import { useEffect, useRef } from "react";

export default function FlowField({
  count = 140,
  color = "255,255,255",     // main line colour (r,g,b)
  accent = "20,184,196",     // accent line colour
  bg = "0,0,0",              // MUST match page background (r,g,b)
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w, h, raf;
    let t = 0;
    const mouse = { x: -9999, y: -9999 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = `rgb(${bg})`;
      ctx.fillRect(0, 0, w, h);
    };

    const spawn = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      life: 0,
      max: 200 + Math.random() * 250,
      accent: Math.random() < 0.22,      // 22% lines accent colour
    });

    // wind direction (radians) at a point
    const field = (x, y) =>
      0.14 + Math.sin(x * 0.003 + t) * 1.2 + Math.cos(y * 0.004 - t * 0.7) * 1.2;

    resize();
    const parts = Array.from({ length: count }, spawn);

    const frame = () => {
      t += 0.003;

      // fade old pixels → creates tails
      ctx.fillStyle = `rgba(${bg},0.06)`;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const a = field(p.x, p.y);
        let vx = Math.cos(a) * 1.2;
        let vy = Math.sin(a) * 1.2;

        // push away from cursor
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 150 * 150) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 150) * 2.5;
          vx += (dx / d) * f;
          vy += (dy / d) * f;
        }

        const nx = p.x + vx;
        const ny = p.y + vy;
        const alpha = Math.sin((p.life / p.max) * Math.PI) * 0.8; // fade in & out

        ctx.strokeStyle = `rgba(${p.accent ? accent : color},${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        p.x = nx;
        p.y = ny;
        p.life++;
        if (p.life > p.max || nx < 0 || nx > w || ny < 0 || ny > h) parts[i] = spawn();
      }
      raf = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      for (let i = 0; i < 300; i++) frame0();       // one still picture, no loop
    } else {
      frame();
    }

    function frame0() {
      cancelAnimationFrame(raf);
      frame();
      cancelAnimationFrame(raf);
    }

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, [count, color, accent, bg]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}