"use client";
import { useEffect, useState } from "react";

/**
 * Hold the picture you have until the next one is ready.
 *
 * The camera still is overwritten in place, so its URL carries a new tail on
 * every poll. Rendering that URL straight into an `<img key={url}>` destroys
 * the element and mounts an empty one, which shows nothing until the bytes
 * arrive — a blink, every poll, on a photograph that barely changes.
 *
 * So the new URL is loaded off-screen first and only becomes the visible one
 * once the browser has it. A failed load keeps the last good picture rather
 * than replacing it with a gap, and reports the failure separately so the page
 * can say the camera went quiet.
 */
export function useSteadyImage(url: string | null): {
  src: string | null;
  state: "waiting" | "ok" | "missing";
} {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<"waiting" | "ok" | "missing">("waiting");

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      setSrc(url);
      setState("ok");
    };
    img.onerror = () => {
      if (!alive) return;
      // Keep whatever is on screen; only the status changes.
      setState((s) => (s === "ok" ? s : "missing"));
    };
    img.src = url;
    return () => {
      alive = false;
      img.onload = img.onerror = null;
    };
  }, [url]);

  return { src, state };
}
