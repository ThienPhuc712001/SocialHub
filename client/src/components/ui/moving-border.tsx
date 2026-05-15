import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MovingBorderProps {
  children: ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  className?: string;
  containerClassName?: string;
  as?: React.ElementType;
}

export const MovingBorder: React.FC<MovingBorderProps> = ({
  children,
  duration = 3000,
  rx = "20",
  ry = "20",
  className,
  containerClassName,
  as = "div",
}) => {
  const Component = as;

  return (
    <Component
      className={cn(
        "relative overflow-hidden rounded-xl p-[1px]",
        containerClassName
      )}
    >
      <svg
          className="absolute h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <motion.rect
            x="0"
            y="0"
            width="100"
            height="100"
            rx={rx}
            ry={ry}
            fill="none"
            stroke="url(#moving-border-gradient)"
            strokeWidth="2"
            strokeDasharray="10 5"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -200 }}
            transition={{
              duration: duration / 1000,
              ease: "linear",
              repeat: Infinity,
            }}
          />
          <defs>
            <linearGradient
              id="moving-border-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>
      <div className={cn("relative h-full w-full rounded-xl", className)}>
        {children}
      </div>
    </Component>
  );
};