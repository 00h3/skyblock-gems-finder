"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShopUi } from "@/lib/shop-ui";
import { AvatarShowcase } from "@/components/AvatarShowcase";

/**
 * Global Shop popup that displays the Avatar Section in an iOS-style
 * bottom-to-top morphing sheet popup, matching the events popup.
 */
export function GlobalShopPopup() {
  const { open, closeShop } = useShopUi();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeShop();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeShop]);

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
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={closeShop}
          />

          {/* Morphing Bottom Sheet Panel */}
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
                closeShop();
              }
            }}
            className="relative w-full max-w-[440px] h-[88dvh] flex flex-col overflow-hidden rounded-t-[32px] bg-white border-t border-x border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.25)] z-10 will-change-transform"
          >
            {/* iOS Drag Handle */}
            <div className="pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none shrink-0 bg-white">
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>

            {/* Embedded Avatar Showcase (Customization & Shop section) */}
            <div className="flex-1 w-full overflow-hidden">
              <AvatarShowcase isPopup={true} onClose={closeShop} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
