/**
 * Reads image dimensions straight out of the file header, and - more
 * importantly - decides what a file actually IS from its bytes rather than from
 * the Content-Type the browser attached to it. An upload whose magic number
 * does not match a format we support is rejected before it reaches disk.
 */
export interface ImageInfo {
  mime: string;
  ext: string;
  width: number;
  height: number;
}

function readPng(buf: Buffer): ImageInfo | null {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { mime: "image/png", ext: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpeg(buf: Buffer): ImageInfo | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const length = buf.readUInt16BE(i + 2);
    // SOF0..SOF15, skipping the four that are not frame headers.
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) {
      return { mime: "image/jpeg", ext: "jpg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  return null;
}

function readGif(buf: Buffer): ImageInfo | null {
  if (buf.length < 10 || buf.toString("ascii", 0, 3) !== "GIF") return null;
  return { mime: "image/gif", ext: "gif", width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function readWebp(buf: Buffer): ImageInfo | null {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8X") {
    const w = 1 + (buf.readUIntLE(24, 3) & 0xffffff);
    const h = 1 + (buf.readUIntLE(27, 3) & 0xffffff);
    return { mime: "image/webp", ext: "webp", width: w, height: h };
  }
  if (kind === "VP8 ") {
    return { mime: "image/webp", ext: "webp", width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (kind === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { mime: "image/webp", ext: "webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function readAvif(buf: Buffer): ImageInfo | null {
  // Dimensions live deep inside the ISOBMFF boxes; the brand check is enough to
  // accept the file, and the browser reports the real size on upload.
  if (buf.length < 12 || buf.toString("ascii", 4, 8) !== "ftyp") return null;
  const brand = buf.toString("ascii", 8, 12);
  if (brand !== "avif" && brand !== "avis") return null;
  return { mime: "image/avif", ext: "avif", width: 0, height: 0 };
}

function readSvg(buf: Buffer): ImageInfo | null {
  const head = buf.subarray(0, 1024).toString("utf8").trim();
  if (!/^(<\?xml|<svg)/i.test(head) || !/<svg[\s>]/i.test(buf.subarray(0, 4096).toString("utf8"))) return null;
  return { mime: "image/svg+xml", ext: "svg", width: 0, height: 0 };
}

export function inspectImage(buf: Buffer): ImageInfo | null {
  return readPng(buf) ?? readJpeg(buf) ?? readGif(buf) ?? readWebp(buf) ?? readAvif(buf) ?? readSvg(buf);
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
