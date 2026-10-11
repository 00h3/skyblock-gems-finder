"use client";

import { useState, useMemo, useEffect } from "react";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OrangeHeartIcon } from "@/components/QbIcons";
import {
  DISCOVERY_GAMES,
  UPLOADED_DISCOVER_TABS,
  type DiscoveryGame,
} from "@/lib/discovery-data";

interface DiscoveryPopupProps {
  open: boolean;
  onClose: () => void;
  onSelectGame?: (game: {
    id: string;
    t: string;
    p: string;
    hue: string;
    bio: string;
    icon: string;
    playable: boolean;
  }) => void;
}

export function DiscoveryPopup({ open, onClose, onSelectGame }: DiscoveryPopupProps) {
  const [tab, setTab] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const games = useMemo(() => {
    const activeTab = UPLOADED_DISCOVER_TABS[tab];
    if (activeTab === "Party") return DISCOVERY_GAMES;
    if (activeTab === "PvP")
      return DISCOVERY_GAMES.filter((g) => g.id === "block-fall" || g.id === "bedwars");
    if (activeTab === "Building") return DISCOVERY_GAMES.filter((g) => g.id === "skyblock");
    if (activeTab === "Fantasy") return DISCOVERY_GAMES.filter((g) => g.id === "skyblock");
    return DISCOVERY_GAMES;
  }, [tab]);

  const handleGameSelect = (game: DiscoveryGame) => {
    if (onSelectGame) {
      onSelectGame({
        id: game.id,
        t: game.title,
        p: "",
        hue: game.hue,
        bio: game.bio,
        icon: game.img,
        playable: true,
      });
    }
  };

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
            onClick={onClose}
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
                onClose();
              }
            }}
            className="relative w-full max-w-[440px] h-[85dvh] flex flex-col overflow-hidden rounded-t-[28px] border-t border-x border-black/[0.08] shadow-[0_16px_40px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] z-10 will-change-transform"
            style={{
              background:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 243, 247, 0.95))",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              transform: "translateZ(0)",
            }}
          >
            {/* iOS Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none shrink-0">
              <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-black/[0.06] bg-transparent z-20">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-extrabold tracking-tight text-[#141414]">
                  Discover
                </h2>
              </div>
            </div>

            {/* Category tabs */}
            <div className="px-4 py-2 shrink-0 overflow-x-auto scroll-smooth hide-scrollbar border-b border-black/[0.04] touch-pan-x overscroll-x-contain">
              <div className="flex items-center gap-1.5 whitespace-nowrap min-w-max">
                {UPLOADED_DISCOVER_TABS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setTab(index)}
                    className={`press h-7 shrink-0 rounded-full px-3 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap select-none ${
                      index === tab
                        ? "bg-[#141414] text-white shadow-xs"
                        : "qb-squircle text-[#5f646d] hover:text-[#141414]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Discovery Games Grid */}
            <div className="flex-1 w-full overflow-y-auto overscroll-contain px-4 pt-3 pb-12 hide-scrollbar ios-scroll">
              <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#8b929d]">
                {UPLOADED_DISCOVER_TABS[tab]}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {games.map((game) => {
                  const isLiked = liked.has(game.id);
                  return (
                    <div key={game.id} className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleGameSelect(game)}
                        className="press relative aspect-square overflow-hidden rounded-[10px] bg-gradient-to-br border border-black/[0.08] shadow-xs active:scale-95 transition-transform text-left cursor-pointer"
                      >
                        <img
                          src={game.img}
                          alt={game.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${game.hue} opacity-25`}
                        />
                      </button>
                      <div className="flex h-[36px] items-center justify-between gap-1 px-0.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-bold text-[#141414]">
                            {game.title}
                          </div>
                          <div className="text-[9.5px] font-medium text-[#8b929d]">
                            {game.mode}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLiked((current) => {
                              const next = new Set(current);
                              if (next.has(game.id)) {
                                next.delete(game.id);
                              } else {
                                next.add(game.id);
                              }
                              return next;
                            });
                          }}
                          className="press grid h-6 w-6 shrink-0 place-items-center cursor-pointer active:scale-90 transition-transform"
                          aria-label="Like game"
                        >
                          <OrangeHeartIcon
                            className={
                              isLiked
                                ? "h-[15px] w-[15px] filter drop-shadow-[0_1px_3px_rgba(250,70,22,0.4)]"
                                : "h-[15px] w-[15px] opacity-35 grayscale"
                            }
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGameSelect(game)}
                          className="press grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer active:scale-90 transition-transform"
                          aria-label="Game info"
                        >
                          <Info className="h-3 w-3 text-[#5f646d]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!games.length && (
                <div className="py-12 text-center text-[13px] font-medium text-[#8b929d]">
                  No worlds in this category.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
