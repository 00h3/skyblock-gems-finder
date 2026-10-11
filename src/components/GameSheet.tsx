import { useState, useEffect } from "react";
import { Globe2, Box, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { setNavHidden } from "@/lib/ui-bus";
import { BedwarsGameSheet } from "@/components/BedwarsGameSheet";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, increment } from "firebase/firestore";
import { ClapIcon } from "@/components/QbIcons";
import { RobloxServerBrowser } from "@/components/RobloxServerBrowser";

export type GameMeta = {
  t: string;
  p: string;
  hue: string;
  bio: string;
  id?: string;
  icon?: string;
  screenshots?: string[];
  playable?: boolean;
  developer?: string;
};

// ─── Game Full Screen Sheet (Apple iOS SwiftUI Style) ─────────────────────────────────────────────────────
export function GameSheet({
  g,
  onClose,
  onPlay,
}: {
  g: GameMeta;
  onClose: () => void;
  onPlay?: (serverId?: string) => void;
}) {
  const [launching, setLaunching] = useState(false);
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

  const handlePlay = (serverId?: string) => {
    setLaunching(true);
    setNavHidden(true);
    if (onPlay) onPlay(serverId);
  };

  if (g.id?.startsWith("bedwars") || g.id === "skyblock") {
    return <BedwarsGameSheet g={g} onClose={onClose} onPlay={handlePlay} />;
  }

  const gameIcon =
    g.icon || (g.id === "sandbox" ? "/assets/game-baseplate.jpg" : "/banners/welcome.jpg");
  const playLabel = launching ? "Loading..." : "Play";

  return (
    <div className="fixed inset-0 z-[170] flex justify-center bg-black/40 backdrop-blur-xs">
      <motion.section
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
        className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-[#f2f3f5] dark:bg-[#0b0c10] will-change-transform"
        style={{ transform: "translateZ(0)" }}
      >
        {/* iOS-Style Top Navigation Bar (transitions when scrolled) */}
        {scrolled && (
          <div
            className="absolute top-0 inset-x-0 z-40 h-14 px-4 flex items-center justify-center bg-white/85 dark:bg-[#15171c]/85 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08] shadow-sm transition-all duration-200 pointer-events-none"
            style={{ paddingTop: "max(env(safe-area-inset-top), 6px)" }}
          >
            <span className="text-[15px] font-black text-[#17191d] dark:text-white truncate max-w-[260px] animate-fade-in text-center">
              {g.t}
            </span>
          </div>
        )}

        {/* Vertically Scrollable Experience */}
        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 100)}
          className="relative flex-1 overflow-y-auto overscroll-contain ios-scroll hide-scrollbar"
        >
          {/* Full-bleed Full Screen Banner Image */}
          <div className="relative w-full h-[270px] sm:h-[300px] shrink-0 select-none overflow-hidden">
            <img src={gameIcon} alt={g.t} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35 pointer-events-none" />
            <div className="absolute bottom-4 inset-x-5 z-10">
              <h1 className="text-[24px] font-black tracking-tight text-white drop-shadow-md leading-tight">
                {g.t}
              </h1>
              {g.p && (
                <p className="mt-0.5 text-[12px] font-semibold text-white/80 drop-shadow">
                  {g.p} playing
                </p>
              )}
            </div>
          </div>

          {/* Modal Content Card */}
          <div className="rounded-t-[28px] bg-white dark:bg-[#15171c] px-5 pt-4 pb-32 -mt-4 relative z-10 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.4)] min-h-[500px]">
            {/* iOS Sheet Handle Indicator */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10 dark:bg-white/15 cursor-grab touch-none" />

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

            {/* Tab: Info - Bio & Feature Cards */}
            {tab === "info" && (
              <div className="space-y-4 pt-1">
                <p className="text-[14px] text-[#4a515e] dark:text-[#a1a7b5] leading-relaxed font-medium">
                  {g.bio ||
                    (g.id === "sandbox"
                      ? "First-person voxel sandbox. Walk, jump, break and place blocks in a fresh flat world."
                      : "Experience an incredible new world. Gather resources, build your base, and connect with friends in this immersive world.")}
                </p>

                {/* Developer & Genre Info */}
                <div className="pt-2 divide-y divide-black/[0.06] dark:divide-white/[0.06] text-[13px]">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#7d8590] dark:text-[#8e95a0]">Developer</span>
                    <span className="font-bold text-[#17191d] dark:text-white">
                      {g.developer || "QBlock Studios"}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-[#7d8590] dark:text-[#8e95a0]">Genre</span>
                    <span className="font-bold text-[#17191d] dark:text-white">
                      {g.id === "sandbox" ? "Voxel Sandbox" : "Adventure"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Lobbies - 16-Player Roblox-style Servers with PFP grid */}
            {tab === "lobbies" && (
              <RobloxServerBrowser
                gameId={g.id || "sandbox"}
                gameTitle={g.t}
                onJoinServer={(serverId) => handlePlay(serverId)}
              />
            )}
          </div>
        </div>

        {/* Play & Clap Action Bar: Squircle Clap icon next to Play on the right */}
        <div className="absolute bottom-0 inset-x-0 p-4 pb-[max(20px,env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#15171c] dark:via-[#15171c]/95 z-30 pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePlay}
            disabled={launching || g.playable === false}
            className="flex-1 relative h-12 rounded-[16px] bg-gradient-to-b from-[#ff5b29] via-[#fa4616] to-[#e13b0e] text-white text-[14.5px] font-black tracking-tight select-none overflow-hidden transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[15px] before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none shadow-[0_4px_16px_rgba(250,70,22,0.3)] disabled:opacity-50"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <img
                src="/icons/stopwatch-play-svgrepo-com.svg"
                alt=""
                className="h-[20px] w-[20px] object-contain brightness-0 invert"
              />
              {playLabel}
            </span>
          </button>

          {/* Squircle Clap Button */}
          <button
            type="button"
            onClick={handleClap}
            className="qb-squircle press shrink-0 h-12 px-3.5 rounded-[16px] bg-slate-100 dark:bg-white/[0.08] hover:bg-orange-50 dark:hover:bg-orange-500/10 border border-black/[0.08] dark:border-white/10 flex items-center justify-center gap-1.5 text-[#17191d] dark:text-white transition-all shadow-xs active:scale-95"
            title="Like"
          >
            <ClapIcon className="h-5 w-5 text-[#fa4616]" />
            <span className="text-[12.5px] font-black">{claps}</span>
          </button>
        </div>
      </motion.section>
    </div>
  );
}
