import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { GameMode } from "@/game/qblock/engine";
import { subscribeLeaderboard, type LeaderboardEntry } from "@/lib/qblock-leaderboard";
import { GemIcon, LILITA } from "./QblockHud";

const MEDALS = ["#f5c542", "#c9d3dd", "#d98b4a"];

export function LeaderboardPanel({ mode, myId, onClose }: { mode: GameMode; myId?: string; onClose: () => void }) {
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  useEffect(() => subscribeLeaderboard(mode, setRows), [mode]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Leaderboard"
        className="w-full max-w-sm overflow-hidden rounded-2xl border-4 border-[#1d1450] bg-[#4a3d8f] shadow-[0_6px_0_rgba(0,0,0,.4)]"
        style={LILITA}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#2f2566] px-4 py-2 text-white">
          <h2 className="text-xl tracking-wide">{mode === "skyblock" ? "Top Miners" : "Block Fall Legends"}</h2>
          <button type="button" aria-label="Close leaderboard" onClick={onClose} className="rounded-lg bg-white/15 p-1 hover:bg-white/25">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="max-h-[55vh] space-y-1.5 overflow-y-auto p-3">
          {rows === null && <li className="py-6 text-center text-white/80">Loading...</li>}
          {rows?.length === 0 && <li className="py-6 text-center text-white/80">No scores yet. Be the first!</li>}
          {rows?.map((r, i) => (
            <li
              key={r.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-white ${r.id === myId ? "bg-[#35e0a1]/30 ring-2 ring-[#35e0a1]" : "bg-black/20"}`}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-[#1d1450]"
                style={{ background: MEDALS[i] ?? "rgba(255,255,255,.8)" }}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate">{r.name}</span>
              <span className="flex items-center gap-1">
                {mode === "skyblock" ? <GemIcon /> : null}
                {mode === "skyblock" ? r.score : `${r.score}s`}
              </span>
            </li>
          ))}
        </ol>
        {!myId && <p className="px-4 pb-3 text-center text-sm text-white/80">Log in to save your score</p>}
      </div>
    </div>
  );
}
