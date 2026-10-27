"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFragmentsUi } from "@/lib/fragments-ui";
import { GlowCard } from "@/components/ui/spotlight-card";
import {
  useFragments,
  claimFragment,
  redeemFaceFragment,
  ensureFragmentSchedule,
} from "@/lib/fragments";
import { useFragmentAccount, formatRemaining } from "@/components/FragmentsPanel";
import { X, Sparkles, Clock, Check, Gift, ShieldAlert, Award } from "lucide-react";
import { ShinyButton } from "@/components/ui/shiny-button";
import { toast } from "sonner";

const fragmentIcon =
  "https://file.garden/alGOOylwpAfCa6qP/file_00000000ded48210a85ba665493b1474.png";
const faceMoneyIcon = "/skins/face-money.png";
const chestIcon = "/icon-packs/reward-chest.png";

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
  const trialRemaining = Math.max(0, fragments.faceTrialUntil - now);
  const faceActive = trialRemaining > 0;

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

  const handleRedeemFace = async () => {
    if (busy) return;
    if (fragments.count < 1) {
      toast.error("Not enough fragments", {
        description: "You need at least 1 fragment to activate the $$$ Face.",
      });
      return;
    }
    try {
      setBusy(true);
      const ok = await redeemFaceFragment();
      if (ok) {
        toast.success("$$$ Face Activated for 24 Hours!", {
          description: "Equipped in your wardrobe for the next 24 hours.",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not redeem face.");
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
            className="relative w-full max-w-[440px] h-[86dvh] flex flex-col overflow-hidden rounded-t-[32px] bg-white border-t border-x border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.22)] z-10 will-change-transform"
          >
            {/* iOS Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none shrink-0 bg-white">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
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

            {/* Claim Bar */}
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

            {/* Cards Scrollable Body on White Background */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white ios-scroll">
              {/* Card 1: $$$ Face Trial (Customization) */}
              <GlowCard
                glowColor="orange"
                customSize={true}
                className="w-full bg-white border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.04)] rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      <img
                        src={faceMoneyIcon}
                        alt="Money Face"
                        className="h-11 w-11 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = fragmentIcon;
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                          Customization
                        </span>
                        {faceActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Active
                          </span>
                        )}
                      </div>
                      <h3 className="text-[15px] font-black text-[#111827]">
                        $$$ Face (24h Trial)
                      </h3>
                      <p className="text-[11.5px] leading-tight text-slate-500 mt-0.5">
                        {faceActive
                          ? `Expires in ${formatRemaining(trialRemaining)}`
                          : "Unlock the exclusive $$$ animated face expression for 24 hours."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <img src={fragmentIcon} alt="" className="h-3.5 w-3.5 object-contain" />
                    <span className="text-[12px] font-bold text-slate-700">Cost: 1 Fragment</span>
                  </div>

                  <button
                    type="button"
                    disabled={busy || fragments.count < 1}
                    onClick={handleRedeemFace}
                    className={`press px-4 py-1.5 rounded-xl font-bold text-[12px] transition ${
                      fragments.count >= 1
                        ? "bg-[#fa4616] text-white hover:brightness-105 shadow-xs"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {faceActive ? "Extend (+24h)" : "Unlock Face"}
                  </button>
                </div>
              </GlowCard>

              {/* Card 2: Scarlet Armor & Wings (Wearables) */}
              <GlowCard
                glowColor="purple"
                customSize={true}
                className="w-full bg-white border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.04)] rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      <Sparkles className="h-7 w-7 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Wearables
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Upcoming
                        </span>
                      </div>
                      <h3 className="text-[15px] font-black text-[#111827]">
                        Scarlet Wings & Armor Set
                      </h3>
                      <p className="text-[11.5px] leading-tight text-slate-500 mt-0.5">
                        A limited legendary cosmetic set wearable across all QBLOCK worlds.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <img src={fragmentIcon} alt="" className="h-3.5 w-3.5 object-contain" />
                    <span className="text-[12px] font-bold text-slate-700">Cost: 5 Fragments</span>
                  </div>

                  <span className="px-3.5 py-1 rounded-xl bg-slate-100 text-slate-500 font-semibold text-[11.5px]">
                    Coming Soon
                  </span>
                </div>
              </GlowCard>

              {/* Card 3: Currency & Gem Vault */}
              <GlowCard
                glowColor="blue"
                customSize={true}
                className="w-full bg-white border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.04)] rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      <Gift className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Economy
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Upcoming
                        </span>
                      </div>
                      <h3 className="text-[15px] font-black text-[#111827]">
                        Gold & Gem Conversion
                      </h3>
                      <p className="text-[11.5px] leading-tight text-slate-500 mt-0.5">
                        Direct conversion from collected shards into coins and marketplace gems.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <img src={fragmentIcon} alt="" className="h-3.5 w-3.5 object-contain" />
                    <span className="text-[12px] font-bold text-slate-700">Cost: 2 Fragments</span>
                  </div>

                  <span className="px-3.5 py-1 rounded-xl bg-slate-100 text-slate-500 font-semibold text-[11.5px]">
                    Coming Soon
                  </span>
                </div>
              </GlowCard>

              {/* Card 4: Party Emotes Pack */}
              <GlowCard
                glowColor="green"
                customSize={true}
                className="w-full bg-white border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.04)] rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      <Award className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Emotes
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Upcoming
                        </span>
                      </div>
                      <h3 className="text-[15px] font-black text-[#111827]">
                        Party Emote Pack
                      </h3>
                      <p className="text-[11.5px] leading-tight text-slate-500 mt-0.5">
                        Seasonal animated reactions, victory waves, and high-fives.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <img src={fragmentIcon} alt="" className="h-3.5 w-3.5 object-contain" />
                    <span className="text-[12px] font-bold text-slate-700">Cost: 3 Fragments</span>
                  </div>

                  <span className="px-3.5 py-1 rounded-xl bg-slate-100 text-slate-500 font-semibold text-[11.5px]">
                    Coming Soon
                  </span>
                </div>
              </GlowCard>

              {/* Card 5: Grand Mystery Chest */}
              <GlowCard
                glowColor="red"
                customSize={true}
                className="w-full bg-white border border-slate-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.04)] rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      <img
                        src={chestIcon}
                        alt="Chest"
                        className="h-10 w-10 object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                          Mystery Loot
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          Seasonal
                        </span>
                      </div>
                      <h3 className="text-[15px] font-black text-[#111827]">
                        Phoenix Vault Chest
                      </h3>
                      <p className="text-[11.5px] leading-tight text-slate-500 mt-0.5">
                        Drop chance for rare particle effects, crown frames, and obsidian blocks.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <img src={fragmentIcon} alt="" className="h-3.5 w-3.5 object-contain" />
                    <span className="text-[12px] font-bold text-slate-700">Cost: 10 Fragments</span>
                  </div>

                  <span className="px-3.5 py-1 rounded-xl bg-slate-100 text-slate-500 font-semibold text-[11.5px]">
                    Coming Soon
                  </span>
                </div>
              </GlowCard>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default GlobalFragmentsPopup;
