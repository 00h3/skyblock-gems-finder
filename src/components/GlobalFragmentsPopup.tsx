"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFragmentsUi } from "@/lib/fragments-ui";
import { GlowCard } from "@/components/ui/spotlight-card";
import { useFragments, claimFragment } from "@/lib/fragments";
import { useFragmentAccount, formatRemaining } from "@/components/FragmentsPanel";
import { X, Clock } from "lucide-react";
import { toast } from "sonner";

const fragmentIcon =
  "https://file.garden/alGOOylwpAfCa6qP/file_00000000ded48210a85ba665493b1474.png";

export function GlobalFragmentsPopup() {
  const { open, closeFragments } = useFragmentsUi();
  useFragmentAccount();
  const fragments = useFragments();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFragments();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeFragments]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  const readyToClaim = Boolean(fragments.nextAt && now >= fragments.nextAt);
  const countdown = fragments.nextAt ? formatRemaining(fragments.nextAt - now) : "Ready";

  const handleClaim = async () => {
    if (busy) return;
    try {
      setBusy(true);
      const claimed = await claimFragment();
      if (claimed) {
        toast.success("Fragment Collected!", {
          description: "+1 Fragment added to your account inventory.",
        });
      } else {
        toast.info("Fragment not ready yet.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not claim fragment.");
    } finally {
      setBusy(false);
    }
  };

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
            className="relative w-full max-w-[440px] h-[85dvh] flex flex-col overflow-hidden rounded-t-[32px] bg-white border-t border-x border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.22)] z-10 will-change-transform"
          >
            {/* iOS Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none shrink-0 bg-white">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header: Title and Subtitle and Balance */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/15 to-orange-500/15 border border-orange-500/20 shadow-xs">
                  <img
                    src={fragmentIcon}
                    alt="Fragment"
                    className="h-5 w-5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-[17px] font-black tracking-tight text-[#111827]">
                    Fragments
                  </h2>
                  <p className="text-[11.5px] font-semibold text-[#64748b]">
                    Collect shards & unlock exclusive rewards
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Balance badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 shadow-2xs">
                  <img
                    src={fragmentIcon}
                    alt="Shard"
                    className="h-3.5 w-3.5 object-contain"
                  />
                  <span className="text-[13px] font-black text-[#111827]">
                    {fragments.count}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={closeFragments}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Next Shard / Auto-accumulating Bar */}
            <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-[12px] font-semibold text-slate-600">
                  {readyToClaim ? "Free Shard Ready!" : `Next Shard in ${countdown}`}
                </span>
              </div>
              {readyToClaim ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleClaim}
                  className="press px-3.5 py-1 rounded-full bg-[#fa4616] text-white text-[11.5px] font-bold shadow-xs hover:brightness-105 transition"
                >
                  Claim +1
                </button>
              ) : (
                <span className="text-[11.5px] font-medium text-slate-400">
                  Auto-accumulating
                </span>
              )}
            </div>

            {/* Body: Cards with NO values, exactly how the pasted text provides them, on a clean white background */}
            <div className="flex-1 w-full bg-white flex flex-col items-center justify-center p-6 overflow-hidden">
              <div className="w-full flex flex-row items-center justify-center gap-8 overflow-x-auto py-6 px-4 snap-x snap-mandatory hide-scrollbar">
                <GlowCard glowColor="blue" className="shrink-0 snap-center" />
                <GlowCard glowColor="purple" className="shrink-0 snap-center" />
                <GlowCard glowColor="green" className="shrink-0 snap-center" />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default GlobalFragmentsPopup;
