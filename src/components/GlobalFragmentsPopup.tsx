"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFragmentsUi } from "@/lib/fragments-ui";
import { X } from "lucide-react";

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
        <div className="fixed inset-0 z-[160] flex items-end justify-center pointer-events-auto select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 cursor-pointer"
            onClick={closeFragments}
          />

          {/* Sliding Sheet Panel with pure white background */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 360, mass: 0.6 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            dragMomentum={false}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 70 || info.velocity.y > 250) {
                closeFragments();
              }
            }}
            className="relative w-full max-w-[440px] h-[85dvh] flex flex-col overflow-hidden rounded-t-[32px] bg-white border-t border-x border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.22)] z-10 transform-gpu"
          >
            {/* iOS Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none shrink-0 bg-white">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header: Title and Close button */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-slate-100 bg-white">
              <h2 className="text-[17px] font-black tracking-tight text-[#111827]">
                Fragments
              </h2>
              <button
                type="button"
                onClick={closeFragments}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body: Blank with Tribe Mascot + Work in Progress */}
            <div className="flex-1 w-full bg-white flex flex-col items-center justify-center text-center p-6 select-none">
              <img
                src="https://maxwell.z3ki.dev/bot/_files/goggle-character/goggle_character.png"
                alt="Mascot"
                className="w-28 h-28 object-contain mb-4 drop-shadow-md select-none pointer-events-none"
              />
              <p className="text-[17px] font-bold text-[#17191d] dark:text-white font-sans tracking-tight">
                Work in Progress
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default GlobalFragmentsPopup;
