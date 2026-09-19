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
            className="relative w-full max-w-[440px] h-[85dvh] flex flex-col overflow-hidden rounded-t-[24px] bg-white dark:bg-[#14151b] shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#14151b] z-20">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-extrabold tracking-tight text-[#141414] dark:text-white">
                  Fragments
                </h2>
              </div>
              <button
                type="button"
                onClick={closeFragments}
                className="press grid h-9 w-9 place-items-center rounded-[12px] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Completely blank body as requested */}
            <div className="flex-1 w-full flex flex-col items-center justify-center p-6 bg-white dark:bg-[#14151b]">
              {/* Intentionally blank */}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
