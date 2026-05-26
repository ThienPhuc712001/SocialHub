import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  children: ReactNode;
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  className,
  size = 200,
  duration = 15,
  delay = 0,
  colorFrom = "#8b5cf6",
  colorTo = "#06b6d4",
}) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        className
      )}
    >
      {children}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          maskImage: `linear-gradient(transparent, transparent), linear-gradient(white, white)`,
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      >
        <div
          className="absolute aspect-square h-full w-full"
          style={{
            background: `linear-gradient(to right, ${colorFrom}, ${colorTo})`,
            animation: `border-beam-spin ${duration}s linear ${delay}s infinite`,
            width: `${size}%`,
          }}
        />
      </div>
    </div>
  );
};