import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  decimalPlaces?: number;
}

export const NumberTicker: React.FC<NumberTickerProps> = ({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const displayedValue = useTransform(springValue, (current) =>
    Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(current)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timeout = setTimeout(() => {
      motionValue.set(direction === "down" ? 0 : value);
    }, delay);
    return () => clearTimeout(timeout);
  }, [mounted, motionValue, direction, value, delay]);

  return (
    <span
      ref={ref}
      className={cn("inline-block tabular-nums tracking-wider text-black dark:text-white", className)}
    >
      {mounted && <motion.span>{displayedValue}</motion.span>}
      {!mounted && (
        <span>
          {Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(direction === "down" ? value : 0)}
        </span>
      )}
    </span>
  );
};