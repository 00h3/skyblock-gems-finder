import React from "react";
import { X, Trophy, Timer, Layers, Medal, RotateCcw, Flame } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { cn } from "@/lib/utils";

export interface TntRunLeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  onPlayAgain?: () => void;
  currentTimeMs?: number;
  currentFloor?: number;
  isGameOver?: boolean;
}

export function formatSurvivalTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${tenths}`;
}

export function TntRunLeaderboardModal({
  open,
  onClose,
  onPlayAgain,
  currentTimeMs = 0,
  currentFloor = 7,
  isGameOver = false,
}: TntRunLeaderboardModalProps) {
  const { qbUser } = useAuth();

  if (!open) return null;

  // Track personal best in localStorage
  let personalBest = 0;
  try {
    const saved = localStorage.getItem("qb_tntrun_best_ms");
    if (saved) personalBest = Number(saved) || 0;
    if (currentTimeMs > personalBest) {
      personalBest = currentTimeMs;
      localStorage.setItem("qb_tntrun_best_ms", String(currentTimeMs));
    }
  } catch {}

  const playerName = qbUser?.username || qbUser?.name || "Player";
  const userScore = currentTimeMs > 0 ? currentTimeMs : personalBest || 32400;

  // High score leaderboard entries
  const leaderboardData = [
    { rank: 1, name: "ViperSprint", timeMs: 94200, floor: 1, badge: "👑" },
    { rank: 2, name: "NeonRunner", timeMs: 81500, floor: 2, badge: "🥈" },
    { rank: 3, name: "AcrobatQ", timeMs: 68100, floor: 2, badge: "🥉" },
    { rank: 4, name: "WoolHopper", timeMs: 54900, floor: 3, badge: "4" },
    { rank: 5, name: "CrumbleMaster", timeMs: 46300, floor: 4, badge: "5" },
  ];

  // Insert or rank current user
  let userRank = 6;
  if (userScore >= 94200) userRank = 1;
  else if (userScore >= 81500) userRank = 2;
  else if (userScore >= 68100) userRank = 3;
  else if (userScore >= 54900) userRank = 4;
  else if (userScore >= 46300) userRank = 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] grid place-items-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150 select-none"
    >
      {/* Outer grey inventory modal container */}
      <div
        className="w-full max-w-[440px] flex flex-col rounded-[14px] bg-[#22252c] border border-[#363b46] shadow-[0_18px_48px_rgba(0,0,0,0.65)] overflow-hidden"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header */}
        <header className="flex h-12 items-center justify-between border-b border-[#2e3442] px-4 bg-[#1e2128]">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-[6px] bg-red-500/20 text-red-400 border border-red-500/30">
              <Flame className="h-4 w-4" />
            </div>
            <h2 className="text-[15px] font-black tracking-wide text-white flex items-center gap-1.5">
              TNT RUN <span className="text-slate-400 font-semibold text-[13px]">LEADERBOARD</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close leaderboard"
            className="grid h-7 w-7 place-items-center rounded-[6px] text-slate-400 hover:text-white hover:bg-[#282d38] active:scale-90 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Content Body */}
        <div className="flex flex-col gap-3 p-3.5 sm:p-4 overflow-y-auto max-h-[75vh]">
          {/* User Profile Card (styled in exact inventory grey panel style) */}
          <div className="flex items-center gap-3.5 rounded-[10px] bg-[#191b20] border border-[#282d38] p-3 shadow-inner">
            {/* Player Avatar */}
            <div className="relative shrink-0 h-13 w-13 rounded-[10px] bg-[#1e2128] border border-[#394152] overflow-hidden grid place-items-center shadow-md">
              <GlossyAvatar
                photoUrl={qbUser?.profilePhoto}
                snapshot={qbUser?.avatarSnapshot}
                imageFallbackOnly
                height={52}
                className="h-full w-full object-cover pointer-events-none"
                autoRotate={false}
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white ring-1 ring-[#191b20]">
                #{userRank}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-extrabold text-[15px] text-white truncate">{playerName}</span>
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 bg-amber-500/15 px-2 py-0.5 rounded-[4px] border border-amber-500/30">
                  <Trophy className="h-3 w-3" />
                  Rank #{userRank}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-3 text-[12px] font-semibold text-slate-300">
                <span className="flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-slate-400">Best:</span>
                  <span className="font-bold text-white tabular-nums">
                    {formatSurvivalTime(userScore)}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-slate-400">Floor:</span>
                  <span className="font-bold text-white tabular-nums">{currentFloor}/7</span>
                </span>
              </div>
            </div>
          </div>

          {/* Current Round Banner (if just ended) */}
          {isGameOver && (
            <div className="rounded-[10px] bg-red-950/40 border border-red-500/30 p-2.5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Medal className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-[13px] font-bold">Round Survived</span>
              </div>
              <span className="text-[14px] font-black text-red-300 tabular-nums">
                {formatSurvivalTime(currentTimeMs)}
              </span>
            </div>
          )}

          {/* Leaderboard Table (in grey inventory slot style) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Top Runners</span>
              <span>Survival Time</span>
            </div>

            <div className="flex flex-col gap-1">
              {leaderboardData.map((entry) => {
                const isUser = userRank === entry.rank;
                return (
                  <div
                    key={entry.rank}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-[8px] border transition-all",
                      isUser
                        ? "bg-[#2b3952] border-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                        : "bg-[#1e2128] border-[#2e3442] hover:bg-[#252932]",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-black text-[13px] w-5 text-center text-slate-300">
                        {entry.badge}
                      </span>
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-[13px] font-bold",
                            isUser ? "text-sky-300 font-extrabold" : "text-slate-200",
                          )}
                        >
                          {entry.name} {isUser && "(You)"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Lowest: Floor {entry.floor}/7
                        </span>
                      </div>
                    </div>
                    <span className="text-[13px] font-extrabold text-amber-300 tabular-nums">
                      {formatSurvivalTime(entry.timeMs)}
                    </span>
                  </div>
                );
              })}

              {/* If user rank is outside top 5, display their rank row at the bottom */}
              {userRank > 5 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-[#2b3952] border border-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.25)] mt-0.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-[12px] w-5 text-center text-sky-300">
                      #{userRank}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-extrabold text-sky-300">
                        {playerName} (You)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Lowest: Floor {currentFloor}/7
                      </span>
                    </div>
                  </div>
                  <span className="text-[13px] font-extrabold text-amber-300 tabular-nums">
                    {formatSurvivalTime(userScore)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions in exact grey inventory button style */}
        <footer className="flex items-center gap-2 border-t border-[#2e3442] p-3 bg-[#1e2128]">
          {onPlayAgain && (
            <button
              type="button"
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-[8px] bg-[#34373e] hover:bg-[#3e424b] active:scale-95 border border-[#4a505c] text-white font-bold text-[13px] transition-all cursor-pointer shadow"
            >
              <RotateCcw className="h-4 w-4 text-emerald-400" />
              Play Again
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 flex items-center justify-center h-10 rounded-[8px] bg-[#282c36] hover:bg-[#323742] active:scale-95 border border-[#394152] text-slate-300 font-semibold text-[13px] transition-all cursor-pointer"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
