import { useState, useEffect } from "react";
import { ChevronLeft, Play, Globe2, Shield, Users, Trophy, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { GameMeta } from "@/components/GameSheet";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, increment } from "firebase/firestore";
import { ClapIcon } from "@/components/QbIcons";

export function BedwarsGameSheet({
  g,
  onClose,
  onPlay,
}: {
  g: GameMeta;
  onClose: () => void;
  onPlay?: () => void;
}) {
  const [tab, setTab] = useState<"info" | "lobbies">("info");
  const [scrolled, setScrolled] = useState(false);
  const [claps, setClaps] = useState<number>(0);

  useEffect(() => {
    if (!g.id) return;
    const unsubscribe = onSnapshot(doc(db, "games", g.id), (snap) => {
      if (snap.exists()) {
        setClaps(snap.data().claps || 0);
      }
    });
    return () => unsubscribe();
  }, [g.id]);

  const handleClap = async () => {
    if (!g.id) return;
    try {
      await setDoc(doc(db, "games", g.id), { claps: increment(1) }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const gameTitle = g?.t || "Bedwars";

  return (
    <div className="fixed inset-0 z-[120] flex justify-center bg-black/40 backdrop-blur-xs">
      <motion.section
        initial={{ y: "100%", opacity: 0.8, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
        className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-[#f2f3f5] dark:bg-[#0b0c10]"
      >
        {/* iOS-Style Top Navigation Bar (transitions when scrolled) */}
        <div
          className={`absolute top-0 inset-x-0 z-40 h-14 px-4 flex items-center justify-between transition-all duration-200 ${
            scrolled
              ? "bg-white/85 dark:bg-[#15171c]/85 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] shadow-sm"
              : "bg-transparent pointer-events-none"
          }`}
          style={{ paddingTop: "max(env(safe-area-inset-top), 6px)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto h-9 w-9 rounded-full bg-white/80 dark:bg-[#1a1c24]/80 backdrop-blur-md flex items-center justify-center text-[#17191d] dark:text-white transition-all active:scale-95 shadow-sm border-0 cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {scrolled && (
            <span className="text-[15px] font-black text-[#17191d] dark:text-white truncate max-w-[220px] animate-fade-in">
              {gameTitle}
            </span>
          )}

          <div className="w-9" />
        </div>

        {/* Vertically Scrollable Experience: Full-size PFP naturally scrolls out of view */}
        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 100)}
          className="relative flex-1 overflow-y-auto overscroll-contain ios-scroll hide-scrollbar"
        >
          {/* Wide Landscape Rectangle Game Banner and Title Hero (Only on popup) */}
          <div className="flex flex-col items-center justify-center pt-14 pb-5 px-4 shrink-0 select-none">
            <div className="w-full max-w-[390px] aspect-[16/9] rounded-[22px] overflow-hidden shadow-md bg-white dark:bg-[#16181f] transition-transform duration-300 border border-black/[0.06] dark:border-white/[0.08]">
              <img
                src={g.icon || "/bedwars-own-icon.png"}
                alt={gameTitle}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="mt-4 text-[22px] font-black tracking-tight text-[#17191d] dark:text-white text-center px-4 truncate max-w-full leading-tight">
              {gameTitle}
            </h1>
          </div>

          {/* Modal Content Card */}
          <div className="rounded-t-[32px] bg-white dark:bg-[#15171c] px-5 pt-4 pb-32 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.4)] min-h-[500px]">
            {/* iOS Sheet Handle Indicator */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10 dark:bg-white/15" />

            {/* Apple iOS Segmented Control: Info & Lobbies */}
            <div className="flex rounded-[14px] p-1 bg-black/[0.05] dark:bg-white/[0.08] mb-5">
              {(["info", "lobbies"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`relative z-10 flex-1 rounded-[11px] py-2 text-[13px] font-extrabold capitalize transition-all select-none cursor-pointer ${
                    tab === item
                      ? "bg-white dark:bg-[#22252e] text-[#17191d] dark:text-white shadow-sm"
                      : "text-[#7d8590] dark:text-[#8e95a0] hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Tab: Info - Bio & Game Details */}
            {tab === "info" && (
              <div className="space-y-4 pt-1">
                <p className="text-[14px] text-[#4a515e] dark:text-[#a1a7b5] leading-relaxed font-medium">
                  {g.bio ||
                    "Protect your bed, collect resources, and be the last team standing! Use teamwork and skills to win!"}
                </p>

                {/* Additional Info Details */}
                <div className="pt-2 divide-y divide-black/[0.06] dark:divide-white/[0.06] text-[13px]">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#7d8590] dark:text-[#8e95a0]">Developer</span>
                    <span className="font-bold text-[#17191d] dark:text-white">QBlock Studios</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#7d8590] dark:text-[#8e95a0]">Genre</span>
                    <span className="font-bold text-[#17191d] dark:text-white">Strategy</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Lobbies */}
            {tab === "lobbies" && (
              <div className="py-12 flex flex-col items-center justify-center text-center select-none">
                <div className="h-12 w-12 rounded-full bg-black/[0.04] dark:bg-white/[0.06] grid place-items-center mb-3 text-[#7d8590] dark:text-[#8e95a0]">
                  <Globe2 className="h-6 w-6" />
                </div>
                <h3 className="text-[15.5px] font-black text-[#17191d] dark:text-white">
                  No Lobby found
                </h3>
                <p className="text-[12.5px] text-[#7d8590] dark:text-[#8e95a0] font-medium mt-1 max-w-[240px] leading-relaxed">
                  There are currently no active public or private lobbies for this game.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Play & Clap Action Bar: Squircle Clap icon next to Play on the right */}
        <div className="absolute bottom-0 inset-x-0 p-4 pb-[max(20px,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#15171c] dark:via-[#15171c]/95 z-30 pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={onPlay}
            className="flex-1 relative h-12 rounded-[16px] bg-gradient-to-b from-[#ff5b29] via-[#fa4616] to-[#e13b0e] text-white text-[14.5px] font-black tracking-tight select-none overflow-hidden transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[15px] before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none shadow-[0_4px_16px_rgba(250,70,22,0.3)]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Play className="h-4 w-4 fill-white" />
              Play Bedwars
            </span>
          </button>

          {/* Squircle Clap Button */}
          <button
            type="button"
            onClick={handleClap}
            className="qb-squircle press shrink-0 h-12 px-3.5 rounded-[16px] bg-slate-100 dark:bg-white/[0.08] hover:bg-orange-50 dark:hover:bg-orange-500/10 border border-black/[0.08] dark:border-white/10 flex items-center justify-center gap-1.5 text-[#17191d] dark:text-white transition-all shadow-xs active:scale-95"
            title="Clap"
          >
            <ClapIcon className="h-5 w-5 text-[#fa4616]" />
            <span className="text-[12.5px] font-black">{claps}</span>
          </button>
        </div>
      </motion.section>
    </div>
  );
}
