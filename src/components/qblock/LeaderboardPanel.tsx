import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { subscribeLeaderboard, type GameMode, type LeaderboardEntry } from "@/lib/qblock-leaderboard";

export function LeaderboardList({ mode, myId }: { mode: GameMode; myId?: string }) {
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  useEffect(() => subscribeLeaderboard(mode, setRows), [mode]);

  return (
    <ol className="flex max-h-[42vh] flex-col gap-1 overflow-y-auto">
      {rows === null && <li className="py-5 text-center text-sm text-white/50">Loading...</li>}
      {rows?.length === 0 && <li className="py-5 text-center text-sm text-white/50">No scores yet. Be the first.</li>}
      {rows?.map((r, i) => (
        <li
          key={r.id}
          className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${r.id === myId ? "bg-white text-black" : "bg-white/[0.06] text-white"}`}
        >
          <span className={`w-5 text-center text-sm ${r.id === myId ? "text-black/60" : i < 3 ? "text-amber-300" : "text-white/40"}`}>
            {i + 1}
          </span>
          <span className="flex-1 truncate">{r.name}</span>
          <span className="tabular-nums">{mode === "blockfall" ? `${r.score}s` : r.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardPanel({ mode, myId, onClose }: { mode: GameMode; myId?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Leaderboard"
        className="font-lilita w-full max-w-xs rounded-[28px] border border-white/10 bg-black/90 p-4 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl tracking-wide">Leaderboard</h2>
          <button
            type="button"
            aria-label="Close leaderboard"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <LeaderboardList mode={mode} myId={myId} />
        {!myId && <p className="mt-3 text-center text-xs text-white/50">Log in to save your score</p>}
      </div>
    </div>
  );
}
