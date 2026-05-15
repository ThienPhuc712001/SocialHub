import React, { MouseEvent, ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface DockItem {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

interface DockProps {
  items: DockItem[];
  className?: string;
  magnification?: number;
  distance?: number;
}

export const Dock: React.FC<DockProps> = ({
  items,
  className,
  magnification = 0.5,
  distance = 140,
}) => {
  const mouseX = useMotionValue<number>(Infinity);

  return (
    <motion.div
      className={cn(
        "flex items-end gap-2 rounded-2xl border border-border/30 bg-surface/80 backdrop-blur-md px-4 pb-3 pt-2",
        className
      )}
      onMouseMove={(e: MouseEvent<HTMLDivElement>) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {items.map((item) => (
        <DockIcon
          key={item.label}
          mouseX={mouseX}
          magnification={magnification}
          distance={distance}
          icon={item.icon}
          label={item.label}
          onClick={item.onClick}
        />
      ))}
    </motion.div>
  );
};

interface DockIconProps {
  mouseX: MotionValue<number>;
  magnification: number;
  distance: number;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

const DockIcon: React.FC<DockIconProps> = ({
  mouseX,
  magnification,
  distance,
  icon,
  label,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const distanceFromMouse = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distanceFromMouse, [-distance, 0, distance], [40, 40 + magnification * 40, 40]);
  const width = useSpring(widthSync, { damping: 15, stiffness: 200, mass: 0.1 });

  return (
    <motion.div
      ref={ref}
      className="flex flex-col items-center justify-end"
      style={{ width }}
      onClick={onClick}
    >
      <div className="flex items-center justify-center rounded-xl bg-card border border-border/50 w-full aspect-square">
        {icon}
      </div>
      <span className="text-xs text-text-muted mt-1 text-center w-full truncate">
        {label}
      </span>
    </motion.div>
  );
};