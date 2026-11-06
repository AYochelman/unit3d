"use client";
import { useEffect, useRef, useState } from "react";
import type { Font } from "opentype.js";
import { assetSrc } from "@/lib/assets";
import type { FontId, StyleId } from "./styles";

/**
 * The keychain in 3D, in any of the styles (./styles.ts), rebuilt live from the
 * typed text and two colours. three.js, clipper and the fonts load only when
 * this mounts.
 */
export default function StyledKeychain3D({ style, text, textColor, baseColor }: { style: StyleId; text: string; textColor: string; baseColor: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update: (s: StyleId, t: string, c1: string, c2: string) => void } | null>(null);
  const [failed, setFailed] = useState(false);

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
        const load = async (f: string) => opentype.parse(await fetch(assetSrc(`/fonts/${f}.ttf`)).then((r) => r.arrayBuffer())) as Font;
        const [heebo, rubik, pacifico] = await Promise.all([load("heebo-800"), load("rubik-900"), load("pacifico")]);
        const fonts: Record<FontId, Font> = { heebo, rubik, pacifico };
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
        const update = (s: StyleId, t: string, c1: string, c2: string) => {
          group.children.forEach((m) => (m as InstanceType<typeof THREE.Mesh>).geometry.dispose());
          group.clear();
          mat1.color.set(c1);
          mat2.color.set(c2);
          for (const part of buildStyle(s, fonts, t)) group.add(new THREE.Mesh(part.geometry, part.slot === 1 ? mat1 : mat2));
          // Centre it, and frame it again when the style (and so the size) changes.
          const box = new THREE.Box3().setFromObject(group);
          const c = box.getCenter(new THREE.Vector3());
          group.position.set(group.position.x - c.x, group.position.y - c.y, group.position.z - c.z);
          if (s !== lastStyle) {
            lastStyle = s;
            const size = box.getSize(new THREE.Vector3());
            const span = Math.max(size.x, size.y, 30);
            camera.position.set(0, -span * 0.9, span * 1.5);
            controls.target.set(0, 0, 0);
            controls.minDistance = span * 0.6;
            controls.maxDistance = span * 4;
          }
        };
        api.current = { update };

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
    const run = () => api.current?.update(style, text, textColor, baseColor);
    run();
    el?.addEventListener("k3d-ready", run);
    return () => el?.removeEventListener("k3d-ready", run);
  }, [style, text, textColor, baseColor]);

  return (
    <div className="relative w-full aspect-square rounded-2xl border border-ink-800 bg-[radial-gradient(circle_at_50%_40%,#123a26,#06150e_70%)] overflow-hidden touch-none">
      <div ref={host} className="absolute inset-0" />
      {failed && <div className="absolute inset-0 grid place-items-center text-sm text-ink-400">הדפדפן לא תומך בתצוגת תלת-מימד</div>}
      <div className="pointer-events-none absolute bottom-3 inset-x-0 text-center text-[11px] text-ink-400">גוררים כדי לסובב · צובטים כדי להתקרב</div>
    </div>
  );
}
