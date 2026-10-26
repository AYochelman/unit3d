/**
 * YouTube Live, automatically, with the print's name on it.
 *
 * Two halves that do not depend on each other:
 *
 *  · The video. The live encoder already reads the printer for the site; with a
 *    stream key it sends the same picture to YouTube's RTMP ingest as well (see
 *    rtmpOutput). YouTube's "Auto-start" turns that into a live broadcast on the
 *    channel, and "Auto-stop" ends it when the print ends and the push stops.
 *
 *  · The words. YouTube names an auto-started broadcast after the last one, so
 *    every print would be called the same thing. With an OAuth client the agent
 *    finds the broadcast that is live right now and sets its title and
 *    description to what is printing (setLiveText).
 *
 * The OAuth sign-in is Google's "TV and limited input" flow, because the agent
 * runs on a Pi with no screen: it asks Google for a short code, /admin →
 * "מדפסת" shows it, and the owner types it at google.com/device on a phone.
 * The refresh token that comes back stays in config.json on the Pi — it never
 * goes to the database.
 */

const SCOPE = "https://www.googleapis.com/auth/youtube";
const API = "https://www.googleapis.com/youtube/v3";

export const RTMP_BASE = "rtmp://a.rtmp.youtube.com/live2";

/** The extra ffmpeg output that sends the encoder's picture to YouTube. */
export function rtmpOutput(streamKey) {
  return `${RTMP_BASE}/${streamKey}`;
}

export function makeYoutube({ cfg, saveConfig, report, log }) {
  const yt = () => cfg.youtube ?? {};
  let token = "";
  let tokenUntil = 0;
  let pending = null; // a device-code sign-in in progress

  async function post(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
    return { ok: res.ok, status: res.status, json: await res.json().catch(() => ({})) };
  }

  async function accessToken() {
    const { clientId, clientSecret, refreshToken } = yt();
    if (!clientId || !clientSecret || !refreshToken) return "";
    if (token && Date.now() < tokenUntil) return token;
    const r = await post("https://oauth2.googleapis.com/token", {
      client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token",
    });
    if (!r.ok) {
      log(`youtube: Google refused the saved sign-in (${r.json.error || r.status}) - sign in again from /admin`);
      if (r.json.error === "invalid_grant") {
        saveConfig({ ...cfg, youtube: { ...yt(), refreshToken: "" } });
        void report({ state: "signed-out", why: "invalid_grant" });
      }
      return "";
    }
    token = r.json.access_token;
    tokenUntil = Date.now() + (r.json.expires_in - 60) * 1000;
    return token;
  }

  /**
   * Sign in without a screen: show a code in /admin, wait for the owner to
   * enter it at google.com/device, keep the refresh token in config.json.
   */
  async function signInIfNeeded() {
    const { clientId, clientSecret, refreshToken } = yt();
    if (!clientId || !clientSecret || refreshToken) return;
    const now = Date.now();

    if (pending && pending.client !== clientId) pending = null;
    if (!pending || now > pending.until) {
      const r = await post("https://oauth2.googleapis.com/device/code", { client_id: clientId, scope: SCOPE });
      if (!r.ok) {
        log(`youtube: could not start the sign-in (${r.json.error || r.status}) - is the OAuth client of type "TVs and Limited Input devices"?`);
        void report({ state: "error", why: r.json.error || String(r.status) });
        pending = { client: clientId, until: now + 10 * 60_000, failed: true };
        return;
      }
      pending = {
        client: clientId,
        device: r.json.device_code,
        until: now + r.json.expires_in * 1000,
        every: (r.json.interval || 5) * 1000,
        next: now,
      };
      log(`youtube: to connect the channel, open ${r.json.verification_url} and enter ${r.json.user_code}`);
      void report({ state: "needs-code", code: r.json.user_code, url: r.json.verification_url, until: new Date(pending.until).toISOString() });
      return;
    }
    if (pending.failed || now < pending.next) return;
    pending.next = now + pending.every;

    const r = await post("https://oauth2.googleapis.com/token", {
      client_id: clientId, client_secret: clientSecret, device_code: pending.device,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });
    if (r.ok && r.json.refresh_token) {
      pending = null;
      token = r.json.access_token;
      tokenUntil = Date.now() + (r.json.expires_in - 60) * 1000;
      saveConfig({ ...cfg, youtube: { ...yt(), refreshToken: r.json.refresh_token } });
      log("youtube: channel connected - titles and descriptions will follow the print");
      void report({ state: "connected" });
      return;
    }
    const e = r.json.error;
    if (e === "authorization_pending") return;
    if (e === "slow_down") { pending.every += 5000; return; }
    // access_denied, expired_token: start over with a fresh code next round.
    log(`youtube: sign-in not completed (${e || r.status}) - a new code is coming`);
    pending = null;
  }

  let lastSet = "";
  let lastTry = 0;

  /**
   * Put the print's name on whatever is live on the channel right now.
   *
   * YouTube takes a few tens of seconds after the push starts before it calls
   * the broadcast live, so this is tried every 30 seconds until it lands, and
   * again whenever the text changes (a new print while the stream keeps going).
   */
  async function setLiveText({ title, description }) {
    const key = `${title}\n${description}`;
    if (key === lastSet || Date.now() - lastTry < 30_000) return;
    lastTry = Date.now();
    const t = await accessToken();
    if (!t) return;
    const h = { Authorization: `Bearer ${t}` };

    const list = await fetch(`${API}/liveBroadcasts?part=id,snippet&broadcastStatus=active&broadcastType=all&maxResults=5`, { headers: h });
    if (!list.ok) { log(`youtube: could not list broadcasts (${list.status})`, (await list.text()).slice(0, 160)); return; }
    const live = (await list.json()).items?.[0];
    if (!live) return; // not on air yet — next round

    const got = await fetch(`${API}/videos?part=snippet&id=${live.id}`, { headers: h });
    const snippet = got.ok ? (await got.json()).items?.[0]?.snippet : null;
    const res = await fetch(`${API}/videos?part=snippet`, {
      method: "PUT",
      headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: live.id,
        snippet: {
          title,
          description,
          categoryId: snippet?.categoryId || "28",
          ...(snippet?.tags ? { tags: snippet.tags } : {}),
          ...(snippet?.defaultLanguage ? { defaultLanguage: snippet.defaultLanguage } : {}),
        },
      }),
    });
    if (!res.ok) { log(`youtube: could not set the title (${res.status})`, (await res.text()).slice(0, 200)); return; }
    lastSet = key;
    log(`youtube: live as "${title}" - https://youtu.be/${live.id}`);
    void report({ state: "live", title, video: live.id });
  }

  /** A print ended: the next one gets its own title even if the name repeats. */
  function forget() { lastSet = ""; lastTry = 0; }

  return { signInIfNeeded, setLiveText, forget };
}

/** YouTube refuses < and > in titles, and cuts at 100 characters. */
export const cleanTitle = (s) => String(s).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 100);
