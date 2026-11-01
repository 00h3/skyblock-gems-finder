import React, { useEffect, useRef } from "react";

/**
 * Gameplay-only touch indicator ripple.
 * Strictly limited to 1 single finger during active 3D gameplay canvas drag.
 * Automatically hidden on UI elements, modals (settings, shop, etc.), non-game routes,
 * or when touch circle setting is toggled OFF.
 */
export function TouchFeedbackRipples() {
  const dotRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const isReleasingRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const isGameplayActive = (): boolean => {
      if (typeof window === "undefined") return false;
      // Only active on gameplay pages
      if (!window.location.pathname.startsWith("/game")) return false;
      // Check user preference
      try {
        if (localStorage.getItem("qb_touch_circle") === "false") return false;
      } catch {}
      // Check if any modal or menu is currently open
      const hasOpenModal = document.querySelector(
        ".bf-overlay.is-open, .bf-modal, [role='dialog'], .chat-overlay, .settings-modal",
      );
      if (hasOpenModal) return false;
      return true;
    };

    const isUiTarget = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      return Boolean(
        target.closest(
          "button, a, input, select, textarea, [role='dialog'], .bf-modal, .bf-overlay, .bf-panel, nav, header, [data-ui='true'], [data-scrollable='true'], .custom-scrollbar",
        ),
      );
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
      // Must be touch or pen, or primary mouse
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!isGameplayActive()) return;
      if (isUiTarget(e.target)) return;

      // STRICT 1-FINGER LIMIT: If a pointer is already active, ignore all other fingers!
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
        dotRef.current.style.transform = "translate(-50%, -50%) scale(1.25)";
      }

      releaseTimerRef.current = window.setTimeout(() => {
        hideIndicator();
      }, 160);
    };

    // When modal opens, immediately dismiss the touch indicator
    const handleModalActive = () => hideIndicator();

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    window.addEventListener("bm-modal-active", handleModalActive);
    window.addEventListener("popstate", handleModalActive);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("bm-modal-active", handleModalActive);
      window.removeEventListener("popstate", handleModalActive);
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
          width: "44px",
          height: "44px",
          backgroundColor: "rgba(255, 255, 255, 0.22)",
          border: "2px solid rgba(255, 255, 255, 0.82)",
          boxShadow:
            "0 0 12px rgba(255, 255, 255, 0.45), inset 0 0 8px rgba(255, 255, 255, 0.25)",
          backdropFilter: "blur(1.5px)",
          WebkitBackdropFilter: "blur(1.5px)",
          transform: "translate(-50%, -50%) scale(0.7)",
          transition:
            "opacity 160ms cubic-bezier(0.1, 0.9, 0.2, 1), transform 160ms cubic-bezier(0.1, 0.9, 0.2, 1)",
        }}
      />
    </div>
  );
}
