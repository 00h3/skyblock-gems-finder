import { useState } from "react";
import { Clock, Layers, Trophy, Users } from "lucide-react";
import { LeaderboardList, LeaderboardPanel } from "./LeaderboardPanel";

export type BlockFallResult = { won: boolean; place: number; time: number };

type Props = {
  state: "waiting" | "playing" | "eliminated";
  countdown: number;
  alive: number;
  total: number;
  floor: number;
  time: number;
  result: BlockFallResult | null;
  myId?: string;
  onPlayAgain: () => void;
  onLeave: () => void;
};

const chip = "flex items-center gap-1.5 rounded-2xl border border-white/10 bg-black/70 px-3 py-1.5 text-sm text-white";

export function BlockFallOverlay({ state, countdown, alive, total, floor, time, result, myId, onPlayAgain, onLeave }: Props) {
  const [boardOpen, setBoardOpen] = useState(false);

  return (
    <div className="font-lilita pointer-events-none fixed inset-0 z-[110] select-none">
      <div className="absolute left-1/2 top-[max(16px,calc(env(safe-area-inset-top)+10px))] flex -translate-x-1/2 items-center gap-1.5">
        <span className={chip}>
          <Users className="h-3.5 w-3.5 text-white/60" aria-hidden />
          <span className="tabular-nums">
            {alive + (state === "eliminated" ? 0 : 1)}/{total + 1}
          </span>
        </span>
        <span className={chip}>
          <Clock className="h-3.5 w-3.5 text-white/60" aria-hidden />
          <span className="tabular-nums">{time}s</span>
        </span>
        <span className={`${chip} hidden sm:flex`}>
          <Layers className="h-3.5 w-3.5 text-white/60" aria-hidden />
          <span>FL {floor}/5</span>
        </span>
      </div>

      <button
        type="button"
        aria-label="Open leaderboard"
        onClick={() => setBoardOpen(true)}
        className="pointer-events-auto absolute right-4 top-[max(16px,calc(env(safe-area-inset-top)+10px))] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/70 text-amber-300 active:scale-90 sm:right-6"
      >
        <Trophy className="h-5 w-5" />
      </button>

      {state === "waiting" && (
        <div className="absolute inset-x-0 top-[26%] flex flex-col items-center gap-1 text-white">
          <span className="text-sm tracking-[0.2em] text-white/60">STARTING IN</span>
          <span key={countdown} className="animate-in zoom-in-50 fade-in text-7xl leading-none duration-300 [text-shadow:0_4px_24px_rgba(0,0,0,.6)]">
            {countdown}
          </span>
          <span className="mt-1 rounded-2xl bg-black/60 px-3 py-1 text-xs text-white/70">
            Keep moving. Tiles fall after you step on them.
          </span>
        </div>
      )}

      {state === "eliminated" && result && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/55 p-4">
          <div className="animate-in zoom-in-95 fade-in w-full max-w-xs rounded-[28px] border border-white/10 bg-black/90 p-5 text-white shadow-2xl duration-200">
            <p className="text-center text-sm tracking-[0.2em] text-white/50">{result.won ? "VICTORY" : "ELIMINATED"}</p>
            <p className={`text-center text-5xl ${result.won ? "text-amber-300" : "text-white"}`}>#{result.place}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-white/[0.06] py-2">
                <p className="text-xs text-white/50">Survived</p>
                <p className="text-lg tabular-nums">{result.time}s</p>
              </div>
              <div className="rounded-2xl bg-white/[0.06] py-2">
                <p className="text-xs text-white/50">Players</p>
                <p className="text-lg tabular-nums">{total + 1}</p>
              </div>
            </div>
            <p className="mb-2 mt-4 text-sm text-white/60">Top survivors</p>
            <LeaderboardList mode="blockfall" myId={myId} />
            {!myId && <p className="mt-2 text-center text-xs text-white/50">Log in to save your score</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onLeave} className="h-11 flex-1 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95">
                Leave
              </button>
              <button type="button" onClick={onPlayAgain} className="h-11 flex-[2] rounded-2xl bg-white text-black hover:bg-white/90 active:scale-95">
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {boardOpen && (
        <div className="pointer-events-auto">
          <LeaderboardPanel mode="blockfall" myId={myId} onClose={() => setBoardOpen(false)} />
        </div>
      )}
    </div>
  );
}
