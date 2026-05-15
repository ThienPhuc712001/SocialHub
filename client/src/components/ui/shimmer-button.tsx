import { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  children,
  className,
  shimmerColor = "#ffffff",
  shimmerSize = "0.05em",
  borderRadius = "100px",
  shimmerDuration = "3s",
  background = "rgba(0, 0, 0, 1)",
  ...rest
}) => {
  return (
    <button
      {...rest}
      className={cn(
        "group relative flex items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 font-medium text-white transition-all duration-300",
        className
      )}
      style={{
        borderRadius,
        background,
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius }}
      >
        <div
          className="absolute inset-[-100%] animate-shimmer"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} ${shimmerSize}, transparent 100%)`,
            animationDuration: shimmerDuration,
          }}
        />
      </div>
      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
    </button>
  );
};