import React, { useEffect, useState } from "react";

interface ActiveTouch {
  id: number;
  x: number;
  y: number;
  releasing: boolean;
}

export function TouchFeedbackRipples() {
  const [touches, setTouches] = useState<Map<number, ActiveTouch>>(new Map());

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Primary touch / mouse button only
      if (e.button !== 0 && e.pointerType === "mouse") return;

      setTouches((prev) => {
        const next = new Map(prev);
        next.set(e.pointerId, {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          releasing: false,
        });
        return next;
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      setTouches((prev) => {
        if (!prev.has(e.pointerId)) return prev;
        const current = prev.get(e.pointerId)!;
        if (current.releasing) return prev;
        const next = new Map(prev);
        next.set(e.pointerId, {
          ...current,
          x: e.clientX,
          y: e.clientY,
        });
        return next;
      });
    };

    const handlePointerUp = (e: PointerEvent) => {
      setTouches((prev) => {
        if (!prev.has(e.pointerId)) return prev;
        const next = new Map(prev);
        const item = next.get(e.pointerId)!;
        next.set(e.pointerId, { ...item, releasing: true });
        return next;
      });

      // Remove after smooth fade-out
      setTimeout(() => {
        setTouches((prev) => {
          if (!prev.has(e.pointerId)) return prev;
          const next = new Map(prev);
          next.delete(e.pointerId);
          return next;
        });
      }, 160);
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  if (touches.size === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none">
      {Array.from(touches.values()).map((t) => (
        <div
          key={t.id}
          className="absolute rounded-full pointer-events-none will-change-transform"
          style={{
            left: `${t.x}px`,
            top: `${t.y}px`,
            width: "46px",
            height: "46px",
            backgroundColor: "rgba(255, 255, 255, 0.22)",
            border: "2px solid rgba(255, 255, 255, 0.82)",
            boxShadow:
              "0 0 12px rgba(255, 255, 255, 0.45), inset 0 0 8px rgba(255, 255, 255, 0.25)",
            backdropFilter: "blur(1.5px)",
            WebkitBackdropFilter: "blur(1.5px)",
            transform: t.releasing
              ? "translate(-50%, -50%) scale(1.28)"
              : "translate(-50%, -50%) scale(1.0)",
            opacity: t.releasing ? 0 : 0.95,
            transition: t.releasing
              ? "opacity 160ms cubic-bezier(0.1, 0.9, 0.2, 1), transform 160ms cubic-bezier(0.1, 0.9, 0.2, 1)"
              : "transform 80ms ease-out",
          }}
        />
      ))}
    </div>
  );
}
