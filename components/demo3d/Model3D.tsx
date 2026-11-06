"use client";
import { useEffect, useRef, useState } from "react";
import { assetSrc } from "@/lib/assets";

/**
 * A real print file in 3D, one colour per filament, each colour changeable.
 * Loads what scripts/3mf-to-web.py makes from a Bambu .3mf: a JSON listing the
 * parts and the colour each prints in, and a .bin with their triangles.
 */
export type ModelPart = { filament: number; colour: string; vertices: number; triangles: number; v: number; i: number };
export type ModelInfo = { size: [number, number, number]; parts: ModelPart[] };

export default function Model3D({ src, colours, onInfo }: { src: string; colours: Record<number, string>; onInfo?: (m: ModelInfo) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const mats = useRef<Map<number, { color: { set: (c: string) => void } }>>(new Map());
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const coloursRef = useRef(colours);
  const onInfoRef = useRef(onInfo);
  useEffect(() => { coloursRef.current = colours; onInfoRef.current = onInfo; });

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    // A new model is a new component (the parent keys it by src), so this
    // starts in "loading" without being told.
    (async () => {
      try {
        const [THREE, { OrbitControls }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/controls/OrbitControls.js"),
        ]);
        const [info, bin] = await Promise.all([
          fetch(assetSrc(`${src}.json`)).then((r) => r.json() as Promise<ModelInfo>),
          fetch(assetSrc(`${src}.bin`)).then((r) => r.arrayBuffer()),
        ]);
        const el = host.current;
        if (disposed || !el) return;
        onInfoRef.current?.(info);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        renderer.setSize(el.clientWidth, el.clientHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const span = Math.max(info.size[0], info.size[1]);
        const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 1, 5000);
        camera.position.set(0, -span * 0.95, span * 1.55);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2a22, 1.6));
        const key = new THREE.DirectionalLight(0xffffff, 2.2);
        key.position.set(span, -span, span * 1.6);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x9fffc8, 0.7);
        rim.position.set(-span, span, span * 0.4);
        scene.add(rim);

        const group = new THREE.Group();
        mats.current.clear();
        for (const p of info.parts) {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(bin, p.v, p.vertices * 3), 3));
          geo.setIndex(new THREE.BufferAttribute(new Uint32Array(bin, p.i, p.triangles * 3), 1));
          geo.computeVertexNormals();
          // Flat: a print has hard edges, and smoothing across them looks like wax.
          const mat = new THREE.MeshStandardMaterial({ color: coloursRef.current[p.filament] ?? p.colour, roughness: 0.55, metalness: 0.05, flatShading: true });
          mats.current.set(p.filament, mat);
          group.add(new THREE.Mesh(geo, mat));
        }
        group.position.z = -info.size[2] / 2;
        scene.add(group);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.2;
        controls.enablePan = false;
        controls.minDistance = span * 0.7;
        controls.maxDistance = span * 4;
        controls.addEventListener("start", () => { controls.autoRotate = false; });

        let raf = 0;
        const loop = () => { raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); };
        loop();
        const ro = new ResizeObserver(() => {
          renderer.setSize(el.clientWidth, el.clientHeight);
          camera.aspect = el.clientWidth / el.clientHeight;
          camera.updateProjectionMatrix();
        });
        ro.observe(el);
        setState("ready");

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          controls.dispose();
          group.children.forEach((m) => (m as InstanceType<typeof THREE.Mesh>).geometry.dispose());
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!disposed) setState("failed");
      }
    })();
    return () => { disposed = true; cleanup(); };
  }, [src]);

  useEffect(() => {
    for (const [f, m] of mats.current) if (colours[f]) m.color.set(colours[f]);
  }, [colours]);

  return (
    <div className="relative w-full aspect-square rounded-2xl border border-ink-800 bg-[radial-gradient(circle_at_50%_40%,#123a26,#06150e_70%)] overflow-hidden touch-none">
      <div ref={host} className="absolute inset-0" />
      {state === "loading" && <div className="absolute inset-0 grid place-items-center text-sm text-ink-400">טוען דגם…</div>}
      {state === "failed" && <div className="absolute inset-0 grid place-items-center text-sm text-ink-400">לא הצלחנו לטעון את הדגם</div>}
      <div className="pointer-events-none absolute bottom-3 inset-x-0 text-center text-[11px] text-ink-400">גוררים כדי לסובב · צובטים כדי להתקרב</div>
    </div>
  );
}
