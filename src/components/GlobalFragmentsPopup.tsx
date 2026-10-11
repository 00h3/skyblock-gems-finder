"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useFragmentsUi } from "@/lib/fragments-ui";

/**
 * Global Fragments popup side sheet.
 * Completely blank body and clean header.
 */
export function GlobalFragmentsPopup() {
  const { open, closeFragments } = useFragmentsUi();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFragments();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeFragments]);

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
            onClick={closeFragments}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.75 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 75 || info.velocity.y > 300) {
                closeFragments();
              }
            }}
            className="relative w-full max-w-[440px] h-[85dvh] flex flex-col overflow-hidden rounded-t-[28px] border-t border-x border-black/[0.08] shadow-[0_16px_40px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] z-10"
            style={{
              background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 243, 247, 0.95))",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* iOS Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none">
              <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-black/[0.06] bg-transparent z-20">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-extrabold tracking-tight text-[#141414]">
                  Fragments
                </h2>
              </div>
              <button
                type="button"
                onClick={closeFragments}
                className="qb-squircle press grid h-9 w-9 place-items-center cursor-pointer text-slate-700 active:scale-95 transition-transform"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Under construction */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-6 bg-transparent">
              <p className="text-[17px] font-black text-[#17191d] font-lilita tracking-wide">
                Under construction
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
