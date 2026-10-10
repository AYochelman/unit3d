/**
 * Counts the colours actually present in an image, in the browser, at the
 * moment it is dropped. Doing it here means the server never needs an image
 * decoder, and the result is a real measurement of the file - so these swatches
 * are marked "observed" rather than estimated.
 *
 * Median-cut quantisation: repeatedly split the box of colours along its
 * longest axis. It keeps small but saturated accents that a simple
 * most-frequent count loses in the background.
 */
export interface AutoSwatch { hex: string; share: number }

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("")}`;

export async function extractPalette(file: File, count = 6): Promise<AutoSwatch[]> {
  if (typeof document === "undefined") return [];
  if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) return [];

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return [];
  }
  try {
    const max = 160;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(bitmap, 0, 0, w, h);

    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch {
      return []; // tainted canvas - not worth failing an upload over
    }

    const pixels: [number, number, number][] = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // skip transparent
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (!pixels.length) return [];

    const boxes: [number, number, number][][] = [pixels];
    while (boxes.length < count) {
      boxes.sort((a, b) => b.length - a.length);
      const box = boxes.shift();
      if (!box || box.length < 2) { if (box) boxes.push(box); break; }
      let axis = 0;
      let widest = -1;
      for (let c = 0; c < 3; c += 1) {
        let lo = 255; let hi = 0;
        for (const p of box) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        if (hi - lo > widest) { widest = hi - lo; axis = c; }
      }
      if (widest <= 0) { boxes.push(box); break; }
      box.sort((a, b) => a[axis] - b[axis]);
      const mid = Math.floor(box.length / 2);
      boxes.push(box.slice(0, mid), box.slice(mid));
    }

    const total = pixels.length;
    return boxes
      .filter((b) => b.length)
      .map((box) => {
        let r = 0; let g = 0; let b = 0;
        for (const p of box) { r += p[0]; g += p[1]; b += p[2]; }
        return { hex: hex(r / box.length, g / box.length, b / box.length), share: Number((box.length / total).toFixed(4)) };
      })
      .sort((a, b) => b.share - a.share)
      .slice(0, count);
  } finally {
    bitmap.close?.();
  }
}

/** Natural dimensions of a dropped file, so the library knows them at once. */
export async function imageSize(file: File): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return size;
  } catch {
    return { width: 0, height: 0 };
  }
}
