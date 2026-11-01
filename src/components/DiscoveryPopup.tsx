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
    if (activeTab === "Sandbox") return DISCOVERY_GAMES.filter((g) => g.id === "baseplate");
    if (activeTab === "Survival") return DISCOVERY_GAMES.filter((g) => g.id === "skyblock");
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
            className="relative w-full max-w-[440px] h-[85dvh] flex flex-col overflow-hidden rounded-t-[28px] bg-white border-t border-x border-black/[0.08] shadow-[0_16px_40px_rgba(15,23,42,0.18)] z-10 transform-gpu"
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

              {/* Card / List Switcher (Reverted to old style) */}
              <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-white/10 rounded-full p-1 border border-black/[0.06] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`press flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-all cursor-pointer select-none ${
                    viewMode === "card"
                      ? "bg-white dark:bg-white/25 text-[#141414] dark:text-white shadow-xs"
                      : "text-[#6b7280] hover:text-[#141414] dark:hover:text-white"
                  }`}
                  aria-label="Card view"
                >
                  <LayoutGrid className="h-3 w-3" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`press flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-all cursor-pointer select-none ${
                    viewMode === "list"
                      ? "bg-white dark:bg-white/25 text-[#141414] dark:text-white shadow-xs"
                      : "text-[#6b7280] hover:text-[#141414] dark:hover:text-white"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-3 w-3" />
                  <span>List</span>
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
                /* List View — rectangles with game pfp & bio, and glossy Play button */
                <div className="flex flex-col gap-2.5">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className="press group relative flex items-center gap-3 p-2.5 rounded-[12px] bg-white border border-black/[0.08] shadow-[0_2px_6px_rgba(0,0,0,0.03)] active:scale-[0.99] transition-all cursor-pointer overflow-hidden select-none"
                    >
                      {/* Game pfp thumbnail */}
                      <div className="relative h-[60px] w-[60px] shrink-0 rounded-[10px] overflow-hidden border border-black/[0.08] bg-slate-100">
                        <img
                          src={game.img}
                          alt={game.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          draggable={false}
                        />
                      </div>

                      {/* Info: title & bio only */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center pr-1">
                        <h3 className="truncate text-[13px] font-extrabold tracking-tight text-[#141414] leading-tight">
                          {game.title}
                        </h3>
                        <p className="mt-0.5 text-[10.5px] font-medium text-[#6B7280] leading-snug line-clamp-2">
                          {game.bio}
                        </p>
                      </div>

                      {/* Play button with same glossiness as free */}
                      <div className="shrink-0 flex items-center pl-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGameSelect(game);
                          }}
                          className="qb-squircle press relative h-9 px-3.5 shrink-0 flex items-center justify-center font-extrabold text-[12.5px] text-[#17191d] active:scale-95 transition-transform select-none cursor-pointer"
                          aria-label={`Play ${game.title}`}
                        >
                          Play
                        </button>
                      </div>
                    </div>
                  ))}
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
