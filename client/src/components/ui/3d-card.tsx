import React, { ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Card3DProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  glareColor?: string;
  glareOpacity?: number;
  maxRotation?: number;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className,
  containerClassName,
  glareColor = "rgba(139, 92, 246, 0.4)",
  glareOpacity = 0.15,
  maxRotation = 15,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxRotation;
    const rotateY = ((x - centerX) / centerX) * maxRotation;

    container.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

    const glareX = ((x / rect.width) * 100);
    const glareY = ((y / rect.height) * 100);
    setGlarePosition({ x: glareX, y: glareY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    const container = containerRef.current;
    if (!container) return;
    container.style.boxShadow = `0 0 30px rgba(139, 92, 246, 0.2), 0 20px 40px rgba(0, 0, 0, 0.3)`;
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    const container = containerRef.current;
    if (!container) return;
    container.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    container.style.boxShadow = "none";
  };

  return (
    <div
      className={cn("flex items-center justify-center", containerClassName)}
    >
      <div
        ref={containerRef}
        className={cn("relative transition-all duration-300 ease-out", className)}
        style={{ transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {isHovered && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden z-10"
            style={{
              background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, ${glareColor}, transparent 60%)`,
              opacity: glareOpacity,
              mixBlendMode: "overlay",
            }}
          />
        )}
      </div>
    </div>
  );
};