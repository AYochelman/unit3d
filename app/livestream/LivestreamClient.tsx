"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Btn from "@/components/ui/Btn";
import LiveVideo from "@/components/LiveVideo";
import { useSteadyImage } from "@/lib/steady-image";
import { useAdminStore } from "@/lib/admin-store";
import Pill from "@/components/ui/Pill";
import Icon from "@/components/ui/Icon";
import { fmtLeft, jobStats, usePrinterJobs, usePrinterLive, useTimelapses, type PrinterState } from "@/lib/printer";

const pad = (n: number) => n.toString().padStart(2, "0");

const STATE_HE: Record<PrinterState, string> = {
  printing: "מדפיסה עכשיו",
  paused: "מושהית",
  idle: "דולקת, לא מדפיסה",
  finished: "סיימה הדפסה",
  failed: "ההדפסה נעצרה",
  offline: "כבויה",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

/**
 * The printer, as it actually is.
 *
 * Everything here comes from the machine itself: the agent beside it writes its
 * state, a chamber still and every finished job to the shop's table, and this
 * page reads them. When the printer is off, the page says so — a studio that
 * pretends to print around the clock is worth less than one that tells the
 * truth, and the truth is checkable against the photo.
 */
export default function LivestreamClient() {
  const { live, camera, stream, liveWhy, liveAgent, ready, online } = usePrinterLive();
  const jobs = usePrinterJobs();
  const clips = useTimelapses();
  const stats = jobStats(jobs);

  // The camera URL is assembled from the shop's config, so it exists whether or
  // not a picture was ever uploaded. Only the browser can say whether one really
  // came back, so the page waits to be told rather than assuming.
  // Preloaded before it is shown, so swapping to a fresher frame never leaves a
  // gap on screen (see lib/steady-image.ts).
  const { src: shotSrc, state: shot } = useSteadyImage(camera);
  // Video is preferred while a print runs, but it is not promised: if the
  // stream will not play, the page drops back to the still rather than showing
  // a dead player. A new stream address clears the refusal, so the next print
  // gets a fresh chance.
  /**
   * A refusal, remembered for a minute — not for ever.
   *
   * It used to be remembered by stream address, with the note that "a new
   * address clears the refusal". The address never changes: it is one constant
   * URL for the life of the shop. So the FIRST time the player gave up — which
   * happens normally at the end of every broadcast, when the playlist it is
   * still reading is taken down — the page refused to try again until someone
   * reloaded it by hand. One broadcast would play, and every one after it
   * showed stills, which is exactly what it did.
   *
   * A minute is long enough not to hammer a stream that is genuinely broken,
   * and short enough that the next print is picked up on its own.
   */
  const REFUSAL_MS = 45_000;
  const [videoFault, setVideoFault] = useState<{ src: string; at: number } | null>(null);
  const [videoOn, setVideoOn] = useState(false);
  // The clock below lets it go once it is old enough; reading the time during
  // render would make the same view render differently twice.
  const showVideo = !!stream && videoFault?.src !== stream;

  /**
   * The other half of "why is there no video".
   *
   * The agent can be uploading happily and the browser still refuse to play
   * what it uploaded. In that case the status file says the stream IS on, so
   * there is no agent-side reason to show — and the page used to fall back to
   * the still with nothing to say at all. This is the player's own complaint,
   * plus a plain timeout for the case where it never complains and never
   * starts either.
   */
  // Tagged with the stream it belongs to, so a new address drops the old
  // complaint on its own rather than needing an effect to clear it.
  const [playFault, setPlayFault] = useState<{ src: string; why: string } | null>(null);
  const onDiag = useCallback((d: string) => setPlayFault({ src: stream ?? "", why: d }), [stream]);
  const playWhy = stream && playFault?.src === stream ? playFault.why : null;
  useEffect(() => {
    if (!stream) return;
    // No complaint and no picture is its own fault, and the commonest one.
    const id = setTimeout(
      () => setPlayFault((prev) => (prev?.src === stream ? prev : { src: stream, why: "stream-never-started" })),
      12_000,
    );
    return () => clearTimeout(id);
  }, [stream]);

  /**
   * The flicker.
   *
   * iOS plays this stream natively, and a live playlist rewritten every second
   * from a few short segments leaves it repeatedly at the live edge with
   * nothing to show — so it painted the player's own black background about
   * once a second, on top of a perfectly good still picture.
   *
   * Two changes end it. The player no longer carries an opaque background, so
   * an empty frame shows what is UNDER it rather than black; and the still is
   * no longer hidden the moment video starts — it is hidden only while frames
   * are actually arriving, and comes straight back on a stall. A held still is
   * a second old; a black rectangle is nothing at all.
   */
  /**
   * The frame takes the camera's shape, rather than the camera being cut to fit.
   *
   * The box was fixed at 16:9 with `object-cover`, which does exactly what it
   * says: anything the camera sends that is not 16:9 gets its edges cut off,
   * and the middle is blown up to fill. A printer camera is a wide-angle lens
   * in a corner — the parts that get cut are the plate edges, which is the part
   * worth seeing. Now the box adopts the stream's real proportions the moment
   * they are known, so nothing is cropped and nothing is letterboxed either.
   */
  const [frameRatio, setFrameRatio] = useState(16 / 9);

  const stallTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const framesFlowing = () => {
    if (stallTimer.current) clearTimeout(stallTimer.current);
    // Frames arrive continuously; a gap longer than this is a stall even if the
    // element never fired an event for it.
    stallTimer.current = setTimeout(() => setVideoOn(false), 1200);
    setVideoOn(true);
    // Frames are arriving, so whatever the player complained about is over.
    setPlayFault(null);
    const v = videoEl.current;
    if (v?.videoWidth && v.videoHeight) {
      const r = v.videoWidth / v.videoHeight;
      setFrameRatio((prev) => (Math.abs(prev - r) > 0.01 ? r : prev));
    }
  };
  useEffect(() => () => { if (stallTimer.current) clearTimeout(stallTimer.current); }, []);

  // Fullscreen. iOS Safari will not take a div — only the video element itself
  // — so the button tries the frame first and falls back to the player.
  const frameRef = useRef<HTMLDivElement>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const sync = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggleFullscreen = () => {
    type IosVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    type AnyEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    const doc = document as Document & { webkitExitFullscreen?: () => void };
    if (document.fullscreenElement) { void document.exitFullscreen(); return; }
    if (doc.webkitExitFullscreen && !document.fullscreenElement && isFull) { doc.webkitExitFullscreen(); return; }
    const frame = frameRef.current as AnyEl | null;
    if (frame?.requestFullscreen) { void frame.requestFullscreen().catch(() => {}); return; }
    if (frame?.webkitRequestFullscreen) { void frame.webkitRequestFullscreen(); return; }
    // iPhone: the video element is the only thing it will enlarge.
    (videoEl.current as IosVideo | null)?.webkitEnterFullscreen?.();
  };

  const adminUnlocked = useAdminStore((s) => s.unlocked);

  /**
   * How the owner actually gets to see the diagnosis.
   *
   * The admin unlock lives in one tab's memory and is cleared by any hard
   * load — and a hard load is exactly how this page is reached. Gated on the
   * unlock alone, the box below could never appear for the person it was
   * written for. `?debug=1` is the way in that survives a cold load, on a
   * phone, without unlocking anything: the reasons it shows carry no secret,
   * they are copied from the agent's own publicly readable status file.
   */
  const [urlDebug, setUrlDebug] = useState(false);
  useEffect(() => {
    const on = new URLSearchParams(window.location.search).has("debug");
    if (on) requestAnimationFrame(() => setUrlDebug(true));
  }, []);
  const showWhy = adminUnlocked || urlDebug;

  /** The agent's reason, in Hebrew, for the owner only. */
  const WHY_HE: Record<string, string> = {
    "r2-not-configured": "אין הגדרות R2 ב-config.json של הסוכן — לווידאו אין לאן לעלות.",
    "disabled-in-config": "live.enabled מוגדר false ב-config.json של הסוכן.",
    "cors-blocked": "ה-bucket לא מרשה לאתר לקרוא ממנו, אז שום דפדפן לא יוכל לנגן את השידור. start.bat מדפיס בדיוק מה להדביק ב-Cloudflare.",
    "not-printing": "המדפסת לא מדפיסה כרגע, אז אין שידור — זה תקין.",
    "printer-offers-no-stream": "המדפסת לא מפרסמת כתובת RTSP. צריך LAN Only + Liveview + Developer Mode בתפריט המדפסת.",
    "ffmpeg-missing": "ffmpeg לא מותקן על המחשב של הסוכן. הרץ פעם אחת ffmpeg-install.bat.",
    "encoder-not-started": "ffmpeg עוד לא הספיק לעלות. עוד כמה שניות.",
    "no-video-from-printer": "ffmpeg רץ אבל המדפסת לא שולחת לו וידאו — כלום לא הגיע ל-bucket. בדוק שה-Liveview דלוק בתפריט המדפסת.",
    "agent-status-unreachable": "לא הצלחתי להגיע ל-live.unit-3d.com בכלל. או שהסוכן לא רץ, או שהוא לא מעלה ל-R2.",
    "agent-status-missing": "live/status.json לא קיים ב-R2. הסוכן רץ? הוא מעלה?",
    "agent-status-unreadable": "live/status.json קיים אבל לא נקרא כ-JSON.",
    "agent-too-old": "הסוכן מעלה סטטוס אבל בלי שדה why — גרסה ישנה. הרץ update.bat.",
    "no-live-url": "אין liveUrl ב-public/shop.json של האתר.",
    unknown: "הסוכן לא אמר למה. כנראה גרסה ישנה — הרץ את update.",
    // The player's side: the agent says the stream is up, the browser disagrees.
    "stream-never-started": "הסוכן מדווח ששידור באוויר, אבל הנגן לא התחיל ולא התלונן — ולא הספיק להגיע לשום שלב מדווח. סימן שנגן הווידאו עצמו לא נטען.",
    "play-refused": "הדפדפן סירב להתחיל לנגן מעצמו. לחץ על הכפתור שמופיע על התמונה.",
    "hlsjs-failed-to-load": "נגן הווידאו (hls.js) לא הצליח להיטען בדפדפן — כנראה חסימת רשת או קובץ ישן בזיכרון המטמון. רענון קשיח.",
    "hlsjs-unsupported": "הדפדפן הזה לא תומך בניגון השידור. נסה כרום או אדג'.",
    "stalled-at": "הנגן נעצר באמצע. השלב שהוא הספיק להגיע אליו מופיע בשורה הקטנה מתחת.",
    manifestLoadError: "הדפדפן לא הצליח לטעון את stream.m3u8. אם הקוד הוא 0 — זה CORS על ה-bucket. אם 404 — הקובץ לא שם.",
    manifestLoadTimeOut: "stream.m3u8 לא ענה בזמן.",
    manifestParsingError: "stream.m3u8 נטען אבל לא נקרא כפלייליסט תקין.",
    fragLoadError: "הפלייליסט נטען אבל קטעי הווידאו עצמם לא — כנראה הרשאות או נתיב.",
    levelLoadError: "רשימת הקטעים לא נטענה.",
    bufferAppendError: "הדפדפן לא מצליח לפענח את הווידאו — קידוד לא נתמך.",
  };

  const [clock, setClock] = useState("00:00:00");
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
      // And let an old refusal go, so the next broadcast gets a fresh chance
      // without anyone reloading the page.
      setVideoFault((f) => (f && Date.now() - f.at > REFUSAL_MS ? null : f));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const state: PrinterState = live?.state ?? "offline";
  const printing = state === "printing" || state === "paused";
  const progress = Math.max(0, Math.min(100, live?.progress ?? 0));

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12">
      <header className="mb-6 md:mb-8">
        <Pill tone={online ? (printing ? "bad" : "good") : "neutral"} className="mb-3">
          {online && <span className={`w-1.5 h-1.5 rounded-full ${printing ? "bg-bad live-dot" : "bg-good"}`} />}
          {online ? (printing ? "LIVE NOW" : "ONLINE") : "OFFLINE"}
        </Pill>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tightest mb-2">
          {printing ? "המדפסת רצה עכשיו." : online ? "המדפסת דלוקה." : "המדפסת כבויה כרגע."}
        </h1>
        <p className="text-ink-300">
          שקוף, חי, ובלי פילטרים. הסטודיו בגבעתיים — {live?.model || "Bambu Lab P2S"}.
          {!online && " כשהיא נדלקת, כל מה שקורה בה מופיע כאן מעצמו."}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* The chamber */}
        <div className="lg:col-span-2">
          <div
            ref={frameRef}
            className="relative w-full rounded-2xl overflow-hidden border border-ink-800 bg-ink-950 group/frame"
            style={{ aspectRatio: String(frameRatio) }}
          >
            {showVideo && (
              <LiveVideo
                key={stream}
                src={stream}
                videoRef={videoEl}
                // No background of its own: an empty frame must reveal the
                // still underneath, not a black rectangle.
                className="absolute inset-0 h-full w-full object-contain z-[2]"
                onPlaying={framesFlowing}
                onStall={() => setVideoOn(false)}
                onDiag={onDiag}
                onFail={() => { setVideoOn(false); setVideoFault({ src: stream ?? "", at: Date.now() }); }}
              />
            )}

            {shotSrc && online && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shotSrc ?? undefined}
                alt="המדפסת עכשיו"
                // Always on once it has loaded. It sits UNDER the player, so a
                // playing video covers it anyway — and the moment the player
                // has no frame, this is what shows instead of black. Toggling
                // it with the video was what turned a stall into a flash.
                className="absolute inset-0 h-full w-full object-contain z-[1] transition-opacity duration-300"
                style={{ opacity: shot === "ok" ? 1 : 0 }}
              />
            )}
            {shot !== "ok" && !videoOn && (
              <>
                <div className="absolute inset-0 printer-grid opacity-40" />
                <svg viewBox="0 0 600 360" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                  <rect x="80" y="280" width="440" height="20" rx="2" fill="#1C1C1F" stroke="#3A3A3F" />
                  <rect x="80" y="280" width="440" height="6" fill="#089a47" opacity="0.3" />
                  <rect x="60" y="60" width="20" height="240" fill="#1C1C1F" stroke="#3A3A3F" />
                  <rect x="520" y="60" width="20" height="240" fill="#1C1C1F" stroke="#3A3A3F" />
                  <rect x="60" y="60" width="480" height="14" fill="#1C1C1F" stroke="#3A3A3F" />
                  <g transform="translate(300, 110)">
                    <rect x="-30" y="-12" width="60" height="40" rx="4" fill="#2A2A2E" stroke="#3A3A3F" />
                    <polygon points="-10,28 10,28 0,42" fill="#089a47" />
                  </g>
                </svg>
                <div className="absolute inset-0 flex items-end justify-center pb-10">
                  <div className="text-center">
                    <div className="text-ink-400 text-sm">
                      {!ready ? "טוען…" : shot === "missing" ? "אין תמונה מהמצלמה" : "אין תמונה כרגע"}
                    </div>
                    <div className="text-ink-600 text-xs mt-1">
                      {shot === "missing" ? "המצלמה לא שולחת כרגע. הנתונים למטה עדיין חיים." : "המצלמה משדרת כשהמדפסת דולקת"}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Why there is no video — the owner's answer, never a customer's.
                Without it, a printer that is mid-print with the camera on and
                no R2 keys looks exactly like one that is working. */}
            {showWhy && !videoOn && (liveWhy || playWhy) && (
              <div className="absolute bottom-4 right-4 z-20 max-w-[min(92%,30rem)] rounded-lg border border-amber-500/40 bg-ink-950/85 backdrop-blur px-3 py-2 text-[11px] leading-relaxed text-amber-200">
                <span className="font-mono text-[10px] tracking-widest uppercase text-amber-400/80">ADMIN · אין וידאו</span>
                <div className="mt-0.5 text-ink-100">
                  {/* The player appends the HTTP code to its reason, so the
                      lookup uses the reason alone and the code stays in the
                      line below it. */}
                  {WHY_HE[(liveWhy ?? playWhy ?? "").split(/[:(]/)[0].trim()] ??
                    (liveWhy
                      ? liveWhy
                      : `הסוכן משדר, אבל הנגן בדפדפן נכשל: ${playWhy}`)}
                </div>
                <div className="mt-1 font-mono text-[10px] text-ink-500" dir="ltr">
                  {liveWhy ?? `player: ${playWhy}`}{liveAgent ? ` · agent ${liveAgent}` : " · agent ?"}
                  {` · frame ${frameRatio.toFixed(3)}`}
                </div>
              </div>
            )}

            {/* The browser would not start it by itself. Everyone sees this —
                it is the one failure a visitor can actually fix, with a tap. */}
            {playWhy?.startsWith("play-refused") && !videoOn && (
              <button
                type="button"
                onClick={() => { setPlayFault(null); void videoEl.current?.play().catch(() => {}); }}
                className="absolute inset-0 z-[3] flex items-center justify-center bg-ink-950/45 backdrop-blur-[2px]"
                aria-label="הפעל את השידור החי"
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-ink-950/85 border border-ink-700 px-5 py-3 text-sm font-semibold text-ink-50">
                  <Icon name="play" size={18} />
                  הפעל את השידור
                </span>
              </button>
            )}

            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              {/* Fullscreen sits up here, not in a bottom corner: both bottom
                  corners of the viewport already belong to the floating
                  WhatsApp and help buttons, and on a phone the frame scrolls
                  right under them. Always visible — a touch screen has no
                  hover to reveal it with. */}
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFull ? "צא ממסך מלא" : "מסך מלא"}
                title={isFull ? "צא ממסך מלא" : "מסך מלא"}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-ink-700/70 bg-ink-950/70 backdrop-blur text-ink-100 hover:border-flame hover:text-flame transition-colors"
              >
                <Icon name="expand" size={16} />
              </button>
              <Pill tone={printing ? "bad" : "neutral"}>
                {printing && <span className="w-1.5 h-1.5 rounded-full bg-bad live-dot" />}
                {STATE_HE[state]}
              </Pill>
            </div>

            <div className="absolute top-4 left-4 z-10 font-mono text-[11px] text-ink-200 bg-ink-950/60 backdrop-blur px-2 py-1.5 rounded" dir="ltr">
              <div>{videoOn ? "LIVE" : "CAM"} · {(live?.model || "PRINTER").toUpperCase()}</div>
              <div className="text-flame">{clock}</div>
            </div>

            {/* A printer standing idle is not a dead page — it is an opening. The
                same strip that carries the job while one is running says what
                the empty plate means, and gives it somewhere to go. */}
            {online && !printing && (
              <div className="absolute inset-x-0 bottom-0 z-10">
                <div className="bg-gradient-to-t from-ink-950 via-ink-950/85 to-transparent p-4 pt-14">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] tracking-widest uppercase text-ink-500" dir="ltr">READY</div>
                      <h2 className="font-extrabold text-lg md:text-xl mt-0.5">
                        הפלטה פנויה — מחכים רק <span className="text-flame">להזמנה שלך</span>.
                      </h2>
                    </div>
                    <Btn as="a" href="/contact" size="sm" icon="arrowLeft" className="shrink-0">
                      להזמנה
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {printing && (
              <div className="absolute inset-x-0 bottom-0 z-10">
                <div className="bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent p-4 pt-12">
                  <div className="flex items-end justify-between gap-3">
                    <h2 className="font-bold text-lg truncate">{live?.job_name || "הדפסה"}</h2>
                    <div className="font-mono text-3xl font-extrabold text-flame tabular-nums" dir="ltr">
                      {Math.round(progress)}%
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-ink-800 rounded-full overflow-hidden">
                    <div className="h-full bg-flame transition-[width] duration-700" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="mt-3 text-[11px] text-ink-500">
            {videoOn
              ? "וידאו חי מהמדפסת עצמה, בזמן אמת. הנתונים מתעדכנים כל שתי שניות."
              : "התמונה והנתונים נמשכים מהמדפסת עצמה ומתעדכנים מעצמם כל שתי שניות — בלי לרענן את הדף."}
            {live?.updated_at && ` עדכון אחרון: ${when(live.updated_at)}.`}
          </p>
        </div>

        {/* Readout */}
        <aside className="grid grid-cols-2 gap-3 h-fit">
          <div className="col-span-2 p-5 rounded-2xl bg-ink-900 border border-ink-800">
            <div className="flex items-center justify-between mb-2">
              <Pill tone={printing ? "flame" : "neutral"}>{STATE_HE[state]}</Pill>
              <span className="font-mono text-[10px] tracking-widest text-ink-500" dir="ltr">CURRENT JOB</span>
            </div>
            <div className="font-bold text-base mb-3 truncate">{live?.job_name || (online ? "אין הדפסה פעילה" : "—")}</div>
            <div className="grid grid-cols-2 divide-x divide-ink-800 rtl:divide-x-reverse" dir="ltr">
              <div className="text-center">
                <div className="font-mono text-2xl font-bold tabular-nums">{fmtLeft(live?.minutes_left ?? null)}</div>
                <div className="text-[10px] text-ink-500 uppercase tracking-widest mt-0.5">REMAINING</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-2xl font-bold tabular-nums">
                  {live?.layer != null && live?.layers_total ? `${live.layer} / ${live.layers_total}` : "—"}
                </div>
                <div className="text-[10px] text-ink-500 uppercase tracking-widest mt-0.5">LAYER</div>
              </div>
            </div>
          </div>

          {[
            { label: "NOZZLE", value: live?.nozzle_temp != null ? `${Math.round(live.nozzle_temp)}°C` : "—", iconKey: "thermometer" as const },
            { label: "BED", value: live?.bed_temp != null ? `${Math.round(live.bed_temp)}°C` : "—", iconKey: "layers" as const },
            { label: "FILAMENT", value: live?.filament || "—", iconKey: "droplet" as const },
            { label: "FAN", value: live?.fan != null ? `${live.fan}` : "—", iconKey: "zap" as const },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-2xl bg-ink-900 border border-ink-800">
              <span className="text-ink-500" aria-hidden="true"><Icon name={s.iconKey} size={16} /></span>
              <div className="font-mono text-xl font-bold tabular-nums mt-2 truncate" dir="ltr">{s.value}</div>
              <div className="font-mono text-[10px] text-ink-500 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </aside>
      </div>

      {/* The numbers, openly */}
      {jobs.length > 0 && (
        <section className="mt-12">
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-2">THE NUMBERS</div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">מה יצא מהמדפסת הזאת.</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "הדפסות שהסתיימו", value: String(stats.ok) },
              { label: "שעות הדפסה", value: String(stats.hours) },
              { label: "בחודש האחרון", value: String(stats.lastMonth) },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-2xl bg-ink-900 border border-ink-800">
                <div className="font-mono text-3xl font-black text-flame tabular-nums" dir="ltr">{s.value}</div>
                <div className="text-xs text-ink-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-ink-500">
            נספר על ידי המדפסת, לא על ידי. כולל הדפסות שנכשלו — {stats.failed} מהן.
          </p>
        </section>
      )}

      {/* Timelapses */}
      {clips.length > 0 && (
        <section className="mt-12">
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-2">TIMELAPSE</div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">שעות בתוך חצי דקה.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((c) => (
              <figure key={c.file} className="rounded-2xl overflow-hidden bg-ink-900 border border-ink-800">
                <video src={c.url} controls preload="metadata" playsInline className="w-full aspect-video bg-ink-950" />
                <figcaption className="p-3 text-[11px] text-ink-400 flex items-center justify-between gap-2">
                  <span className="truncate" dir="ltr">{c.file}</span>
                  <span className="shrink-0">{when(c.recorded_at)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Last prints */}
      {jobs.length > 0 && (
        <section className="mt-12">
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-2">RECENT</div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-5">מה רץ כאן לאחרונה.</h2>
          <div className="space-y-2">
            {jobs.slice(0, 8).map((j) => (
              <div key={j.key} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-ink-900 border border-ink-800">
                <Pill tone={j.ok ? "good" : "neutral"} className="text-[10px]">{j.ok ? "הושלמה" : "נעצרה"}</Pill>
                <span className="font-semibold text-sm truncate">{j.name}</span>
                <span className="flex-1" />
                {j.minutes != null && <span className="font-mono text-[11px] text-ink-400" dir="ltr">{fmtLeft(j.minutes)}</span>}
                <span className="text-[11px] text-ink-500">{when(j.finished_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {ready && !online && jobs.length === 0 && (
        <section className="mt-12 p-8 rounded-2xl border border-ink-800 text-center">
          <div className="font-bold mb-1">עוד אין נתונים מהמדפסת.</div>
          <p className="text-sm text-ink-400">
            ברגע שהמדפסת והמחשב שלידה דולקים, המצב, התמונה, ההדפסות והטיימלפסים מופיעים כאן מעצמם.
          </p>
        </section>
      )}
    </div>
  );
}
