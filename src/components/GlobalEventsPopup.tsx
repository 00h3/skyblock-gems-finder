"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEventsUi } from "@/lib/events-ui";

/**
 * Global Events popup with iOS-style bottom-to-top morphing sheet animation.
 * The body is kept blank as requested.
 */
export function GlobalEventsPopup() {
  const { open, closeEvents } = useEventsUi();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeEvents();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeEvents]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 cursor-pointer"
            onClick={closeEvents}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 380, mass: 0.5 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            dragMomentum={false}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 60 || info.velocity.y > 220) {
                closeEvents();
              }
            }}
            className="relative w-full max-w-[440px] h-[85dvh] flex flex-col overflow-hidden rounded-t-[28px] bg-white border-t border-x border-black/[0.08] shadow-[0_16px_40px_rgba(15,23,42,0.18)] z-10 transform-gpu"
          >
            {/* iOS Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none">
              <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-black/[0.06] bg-transparent z-20">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-extrabold tracking-tight text-[#141414]">
                  Events
                </h2>
              </div>
            </div>

            {/* Under construction */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-6 bg-transparent">
              <img
                src="https://maxwell.z3ki.dev/bot/_files/goggle-character/goggle_character.png"
                alt="Events Mascot"
                className="w-28 h-28 object-contain mb-4 drop-shadow-md"
              />
              <p className="text-[17px] font-bold text-[#17191d] font-sans tracking-tight">
                Under construction
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
