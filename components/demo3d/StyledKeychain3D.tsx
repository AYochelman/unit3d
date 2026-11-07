"use client";
import { useEffect, useRef, useState } from "react";
import type { Font } from "opentype.js";
import { assetSrc } from "@/lib/assets";
import { FONT_FILES, fontFor, shownText, type FontId, type StyleId } from "./style-meta";

/**
 * Font files, fetched once per page and only when a style asks for one. The
 * first is asked for as the viewer mounts, so it downloads alongside three.js
 * rather than after it.
 */
const fontBytes = new Map<FontId, Promise<ArrayBuffer>>();
const fetchFont = (id: FontId) => {
  let p = fontBytes.get(id);
  if (!p) {
    p = fetch(assetSrc(`/fonts/${FONT_FILES[id]}.ttf`)).then((r) => {
      if (!r.ok) throw new Error(`font ${id}: ${r.status}`);
      return r.arrayBuffer();
    });
    p.catch(() => fontBytes.delete(id)); // a failed fetch may be retried
    fontBytes.set(id, p);
  }
  return p;
};

/**
 * The keychain in 3D, in any of the styles (./styles.ts), rebuilt live from the
 * typed text and two colours. three.js and clipper load only when this mounts,
 * and each font only when a style first needs it.
 */
/**
 * `exportName`: when set (the owner, with /admin open), a button downloads the
 * keychain as a two-part .3mf — the file to print the order from, exactly as
 * the customer saw it. Bambu Studio opens it as one object with two parts,
 * one per filament.
 */
export default function StyledKeychain3D({ style, text, textColor, baseColor, exportName }: { style: StyleId; text: string; textColor: string; baseColor: string; exportName?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update: (s: StyleId, t: string, c1: string, c2: string) => Promise<void>; export3mf: (name: string) => Promise<void> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  // Start the first font now, before the effect below waits on three.js.
  const firstFont = useRef(false);
  useEffect(() => {
    if (firstFont.current) return;
    firstFont.current = true;
    void fetchFont(fontFor(style, shownText(text))).catch(() => {});
  }, [style, text]);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      try {
        const [THREE, { OrbitControls }, opentype, { buildStyle }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          import("opentype.js"),
          import("./styles"),
        ]);
        const parsed = new Map<FontId, Promise<Font>>();
        const font = (id: FontId) => {
          let p = parsed.get(id);
          if (!p) {
            p = fetchFont(id).then((b) => opentype.parse(b) as Font);
            p.catch(() => parsed.delete(id));
            parsed.set(id, p);
          }
          return p;
        };
        const el = host.current;
        if (disposed || !el) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 1, 2000);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2a22, 1.6));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(60, -50, 120);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x9fffc8, 0.7);
        rim.position.set(-80, 60, 30);
        scene.add(rim);

        const mat1 = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
        const mat2 = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
        const group = new THREE.Group();
        scene.add(group);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.2;
        controls.enablePan = false;
        controls.addEventListener("start", () => { controls.autoRotate = false; });

        let lastStyle: StyleId | null = null;
        // Each call supersedes the one before: a font that arrives after the
        // customer has already moved on draws nothing.
        let seq = 0;
        const update = async (s: StyleId, t: string, c1: string, c2: string) => {
          const mine = ++seq;
          let f: Font;
          try { f = await font(fontFor(s, shownText(t))); } catch { return; }
          if (mine !== seq || disposed) return;
          group.children.forEach((m) => (m as InstanceType<typeof THREE.Mesh>).geometry.dispose());
          group.clear();
          mat1.color.set(c1);
          mat2.color.set(c2);
          for (const part of buildStyle(s, f, t)) group.add(new THREE.Mesh(part.geometry, part.slot === 1 ? mat1 : mat2));
          // Centre it, and frame it again when the style (and so the size) changes.
          const box = new THREE.Box3().setFromObject(group);
          const c = box.getCenter(new THREE.Vector3());
          group.position.set(group.position.x - c.x, group.position.y - c.y, group.position.z - c.z);
          // Keep the whole keychain in view as the text grows or the style
          // changes: the camera keeps its angle and only moves in or out.
          const size = box.getSize(new THREE.Vector3());
          const span = Math.max(size.x, size.y, 30);
          if (s !== lastStyle) {
            lastStyle = s;
            camera.position.set(0, -0.9, 1.5);
            controls.target.set(0, 0, 0);
          }
          camera.position.setLength(span * 2.1);
          controls.minDistance = span * 0.6;
          controls.maxDistance = span * 4;
          setReady(true);
        };
        const export3mf = async (name: string) => {
          const { build3mf } = await import("./export3mf");
          const parts = (group.children as InstanceType<typeof THREE.Mesh>[]).map((m) => ({ geometry: m.geometry, slot: m.material === mat1 ? 1 : 2 }));
          const zip = await build3mf(parts, name);
          const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: "model/3mf" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = `${name.replace(/[\\/:*?"<>|]+/g, "_")}.3mf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        };
        api.current = { update, export3mf };

        let raf = 0;
        const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
        loop();
        const ro = new ResizeObserver(() => {
          renderer.setSize(el.clientWidth, el.clientHeight);
          camera.aspect = el.clientWidth / el.clientHeight;
          camera.updateProjectionMatrix();
        });
        ro.observe(el);

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          controls.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
        el.dispatchEvent(new Event("k3d-ready"));
      } catch {
        if (!disposed) setFailed(true);
      }
    })();
    return () => { disposed = true; cleanup(); api.current = null; };
  }, []);

  useEffect(() => {
    const el = host.current;
    const run = () => void api.current?.update(style, text, textColor, baseColor);
    run();
    el?.addEventListener("k3d-ready", run);
    return () => el?.removeEventListener("k3d-ready", run);
  }, [style, text, textColor, baseColor]);

  return (
    <div className="relative w-full aspect-square rounded-2xl border border-ink-800 bg-[radial-gradient(circle_at_50%_40%,#123a26,#06150e_70%)] overflow-hidden touch-none">
      <div ref={host} className="absolute inset-0" />
      {!ready && !failed && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-[12px] text-ink-400">
            <span className="h-7 w-7 rounded-full border-2 border-ink-600 border-t-flame animate-spin" />
            טוען תצוגת תלת-מימד…
          </div>
        </div>
      )}
      {failed && <div className="absolute inset-0 grid place-items-center text-sm text-ink-400">הדפדפן לא תומך בתצוגת תלת-מימד</div>}
      <div className="pointer-events-none absolute bottom-3 inset-x-0 text-center text-[11px] text-ink-400">גוררים כדי לסובב · צובטים כדי להתקרב</div>
      {exportName && (
        <button
          type="button"
          onClick={() => void api.current?.export3mf(exportName)}
          className="absolute top-3 left-3 rounded-lg border border-ink-600 bg-ink-900/90 px-3 h-8 text-xs font-semibold text-ink-100 hover:border-flame"
          title="רק למנהל: קובץ להדפסה, שני חלקים לפי צבע"
        >
          הורדת 3MF
        </button>
      )}
    </div>
  );
}
