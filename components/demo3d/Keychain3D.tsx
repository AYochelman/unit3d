"use client";
import { useEffect, useRef, useState } from "react";
import type { Font } from "opentype.js";
import { assetSrc } from "@/lib/assets";
import { buildKeychain } from "./keychain-geometry";

/**
 * A live 3D keychain: drag to turn it, pinch or scroll to zoom. Rebuilds as the
 * text or colours change. three.js and the font load only when this mounts, so
 * nothing on any other page gets heavier.
 */
export default function Keychain3D({ text, plateColor, textColor }: { text: string; plateColor: string; textColor: string }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ update: (t: string, p: string, c: string) => void } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      try {
        const [THREE, { OrbitControls }, opentype] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          import("opentype.js"),
        ]);
        const buf = await fetch(assetSrc("/fonts/heebo-800.ttf")).then((r) => r.arrayBuffer());
        const font = opentype.parse(buf) as Font;
        const el = host.current;
        if (disposed || !el) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 1, 1000);
        camera.position.set(0, -55, 95);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2a22, 1.6));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(40, -30, 80);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x9fffc8, 0.8);
        rim.position.set(-60, 50, 20);
        scene.add(rim);

        const plateMat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
        const textMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
        const group = new THREE.Group();
        scene.add(group);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.2;
        controls.minDistance = 50;
        controls.maxDistance = 220;
        controls.enablePan = false;
        // Stop the turntable once someone takes hold of it.
        controls.addEventListener("start", () => { controls.autoRotate = false; });

        const update = (t: string, p: string, c: string) => {
          group.children.forEach((m) => (m as InstanceType<typeof THREE.Mesh>).geometry.dispose());
          group.clear();
          const { plateGeo, textGeo } = buildKeychain(font, { text: t, width: 62, height: 24, plate: 3, raise: 1.4 });
          plateMat.color.set(p);
          textMat.color.set(c);
          group.add(new THREE.Mesh(plateGeo, plateMat));
          if (textGeo) group.add(new THREE.Mesh(textGeo, textMat));
        };
        api.current = { update };

        let raf = 0;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          controls.update();
          renderer.render(scene, camera);
        };
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
        // First build with whatever the props are by now.
        el.dispatchEvent(new Event("k3d-ready"));
      } catch {
        if (!disposed) setFailed(true);
      }
    })();
    return () => { disposed = true; cleanup(); api.current = null; };
  }, []);

  // Rebuild on every change, and once the scene above becomes ready.
  useEffect(() => {
    const el = host.current;
    const run = () => api.current?.update(text, plateColor, textColor);
    run();
    el?.addEventListener("k3d-ready", run);
    return () => el?.removeEventListener("k3d-ready", run);
  }, [text, plateColor, textColor]);

  return (
    <div className="relative w-full aspect-square rounded-2xl border border-ink-800 bg-[radial-gradient(circle_at_50%_40%,#123a26,#06150e_70%)] overflow-hidden touch-none">
      <div ref={host} className="absolute inset-0" />
      {failed && <div className="absolute inset-0 grid place-items-center text-sm text-ink-400">הדפדפן לא תומך בתצוגת תלת-מימד</div>}
      <div className="pointer-events-none absolute bottom-3 inset-x-0 text-center text-[11px] text-ink-400">גוררים כדי לסובב · צובטים כדי להתקרב</div>
    </div>
  );
}
