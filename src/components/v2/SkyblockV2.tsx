import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { Progression } from "@/engine-sandbox/skyblock/progression";
import type { WorldEvents } from "@/engine-sandbox/skyblock/world-events";
import { useStore } from "@/engine-sandbox/shared/store";
import { formatClock, useNow } from "./primitives";

export function SkyblockStatus({
  progression,
  events,
  isVisiting = false,
  visitingOwnerName = "",
  playerName = "",
}: {
  progression: Progression;
  events: WorldEvents;
  isVisiting?: boolean;
  visitingOwnerName?: string;
  playerName?: string;
}) {
  const p = useStore(progression.store);
  const e = useStore(events.store);
  const now = useNow(500);
  const span = p.nextLevelXp === null ? 1 : p.nextLevelXp - p.levelFloorXp;
  const pct = p.nextLevelXp === null ? 100 : Math.round(((p.xp - p.levelFloorXp) / span) * 100);

  const displayName = isVisiting
    ? `${visitingOwnerName || "Player"}'s Island`
    : playerName
      ? `${playerName}'s Island`
      : `Island ${p.level}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
      {e.active && !isVisiting && (
        <span className="flex items-center gap-2 rounded-full border border-[#965a2a] bg-gradient-to-b from-[#4a2e18] to-[#251307] px-3.5 py-1.5 text-xs font-lilita text-amber-200 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
          {e.active.name}
          <span className="tabular-nums text-amber-100/70">{formatClock(e.endsAt - now)}</span>
          {e.active.xpMultiplier > 1 && <span className="text-amber-400">{`x${e.active.xpMultiplier} XP`}</span>}
        </span>
      )}
      {/* Wooden Hood-Style Progress Panel - Clickable to open Island Interface */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          window.dispatchEvent(new Event("qb-open-island"));
          window.dispatchEvent(new Event("bm-open-island"));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            window.dispatchEvent(new Event("qb-open-island"));
          }
        }}
        className="wood-panel relative flex min-w-[210px] flex-col gap-1.5 !rounded-[4px] px-3 py-2 cursor-pointer transition-all duration-150 active:scale-95 hover:brightness-110 hover:border-amber-400/50 shadow-md group"
        aria-label={`${displayName}. Click to open island interface`}
        title="Click to open Island Manor & Upgrades"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-lilita text-[13.5px] tracking-wide text-amber-100 flex items-center gap-1.5 truncate max-w-[190px]">
            <span className="tabular-nums text-amber-300 truncate">{displayName}</span>
            {isVisiting ? (
              <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-500/30 border border-blue-400/40 text-blue-200">
                Visitor
              </span>
            ) : (
              <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-400/30 text-amber-200 group-hover:bg-amber-500/40 transition">
                Lv. {p.level}
              </span>
            )}
          </span>
          <span className="text-[11px] font-bold text-amber-200/70 shrink-0">
            {isVisiting ? "Read-Only" : p.title}
          </span>
        </div>
        {/* Wood-grooved progress track with glossy glass finish */}
        <div className="loader-glossy relative h-2.5 overflow-hidden rounded-[2px] border-2 border-[#150b04] bg-[#160c04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.1)]">
          <div
            className={`loader-glossy relative h-full shadow-[0_0_10px_rgba(245,158,11,0.7)] transition-[width] duration-500 overflow-hidden ${
              isVisiting
                ? "bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 w-full"
                : "bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24]"
            }`}
            style={{ width: isVisiting ? "100%" : `${pct}%` }}
          >
            {/* Glossy highlight sheen */}
            <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-white/80 via-white/30 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
          </div>
          <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
        </div>
        <div className="flex justify-between text-[10.5px] font-bold tabular-nums text-amber-200/60">
          {isVisiting ? (
            <>
              <span className="text-sky-300/80">Spectator Mode</span>
              <span className="text-zinc-400">Cannot alter island</span>
            </>
          ) : (
            <>
              <span>{p.xp} XP</span>
              <span>{p.nextLevelXp === null ? "Max" : `${p.nextLevelXp} XP`}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function MilestoneTracker({ progression }: { progression?: Progression }) {
  // Old missions removed per user request: "remove the old missions"
  return null;
}

import { BLOCKS } from "@/engine-sandbox/shared/world";
import { ITEM_INFO } from "@/components/v2/BlockmanInventory";

function getItemName(id: number | string | undefined): string {
  if (id === undefined || id === 0) return "";
  if (typeof id === "string") return ITEM_INFO[id]?.name ?? id.replace(/_/g, " ");
  return BLOCKS.find((b) => b.id === id)?.name ?? "Block";
}

/**
 * Inventory bar — pinned nicely near bottom edge, compact size.
 */
export function V2Hotbar({
  hotbar,
  counts,
  tileUrls,
  slot,
  onSelect,
  isTouch,
  onOpenInventory,
}: {
  hotbar: (number | string)[];
  counts?: number[];
  tileUrls: Record<number | string, string>;
  slot: number;
  onSelect: (i: number) => void;
  isTouch: boolean;
  onOpenInventory?: () => void;
}) {
  const lastTapRef = useRef<{ index: number; time: number }>({ index: -1, time: 0 });

  if (hotbar.length === 0) return null;

  const activeItem = hotbar[slot];
  const activeName = getItemName(activeItem);

  const handleSlotClick = (i: number) => {
    const now = Date.now();
    if (slot === i && lastTapRef.current.index === i && now - lastTapRef.current.time < 350) {
      // Double tap on selected slot drops the item
      window.dispatchEvent(new Event("qb-drop-active-item"));
      lastTapRef.current = { index: -1, time: 0 };
    } else {
      lastTapRef.current = { index: i, time: now };
      onSelect(i);
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[max(5px,calc(env(safe-area-inset-bottom)+3px))] flex flex-col items-center justify-center px-2 scale-[0.78] origin-bottom">
      {/* Selected Item Badge showing clear name + picture in same style as the gems and icons box */}
      {activeName && (
        <div
          className="mb-1.5 px-3 py-1 rounded-[6px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.5)] select-none pointer-events-none animate-in fade-in zoom-in-95 duration-100 flex items-center gap-2 whitespace-nowrap"
          style={{
            background: "rgba(28, 28, 32, 0.88)",
            border: "2px solid rgba(12, 12, 14, 0.95)",
            fontFamily:
              '"InterDisplay", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {tileUrls[activeItem] && (
            <img src={tileUrls[activeItem]} alt="" className="w-4 h-4 object-contain pixelated rounded-sm" />
          )}
          <span
            className="text-[12px] font-bold text-white font-mono tracking-tight leading-none"
            style={{
              textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            }}
          >
            {activeName}
          </span>
        </div>
      )}

      <div
        role="toolbar"
        aria-label="Inventory"
        className="flex max-w-[min(98vw,620px)] gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {hotbar.map((id, i) => {
          const active = slot === i;
          const count = counts?.[i] ?? (typeof id === "number" ? 64 : String(id).includes("sword") || String(id).includes("staff") || id === "shield" ? 1 : 16);
          return (
            <button
              key={`${id}-${i}`}
              type="button"
              onClick={() => handleSlotClick(i)}
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
                  {id !== 0 && count > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 font-lilita text-[10px] text-white [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none pointer-events-none select-none">
                      {count}
                    </span>
                  )}
                </>
              ) : id === "dark_magic_staff" ? (
                <>
                  <span className="text-[18px] leading-none drop-shadow">🔮</span>
                  {count > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 font-lilita text-[10px] text-white [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none pointer-events-none select-none">
                      {count}
                    </span>
                  )}
                </>
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
