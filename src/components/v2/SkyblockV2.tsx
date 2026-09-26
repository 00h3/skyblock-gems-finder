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
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
      {e.active && (
        <span className="v2-pill v2-anim-drop border-v2-sun/60 bg-v2-sun/95 text-v2-ink">
          {e.active.name} - {formatClock(e.endsAt - now)}
          {e.active.xpMultiplier > 1 && <span className="opacity-70">x{e.active.xpMultiplier} XP</span>}
        </span>
      )}
      <div className="v2-pill h-auto flex-col items-stretch gap-1 py-1.5 pr-3" aria-label={`Island level ${p.level}, ${pct} percent to next level`}>
        <div className="flex items-center justify-between gap-3">
          <span>Island Lv {p.level}</span>
          <span className="font-sans text-[11px] font-semibold text-white/65">{p.title}</span>
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-v2-sun transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export function MilestoneTracker({ progression }: { progression: Progression }) {
  useStore(progression.store);
  const next = progression.upcoming(2);
  if (next.length === 0) return null;
  return (
    <aside
      aria-label="Milestones"
      className="pointer-events-none absolute left-3 top-[calc(max(12px,env(safe-area-inset-top)+8px)+60px)] hidden w-56 flex-col gap-1.5 sm:left-5 sm:flex landscape:flex"
    >
      {next.map((m) => (
        <div key={m.id} className="rounded-[12px] bg-v2-ink/55 px-3 py-2 text-white">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="truncate">{m.label}</span>
            <span className="tabular-nums text-white/70">
              {m.progress}/{m.target}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-v2-mint" style={{ width: `${(m.progress / m.target) * 100}%` }} />
          </div>
        </div>
      ))}
    </aside>
  );
}

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
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 flex justify-center px-3",
        isTouch
          ? "bottom-[calc(max(18px,env(safe-area-inset-bottom)+12px)+var(--k)*3+24px)] landscape:bottom-[max(14px,env(safe-area-inset-bottom)+8px)]"
          : "bottom-[max(16px,env(safe-area-inset-bottom)+10px)]",
      )}
    >
      <div
        role="toolbar"
        aria-label="Hotbar"
        className="flex max-w-[min(92vw,640px)] gap-1 overflow-x-auto rounded-[16px] border-2 border-v2-plum-deep bg-v2-ink/60 p-1.5 [scrollbar-width:none] landscape:max-w-[42vw] lg:landscape:max-w-[640px]"
      >
        {hotbar.map((id, i) => (
          <button
            key={`${id}-${i}`}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Slot ${i + 1}`}
            aria-pressed={slot === i}
            className={cn(
              "relative grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border-2 transition-transform active:scale-90",
              slot === i ? "scale-105 border-v2-sun bg-white/25" : "border-transparent bg-white/10",
            )}
          >
            {tileUrls[id] ? (
              <img src={tileUrls[id]} alt="" draggable={false} className="h-7 w-7 rounded-[4px] object-cover [image-rendering:pixelated]" />
            ) : null}
            {!isTouch && i < 9 && (
              <span className="absolute left-1 top-0.5 text-[10px] text-white/80">{i + 1}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Crosshair() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-1/2 top-1/2 z-[90] -translate-x-1/2 -translate-y-1/2">
      <div className="relative h-5 w-5">
        <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded bg-white/85 shadow-[0_0_2px_rgba(0,0,0,.6)]" />
        <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded bg-white/85 shadow-[0_0_2px_rgba(0,0,0,.6)]" />
      </div>
    </div>
  );
}
