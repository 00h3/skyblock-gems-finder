import { cn } from "@/lib/utils";
import type { Progression } from "@/engine-sandbox/skyblock/progression";
import type { WorldEvents } from "@/engine-sandbox/skyblock/world-events";
import { useStore } from "@/engine-sandbox/shared/store";
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
        {/* Wood-grooved progress track with glossy glass finish */}
        <div className="loader-glossy relative h-2.5 overflow-hidden rounded-[2px] border-2 border-[#150b04] bg-[#160c04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.1)]">
          <div
            className="loader-glossy relative h-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] shadow-[0_0_10px_rgba(245,158,11,0.7)] transition-[width] duration-500 overflow-hidden"
            style={{ width: `${pct}%` }}
          >
            {/* Glossy highlight sheen */}
            <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
          </div>
          <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        </div>
        <div className="flex justify-between text-[10.5px] font-bold tabular-nums text-amber-200/60">
          <span>{p.xp} XP</span>
          <span>{p.nextLevelXp === null ? "Max" : `${p.nextLevelXp} XP`}</span>
        </div>
      </div>
    </div>
  );
}

export function MilestoneTracker({ progression }: { progression?: Progression }) {
  // Old missions removed per user request: "remove the old missions"
  return null;
}

/**
 * Inventory bar — pinned nicely near bottom edge, compact size.
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
    <div className="pointer-events-auto absolute inset-x-0 bottom-[max(5px,calc(env(safe-area-inset-bottom)+3px))] flex justify-center px-2 scale-[0.78] origin-bottom">
      <div
        role="toolbar"
        aria-label="Inventory"
        className="flex max-w-[min(98vw,620px)] gap-1 overflow-x-auto [scrollbar-width:none]"
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
                "blockman-slot relative grid h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 place-items-center rounded-[4px] transition-transform duration-100 active:scale-95",
              )}
            >
              {tileUrls[id] ? (
                <>
                  <img
                    src={tileUrls[id]}
                    alt=""
                    draggable={false}
                    className="h-6.5 w-6.5 sm:h-7 sm:w-7 rounded-[3px] object-cover [image-rendering:pixelated]"
                  />
                  {id !== 0 && (
                    <span className="absolute bottom-0.5 right-0.5 font-lilita text-[10px] text-white [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none pointer-events-none select-none">
                      {typeof id === "number" ? 64 : String(id).includes("sword") || String(id).includes("staff") || id === "shield" ? 1 : 16}
                    </span>
                  )}
                </>
              ) : id === "dark_magic_staff" ? (
                <span className="text-[18px] leading-none drop-shadow">🔮</span>
              ) : null}
              {!isTouch && i < 9 && (
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 text-[8.5px] font-semibold tabular-nums",
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
            className="blockman-slot grid h-9.5 w-9.5 sm:h-10 sm:w-10 shrink-0 place-items-center rounded-[4px] text-[15px] font-black leading-none tracking-[0.1em] text-white/85 active:scale-95"
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
