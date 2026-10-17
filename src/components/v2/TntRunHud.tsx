import React, { useEffect } from "react";
import { Trophy, Layers, Timer, Users, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSurvivalTime } from "./TntRunLeaderboardModal";
import { GameAudio } from "@/lib/game-audio";

export interface TntRunHudProps {
  floor: number;
  timeSurvivedMs: number;
  phase: "lobby" | "countdown" | "playing" | "gameover";
  countdownSeconds: number;
  onOpenLeaderboard: () => void;
}

const BIG_NUMBER_STYLE = { textShadow: "0 6px 30px rgba(0,0,0,.65), 0 2px 8px rgba(0,0,0,0.8)" };

export function TntRunStatus({
  floor,
  timeSurvivedMs,
  onOpenLeaderboard,
}: {
  floor: number;
  timeSurvivedMs: number;
  onOpenLeaderboard: () => void;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      {/* Floor Indicator */}
      <span className="flex items-center gap-1.5 rounded-[8px] bg-[#22252c]/90 border border-[#363b46] px-2.5 py-1 text-[12px] font-extrabold text-white shadow-md backdrop-blur-sm">
        <Layers className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-slate-400">Floor</span>
        <span className="text-white font-black">{floor}/7</span>
      </span>

      {/* Timer */}
      <span className="flex items-center gap-1.5 rounded-[8px] bg-[#22252c]/90 border border-[#363b46] px-2.5 py-1 text-[12px] font-extrabold text-white shadow-md backdrop-blur-sm">
        <Timer className="h-3.5 w-3.5 text-sky-400" />
        <span className="tabular-nums font-black">{formatSurvivalTime(timeSurvivedMs)}</span>
      </span>

      {/* Leaderboard Button in exact grey inventory square style */}
      <button
        type="button"
        onClick={onOpenLeaderboard}
        className="relative grid h-8 w-8 place-items-center rounded-[8px] bg-[#34373e] hover:bg-[#3e424b] active:scale-95 border border-[#4a505c] transition-all cursor-pointer shadow-md select-none"
        aria-label="Open TNT Run Leaderboard"
        title="Leaderboard"
      >
        <Trophy className="h-4 w-4 text-amber-400 drop-shadow-sm" />
      </button>
    </div>
  );
}

export function TntRunCountdownOverlay({
  phase,
  countdownSeconds,
  isGoVisible,
}: {
  phase: "countdown" | "playing" | "lobby" | "gameover";
  countdownSeconds: number;
  isGoVisible: boolean;
}) {
  useEffect(() => {
    if (phase === "countdown" && countdownSeconds > 0) {
      GameAudio.playPop();
    } else if (isGoVisible) {
      GameAudio.playLevelUp();
    }
  }, [phase, countdownSeconds, isGoVisible]);

  if (phase === "countdown") {
    return (
      <div className="v2-ui pointer-events-none fixed inset-0 z-[120] grid place-items-center animate-in zoom-in-75 duration-200">
        <div className="flex flex-col items-center">
          <span
            key={countdownSeconds}
            className="text-[clamp(110px,28vmin,200px)] font-black text-amber-300 leading-none drop-shadow-2xl animate-bounce"
            style={BIG_NUMBER_STYLE}
          >
            {countdownSeconds}
          </span>
          <span className="mt-2 text-[18px] font-black uppercase tracking-[0.2em] text-white/90 bg-black/40 px-4 py-1 rounded-full border border-white/20">
            Get Ready to Run!
          </span>
        </div>
      </div>
    );
  }

  if (isGoVisible) {
    return (
      <div className="v2-ui pointer-events-none fixed inset-0 z-[120] grid place-items-center animate-out fade-out zoom-out-95 duration-700">
        <span
          className="text-[clamp(100px,26vmin,180px)] font-black text-emerald-400 leading-none drop-shadow-2xl"
          style={BIG_NUMBER_STYLE}
        >
          GO!
        </span>
      </div>
    );
  }

  return null;
}
