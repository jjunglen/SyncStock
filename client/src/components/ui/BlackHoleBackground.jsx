import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 180;

export default function BlackHoleBackground({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = canvas.width = rect.width * window.devicePixelRatio;
      height = canvas.height = rect.height * window.devicePixelRatio;
    };

    const spawnParticle = () => {
      const maxRadius = Math.min(width, height) * 0.55;
      return {
        angle: Math.random() * Math.PI * 2,
        radius: maxRadius * (0.6 + Math.random() * 0.4),
        speed: 0.002 + Math.random() * 0.003,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.2 + Math.random() * 0.5,
      };
    };

    const init = () => {
      resize();
      particles = Array.from({ length: PARTICLE_COUNT }, spawnParticle);
    };

    const minRadius = () => Math.min(width, height) * 0.06;

    const draw = () => {
      const cx = width / 2;
      const cy = height / 2;

      ctx.fillStyle = "rgba(10, 10, 10, 0.15)";
      ctx.fillRect(0, 0, width, height);

      for (const p of particles) {
        const angularVelocity = p.speed * ((minRadius() * 3) / p.radius);
        p.angle += angularVelocity;
        p.radius -= 0.15 * window.devicePixelRatio;

        if (p.radius < minRadius()) {
          Object.assign(p, spawnParticle());
          continue;
        }

        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius * 0.4;

        const fadeNearCenter = Math.min(
          1,
          (p.radius - minRadius()) / (minRadius() * 2),
        );
        ctx.beginPath();
        ctx.arc(x, y, p.size * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 250, 250, ${p.opacity * fadeNearCenter})`;
        ctx.fill();
      }

      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        minRadius() * 2.5,
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.08)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, minRadius() * 2.5, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(draw);
    };

    init();

    if (!prefersReducedMotion) {
      draw();
    } else {
      draw();
      cancelAnimationFrame(animationId);
    }

    const handleResize = () => init();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full touch-none ${className}`}
    />
  );
}
