import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SparklesProps {
  id?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  angle: number;
  spinSpeed: number;
  spinDirection: 1 | -1;
}

export const Sparkles: React.FC<SparklesProps> = ({
  id = "sparkles",
  background = "transparent",
  minSize = 0.4,
  maxSize = 1.4,
  speed = 1,
  particleColor = "#FFF",
  particleDensity = 100,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  const initializeParticles = useCallback(
    (width: number, height: number) => {
      particles.current = [];
      for (let i = 0; i < particleDensity; i++) {
        particles.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * (maxSize - minSize) + minSize,
          speedX: (Math.random() - 0.5) * speed * 0.5,
          speedY: (Math.random() - 0.5) * speed * 0.5,
          opacity: Math.random() * 0.5 + 0.5,
          angle: Math.random() * Math.PI * 2,
          spinSpeed: Math.random() * 0.02 + 0.01,
          spinDirection: Math.random() > 0.5 ? 1 : -1,
        });
      }
    },
    [particleDensity, maxSize, minSize, speed]
  );

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const particle of particles.current) {
      particle.angle += particle.spinSpeed * particle.spinDirection;
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      particle.opacity += (Math.random() - 0.5) * 0.1;
      particle.opacity = Math.max(0.1, Math.min(1, particle.opacity));

      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.angle);
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particleColor;

      const size = particle.size;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const outerRadius = size;
        const innerRadius = size * 0.4;
        const outerAngle = (Math.PI / 2) * i;
        const innerAngle = (Math.PI / 2) * i + Math.PI / 4;
        ctx.lineTo(
          Math.cos(outerAngle) * outerRadius,
          Math.sin(outerAngle) * outerRadius
        );
        ctx.lineTo(
          Math.cos(innerAngle) * innerRadius,
          Math.sin(innerAngle) * innerRadius
        );
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [particleColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
        initializeParticles(width, height);
      }
    });

    resizeObserver.observe(canvas.parentElement || canvas);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, [animate, initializeParticles]);

  return (
    <div className={cn("relative h-full w-full", className)} style={{ background }}>
      <canvas
        id={id}
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
};