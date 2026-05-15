import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface InfiniteMovingCardsItem {
  quote: string;
  name: string;
  title: string;
}

interface InfiniteMovingCardsProps {
  items: InfiniteMovingCardsItem[];
  speed?: "fast" | "normal" | "slow";
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  className?: string;
}

export const InfiniteMovingCards: React.FC<InfiniteMovingCardsProps> = ({
  items,
  speed = "fast",
  direction = "left",
  pauseOnHover = true,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);
      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (duplicatedItem instanceof HTMLElement) {
          duplicatedItem.setAttribute('data-duplicated', 'true');
        }
        scrollerRef.current?.appendChild(duplicatedItem);
      });

      const speedMap = { fast: "20s", normal: "40s", slow: "80s" };
      containerRef.current.style.setProperty("--animation-duration", speedMap[speed]);
      containerRef.current.style.setProperty(
        "--animation-direction",
        direction === "left" ? "forwards" : "reverse"
      );

      setStart(true);
    }
  }, [speed, direction, items]);

  useEffect(() => {
    return () => {
      if (scrollerRef.current) {
        const duplicated = scrollerRef.current.querySelectorAll('[data-duplicated="true"]');
        duplicated.forEach(el => el.remove());
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-4 py-4 w-max flex-nowrap",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
        style={{
          animationDuration: "var(--animation-duration, 40s)",
          animationDirection: "var(--animation-direction, forwards)",
        }}
      >
        {items.map((item, idx) => (
          <li
            key={idx}
            className="relative w-[350px] max-w-full flex-shrink-0 rounded-2xl border border-b-0 border-border/30 px-8 py-6 md:w-[450px]"
            style={{ background: "linear-gradient(180deg, var(--color-card), var(--color-surface))" }}
          >
            <blockquote className="relative">
              <span className="relative z-20 text-sm leading-[1.6] text-text font-normal">
                {item.quote}
              </span>
              <div className="relative z-20 mt-6 flex flex-row items-center">
                <span className="flex flex-col gap-1">
                  <span className="text-sm leading-[1.6] text-text-muted font-normal">
                    {item.name}
                  </span>
                  <span className="text-sm leading-[1.6] text-text-subtle font-normal">
                    {item.title}
                  </span>
                </span>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  );
};