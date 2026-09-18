/* ============================================================================
   Unit 3D — the collection list, collected by a browser that is simply his.

   WHY AN EXTENSION AND NOT A SCRIPT

   MakerWorld's collection pages are served the Cloudflare challenge with a box
   to tick, and a driven browser cannot tick it — that is exactly what the box
   is checking. Measured over one evening: hidden Chromium, visible Chromium,
   real Chrome, a signed-in profile, and letting the owner click the box
   himself. None of them got through, and none of them was ever going to.

   His own Chrome is not challenged, because it is not being driven. An
   extension runs inside it: same browser, same cookies, same address, nothing
   announcing itself. The pages open as tabs he did not ask for and close again
   a few seconds later, which is the only visible cost.

   WHERE THE RESULT GOES

   To the Downloads folder, and nowhere else. No server, no token, no new key
   to keep. scripts/sync-daily.bat reads the file each morning and deletes it.
   The project has no backend by design and this does not give it one.

   WHAT IT DOES NOT DO

   It does not decide anything. It reports which collection each model came
   from, and the shop's own rules take it from there: a model saved to a
   collection is approved, a model merely liked waits, and a non-commercial
   licence or a weapon waits whatever collection it sits in.
   ========================================================================== */

const PROFILE = "Erez.yoch";
const ORIGIN = "https://makerworld.com";
const MODEL = /\/models\/(\d{3,9})/g;
const COLLECTION = /\/collections\/(\d+)-([a-z0-9-]*)/gi;

// Once a day is plenty: he saves a model now and then, not by the hour. The
// run costs a handful of background tabs, so doing it on every visit to the
// site would be rude.
const EVERY_MS = 20 * 60 * 60 * 1000;

const idsIn = (text) => [...new Set([...text.matchAll(MODEL)].map((m) => m[1]))];
const challenged = (t) => /just a moment|cf-chl|challenge-platform/i.test(t);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Read one page by opening it in a tab that is never focused.
 *
 * The pages are a React app, so their HTML has to be RENDERED before the model
 * links exist — a plain fetch returns the shell. The tab is scrolled to the
 * bottom repeatedly because the list loads as you go, and the read stops when
 * a few passes in a row stop finding anything new.
 */
async function readPage(url) {
  const tab = await chrome.tabs.create({ url, active: false, pinned: true });
  try {
    let best = [];
    let quiet = 0;
    for (let i = 0; i < 40 && quiet < 4; i++) {
      await wait(900);
      let html = "";
      try {
        const [res] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            window.scrollTo(0, document.body.scrollHeight);
            return document.documentElement.innerHTML;
          },
        });
        html = res?.result || "";
      } catch {
        continue; // the tab is still navigating
      }
      if (!html || challenged(html)) continue;
      const ids = idsIn(html);
      if (ids.length > best.length) { best = ids; quiet = 0; } else if (best.length) quiet++;
    }
    return best;
  } finally {
    try { await chrome.tabs.remove(tab.id); } catch { /* already gone */ }
  }
}

/** Every collection on his profile, id and slug. */
async function collections() {
  const res = await fetch(`${ORIGIN}/en/@${PROFILE}/collections`, { credentials: "include" });
  const html = await res.text();
  // The profile page answers a plain fetch — it is the collection pages that
  // do not. Rendering it in a tab would work too and costs a tab; this does
  // not need one.
  const found = new Map([...html.matchAll(COLLECTION)].map((m) => [m[1], m[2] || ""]));
  return [...found.entries()].map(([id, slug]) => ({ id, slug }));
}

/**
 * One sweep: every collection, then the likes.
 *
 * Likes are kept apart from the start. Downstream they mean something weaker
 * than a collection — "this is good" rather than "I want this" — and a list
 * that mixes them cannot tell the shop which is which. That already happened
 * once, and 82 models had to queue for a decision he had already made.
 */
async function sweep() {
  const groups = {};
  const cols = await collections();
  if (!cols.length) return null; // signed out, or the profile did not answer

  for (const { id, slug } of cols) {
    const ids = await readPage(`${ORIGIN}/en/collections/${id}-${slug}`);
    if (ids.length) groups[slug || id] = ids;
    await wait(600);
  }

  let likes = [];
  for (const url of [`${ORIGIN}/en/@${PROFILE}/likes`, `${ORIGIN}/en/@${PROFILE}?tab=likes`]) {
    likes = await readPage(url);
    if (likes.length) break; // MakerWorld has moved this tab before
  }

  const seen = new Set();
  const pending = [];
  for (const [collection, ids] of Object.entries(groups)) {
    const fresh = ids.filter((id) => !seen.has(id) && seen.add(id));
    if (fresh.length) pending.push({ collection, ids: fresh });
  }
  const all = [...seen, ...likes.filter((id) => !seen.has(id))];
  if (!all.length) return null;

  return { readAt: new Date().toISOString(), ids: all, likes, pending };
}

/**
 * Put it where the nightly job looks.
 *
 * A data: URL rather than a Blob, because URL.createObjectURL does not exist
 * in a service worker. `overwrite` keeps this to one file instead of the
 * makerworld-ids (1), (2), (3) that a daily download would otherwise leave
 * behind.
 */
async function save(doc) {
  const url = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(doc, null, 2));
  await chrome.downloads.download({ url, filename: "unit3d/makerworld-ids.json", conflictAction: "overwrite", saveAs: false });
}

async function run(force = false) {
  const { lastRun = 0, running = false } = await chrome.storage.local.get(["lastRun", "running"]);
  if (running) return;
  if (!force && Date.now() - lastRun < EVERY_MS) return;

  await chrome.storage.local.set({ running: true });
  await chrome.action.setBadgeText({ text: "..." });
  try {
    const doc = await sweep();
    if (!doc) {
      // Nothing found is not the same as nothing there: almost always it means
      // he is signed out. Say which, rather than leaving a silent green tick.
      await chrome.action.setBadgeText({ text: "?" });
      await chrome.action.setBadgeBackgroundColor({ color: "#b8860b" });
      await chrome.action.setTitle({ title: "לא נמצאו אוספים — כנראה לא מחובר למייקרוורלד" });
      return;
    }
    await save(doc);
    await chrome.storage.local.set({ lastRun: Date.now(), lastCount: doc.ids.length });
    await chrome.action.setBadgeText({ text: String(doc.ids.length) });
    await chrome.action.setBadgeBackgroundColor({ color: "#089a47" });
    await chrome.action.setTitle({ title: `${doc.ids.length} מודלים נאספו · ${new Date().toLocaleString("he-IL")}` });
  } catch (e) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#b03030" });
    await chrome.action.setTitle({ title: `שגיאה: ${e.message}` });
  } finally {
    await chrome.storage.local.set({ running: false });
  }
}

// Clicking the icon collects now, whatever the clock says. The alarm is the
// unattended path; this is the one for "I just saved something and I want it".
chrome.action.onClicked.addListener(() => run(true));

chrome.alarms.create("sweep", { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(() => run(false));

// A visit to MakerWorld is the best moment to go: he is signed in, and the
// extra tabs open while he is already looking at the site rather than in the
// middle of something else. The throttle keeps it to once a day.
chrome.tabs.onUpdated.addListener((_id, info, tab) => {
  if (info.status === "complete" && tab.url?.startsWith(ORIGIN)) run(false);
});
