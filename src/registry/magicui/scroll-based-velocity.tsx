import { useEffect, useRef } from "react";

export function ScrollVelocityContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`relative overflow-hidden ${className}`}>{children}</div>;
}

export function ScrollVelocityRow({
  children,
  baseVelocity = 20,
  direction = 1,
}: {
  children: React.ReactNode;
  baseVelocity?: number;
  direction?: 1 | -1;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let offset = 0;
    const tick = () => {
      offset = (offset + baseVelocity * direction * 0.018) % 50;
      el.style.transform = `translateX(${offset}%)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [baseVelocity, direction]);
  return (
    <div ref={ref} className="w-max whitespace-nowrap py-0.5 will-change-transform">
      <span className="mr-8">{children}</span>
      <span className="mr-8">{children}</span>
      <span>{children}</span>
    </div>
  );
}
