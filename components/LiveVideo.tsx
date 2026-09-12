"use client";
import { useEffect, useRef } from "react";

/**
 * The printer, as video.
 *
 * The agent beside the machine cuts its camera into short pieces and puts them
 * where they cost nothing to serve; this stitches them back together. Safari
 * plays that format on its own, everything else needs hls.js, which is only
 * fetched when there is actually something to play.
 *
 * It reports failure upward rather than sitting on a black rectangle: if the
 * stream is not there, the page falls back to the still picture, which is the
 * honest thing to show and better than a broken player.
 *
 * It also reports the SMALLER failure — a stall. A live playlist that is
 * rewritten every second from a handful of short segments makes iOS Safari run
 * to the live edge, find nothing, and paint the element's own background. That
 * read on screen as a flicker roughly once a second. `onStall` lets the page
 * put the still picture back for those moments instead of showing black, and
 * `onPlaying` takes it away again when frames resume.
 */
export default function LiveVideo({
  src,
  className,
  onFail,
  onPlaying,
  onStall,
  onDiag,
  videoRef,
}: {
  src: string;
  className?: string;
  onFail?: () => void;
  onPlaying?: () => void;
  /** Frames stopped arriving — briefly, not fatally. */
  onStall?: () => void;
  /**
   * What the player itself is complaining about, in its own words.
   *
   * A stream the agent is happily uploading can still be unplayable in the
   * browser — the wrong content type, a CORS header the bucket never sends, a
   * codec the machine will not decode. From outside, all of those look
   * identical to "no video", so the player says which one it is instead of
   * retrying in silence.
   */
  onDiag?: (detail: string) => void;
  /** Lets the page drive the element (iOS puts video fullscreen, not divs). */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}) {
  const own = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? own;

  /**
   * The callbacks, held still.
   *
   * They are written inline by the page, so a new function object arrives on
   * every render — and this component's setup effect listed them as
   * dependencies. The page re-renders once a second (it shows a clock), so the
   * player was torn down and rebuilt once a second, for ever: it would start,
   * play a fraction of a second, be destroyed mid-frame and start again. On
   * screen that is not video at all, it is a picture that never moves — which
   * is exactly what it looked like.
   *
   * A ref lets the effect call the CURRENT callback without depending on its
   * identity, so the player is built once per stream address and left alone.
   */
  const cbs = useRef({ onFail, onPlaying, onStall, onDiag });
  useEffect(() => { cbs.current = { onFail, onPlaying, onStall, onDiag }; });
  // Refused streams are remembered without re-running the effect either.
  const failed = useRef(false);

  useEffect(() => {
    failed.current = false;
    const video = ref.current;
    if (!video) return;
    let alive = true;
    let destroy: (() => void) | undefined;

    const give = () => {
      if (!alive || failed.current) return;
      failed.current = true;
      cbs.current.onFail?.();
    };

    // Safari and iOS play this natively, and doing so uses far less battery
    // than the JavaScript player would.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      const nativeFail = () => {
        cbs.current.onDiag?.(`native ${video.error?.code ?? "?"}: ${video.error?.message || "לא ניתן לנגן"}`);
        give();
      };
      video.addEventListener("error", nativeFail);
      destroy = () => video.removeEventListener("error", nativeFail);
    } else {
      void import("hls.js").then(({ default: Hls }) => {
        if (!alive) return;
        if (!Hls.isSupported()) return give();
        const hls = new Hls({
          // A live view wants to be near the front, and would rather skip than
          // fall behind: an old frame presented as now is worse than a gap.
          lowLatencyMode: true,
          liveSyncDurationCount: 2,
          maxLiveSyncPlaybackRate: 1.5,
          manifestLoadingMaxRetry: 2,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 4,
        });
        // A fatal network error used to restart the load and say nothing, for
        // ever: a playlist the browser cannot fetch left the page retrying in
        // silence behind the still picture, with no way to tell that from a
        // printer that simply is not streaming. Retrying is still right — a
        // live stream drops segments — but it is bounded now, and it reports.
        let netTries = 0;
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          const code = data.response?.code;
            cbs.current.onDiag?.(`${data.details}${code ? ` (${code})` : ""}`);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (++netTries > 3) return give();
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else give();
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
      }, give);
    }

    return () => { alive = false; destroy?.(); };
    // Deliberately ONLY the stream address. Anything else here rebuilds the
    // player mid-playback; see the note on `cbs` above.
  }, [src, ref]);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      playsInline
      controls={false}
      onPlaying={() => onPlaying?.()}
      onCanPlay={() => onPlaying?.()}
      // The four ways a live stream goes quiet without going away.
      onWaiting={() => onStall?.()}
      onStalled={() => onStall?.()}
      onSuspend={() => onStall?.()}
      onEmptied={() => onStall?.()}
    />
  );
}
