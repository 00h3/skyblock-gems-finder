"use client";

import { useState, useMemo, useEffect } from "react";
import { Info, LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OrangeHeartIcon } from "@/components/QbIcons";
import { PlayersIcon } from "@/components/icons/PlayersIcon";
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
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
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

            {/* Header with Card / List Switcher */}
            <div className="flex items-center justify-between px-5 py-2.5 shrink-0 border-b border-black/[0.06] bg-transparent z-20">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-extrabold tracking-tight text-[#141414]">
                  Discover
                </h2>
              </div>

              {/* Card / List Switcher in bottom menu clear liquid style */}
              <div className="qb-glossy-menu rounded-full p-1 flex items-center gap-1 shadow-xs border border-black/[0.08] dark:border-white/[0.12] bg-white/40 dark:bg-black/20 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`press relative flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none outline-none ${
                    viewMode === "card"
                      ? "font-black text-foreground"
                      : "font-semibold text-foreground/60 hover:text-foreground"
                  }`}
                  aria-label="Card view"
                >
                  {viewMode === "card" && (
                    <motion.div
                      layoutId="discoveryPopupViewModePill"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 32,
                        mass: 0.8,
                      }}
                      className="absolute inset-0 rounded-full pointer-events-none bg-white/70 dark:bg-white/20 backdrop-blur-md border border-white/80 dark:border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_10px_rgba(0,0,0,0.4)]"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <LayoutGrid className="h-3 w-3" />
                    <span>Card</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`press relative flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] transition-all duration-200 cursor-pointer select-none outline-none ${
                    viewMode === "list"
                      ? "font-black text-foreground"
                      : "font-semibold text-foreground/60 hover:text-foreground"
                  }`}
                  aria-label="List view"
                >
                  {viewMode === "list" && (
                    <motion.div
                      layoutId="discoveryPopupViewModePill"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 32,
                        mass: 0.8,
                      }}
                      className="absolute inset-0 rounded-full pointer-events-none bg-white/70 dark:bg-white/20 backdrop-blur-md border border-white/80 dark:border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.95),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_10px_rgba(0,0,0,0.4)]"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <List className="h-3 w-3" />
                    <span>List</span>
                  </span>
                </button>
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

            {/* Discovery Games Content */}
            <div className="flex-1 w-full overflow-y-auto overscroll-contain px-4 pt-3 pb-12 hide-scrollbar ios-scroll">
              {viewMode === "card" ? (
                /* Card Grid View */
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
                            draggable={false}
                          />
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${game.hue} opacity-25`}
                          />
                        </button>
                        <div className="flex flex-col gap-0.5 px-0.5">
                          <div className="truncate text-[11px] font-bold text-[#141414]">
                            {game.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280]">
                            <span className="flex items-center gap-0.5">
                              <OrangeHeartIcon className="h-2.5 w-2.5 text-[#fa4616]" />
                              <span className="font-extrabold text-[#6B7280]">99%</span>
                            </span>
                            <span className="flex items-center gap-0.5">
                              <PlayersIcon className="h-2.5 w-2.5" />
                              <span className="font-extrabold text-[#6B7280]">{game.players || "1"}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View — rectangles with game pfp & bio */
                <div className="flex flex-col gap-2.5">
                  {games.map((game) => {
                    const isLiked = liked.has(game.id);
                    return (
                      <div
                        key={game.id}
                        onClick={() => handleGameSelect(game)}
                        className="press group relative flex items-center gap-3 p-2.5 rounded-[12px] bg-white border border-black/[0.08] shadow-[0_2px_6px_rgba(0,0,0,0.03)] active:scale-[0.99] transition-all cursor-pointer overflow-hidden select-none"
                      >
                        {/* Game pfp thumbnail */}
                        <div className="relative h-[62px] w-[62px] shrink-0 rounded-[10px] overflow-hidden border border-black/[0.08] bg-slate-100">
                          <img
                            src={game.img}
                            alt={game.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            draggable={false}
                          />
                          <div className={`absolute inset-0 bg-gradient-to-br ${game.hue} opacity-20`} />
                        </div>

                        {/* Info: title, bio, stats */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="flex items-center justify-between gap-1.5">
                            <h3 className="truncate text-[13px] font-extrabold tracking-tight text-[#141414] leading-tight">
                              {game.title}
                            </h3>
                          </div>

                          {/* Bio */}
                          <p className="mt-0.5 text-[10.5px] font-medium text-[#6B7280] leading-snug line-clamp-2">
                            {game.bio}
                          </p>

                          {/* Online stats + likes */}
                          <div className="mt-1 flex items-center gap-2.5 text-[9.5px] font-semibold text-[#8b929d]">
                            <span className="flex items-center gap-1 text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-extrabold">{game.players || "Online"}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <OrangeHeartIcon className="h-2.5 w-2.5 text-[#fa4616]" />
                              <span>{game.likes}</span>
                            </span>
                          </div>
                        </div>

                        {/* Like button */}
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
                          className="press grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-black/[0.05] active:scale-90 transition-transform"
                          aria-label="Like game"
                        >
                          <OrangeHeartIcon
                            className={
                              isLiked
                                ? "h-[15px] w-[15px] filter drop-shadow-[0_1px_3px_rgba(250,70,22,0.4)]"
                                : "h-[15px] w-[15px] opacity-30 grayscale"
                            }
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

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
