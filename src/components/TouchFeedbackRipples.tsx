import React, { useEffect, useState } from "react";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function TouchFeedbackRipples() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let nextId = 0;
    const handlePointerDown = (e: PointerEvent) => {
      // Ignore right clicks or non-primary pointers if desired
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const ripple = { id: ++nextId, x: e.clientX, y: e.clientY };
      setRipples((prev) => [...prev.slice(-12), ripple]);

      // Remove after animation finishes
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 350);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (ripples.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none">
      {ripples.map((r) => (
        <div
          key={r.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300/80 bg-cyan-400/20 shadow-[0_0_12px_rgba(56,189,248,0.7)] animate-touch-ripple"
          style={{
            left: `${r.x}px`,
            top: `${r.y}px`,
            width: "44px",
            height: "44px",
          }}
        >
          <div className="absolute inset-1 rounded-full border border-white/60 animate-ping opacity-75" />
        </div>
      ))}
    </div>
  );
}
