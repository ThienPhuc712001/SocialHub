import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
}

export const Marquee: React.FC<MarqueeProps> = ({
  children,
  className,
  reverse = false,
  pauseOnHover = false,
  vertical = false,
}) => {
  return (
    <div
      className={cn(
        "group flex overflow-hidden [--duration:15s]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 justify-around gap-4",
            vertical
              ? "animate-marquee-vertical flex-col"
              : "animate-marquee-horizontal flex-row",
            reverse && "[--direction:reverse]",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
          style={{
            animationDuration: "var(--duration, 40s)",
            animationDirection: "var(--direction, normal)",
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
};