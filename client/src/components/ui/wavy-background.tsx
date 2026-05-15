import { ReactNode, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface WavyBackgroundProps {
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  speed?: "slow" | "normal" | "fast";
  waveOpacity?: number;
}

export const WavyBackground: React.FC<WavyBackgroundProps> = ({
  children,
  className,
  containerClassName,
  colors = ["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"],
  waveWidth = 50,
  backgroundFill = "black",
  speed = "fast",
  waveOpacity = 0.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const nt = useRef(0);

  const speedMap = { slow: 0.001, normal: 0.002, fast: 0.004 };
  const animationSpeed = speedMap[speed];

  const drawWave = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, n: number) => {
      for (let i = 0; i < colors.length; i++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth;
        ctx.strokeStyle = colors[i];
        for (let x = 0; x < width; x++) {
          const y = Math.sin(x * 0.003 + n + i * 0.7) * (height * 0.12);
          ctx.lineTo(x, height / 2 + y);
        }
        ctx.stroke();
        ctx.closePath();
        ctx.globalAlpha = waveOpacity;
      }
    },
    [colors, waveWidth, waveOpacity]
  );

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalAlpha = 1;
    ctx.fillStyle = backgroundFill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = waveOpacity;

    nt.current += animationSpeed;
    drawWave(ctx, canvas.width, canvas.height, nt.current);

    animationRef.current = requestAnimationFrame(animate);
  }, [backgroundFill, animationSpeed, drawWave, waveOpacity]);

useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    animationRef.current = requestAnimationFrame(animate);

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas.parentElement || canvas);

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  return (
    <div className={cn("relative h-full w-full flex flex-col items-center justify-center", containerClassName)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 h-full w-full"
      />
      <div className={cn("relative z-10", className)}>
        {children}
      </div>
    </div>
  );
};