import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/* 1. SHADERS (GLSL): programs that run on the GPU, once per pixel     */
/* ------------------------------------------------------------------ */

// Vertex shader: just places a rectangle that covers the whole canvas.
const VERT = `
attribute vec2 a_position;
varying vec2 vUv;
void main() {
  vUv = 0.5 * (a_position + 1.0);          // -1..1  ->  0..1
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fragment shader: decides the colour of EVERY pixel (this is the art).
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 vUv;
uniform float u_time;      // seconds
uniform float u_ratio;     // canvas width / height
uniform vec2  u_pointer;   // cursor, 0..1 (y up)
uniform float u_scroll;    // scroll progress
uniform vec3  u_color_a;
uniform vec3  u_color_b;
uniform vec3  u_tint;

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

// Stack 15 rotated sine layers -> organic "neural" veins
float neuroShape(vec2 uv, float t, float p) {
  vec2 sineAcc = vec2(0.0);
  vec2 res = vec2(0.0);
  float scale = 8.0;
  for (int j = 0; j < 15; j++) {
    uv = rotate(uv, 1.0);
    sineAcc = rotate(sineAcc, 1.0);
    vec2 layer = uv * scale + float(j) + sineAcc - t;
    sineAcc += sin(layer) + 2.4 * p;        // p = cursor influence
    res += (0.5 + 0.5 * cos(layer)) / scale;
    scale *= 1.2;
  }
  return res.x + res.y;
}

void main() {
  vec2 uv = 0.5 * vUv;
  uv.x *= u_ratio;

  // how close is this pixel to the cursor? (1 near, 0 far)
  vec2 pointer = vUv - u_pointer;
  pointer.x *= u_ratio;
  float p = clamp(length(pointer), 0.0, 1.0);
  p = 0.5 * pow(1.0 - p, 2.0);

  float noise = neuroShape(uv, u_time, p);
  noise = 1.2 * pow(noise, 3.0);
  noise += pow(noise, 10.0);
  noise = max(0.0, noise - 0.5);
  noise *= (1.0 - length(vUv - 0.5));       // fade toward the edges

  vec3 color = mix(u_color_a, u_color_b, 0.32 + 0.16 * sin(2.0 * u_scroll + 1.2));
  color += u_tint * sin(2.0 * u_scroll + 1.5);
  color *= noise;
  gl_FragColor = vec4(color, noise);
}
`;

/* ------------------------------------------------------------------ */
/* 2. HELPER: compile + link the two shaders into one GPU program      */
/* ------------------------------------------------------------------ */

function createProgram(gl, vertSrc, fragSrc) {
  const compile = (type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = compile(gl.VERTEX_SHADER, vertSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return null;
  }
  return { program, vs, fs };
}

/* ------------------------------------------------------------------ */
/* 3. REACT COMPONENT                                                  */
/* ------------------------------------------------------------------ */

export default function NeuralVortex({
  className = "pointer-events-none absolute inset-0 h-full w-full",
  quality = 0.75,                    // 0.25 - 1: render resolution (lower = faster)
  speed = 1,                         // animation speed
  interactive = true,                // react to cursor
  colorA = [0.5, 0.15, 0.65],        // purple (r,g,b 0..1)
  colorB = [0.02, 0.7, 0.9],         // cyan
  tint = [0.15, 0.0, 0.6],           // scroll-based colour shift (use [0,0,0] to disable)
}) {
  const canvasRef = useRef(null);

  // Props that may change WITHOUT restarting WebGL live here.
  // The render loop reads them every frame.
  const live = useRef({});
  live.current = { speed, colorA, colorB, tint };

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!gl) return; // WebGL not supported -> simply show nothing

    const built = createProgram(gl, VERT, FRAG);
    if (!built) return;
    const { program, vs, fs } = built;
    gl.useProgram(program);

    // A rectangle made of 2 triangles covering the full canvas
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPosition = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // "Uniforms" = values we send from JS to the shader
    const u = {};
    ["u_time", "u_ratio", "u_pointer", "u_scroll", "u_color_a", "u_color_b", "u_tint"].forEach(
      (name) => (u[name] = gl.getUniformLocation(program, name))
    );

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const startTime = performance.now();
    let raf = 0;
    let visible = true;

    const draw = (seconds) => {
      // ease the pointer toward its target (smooth follow)
      pointer.x += (pointer.tx - pointer.x) * 0.2;
      pointer.y += (pointer.ty - pointer.y) * 0.2;

      const { speed, colorA, colorB, tint } = live.current;
      gl.uniform1f(u.u_time, seconds * speed);
      gl.uniform2f(u.u_pointer, pointer.x, pointer.y);
      gl.uniform1f(u.u_scroll, window.scrollY / (2 * window.innerHeight));
      gl.uniform3fv(u.u_color_a, colorA);
      gl.uniform3fv(u.u_color_b, colorB);
      gl.uniform3fv(u.u_tint, tint);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const loop = (now) => {
      raf = 0;
      if (!visible) return; // offscreen -> stop working
      draw((now - startTime) / 1000);
      raf = requestAnimationFrame(loop);
    };

    // Size the drawing buffer to the canvas' CSS size (not the window)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform1f(u.u_ratio, w / h);
      if (reduceMotion) draw(5); // static frame must be redrawn after resize
    };

    const onPointerMove = (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width;
      pointer.ty = 1 - (e.clientY - r.top) / r.height;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Pause the animation when the canvas is scrolled out of view
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !reduceMotion) raf = requestAnimationFrame(loop);
    });
    intersectionObserver.observe(canvas);

    if (interactive && !reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    resize();
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // NOTE: we do NOT call loseContext(); React StrictMode re-runs this
      // effect on the same canvas in dev and a lost context would stay dead.
    };
  }, [quality, interactive]);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}