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
        <span className="v2-pill v2-anim-drop gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-v2-sun" aria-hidden="true" />
          {e.active.name}
          <span className="tabular-nums text-white/60">{formatClock(e.endsAt - now)}</span>
          {e.active.xpMultiplier > 1 && <span className="text-v2-sun">{`x${e.active.xpMultiplier} XP`}</span>}
        </span>
      )}
      <div
        className="v2-glass flex min-w-[196px] flex-col gap-1.5 rounded-[14px] px-3.5 py-2.5"
        aria-label={`Island level ${p.level}, ${pct} percent to next level`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-white">
            Island <span className="tabular-nums">{p.level}</span>
          </span>
          <span className="text-[11px] font-medium text-white/55">{p.title}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/12">
          <div className="h-full rounded-full bg-v2-plum transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-[10.5px] font-medium tabular-nums text-white/45">
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
      aria-label="Milestones"
      className="pointer-events-none absolute left-3 top-[calc(max(12px,env(safe-area-inset-top)+8px)+60px)] hidden w-60 flex-col gap-2 sm:left-5 sm:flex landscape:flex"
    >
      <div className="flex items-center justify-between px-1">
        <span className="v2-eyebrow">Milestones</span>
        <span className="text-[11px] font-medium tabular-nums text-white/45">{s.completed.length} done</span>
      </div>
      {next.map((m, i) => {
        const pct = Math.round((m.progress / m.target) * 100);
        return (
          <div
            key={m.id}
            className={cn("v2-glass rounded-[14px] px-3.5 py-2.5 text-white", i > 0 && "opacity-75")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12.5px]">{m.label}</span>
              <span className="shrink-0 rounded-full bg-v2-plum/25 px-1.5 py-0.5 text-[10px] text-v2-sun">
                +{m.rewardXp}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-v2-plum transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10.5px] font-medium tabular-nums text-white/55">
                {m.progress}/{m.target}
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
}: {
  hotbar: (number | string)[];
  tileUrls: Record<number | string, string>;
  slot: number;
  onSelect: (i: number) => void;
  isTouch: boolean;
}) {
  if (hotbar.length === 0) return null;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[max(10px,calc(env(safe-area-inset-bottom)+6px))] flex justify-center px-3">
      <div
        role="toolbar"
        aria-label="Inventory"
        className="v2-glass flex max-w-[min(94vw,620px)] gap-1 overflow-x-auto rounded-[16px] p-1.5 [scrollbar-width:none]"
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
                "relative grid h-11 w-11 shrink-0 place-items-center rounded-[11px] transition-[background-color,transform] duration-100 active:scale-95",
                active ? "bg-white/90 ring-2 ring-v2-plum" : "bg-white/[0.06] hover:bg-white/12",
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
                    active ? "text-v2-ink/60" : "text-white/50",
                  )}
                >
                  {i + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CinematicVignette() {
  return <div aria-hidden="true" className="v2-vignette pointer-events-none fixed inset-0 -z-10" />;
}

export function Crosshair() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-1/2 top-1/2 z-[90] -translate-x-1/2 -translate-y-1/2">
      <div className="relative h-4 w-4">
        <span className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 rounded bg-white/90 shadow-[0_0_2px_rgba(0,0,0,.5)]" />
        <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded bg-white/90 shadow-[0_0_2px_rgba(0,0,0,.5)]" />
      </div>
    </div>
  );
}
