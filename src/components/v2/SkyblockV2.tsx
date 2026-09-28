import { cn } from "@/lib/utils";
import type { Progression } from "@/engine/v2/progression";
import type { WorldEvents } from "@/engine/v2/world-events";
import { useStore } from "@/engine/v2/store";
import { formatClock, useNow } from "./primitives";

export function SkyblockStatus({ progression, events }: { progression: Progression; events: WorldEvents }) {
  const p = useStore(progression.store);
  const e = useStore(events.store);
  const now = useNow(500);
  const span = p.nextLevelXp === null ? 1 : p.nextLevelXp - p.levelFloorXp;
  const pct = p.nextLevelXp === null ? 100 : Math.round(((p.xp - p.levelFloorXp) / span) * 100);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
      {e.active && (
        <span className="flex items-center gap-2 rounded-full border border-[#965a2a] bg-gradient-to-b from-[#4a2e18] to-[#251307] px-3.5 py-1.5 text-xs font-lilita text-amber-200 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
          {e.active.name}
          <span className="tabular-nums text-amber-100/70">{formatClock(e.endsAt - now)}</span>
          {e.active.xpMultiplier > 1 && <span className="text-amber-400">{`x${e.active.xpMultiplier} XP`}</span>}
        </span>
      )}
      {/* Wooden Hood-Style Progress Panel */}
      <div
        className="wood-panel relative flex min-w-[210px] flex-col gap-1.5 !rounded-[4px] px-3 py-2"
        aria-label={`Island level ${p.level}, ${pct} percent to next level`}
      >

        <div className="flex items-baseline justify-between gap-3">
          <span className="font-lilita text-[14px] tracking-wide text-amber-100">
            Island <span className="tabular-nums text-amber-300">{p.level}</span>
          </span>
          <span className="text-[11px] font-bold text-amber-200/70">{p.title}</span>
        </div>
        {/* Wood-grooved progress track */}
        <div className="h-2.5 overflow-hidden rounded-[2px] border-2 border-[#150b04] bg-[#160c04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
          <div
            className="h-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10.5px] font-bold tabular-nums text-amber-200/60">
          <span>{p.xp} XP</span>
          <span>{p.nextLevelXp === null ? "Max" : `${p.nextLevelXp} XP`}</span>
        </div>
      </div>
    </div>
  );
}

export function MilestoneTracker({ progression }: { progression: Progression }) {
  const s = useStore(progression.store);
  const next = progression.upcoming(3);
  if (next.length === 0) return null;
  return (
    <aside
      aria-label="Quests"
      className="pointer-events-none absolute left-3 top-[calc(max(12px,env(safe-area-inset-top)+8px)+60px)] z-30 flex w-56 flex-col gap-2 sm:left-5 sm:w-64"
    >
      <div className="flex items-center justify-between px-1">
        <span className="font-lilita text-[13px] tracking-wide text-amber-200 drop-shadow-sm">Quests & Milestones</span>
        <span className="text-[11px] font-bold tabular-nums text-amber-100/60">{s.completed.length} done</span>
      </div>
      {next.map((m, i) => {
        const pct = Math.round((m.progress / m.target) * 100);
        return (
          <div
            key={m.id}
            className={cn(
              "wood-panel pointer-events-auto relative flex flex-col gap-1.5 !rounded-[4px] border-2 border-[#150b04] bg-[#2a170b] px-3 py-2 shadow-md",
              i > 0 && "opacity-95",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-lilita text-[13px] tracking-wide text-amber-100 leading-tight">
                🪵 {m.label}
              </span>
              <span className="shrink-0 rounded-[2px] border border-[#150b04] bg-[#160c04] px-1.5 py-0.5 font-lilita text-[10.5px] text-amber-300">
                +{m.rewardXp} XP
              </span>
            </div>
            {/* Wood-grooved progress track matching island progress */}
            <div className="h-2.5 overflow-hidden rounded-[2px] border-2 border-[#150b04] bg-[#160c04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
              <div
                className="h-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold tabular-nums text-amber-200/70">
              <span>Quest progress</span>
              <span>
                {m.progress} / {m.target}
              </span>
            </div>
          </div>
        );
      })}
    </aside>
  );
}

/**
 * Inventory bar — always pinned to the bottom edge. On touch the D-pad and
 * action keys are lifted above it by V2GameHud (see `hasHotbar`).
 */
export function V2Hotbar({
  hotbar,
  tileUrls,
  slot,
  onSelect,
  isTouch,
  onOpenInventory,
}: {
  hotbar: (number | string)[];
  tileUrls: Record<number | string, string>;
  slot: number;
  onSelect: (i: number) => void;
  isTouch: boolean;
  onOpenInventory?: () => void;
}) {
  if (hotbar.length === 0) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[max(10px,calc(env(safe-area-inset-bottom)+6px))] flex justify-center px-3">
      <div
        role="toolbar"
        aria-label="Inventory"
        className="flex max-w-[min(94vw,620px)] gap-0.5 overflow-x-auto [scrollbar-width:none]"
      >
        {hotbar.map((id, i) => {
          const active = slot === i;
          return (
            <button
              key={`${id}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Slot ${i + 1}`}
              aria-pressed={active}
              className={cn(
                "blockman-slot relative grid h-11 w-11 shrink-0 place-items-center rounded-[4px] transition-transform duration-100 active:scale-95",
              )}
            >
              {tileUrls[id] ? (
                <img
                  src={tileUrls[id]}
                  alt=""
                  draggable={false}
                  className="h-7 w-7 rounded-[4px] object-cover [image-rendering:pixelated]"
                />
              ) : null}
              {!isTouch && i < 9 && (
                <span
                  className={cn(
                    "absolute left-1 top-0.5 text-[9.5px] font-semibold tabular-nums",
                    active ? "text-white" : "text-white/50",
                  )}
                >
                  {i + 1}
                </span>
              )}
            </button>
          );
        })}
        {onOpenInventory && (
          <button
            type="button"
            onClick={onOpenInventory}
            aria-label="Open inventory"
            className="blockman-slot grid h-11 w-11 shrink-0 place-items-center rounded-[4px] text-[18px] font-black leading-none tracking-[0.1em] text-white/85 active:scale-95"
          >
            {"•••"}
          </button>
        )}
      </div>
    </div>
  );
}

export function CinematicVignette() {
  return <div aria-hidden="true" className="v2-vignette pointer-events-none fixed inset-0 -z-10" />;
}

export function Crosshair() {
  return null;
}
