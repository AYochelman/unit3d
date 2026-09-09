"use client";
import { useEffect, useRef, useState } from "react";

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
 */
export default function LiveVideo({
  src,
  className,
  onFail,
  onPlaying,
}: {
  src: string;
  className?: string;
  onFail?: () => void;
  onPlaying?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let alive = true;
    let destroy: (() => void) | undefined;

    const give = () => {
      if (!alive || failed) return;
      setFailed(true);
      onFail?.();
    };

    // Safari and iOS play this natively, and doing so uses far less battery
    // than the JavaScript player would.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("error", give);
      destroy = () => video.removeEventListener("error", give);
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
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else give();
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
      }, give);
    }

    return () => { alive = false; destroy?.(); };
  }, [src, failed, onFail]);

  return (
    <video
      ref={ref}
      className={className}
      autoPlay
      muted
      playsInline
      controls={false}
      onPlaying={() => onPlaying?.()}
    />
  );
}
