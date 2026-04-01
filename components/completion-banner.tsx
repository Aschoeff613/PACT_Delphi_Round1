"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  radius: number;
  gravity: number;
};

type Burst = {
  x: number;
  y: number;
  particles: Particle[];
};

const COLORS = [
  "#f87171", "#fb923c", "#facc15", "#4ade80",
  "#60a5fa", "#a78bfa", "#f472b6", "#ffffff",
  "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createBurst(x: number, y: number): Burst {
  const count = Math.floor(randomBetween(60, 100));
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + randomBetween(-0.2, 0.2);
    const speed = randomBetween(2, 7);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      radius: randomBetween(2, 4),
      gravity: randomBetween(0.06, 0.12),
    });
  }
  return { x, y, particles };
}

export function CompletionBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstsRef = useRef<Burst[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Schedule firework bursts
    const launchSchedule = [
      { delay: 300,  x: 0.15, y: 0.35 },
      { delay: 600,  x: 0.85, y: 0.30 },
      { delay: 950,  x: 0.50, y: 0.20 },
      { delay: 1300, x: 0.25, y: 0.45 },
      { delay: 1600, x: 0.75, y: 0.40 },
      { delay: 2000, x: 0.40, y: 0.25 },
      { delay: 2300, x: 0.65, y: 0.35 },
      { delay: 2700, x: 0.20, y: 0.30 },
      { delay: 3000, x: 0.80, y: 0.25 },
      { delay: 3400, x: 0.50, y: 0.40 },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const { delay, x, y } of launchSchedule) {
      const t = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          burstsRef.current.push(createBurst(canvas.width * x, canvas.height * y));
        }
      }, delay);
      timers.push(t);
    }

    function tick() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      burstsRef.current = burstsRef.current.filter((burst) => burst.particles.some((p) => p.alpha > 0.02));

      for (const burst of burstsRef.current) {
        for (const p of burst.particles) {
          if (p.alpha <= 0.02) continue;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= 0.98;
          p.alpha -= 0.016;
          p.radius *= 0.995;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      timers.forEach(clearTimeout);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="completion-celebration">
      <canvas ref={canvasRef} className="fireworks-canvas" />
      <div className="completion-celebration-content">
        <div className="completion-celebration-emoji">🎉</div>
        <h2>Thank you for completing your ratings!</h2>
        <p>Your expert input across all three sections has been saved. We deeply appreciate your time and clinical expertise in helping build PACTBench.</p>
        <p className="completion-sub">If you have additional thoughts, you can still revisit any section at any time.</p>
      </div>
    </div>
  );
}
