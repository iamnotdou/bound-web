"use client";

import { clsx } from "clsx";
import { useEffect, useRef } from "react";

/**
 * A slow, grainy WebGL gradient: a navy arch with an ultramarine rim melting
 * into lavender. `default` hangs from the top (gradient heroes), `flip`
 * rises from the bottom (the footer), `band` runs across the middle and
 * fades to the page at both edges.
 *
 * Always put the matching CSS fallback behind it (`.arch-gradient`,
 * `.arch-gradient-flip`, `.band-gradient`), or use `GradientBackground`,
 * which renders both. The canvas fades in only once WebGL is running, so
 * without a GPU the fallback stays. It bulges away from a mouse pointer,
 * draws at about 30 fps only while on screen, and for reduced motion it
 * renders one still frame with no pointer response.
 */
export type GradientVariant = "default" | "flip" | "band";

const vertex = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `
  precision highp float;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uFlip;
  uniform float uBand;
  uniform vec2 uMouse;
  uniform float uPush;
  uniform vec3 uInk;
  uniform vec3 uDeep;
  uniform vec3 uPrimary;
  uniform vec3 uLavender;
  uniform vec3 uHaze;
  uniform vec3 uGround;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  vec2 push(vec2 uv) {
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 delta = (uv - uMouse) * aspect;
    float falloff = exp(-dot(delta, delta) * 6.0);
    return uv - delta / aspect * falloff * 0.5 * uPush;
  }

  vec3 bandColor(vec2 uv, float t) {
    vec2 q = vec2(fbm(uv * vec2(2.0, 1.5) + t), fbm(uv * vec2(2.0, 1.5) - t + 3.7));
    vec2 p = uv + (q - 0.5) * vec2(0.12, 0.3);
    float line = 0.5 + (0.5 - p.x) * 0.5 + sin(p.x * 3.2 + t * 3.0) * 0.06 + sin(p.x * 7.0 - t * 2.0) * 0.025;
    float thickness = 0.36 + sin(p.x * 2.4 - t * 2.5) * 0.1;
    float d = abs(p.y - line) / thickness;

    vec3 color = uInk;
    color = mix(color, uDeep, smoothstep(0.12, 0.3, d));
    color = mix(color, uPrimary, smoothstep(0.3, 0.48, d));
    color = mix(color, uLavender, smoothstep(0.48, 0.7, d));
    color = mix(color, uGround, smoothstep(0.7, 1.0, d));
    float edge = smoothstep(0.7, 1.0, abs(uv.y - 0.5) * 2.0);
    return mix(color, uGround, edge);
  }

  void main() {
    vec2 screen = gl_FragCoord.xy / uResolution;
    vec2 uv = push(screen);
    if (uBand > 0.5) {
      vec3 color = bandColor(uv, uTime * 0.04);
      float fade = 1.0 - smoothstep(0.6, 1.0, abs(screen.y - 0.5) * 2.0);
      gl_FragColor = vec4(color, fade);
      return;
    }
    uv.y = mix(1.0 - uv.y, uv.y, uFlip);
    float t = uTime * 0.04;

    vec2 q = vec2(fbm(uv * 1.5 + t), fbm(uv * 1.5 - t + 3.7));
    vec2 p = uv + (q - 0.5) * 0.18;

    vec2 center = vec2(0.65 + sin(t * 2.0) * 0.05, 0.0);
    float d = length((p - center) / vec2(1.5, 0.85));

    vec3 ground = mix(uHaze, uGround, uv.y);
    vec3 color = uInk;
    color = mix(color, uDeep, smoothstep(0.38, 0.52, d));
    color = mix(color, uPrimary, smoothstep(0.52, 0.64, d));
    color = mix(color, uLavender, smoothstep(0.64, 0.8, d));
    color = mix(color, ground, smoothstep(0.8, 0.98, d));

    float glow = 1.0 - smoothstep(0.0, 1.0, length((p - vec2(0.0, 0.55)) / vec2(0.9, 0.5)));
    color = mix(color, uPrimary, glow * 0.35 * smoothstep(0.4, 0.7, d));

    float fade = 1.0 - smoothstep(0.8, 1.0, mix(1.0 - screen.y, screen.y, uFlip));
    color = mix(uGround, color, fade);

    gl_FragColor = vec4(color, fade);
  }
`;

// Second pass at full resolution: scale the soft gradient up, add film grain
const finish = `
  precision highp float;
  uniform sampler2D uImage;
  uniform vec2 uResolution;
  uniform float uSeed;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  void main() {
    vec4 color = texture2D(uImage, gl_FragCoord.xy / uResolution);
    float grain = hash(gl_FragCoord.xy + uSeed) - 0.5;
    gl_FragColor = vec4(color.rgb + grain * 0.05 * color.a, 1.0);
  }
`;

/** Resolve any CSS colour (oklch included) to normalised sRGB. */
function toRgb(
  probe: CanvasRenderingContext2D,
  color: string,
): [number, number, number] {
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function token(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function link(gl: WebGLRenderingContext, source: string) {
  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, source);
  if (!program || !vs || !fs) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "position");
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

const fract = (value: number) => value - Math.floor(value);

/** Starts the shader on one canvas; returns a function that stops it. */
function start(canvas: HTMLCanvasElement, variant: GradientVariant) {
  const noop = () => {};
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  // Without a real GPU the CSS gradient stays instead
  const gl = canvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl || gl.isContextLost()) return noop;
  const probe = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  if (!probe) return noop;

  const program = link(gl, fragment);
  const post = link(gl, finish);
  if (!program || !post) return noop;

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // The gradient renders into a small texture that the second pass scales up
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const buffer = gl.createFramebuffer();
  const small = { width: 1, height: 1 };

  gl.useProgram(post);
  gl.uniform1i(gl.getUniformLocation(post, "uImage"), 0);
  const postResolution = gl.getUniformLocation(post, "uResolution");
  const seed = gl.getUniformLocation(post, "uSeed");

  gl.useProgram(program);
  const colors = {
    uInk: token("--inverse", "oklch(16% 0.05 270)"),
    uDeep: "oklch(30% 0.14 268)",
    uPrimary: token("--primary", "oklch(52% 0.22 268)"),
    uLavender: "oklch(78% 0.1 275)",
    uHaze: "oklch(92% 0.04 275)",
    uGround: token("--background", "oklch(98.8% 0.006 275)"),
  };
  for (const [name, value] of Object.entries(colors)) {
    gl.uniform3fv(gl.getUniformLocation(program, name), toRgb(probe, value));
  }
  gl.uniform1f(
    gl.getUniformLocation(program, "uFlip"),
    variant === "flip" ? 1 : 0,
  );
  gl.uniform1f(
    gl.getUniformLocation(program, "uBand"),
    variant === "band" ? 1 : 0,
  );
  const resolution = gl.getUniformLocation(program, "uResolution");
  const mouseUniform = gl.getUniformLocation(program, "uMouse");
  const pushUniform = gl.getUniformLocation(program, "uPush");
  const time = gl.getUniformLocation(program, "uTime");

  // The pointer in the canvas's own 0 to 1 space, eased towards its target
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, push: 0, target: 0 };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const rect = canvas.getBoundingClientRect();
    mouse.tx = (event.clientX - rect.left) / rect.width;
    mouse.ty = 1 - (event.clientY - rect.top) / rect.height;
    mouse.target =
      mouse.tx >= 0 && mouse.tx <= 1 && mouse.ty >= 0 && mouse.ty <= 1 ? 1 : 0;
  };
  const onLeave = () => (mouse.target = 0);
  if (!reduceMotion) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }

  const begin = performance.now();
  let frame = 0;
  let last = 0;
  let running = false;

  function draw(now: number) {
    if (!gl || !program || !post) return;
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    mouse.push += (mouse.target - mouse.push) * 0.05;
    gl.uniform2f(mouseUniform, mouse.x, mouse.y);
    gl.uniform1f(pushUniform, mouse.push);
    const seconds = reduceMotion ? 0 : (now - begin) / 1000;
    gl.uniform1f(time, seconds);
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.viewport(0, 0, small.width, small.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(post);
    gl.uniform1f(seed, fract(seconds) * 100);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(program);
  }

  function resize() {
    if (!gl || !program || !post) return;
    // The gradient is soft: half resolution (at most about 400k pixels)
    const area = Math.max(canvas.clientWidth * canvas.clientHeight, 1);
    const ratio = Math.min(0.5, Math.sqrt(400000 / area));
    small.width = Math.max(Math.round(canvas.clientWidth * ratio), 1);
    small.height = Math.max(Math.round(canvas.clientHeight * ratio), 1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      small.width,
      small.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    gl.uniform2f(resolution, small.width, small.height);

    // The grain pass runs at screen resolution so the grain stays fine
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    canvas.width = Math.max(Math.round(canvas.clientWidth * dpr), 1);
    canvas.height = Math.max(Math.round(canvas.clientHeight * dpr), 1);
    gl.useProgram(post);
    gl.uniform2f(postResolution, canvas.width, canvas.height);
    gl.useProgram(program);
    draw(performance.now());
  }

  // About 30 frames a second is plenty for a slow drift
  function loop(now: number) {
    frame = requestAnimationFrame(loop);
    if (now - last < 33) return;
    last = now;
    draw(now);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  canvas.dataset.ready = "true";

  // Only animate while on screen
  let visibility: IntersectionObserver | undefined;
  if (!reduceMotion) {
    visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) frame = requestAnimationFrame(loop);
      if (!entry.isIntersecting) cancelAnimationFrame(frame);
      running = entry.isIntersecting;
    });
    visibility.observe(canvas);
  }

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibility?.disconnect();
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
  };
}

export function GradientShader({
  variant = "default",
  className,
}: {
  variant?: GradientVariant;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let stop: (() => void) | undefined;
    // The CSS gradient paints first; the canvas starts once the page is
    // idle and the canvas is near the viewport
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        near.disconnect();
        stop = start(canvas, variant);
      },
      { rootMargin: "200px" },
    );
    const boot = () => near.observe(canvas);
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if ("requestIdleCallback" in window) {
      idle = window.requestIdleCallback(boot, { timeout: 2000 });
    } else {
      timer = setTimeout(boot, 200);
    }
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
      near.disconnect();
      stop?.();
    };
  }, [variant]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={clsx(
        "opacity-0 transition-opacity duration-1000 data-ready:opacity-100 motion-reduce:transition-none",
        className,
      )}
    />
  );
}

const fallbacks: Record<GradientVariant, string> = {
  default: "arch-gradient",
  flip: "arch-gradient-flip",
  band: "band-gradient",
};

/**
 * The shader with its CSS fallback behind it, both filling the nearest
 * positioned ancestor (`absolute inset-0`). Decorative: aria-hidden.
 */
export function GradientBackground({
  variant = "default",
  className,
}: {
  variant?: GradientVariant;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={clsx("absolute inset-0", className)}>
      <div className={clsx("absolute inset-0", fallbacks[variant])} />
      <GradientShader
        variant={variant}
        className="absolute inset-0 size-full"
      />
    </div>
  );
}
