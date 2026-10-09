#!/usr/bin/env node
/**
 * Put the order number where the printer reads the job's name.
 *
 *   npm run stamp:3mf -- "C:\path\UNIT3D-91872.3mf"            # ref from the file name
 *   npm run stamp:3mf -- "C:\path\Chill Cat.3mf" UNIT3D-91872  # or given
 *
 * Renaming the file, the plate, or the name in Bambu Studio's "Send print job"
 * box did not change what the printer shows: a MakerWorld 3MF carries the
 * designer's title as <metadata name="Title"> in 3D/3dmodel.model, Bambu
 * Studio keeps it as the model's info, and the job went out as
 * "Chill_Cat_-_Phone_Holder". This rewrites that Title (in every model part of
 * the archive) to the order number and writes the file back. The original is
 * kept beside it as .orig.3mf the first time.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { basename } from "node:path";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

const [file, given] = process.argv.slice(2);
if (!file) {
  console.error('usage: npm run stamp:3mf -- <file.3mf> [UNIT3D-12345]');
  process.exit(1);
}
const ref = (given ?? basename(file).match(/UNIT3D-\d+/i)?.[0] ?? "").toUpperCase();
if (!/^UNIT3D-\d+$/.test(ref)) {
  console.error(`No order number. Name the file UNIT3D-<number>.3mf, or pass it: npm run stamp:3mf -- "${file}" UNIT3D-12345`);
  process.exit(1);
}

const files = unzipSync(new Uint8Array(readFileSync(file)));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let changed = 0;
for (const [name, data] of Object.entries(files)) {
  if (!/\.model$/i.test(name)) continue;
  const xml = strFromU8(data);
  let next = xml.replace(
    /(<metadata\b[^>]*\bname="Title"[^>]*>)([\s\S]*?)(<\/metadata>)/gi,
    (_m, open, _old, close) => `${open}${esc(ref)}${close}`,
  );
  // A model with no Title at all gets one, in the root model only.
  if (next === xml && name === "3D/3dmodel.model" && !/name="Title"/i.test(xml)) {
    next = xml.replace(/(<model\b[^>]*>)/i, `$1\n <metadata name="Title">${esc(ref)}</metadata>`);
  }
  if (next !== xml) {
    files[name] = strToU8(next);
    changed++;
  }
}
if (!changed) {
  console.error("Nothing to change — this 3MF has no model title.");
  process.exit(1);
}

const backup = file.replace(/\.3mf$/i, ".orig.3mf");
if (!existsSync(backup)) copyFileSync(file, backup);
writeFileSync(file, zipSync(files, { level: 6 }));
console.log(`OK — the job will be named ${ref}. (original kept as ${basename(backup)})`);
