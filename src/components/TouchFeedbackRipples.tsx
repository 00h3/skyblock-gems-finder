import React, { useEffect, useRef } from "react";

/**
 * Gameplay-only touch indicator ripple.
 * Strictly limited to 1 single finger during active 3D gameplay canvas drag.
 * NEVER appears on UI elements, modals (settings, shop, etc.), non-game routes,
 * or when touch circle setting is toggled OFF.
 * Zero interference with native UI scrolling.
 */
export function TouchFeedbackRipples() {
  const dotRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const isReleasingRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);
  const modalOpenRef = useRef(false);

  useEffect(() => {
    const isGameplayActive = (): boolean => {
      if (typeof window === "undefined") return false;
      if (modalOpenRef.current) return false;
      // Only active on gameplay pages
      if (!window.location.pathname.startsWith("/game")) return false;
      // Check user preference
      try {
        if (localStorage.getItem("qb_touch_circle") === "false") return false;
      } catch {}
      // Check if any modal or menu is currently open
      const hasOpenModal = document.querySelector(
        ".bf-overlay.is-open, .bf-modal, [role='dialog'], .chat-overlay, .settings-modal, [data-modal='true']",
      );
      if (hasOpenModal) return false;
      return true;
    };

    const hideIndicator = () => {
      activePointerIdRef.current = null;
      isReleasingRef.current = false;
      if (releaseTimerRef.current) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      if (dotRef.current) {
        dotRef.current.style.opacity = "0";
        dotRef.current.style.transform = "translate(-50%, -50%) scale(0.7)";
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Must be touch or primary mouse
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!isGameplayActive()) return;

      // STRICT CHECK: ONLY show on the actual 3D gameplay canvas!
      // If the target is NOT a canvas, or is within any UI element, ignore!
      if (!(e.target instanceof HTMLCanvasElement)) {
        return;
      }

      // STRICT 1-FINGER LIMIT: If a pointer is already active, ignore all secondary fingers!
      if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) {
        return;
      }

      activePointerIdRef.current = e.pointerId;
      isReleasingRef.current = false;
      if (releaseTimerRef.current) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }

      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top = `${e.clientY}px`;
        dotRef.current.style.opacity = "0.95";
        dotRef.current.style.transform = "translate(-50%, -50%) scale(1)";
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId || isReleasingRef.current) return;
      if (!isGameplayActive()) {
        hideIndicator();
        return;
      }

      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top = `${e.clientY}px`;
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      isReleasingRef.current = true;

      if (dotRef.current) {
        dotRef.current.style.opacity = "0";
        dotRef.current.style.transform = "translate(-50%, -50%) scale(1.2)";
      }

      releaseTimerRef.current = window.setTimeout(() => {
        hideIndicator();
      }, 150);
    };

    // When any modal opens, immediately dismiss the touch indicator
    const handleModalActive = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && typeof detail.open === "boolean") {
        modalOpenRef.current = detail.open;
      } else {
        modalOpenRef.current = true;
      }
      hideIndicator();
    };

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    window.addEventListener("bm-modal-active", handleModalActive);
    window.addEventListener("popstate", () => hideIndicator());

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("bm-modal-active", handleModalActive);
      window.removeEventListener("popstate", () => hideIndicator());
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        ref={dotRef}
        className="absolute rounded-full pointer-events-none will-change-transform opacity-0"
        style={{
          width: "40px",
          height: "40px",
          backgroundColor: "rgba(255, 255, 255, 0.22)",
          border: "2px solid rgba(255, 255, 255, 0.82)",
          boxShadow:
            "0 0 10px rgba(255, 255, 255, 0.45), inset 0 0 6px rgba(255, 255, 255, 0.25)",
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)",
          transform: "translate(-50%, -50%) scale(0.7)",
          transition:
            "opacity 140ms cubic-bezier(0.1, 0.9, 0.2, 1), transform 140ms cubic-bezier(0.1, 0.9, 0.2, 1)",
        }}
      />
    </div>
  );
}
