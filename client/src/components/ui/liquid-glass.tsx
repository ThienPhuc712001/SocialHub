import { ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LiquidGlassProps {
  children: ReactNode;
  className?: string;
  glareIntensity?: number;
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  className,
  glareIntensity = 0.12,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlare({ x, y, opacity: glareIntensity });
  };

  const handleMouseLeave = () => {
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative rounded-2xl transition-all duration-300",
        className
      )}
      style={{
        background: "var(--color-card)",
        backdropFilter: "blur(40px) saturate(180%) brightness(1.1)",
        WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(1.1)",
        boxShadow: `inset 0 1px 1px 0 rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.2)`,
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.25), transparent 50%)`,
          opacity: glare.opacity,
          transition: "opacity 0.3s ease",
        }}
      />
      {children}
    </div>
  );
};