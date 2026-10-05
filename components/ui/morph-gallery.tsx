"use client"

import * as React from "react"

/**
 * Morph Gallery — a photo gallery whose slides dissolve into each other
 * through noise instead of cutting or cross-fading.
 *
 * The transition is one full-screen shader pass over two textures. An fbm
 * noise field gives every pixel a threshold, and the progress value sweeps
 * past those thresholds, so the outgoing frame tears away in drifting tatters
 * rather than fading uniformly. The threshold is biased by the luminance of
 * the *incoming* frame, which makes its bright areas burn through first.
 *
 * Self-contained: raw WebGL, React is the only import. The canvas sizes itself
 * from its own box.
 *
 * Textures need CORS. An image served without `Access-Control-Allow-Origin`
 * cannot be uploaded to WebGL at all, so the component detects that and falls
 * back to a plain DOM cross-fade. The site's own catalogue photos are served
 * from its own domain, so they morph.
 *
 * Changes from the pasted 21st.dev component, for this site: Hebrew labels and
 * right-to-left controls (the "previous" arrow sits on the right, ← is "next",
 * swipes follow the reading direction); the site's ink palette instead of
 * black and white; `tuning` is written in an effect rather than during render;
 * the source-list key uses "\n" (the paste had a literal line break inside
 * the string, which does not compile); and the canvas is redrawn only while a
 * dissolve runs or something changed, and not at all off screen — the
 * original drew every frame forever, which on a page that also plays a video
 * is a GPU kept busy for a picture that is standing still.
 */

export type MorphItem = {
  /** Full-size image. Must be served with CORS headers to be morphed. */
  src: string
  /** Thumbnail for the strip. Falls back to `src`. */
  thumb?: string
  alt?: string
}

export type MorphGalleryProps = {
  items: MorphItem[]
  /** **Must be a definite length.** The canvas fills this box. */
  height?: string
  /** Milliseconds of dissolve. */
  duration?: number
  /** fbm frequency. Higher tears into finer shreds. */
  noiseScale?: number
  /** Width of the dissolve front, in threshold units. 0 is a hard edge. */
  edge?: number
  /** How far the frames slide against each other while dissolving. */
  drift?: number
  /** Wrap past the ends. */
  loop?: boolean
  /** Milliseconds between automatic advances. 0 (default) is off. */
  autoplay?: number
  arrows?: boolean
  thumbnails?: boolean
  /** Controlled index. Omit for uncontrolled. */
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number) => void
  className?: string
  /** Shown over the bottom of the frame, above the thumbnails. */
  caption?: (item: MorphItem, index: number) => React.ReactNode
  /** A click (not a swipe) on the picture itself. */
  onSlideClick?: (index: number) => void
}

/** Wrap past the ends when looping, clamp at them when not. */
export const wrapIndex = (i: number, n: number, loop: boolean): number => {
  if (n <= 0) return 0
  return loop ? ((i % n) + n) % n : Math.min(Math.max(i, 0), n - 1)
}

/** Quintic in-out: the dissolve starts and ends still, and hurries the middle. */
export const easeInOutQuint = (t: number): number => {
  const x = Math.min(Math.max(t, 0), 1)
  return x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2
}

const VERT = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform sampler2D u_from;
uniform sampler2D u_to;
uniform float u_progress;
uniform vec2 u_resolution;
uniform float u_fromAspect;
uniform float u_toAspect;
uniform float u_scale;
uniform float u_direction;
uniform float u_edge;
uniform float u_drift;

varying vec2 v_uv;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
   -0.577350269189626,
    0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(
    permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
  );
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 v) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(v);
    v *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Reflect UVs pushed past the edge by the drift, instead of smearing the last
// row (CLAMP_TO_EDGE). Done here because MIRRORED_REPEAT is illegal on the
// non-power-of-two textures photos produce.
vec2 mirror(vec2 uv) {
  return 1.0 - abs(1.0 - mod(uv, 2.0));
}

vec2 coverUV(vec2 uv, float imgAspect) {
  float canvasAspect = u_resolution.x / u_resolution.y;
  vec2 scale = (canvasAspect > imgAspect)
    ? vec2(1.0, imgAspect / canvasAspect)
    : vec2(canvasAspect / imgAspect, 1.0);
  return mirror((uv - 0.5) * scale + 0.5);
}

void main() {
  float adjusted = u_progress * (1.0 + 2.0 * u_edge) - u_edge;

  float noise = fbm(v_uv * u_scale + vec2(0.0, u_progress * u_direction)) * 0.5 + 0.5;
  noise = smoothstep(
    0.0,
    2.0,
    length(texture2D(u_to, coverUV(v_uv, u_toAspect)).rgb) + noise
  );

  float mixFactor = 1.0 - smoothstep(adjusted - u_edge, adjusted + u_edge, noise);

  vec2 fromUV = coverUV(
    v_uv + vec2(0.0, noise * u_progress * u_drift * u_direction),
    u_fromAspect
  );
  vec2 toUV = coverUV(
    v_uv + vec2(0.0, noise * (1.0 - u_progress) * -0.5 * u_drift * u_direction),
    u_toAspect
  );

  gl_FragColor = mix(texture2D(u_from, fromUV), texture2D(u_to, toUV), mixFactor);
}
`

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error("could not create shader")
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error("shader compile failed: " + log)
  }
  return shader
}

const link = (gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) => {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc)
  const program = gl.createProgram()
  if (!program) throw new Error("could not create program")
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  gl.deleteShader(vert)
  gl.deleteShader(frag)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    throw new Error("program link failed: " + log)
  }
  return program
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("could not load " + src))
    img.src = src
  })

const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const getReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

export default function MorphGallery({
  items,
  height = "100svh",
  duration = 1500,
  noiseScale = 3.5,
  edge = 0.15,
  drift = 0.5,
  loop = true,
  autoplay = 0,
  arrows = true,
  thumbnails = true,
  index,
  defaultIndex = 0,
  onIndexChange,
  className = "",
  caption,
  onSlideClick,
}: MorphGalleryProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [uncontrolled, setUncontrolled] = React.useState(() =>
    wrapIndex(defaultIndex, items.length, loop),
  )
  const active = index === undefined ? uncontrolled : wrapIndex(index, items.length, loop)

  const [failed, setFailed] = React.useState(false)
  const [ready, setReady] = React.useState(false)
  const [generation, setGeneration] = React.useState(0)
  const reduced = React.useSyncExternalStore(subscribeReduced, getReduced, () => false)
  const [paused, setPaused] = React.useState(false)

  const go = React.useCallback(
    (next: number) => {
      const wrapped = wrapIndex(next, items.length, loop)
      if (index === undefined) setUncontrolled(wrapped)
      onIndexChange?.(wrapped)
    },
    [index, items.length, loop, onIndexChange],
  )

  // The render loop reads live values through refs, so retuning the dissolve
  // never tears down the GL context.
  const tuning = React.useRef({ duration, noiseScale, edge, drift, reduced })
  React.useEffect(() => {
    tuning.current = { duration, noiseScale, edge, drift, reduced }
  }, [duration, noiseScale, edge, drift, reduced])

  // A transition is requested by index changes and consumed by the loop.
  const request = React.useRef<{ from: number; to: number } | null>(null)
  const previous = React.useRef(active)
  React.useEffect(() => {
    if (previous.current === active) return
    request.current = { from: previous.current, to: active }
    previous.current = active
  }, [active])

  const sources = items.map((i) => i.src).join("\n")
  // Read once to seed the first frame; later changes arrive through `request`.
  const seed = React.useRef(active)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || items.length === 0) return
    let disposed = false
    const fail = () => {
      if (!disposed) setFailed(true)
    }

    const gl =
      canvas.getContext("webgl", { alpha: false, antialias: false }) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
    if (!gl) {
      queueMicrotask(fail)
      return
    }

    let program: WebGLProgram | null = null
    let buffer: WebGLBuffer | null = null
    const textures: (WebGLTexture | null)[] = items.map(() => null)
    const aspects: number[] = items.map(() => 1)
    let raf = 0

    let from = seed.current
    let to = seed.current
    let progress = 1
    let startedAt = 0
    let direction = 1
    // Something new to show (a texture arrived, the size changed) while no
    // dissolve is running.
    let dirty = true
    let visible = true
    const seen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      dirty = true
    })
    seen.observe(canvas)

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
    }
    const onRestored = () => setGeneration((g) => g + 1)
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w === 0 || h === 0 || (canvas.width === w && canvas.height === h)) return
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      dirty = true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const uniforms: Record<string, WebGLUniformLocation | null> = {}
    const pick = (i: number) => textures[i] ?? textures.find((t) => t) ?? null

    const draw = () => {
      if (disposed) return
      const t = tuning.current

      const pending = request.current
      if (pending) {
        request.current = null
        if (pending.from !== pending.to) {
          from = pending.from
          to = pending.to
          progress = 0
          startedAt = performance.now()
          const n = items.length
          const forward = loop
            ? ((pending.to - pending.from + n) % n) * 2 <= n
            : pending.to > pending.from
          direction = forward ? 1 : -1
        }
      }

      if (!visible || (progress >= 1 && !dirty)) return
      dirty = false

      if (progress < 1) {
        const span = t.reduced ? 0 : Math.max(t.duration, 1)
        const elapsed = performance.now() - startedAt
        progress = span === 0 ? 1 : easeInOutQuint(Math.min(elapsed / span, 1))
      }

      const fromTex = pick(from)
      const toTex = pick(to)
      if (!fromTex || !toTex) return

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, fromTex)
      gl.uniform1i(uniforms.from, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, toTex)
      gl.uniform1i(uniforms.to, 1)

      gl.uniform1f(uniforms.progress, progress)
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
      gl.uniform1f(uniforms.fromAspect, aspects[from] ?? 1)
      gl.uniform1f(uniforms.toAspect, aspects[to] ?? 1)
      gl.uniform1f(uniforms.scale, t.noiseScale)
      gl.uniform1f(uniforms.direction, direction)
      gl.uniform1f(uniforms.edge, Math.max(t.edge, 0.001))
      gl.uniform1f(uniforms.drift, t.drift)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const frame = () => {
      draw()
      raf = requestAnimationFrame(frame)
    }

    const start = async () => {
      try {
        program = link(gl, VERT, FRAG)
        gl.useProgram(program)

        buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
        const loc = gl.getAttribLocation(program, "a_position")
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

        for (const name of ["from", "to", "progress", "resolution", "fromAspect", "toAspect", "scale", "direction", "edge", "drift"]) {
          uniforms[name] = gl.getUniformLocation(program, "u_" + name)
        }

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

        // Each image is uploaded the moment it arrives and the loop starts on
        // the first one, instead of a black box until the slowest is in.
        let running = false
        let refused = 0
        await Promise.all(
          items.map((item, i) =>
            loadImage(item.src).then(
              (img) => {
                if (disposed) return
                const tex = gl.createTexture()
                gl.bindTexture(gl.TEXTURE_2D, tex)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
                textures[i] = tex
                aspects[i] = img.naturalWidth / Math.max(img.naturalHeight, 1)
                dirty = true
                if (!running) {
                  running = true
                  resize()
                  setReady(true)
                  raf = requestAnimationFrame(frame)
                }
              },
              () => {
                refused += 1
                if (refused === items.length) fail()
              },
            ),
          ),
        )
      } catch {
        fail()
      }
    }
    void start()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      seen.disconnect()
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      for (const tex of textures) if (tex) gl.deleteTexture(tex)
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      textures.fill(null)
    }
    // `items` is represented by `sources`; rebuilding on it is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, generation, items.length, loop])

  // ---- autoplay ------------------------------------------------------------
  React.useEffect(() => {
    if (!autoplay || reduced || paused || items.length < 2) return
    const id = window.setInterval(() => go(active + 1), Math.max(autoplay, 600))
    return () => window.clearInterval(id)
  }, [autoplay, reduced, paused, active, go, items.length])

  React.useEffect(() => {
    const sync = () => setPaused(document.hidden)
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [])

  // ---- pointer and keyboard (right to left) --------------------------------
  const swipe = React.useRef<number | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = e.clientX
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const startX = swipe.current
    swipe.current = null
    if (startX === null) return
    const dx = e.clientX - startX
    if (Math.abs(dx) < 8 && onSlideClick && !(e.target as HTMLElement).closest("button, a")) {
      onSlideClick(active)
      return
    }
    // Hebrew reads right to left, so the next picture comes in from the left:
    // dragging rightwards pulls it in.
    if (Math.abs(dx) > 48) go(active + (dx > 0 ? 1 : -1))
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      go(active + 1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      go(active - 1)
    }
  }

  const atStart = !loop && active === 0
  const atEnd = !loop && active === items.length - 1
  const current = items[active]

  const arrowClass =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center " +
    "rounded-full border border-white/20 bg-ink-950/50 text-white backdrop-blur-md " +
    "transition-colors hover:bg-ink-950/75 focus-visible:outline focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-flame " +
    "disabled:pointer-events-none disabled:opacity-25"

  return (
    <section
      className={"relative w-full overflow-hidden bg-ink-950 " + className}
      style={{ height }}
      role="region"
      aria-roledescription="קרוסלה"
      aria-label="גלריית תמונות"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {failed ? (
        items.map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.src}
            src={item.src}
            alt={item.alt ?? ""}
            className="absolute inset-0 block h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none"
            style={{ maxWidth: "none", opacity: i === active ? 1 : 0 }}
            aria-hidden={i !== active}
          />
        ))
      ) : (
        <canvas
          ref={canvasRef}
          className={"absolute inset-0 block h-full w-full" + (onSlideClick ? " cursor-pointer" : "")}
          style={{ opacity: ready ? 1 : 0, transition: "opacity 400ms ease" }}
          aria-hidden="true"
        />
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-56 bg-gradient-to-b from-transparent to-ink-950/80"
        aria-hidden="true"
      />

      {caption && current && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-10 px-6 text-center max-sm:bottom-8">
          {caption(current, active)}
        </div>
      )}

      {arrows && items.length > 1 && (
        <>
          <button
            type="button"
            className={arrowClass + " right-4 sm:right-8"}
            onClick={() => go(active - 1)}
            disabled={atStart}
            aria-label="התמונה הקודמת"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            type="button"
            className={arrowClass + " left-4 sm:left-8"}
            onClick={() => go(active + 1)}
            disabled={atEnd}
            aria-label="התמונה הבאה"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </>
      )}

      {thumbnails && items.length > 1 && (
        <ul
          className={
            "absolute inset-x-0 bottom-8 z-10 mx-auto flex w-max max-w-[calc(100%-2rem)] gap-2 " +
            "list-none overflow-x-auto scroll-smooth p-0 pb-2.5 " +
            "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-track]:bg-white/10 " +
            "[&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-white/30 " +
            "max-sm:hidden"
          }
        >
          {items.map((item, i) => (
            <li key={item.src} className="shrink-0 list-none">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === active}
                aria-label={item.alt ? "הצג: " + item.alt : "הצג תמונה " + (i + 1)}
                className={
                  "block cursor-pointer overflow-hidden rounded-lg border-2 bg-transparent p-0 transition " +
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame " +
                  (i === active ? "border-flame opacity-100" : "border-transparent opacity-55 hover:opacity-85")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumb ?? item.src}
                  alt=""
                  width={80}
                  height={50}
                  loading="lazy"
                  decoding="async"
                  className="block object-cover"
                  style={{ maxWidth: "none", width: 80, height: 50 }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <span className="sr-only" aria-live="polite">
        {current ? current.alt ?? "תמונה " + (active + 1) : ""}
        {" — "}
        {active + 1} מתוך {items.length}
      </span>
    </section>
  )
}
