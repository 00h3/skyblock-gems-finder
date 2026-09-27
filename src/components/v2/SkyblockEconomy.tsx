import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BLOCKS } from "@/engine/world";
import { useStore } from "@/engine/v2/store";
import type { Progression } from "@/engine/v2/progression";
import { ISLAND_TIERS, MILESTONES } from "@/engine/v2/progression";
import {
  GENERATORS,
  MAX_GENERATOR_LEVEL,
  RARITY_LABEL,
  buyPrice,
  generatorCost,
  generatorInterval,
  rarityOf,
  sellPrice,
  type Economy,
  type Rarity,
} from "@/engine/v2/economy";
import { formatClock, useNow } from "./primitives";

const RARITY_TEXT: Record<Rarity, string> = {
  common: "text-white/50",
  uncommon: "text-v2-mint",
  rare: "text-sky-300",
  epic: "text-v2-sun",
  legendary: "text-amber-300",
};

const nameOf = (id: number) => BLOCKS.find((b) => b.id === id)?.name ?? `Block ${id}`;
const fmt = (n: number) => n.toLocaleString("en-US");

export function CoinMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300 shadow-[inset_0_-1px_0_rgba(0,0,0,.25)]",
        className,
      )}
    />
  );
}

export function CoinPill({ economy, onOpen }: { economy: Economy; onOpen: () => void }) {
  const { coins } = useStore(economy.store);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="v2-pill pointer-events-auto cursor-pointer gap-2 transition-colors hover:bg-white/10"
      aria-label={`${coins} coins. Open island menu`}
    >
      <CoinMark />
      <span className="tabular-nums">{fmt(coins)}</span>
      <span className="text-white/45">Island</span>
      <kbd className="hidden rounded bg-white/10 px-1 text-[10px] font-semibold text-white/60 sm:inline">E</kbd>
    </button>
  );
}

type Tab = "inventory" | "shop" | "generators" | "quests";
const TABS: { id: Tab; label: string }[] = [
  { id: "inventory", label: "Inventory" },
  { id: "shop", label: "Shop" },
  { id: "generators", label: "Generators" },
  { id: "quests", label: "Quests" },
];

export function IslandPanel({
  economy,
  progression,
  tileUrls,
  slot,
  onClose,
}: {
  economy: Economy;
  progression: Progression;
  tileUrls: Record<number | string, string>;
  slot: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("inventory");
  const { coins } = useStore(economy.store);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="v2-ui pointer-events-auto fixed inset-0 z-[160] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="island-panel-title"
        onClick={(e) => e.stopPropagation()}
        className="v2-panel v2-anim-pop flex max-h-[92dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-b-none sm:rounded-[20px]"
      >
        <header className="flex flex-col gap-4 border-b border-white/10 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <IslandSummary progression={progression} />
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-[13px] font-semibold tabular-nums">
                <CoinMark />
                {fmt(coins)}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-white/[0.06] text-[15px] text-white/70 transition-colors hover:bg-white/12 hover:text-white"
                aria-label="Close island menu"
              >
                {"\u00d7"}
              </button>
            </div>
          </div>
          <nav role="tablist" aria-label="Island menu" className="flex gap-1 rounded-[12px] bg-white/[0.05] p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 cursor-pointer rounded-[9px] px-2 py-1.5 text-[12.5px] font-semibold transition-colors",
                  tab === t.id ? "bg-white text-v2-ink" : "text-white/60 hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === "inventory" && <InventoryTab economy={economy} tileUrls={tileUrls} slot={slot} />}
          {tab === "shop" && <ShopTab economy={economy} progression={progression} tileUrls={tileUrls} />}
          {tab === "generators" && <GeneratorsTab economy={economy} progression={progression} tileUrls={tileUrls} />}
          {tab === "quests" && <QuestsTab economy={economy} progression={progression} />}
        </div>
      </section>
    </div>
  );
}

function IslandSummary({ progression }: { progression: Progression }) {
  const p = useStore(progression.store);
  const next = ISLAND_TIERS.find((t) => t.level === p.level + 1);
  const span = p.nextLevelXp === null ? 1 : p.nextLevelXp - p.levelFloorXp;
  const pct = p.nextLevelXp === null ? 100 : Math.round(((p.xp - p.levelFloorXp) / span) * 100);
  const unlocks = next ? [next.unlockLabel, next.unlockGenerator, `Radius ${next.radius}`].filter(Boolean) : [];
  return (
    <div className="relative min-w-0 flex-1 rounded-[16px] border-2 border-[#7a4823] bg-gradient-to-b from-[#4a2e18] via-[#38200f] to-[#231206] p-3.5 shadow-[inset_0_1px_0_rgba(255,200,140,0.3),0_4px_16px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between">
        <p className="font-lilita text-[12px] tracking-wide text-amber-300/80 uppercase">{`Island Level ${p.level}`}</p>
        <span className="font-lilita text-[12px] text-amber-200">
          {p.nextLevelXp === null ? `${fmt(p.xp)} XP` : `${fmt(p.xp)} / ${fmt(p.nextLevelXp)} XP`}
        </span>
      </div>
      <h2 id="island-panel-title" className="mt-0.5 font-lilita text-[20px] tracking-wide text-amber-100 drop-shadow-sm">
        {p.title}
      </h2>
      <div className="mt-2.5 flex max-w-[360px] items-center gap-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full border border-black/50 bg-[#160c04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="mt-2 truncate text-[11.5px] font-medium text-amber-100/60">
        {next ? `Next: ${unlocks.join(" \u00b7 ")}` : `Max level \u00b7 Build radius ${p.radius}`}
      </p>
    </div>
  );
}

function Tile({ url, className }: { url?: string; className?: string }) {
  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white/[0.06]", className)}>
      {url ? (
        <img src={url} alt="" draggable={false} className="h-7 w-7 rounded-[4px] object-cover [image-rendering:pixelated]" />
      ) : null}
    </span>
  );
}

function SmallButton({
  children,
  onClick,
  disabled,
  primary,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "h-8 shrink-0 cursor-pointer rounded-[9px] px-3 text-[12px] font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-35",
        primary ? "bg-v2-plum text-white hover:bg-indigo-400" : "bg-white/[0.07] text-white hover:bg-white/12",
      )}
    >
      {children}
    </button>
  );
}

function InventoryTab({
  economy,
  tileUrls,
  slot,
}: {
  economy: Economy;
  tileUrls: Record<number | string, string>;
  slot: number;
}) {
  const s = useStore(economy.store);
  const items = Object.entries(s.inventory)
    .map(([k, n]) => ({ id: Number(k), n }))
    .filter((i) => i.n > 0)
    .sort((a, b) => sellPrice(b.id) * b.n - sellPrice(a.id) * a.n);
  const looseValue = items
    .filter((i) => !s.hotbar.includes(i.id))
    .reduce((sum, i) => sum + sellPrice(i.id) * i.n, 0);

  if (items.length === 0) {
    return <p className="py-10 text-center text-[13px] text-white/50">Your inventory is empty. Mine blocks or buy some in the shop.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-white/[0.04] px-3.5 py-2.5">
        <p className="text-[12px] text-white/60">
          {`Sell everything not on your hotbar for `}
          <span className="font-semibold tabular-nums text-white">{fmt(looseValue)}</span>
          {" coins"}
        </p>
        <SmallButton primary disabled={looseValue <= 0} onClick={() => economy.sellAllLoose()}>
          Sell all
        </SmallButton>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map(({ id, n }) => {
          const price = sellPrice(id);
          const rarity = rarityOf(id);
          const onBar = s.hotbar.includes(id);
          return (
            <li key={id} className="flex items-center gap-3 rounded-[12px] bg-white/[0.04] p-2.5">
              <Tile url={tileUrls[id]} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">
                  {nameOf(id)} <span className="font-medium tabular-nums text-white/45">{`x${n}`}</span>
                </p>
                <p className="text-[11px]">
                  <span className={RARITY_TEXT[rarity]}>{RARITY_LABEL[rarity]}</span>
                  <span className="text-white/40">{price > 0 ? ` \u00b7 ${price} each` : " \u00b7 not sellable"}</span>
                </p>
              </div>
              <div className="flex gap-1">
                {!onBar && (
                  <SmallButton label={`Put ${nameOf(id)} in hotbar slot ${slot + 1}`} onClick={() => economy.setHotbarSlot(slot, id)}>
                    Equip
                  </SmallButton>
                )}
                <SmallButton label={`Sell one ${nameOf(id)}`} disabled={price <= 0} onClick={() => economy.sell(id, 1)}>
                  1
                </SmallButton>
                <SmallButton label={`Sell all ${nameOf(id)}`} disabled={price <= 0} onClick={() => economy.sell(id, n)}>
                  All
                </SmallButton>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ShopTab({
  economy,
  progression,
  tileUrls,
}: {
  economy: Economy;
  progression: Progression;
  tileUrls: Record<number | string, string>;
}) {
  const { coins } = useStore(economy.store);
  const { level } = useStore(progression.store);
  const items = economy.shopItems();
  const locked = ISLAND_TIERS.filter((t) => t.level > level && t.unlockBlock !== undefined);

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((id) => {
          const price = buyPrice(id);
          return (
            <li key={id} className="flex items-center gap-3 rounded-[12px] bg-white/[0.04] p-2.5">
              <Tile url={tileUrls[id]} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{nameOf(id)}</p>
                <p className="flex items-center gap-1.5 text-[11px] tabular-nums text-white/55">
                  <CoinMark className="h-2 w-2" />
                  {`${price} each`}
                </p>
              </div>
              <div className="flex gap-1">
                <SmallButton label={`Buy one ${nameOf(id)}`} disabled={coins < price} onClick={() => economy.buy(id, 1)}>
                  1
                </SmallButton>
                <SmallButton
                  primary
                  label={`Buy 16 ${nameOf(id)}`}
                  disabled={coins < price * 16}
                  onClick={() => economy.buy(id, 16)}
                >
                  16
                </SmallButton>
              </div>
            </li>
          );
        })}
      </ul>
      {locked.length > 0 && (
        <div>
          <p className="v2-eyebrow mb-2">Locked</p>
          <ul className="flex flex-wrap gap-2">
            {locked.map((t) => (
              <li key={t.level} className="flex items-center gap-2 rounded-full bg-white/[0.04] py-1 pl-1 pr-3 text-[11.5px] text-white/50">
                <Tile url={tileUrls[t.unlockBlock!]} className="h-6 w-6 rounded-full opacity-50 [&_img]:h-4 [&_img]:w-4" />
                {`${t.unlockLabel} \u00b7 level ${t.level}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GeneratorsTab({
  economy,
  progression,
  tileUrls,
}: {
  economy: Economy;
  progression: Progression;
  tileUrls: Record<number | string, string>;
}) {
  const s = useStore(economy.store);
  const { level: islandLevel } = useStore(progression.store);
  useNow(200);

  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {GENERATORS.map((def) => {
        const level = s.generators[def.id]?.level ?? 0;
        const locked = islandLevel < def.unlockLevel;
        const maxed = level >= MAX_GENERATOR_LEVEL;
        const cost = generatorCost(def, level);
        const interval = level > 0 ? generatorInterval(def, level) : generatorInterval(def, 1);
        const nextInterval = generatorInterval(def, Math.min(MAX_GENERATOR_LEVEL, level + 1));
        const progress = economy.generatorProgress(def.id);
        const outputs = def.output(Math.max(1, level)).filter((o) => o.weight > 0);
        return (
          <li key={def.id} className={cn("flex flex-col gap-3 rounded-[14px] bg-white/[0.04] p-3.5", locked && "opacity-55")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[14px] font-bold tracking-tight">{def.name}</p>
                <p className="text-[11.5px] text-white/50">{def.description}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-white/70">
                {locked ? `Island ${def.unlockLevel}` : level === 0 ? "Not built" : `Lv ${level}`}
              </span>
            </div>
            <div className="flex -space-x-1.5">
              {outputs.map((o) => (
                <Tile key={o.id} url={tileUrls[o.id]} className="h-7 w-7 rounded-[7px] ring-2 ring-[#15151d] [&_img]:h-5 [&_img]:w-5" />
              ))}
            </div>
            {level > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-v2-mint" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <span className="text-[10.5px] font-medium tabular-nums text-white/50">{`${interval.toFixed(1)}s`}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] tabular-nums text-white/45">
                {maxed ? "Max level" : level === 0 ? `1 drop / ${interval.toFixed(1)}s` : `Next: ${nextInterval.toFixed(1)}s, better odds`}
              </span>
              {!maxed && (
                <SmallButton primary disabled={locked || s.coins < cost} onClick={() => economy.upgradeGenerator(def.id)}>
                  <span className="flex items-center gap-1.5">
                    {level === 0 ? "Build" : "Upgrade"}
                    <CoinMark className="h-2 w-2" />
                    {fmt(cost)}
                  </span>
                </SmallButton>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function QuestRow({
  label,
  progress,
  target,
  rewardXp,
  rewardCoins,
  done,
}: {
  label: string;
  progress: number;
  target: number;
  rewardXp: number;
  rewardCoins: number;
  done: boolean;
}) {
  const pct = Math.round((Math.min(progress, target) / target) * 100);
  return (
    <li className={cn("rounded-[12px] bg-white/[0.04] px-3.5 py-3", done && "opacity-50")}>
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-[13px] font-semibold", done && "line-through decoration-white/40")}>{label}</span>
        <span className="flex shrink-0 items-center gap-2 text-[11px] font-semibold tabular-nums">
          <span className="text-v2-sun">{`+${rewardXp} XP`}</span>
          <span className="flex items-center gap-1 text-amber-200">
            <CoinMark className="h-2 w-2" />
            {rewardCoins}
          </span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", done ? "bg-v2-mint" : "bg-v2-plum")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10.5px] font-medium tabular-nums text-white/50">
          {done ? "Done" : `${fmt(Math.min(progress, target))}/${fmt(target)}`}
        </span>
      </div>
    </li>
  );
}

function msUntilMidnight(now: number) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime() - now;
}

function QuestsTab({ economy, progression }: { economy: Economy; progression: Progression }) {
  const { daily } = useStore(economy.store);
  const p = useStore(progression.store);
  const now = useNow(1000);
  const island = MILESTONES.map((m) => ({
    ...m,
    progress: p[m.metric] as number,
    done: p.completed.includes(m.id),
  })).sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <div className="flex flex-col gap-2 text-[11px]">
      <details className="group bg-white/[0.03] rounded-lg border border-white/10 overflow-hidden">
        <summary className="cursor-pointer p-2 font-bold text-sky-300 hover:bg-white/5 flex justify-between items-center">
          <span>Daily Quests ({daily.length})</span>
          <span className="text-[10px] text-white/40">{`Resets in ${formatClock(msUntilMidnight(now))}`}</span>
        </summary>
        <ul className="flex flex-col gap-1 p-2 border-t border-white/10">
          {daily.map((q) => (
            <QuestRow key={q.id} {...q} />
          ))}
        </ul>
      </details>
      <details className="group bg-white/[0.03] rounded-lg border border-white/10 overflow-hidden">
        <summary className="cursor-pointer p-2 font-bold text-amber-300 hover:bg-white/5 flex justify-between items-center">
          <span>Island Quests ({island.length})</span>
          <span className="text-[10px] text-white/40">{`${p.completed.length}/${MILESTONES.length} done`}</span>
        </summary>
        <ul className="flex flex-col gap-1 p-2 border-t border-white/10">
          {island.map((q) => (
            <QuestRow key={q.id} {...q} target={q.target} />
          ))}
        </ul>
      </details>
    </div>
  );
}
