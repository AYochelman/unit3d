/**
 * Decides whether a downloaded file really is a video we can serve, from its
 * bytes rather than from the Content-Type the server attached. The same rule
 * the image sniffer follows, for the same reason: what a page claims about a
 * file it hands us is not evidence.
 *
 * Animated GIFs are images and already handled by the image sniffer - they
 * animate in an <img> with nothing extra.
 */
export interface VideoInfo {
  mime: string;
  ext: string;
}

/** 25 MB, matching the upload ceiling: a reference clip, not a feature film. */
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function inspectVideo(buf: Buffer): VideoInfo | null {
  if (buf.length < 12) return null;

  // ISO base media (MP4 / M4V / MOV): a `ftyp` box at offset 4.
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand.startsWith("qt")) return { mime: "video/quicktime", ext: "mov" };
    return { mime: "video/mp4", ext: "mp4" };
  }

  // Matroska / WebM: the EBML header. Both are served as video/webm; a browser
  // that cannot play the codec inside falls back to the poster either way.
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { mime: "video/webm", ext: "webm" };
  }

  return null;
}
