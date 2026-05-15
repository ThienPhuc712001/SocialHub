import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AuroraProps {
  className?: string;
  colors?: string[];
  speed?: number;
  amplitude?: number;
}

export const Aurora: React.FC<AuroraProps> = ({
  className,
  colors = ["#8b5cf6", "#06b6d4", "#ec4899"],
  speed = 0.8,
  amplitude = 0.4,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    timeRef.current += speed * 0.002;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < colors.length; i++) {
      const phase = timeRef.current + i * 1.5;
      const xShift = Math.sin(phase) * amplitude * width;
      const yShift = Math.cos(phase * 0.7) * amplitude * height;

      const gradient = ctx.createRadialGradient(
        width * (0.25 + i * 0.25) + xShift,
        height * 0.5 + yShift,
        0,
        width * (0.25 + i * 0.25) + xShift,
        height * 0.5 + yShift,
        width * 0.5
      );
      gradient.addColorStop(0, colors[i] + "30");
      gradient.addColorStop(0.5, colors[i] + "15");
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [colors, speed, amplitude]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [animate]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};