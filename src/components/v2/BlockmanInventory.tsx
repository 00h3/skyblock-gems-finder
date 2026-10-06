import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Backpack, Hammer, Heart, Minus, Plus, Shield, Sword, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCKS } from "@/engine/world";
import { UTILITY_INFO } from "@/engine/features";
import { GlbAvatar } from "@/components/GlbAvatar";

type ItemId = number | string;

const STORAGE_SLOTS = 36;

export const ITEM_INFO: Record<string, { name: string; damage: number; rarity: Rarity; desc: string }> = {
  short_sword: { name: "Wooden Sword", damage: 4, rarity: "common", desc: "A light practice blade." },
  gold_sword: { name: "Gold Sword", damage: 5, rarity: "rare", desc: "Fast swings, lighter knockback." },
  iron_sword: { name: "Iron Sword", damage: 6, rarity: "epic", desc: "Balanced weight and a heavy hit." },
  diamond_sword: { name: "Diamond Sword", damage: 7, rarity: "legend", desc: "The strongest blade on the islands." },
};

for (const [id, info] of Object.entries(UTILITY_INFO)) {
  ITEM_INFO[id] = {
    name: info.name,
    damage: 0,
    rarity: id === "ender_pearl" || id === "fire_charge" || id === "wind_charge" ? "epic" : "rare",
    desc: info.desc,
  };
}

type Rarity = "common" | "rare" | "epic" | "legend";
const RARITY_CLASS: Record<Rarity, string> = {
  common: "wood-slot",
  rare: "wood-slot wood-slot-blue",
  epic: "wood-slot wood-slot-purple",
  legend: "wood-slot wood-slot-gold",
};

type Recipe = {
  id: ItemId;
  count: number;
  /** 3x3 grid, row-major; 0 = empty cell. */
  grid: number[];
  minLevel: number;
  desc: string;
};

export const RECIPES: Recipe[] = [
  { id: "gold_sword", count: 1, grid: [0, 19, 0, 0, 19, 0, 0, 7, 0], minLevel: 1, desc: "Forged from gold blocks. Quick and bright." },
  { id: "iron_sword", count: 1, grid: [0, 4, 0, 0, 4, 0, 0, 7, 0], minLevel: 2, desc: "Hardened cobblestone iron on an oak grip." },
  { id: "diamond_sword", count: 1, grid: [0, 20, 0, 0, 20, 0, 0, 7, 0], minLevel: 5, desc: "Diamond edge. Maximum damage and knockback." },
  { id: 13, count: 4, grid: [0, 0, 0, 0, 7, 0, 0, 0, 0], minLevel: 1, desc: "Split an oak log into building planks." },
  { id: 5, count: 4, grid: [0, 0, 0, 3, 3, 0, 3, 3, 0], minLevel: 1, desc: "Four stone cut into sturdy bricks." },
  { id: 10, count: 2, grid: [0, 0, 0, 0, 6, 0, 0, 6, 0], minLevel: 2, desc: "Smelted sand, perfect for windows." },
];

const nameOf = (id: ItemId) =>
  typeof id === "string" ? (ITEM_INFO[id]?.name ?? id) : (BLOCKS.find((b) => b.id === id)?.name ?? "Block");

export function defaultItemCount(id: ItemId | undefined): number {
  if (id === undefined || id === 0) return 0;
  if (typeof id === "number") return 64; // Block stack
  if (id.includes("sword") || id === "shield") return 1;
  if (id === "water_bucket" || id === "lava_bucket" || id === "flint_steel") return 1;
  if (id === "ender_pearl" || id === "wind_charge" || id === "fire_charge" || id === "slime_ball") return 16;
  if (id === "speed_potion" || id === "golden_apple") return 8;
  return 1;
}

export function BlockmanInventory({
  hotbar,
  tileUrls,
  slot,
  onSelect,
  onClose,
  backpack = [],
  blockUrl,
  level = 1,
  playerName = "Player",
  counts,
  onEquip,
  onCraft,
}: {
  hotbar: ItemId[];
  tileUrls: Record<ItemId, string>;
  slot: number;
  onSelect: (i: number) => void;
  onClose: () => void;
  /** Items owned but not on the hotbar. */
  backpack?: ItemId[];
  blockUrl?: (id: ItemId) => string;
  level?: number;
  playerName?: string;
  counts?: Record<ItemId, number>;
  onEquip?: (item: ItemId, hotbarSlot: number) => void;
  /** When provided, the Make (crafting table) tab is enabled. */
  onCraft?: (item: ItemId, count: number) => void;
}) {
  const [tab, setTab] = useState<"role" | "make">("role");
  const [picked, setPicked] = useState<ItemId | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const iconOf = (id: ItemId | undefined) =>
    id === undefined ? "" : tileUrls[id] || (blockUrl ? blockUrl(id) : "");

  const getCount = (id: ItemId | undefined) => {
    if (id === undefined || id === 0) return 0;
    if (counts && counts[id] !== undefined) return counts[id];
    return defaultItemCount(id);
  };

  const owned = useMemo(() => {
    const all: ItemId[] = [];
    for (const id of [...hotbar, ...backpack]) if (id !== 0 && !all.includes(id)) all.push(id);
    return all;
  }, [hotbar, backpack]);

  const bar = Array.from({ length: 9 }, (_, i) => hotbar[i]);
  const heldDamage = typeof hotbar[slot] === "string" ? (ITEM_INFO[hotbar[slot] as string]?.damage ?? 1) : 1;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-2 sm:p-3"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-[720px] items-start gap-1.5">
        {onCraft && (
          <nav aria-label="Inventory tabs" className="mt-12 flex flex-col gap-1.5">
            <TabButton label="Role" active={tab === "role"} onClick={() => setTab("role")}>
              <Backpack className="h-5 w-5 fill-current" aria-hidden="true" />
            </TabButton>
            <TabButton label="Make" active={tab === "make"} onClick={() => setTab("make")}>
              <Hammer className="h-5 w-5 fill-current" aria-hidden="true" />
            </TabButton>
          </nav>
        )}

        <section
          role="dialog"
          aria-modal="true"
          aria-label={tab === "role" ? "Inventory" : "Crafting table"}
          className="wood-panel v2-anim-pop flex max-h-[86dvh] min-w-0 flex-1 flex-col overflow-hidden select-none"
        >
          <header className="wood-header relative flex h-10 shrink-0 items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <h2 className="font-lilita text-[20px] tracking-wide text-white [text-shadow:0_2px_0_rgba(0,0,0,.6)]">
                {tab === "role" ? "Role" : "Make"}
              </h2>
              <span className="font-lilita text-[13px] text-amber-200/90 [text-shadow:0_1px_2px_#000]">
                ({owned.length}/{STORAGE_SLOTS} slots)
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close inventory"
              className="grid h-7 w-7 place-items-center text-white/90 active:scale-90"
            >
              <X className="h-5 w-5 stroke-[3.5]" aria-hidden="true" />
            </button>
          </header>

          {tab === "role" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 sm:flex-row sm:p-2.5">
              <div className="wood-inset flex shrink-0 flex-col items-center gap-1.5 p-2 sm:w-[32%]">
                <p className="font-lilita text-[15px] text-amber-300 [text-shadow:0_1px_0_rgba(0,0,0,.6)]">{playerName}</p>
                <div className="h-[150px] w-full sm:h-[200px]">
                  <GlbAvatar height="100%" width="100%" autoRotate interactive />
                </div>
                <div className="wood-slot flex w-full items-center justify-around rounded-[4px] px-2 py-1 font-lilita text-[14px] text-white">
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" aria-hidden="true" />
                    20
                  </span>
                  <span className="flex items-center gap-1">
                    <Sword className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden="true" />
                    {heldDamage.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                    {`Lv ${level}`}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="grid grid-cols-9 gap-1" aria-label="Backpack">
                  {Array.from({ length: STORAGE_SLOTS }, (_, i) => {
                    const id = owned[i];
                    const info = typeof id === "string" ? ITEM_INFO[id] : undefined;
                    const qty = getCount(id);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={id === undefined}
                        aria-label={id === undefined ? `Empty slot ${i + 1}` : `${nameOf(id)} x${qty}`}
                        aria-pressed={picked !== null && picked === id}
                        onClick={() => id !== undefined && setPicked(id)}
                        className={cn(
                          "relative grid aspect-square place-items-center rounded-[4px]",
                          info ? RARITY_CLASS[info.rarity] : "wood-slot",
                          picked !== null && picked === id && "wood-slot-picked",
                        )}
                      >
                        <ItemIcon src={iconOf(id)} />
                        {id !== undefined && qty > 0 && (
                          <span className="absolute bottom-0.5 right-1 font-lilita text-[12px] text-white [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none select-none pointer-events-none">
                            {qty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="wood-inset flex flex-wrap items-center justify-between gap-2 p-2">
                  {picked === null ? (
                    <p className="w-full py-2 text-center font-lilita text-[16px] text-white/60">{"— Select Item —"}</p>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="wood-slot relative grid h-11 w-11 shrink-0 place-items-center rounded-[4px]">
                          <ItemIcon src={iconOf(picked)} />
                          <span className="absolute bottom-0.5 right-1 font-lilita text-[12px] text-white [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none">
                            {getCount(picked)}
                          </span>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-lilita text-[15px] text-white">{nameOf(picked)}</p>
                          <p className="truncate text-[11px] font-bold text-amber-100/90">
                            Quantity: <span className="text-white font-black">{getCount(picked)}</span> • {typeof picked === "string" ? ITEM_INFO[picked]?.desc : "Building block"}
                          </p>
                        </div>
                      </div>
                      {onEquip && (
                        <button
                          type="button"
                          onClick={() => onEquip(picked, slot)}
                          className="wood-btn wood-btn-blue h-10 px-5 font-lilita text-[16px]"
                        >
                          {`Equip to slot ${slot + 1}`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <CraftPanel iconOf={iconOf} owned={owned} level={level} onCraft={onCraft!} />
          )}

          <div className="grid shrink-0 grid-cols-9 gap-1 border-t-2 border-black/40 p-2" role="toolbar" aria-label="Hotbar">
            {bar.map((id, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slot ${i + 1}${id !== undefined ? `: ${nameOf(id)} x${getCount(id)}` : ""}`}
                aria-pressed={slot === i}
                onClick={() => onSelect(i)}
                className={cn("wood-slot relative grid aspect-square place-items-center rounded-[4px]", slot === i && "wood-slot-picked")}
              >
                <ItemIcon src={iconOf(id)} />
                {id !== undefined && id !== 0 && (
                  <span className="absolute bottom-0.5 right-1 font-lilita text-[12px] text-white [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none select-none pointer-events-none">
                    {getCount(id)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CraftPanel({
  iconOf,
  owned,
  level,
  onCraft,
}: {
  iconOf: (id: ItemId | undefined) => string;
  owned: ItemId[];
  level: number;
  onCraft: (item: ItemId, count: number) => void;
}) {
  const [recipeIdx, setRecipeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState(false);
  const recipe = RECIPES[recipeIdx];
  const needs = recipe.grid.filter(Boolean);
  const levelOk = level >= recipe.minLevel;
  const hasAll = needs.every((id) => owned.includes(id));
  const canMake = levelOk && hasAll;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 sm:flex-row sm:p-3">
      <div className="wood-inset grid shrink-0 grid-cols-6 content-start gap-1 p-2 sm:w-[40%]" aria-label="Recipes">
        {RECIPES.map((r, i) => (
          <button
            key={String(r.id)}
            type="button"
            aria-label={nameOf(r.id)}
            aria-pressed={i === recipeIdx}
            onClick={() => {
              setRecipeIdx(i);
              setQty(1);
            }}
            className={cn(
              "relative grid aspect-square place-items-center rounded-[4px]",
              typeof r.id === "string" ? RARITY_CLASS[ITEM_INFO[r.id].rarity] : "wood-slot",
              i === recipeIdx && "wood-slot-picked",
              level < r.minLevel && "opacity-45",
            )}
          >
            <ItemIcon src={iconOf(r.id)} />
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="wood-inset flex items-center justify-center gap-3 p-3">
          <div className="grid grid-cols-3 gap-1.5" aria-label="Recipe grid">
            {recipe.grid.map((id, i) => {
              const have = id ? owned.includes(id) : false;
              return (
                <div
                  key={i}
                  className={cn(
                    "relative grid h-11 w-11 place-items-center rounded-[4px] sm:h-12 sm:w-12",
                    id ? "wood-slot wood-slot-blue" : "wood-slot",
                  )}
                >
                  {id ? (
                    <>
                      <ItemIcon src={iconOf(id)} />
                      <span className="absolute left-0.5 top-0 font-lilita text-[11px] leading-none [text-shadow:0_1px_0_#000]">
                        <span className={have ? "text-emerald-300" : "text-red-400"}>{have ? 1 : 0}</span>
                        <span className="text-white">/1</span>
                      </span>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
          <span aria-hidden="true" className="font-lilita text-[28px] text-emerald-400 [text-shadow:0_2px_0_rgba(0,0,0,.5)]">
            {"»"}
          </span>
          <div className="wood-ring grid h-24 w-24 shrink-0 place-items-center rounded-full sm:h-28 sm:w-28">
            <div className={cn("wood-slot relative grid h-14 w-14 place-items-center rounded-[4px]", flash && "animate-pulse")}>
              <ItemIcon src={iconOf(recipe.id)} />
              {recipe.count > 1 && (
                <span className="absolute left-0.5 top-0 font-lilita text-[12px] text-white [text-shadow:0_1px_0_#000]">
                  {recipe.count * qty}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="wood-inset flex flex-col items-center gap-2 p-3 text-center">
          <p className="font-lilita text-[17px] text-white">{nameOf(recipe.id)}</p>
          <p className="text-[12px] font-bold text-amber-100/75">{recipe.desc}</p>
          {!levelOk && (
            <p className="text-[12px] font-bold text-red-300">{`Requires Island level ${recipe.minLevel}`}</p>
          )}
          {levelOk && !hasAll && <p className="text-[12px] font-bold text-red-300">Missing ingredients</p>}
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Decrease amount"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="wood-btn grid h-8 w-8 place-items-center"
            >
              <Minus className="h-4 w-4 stroke-[4]" aria-hidden="true" />
            </button>
            <span className="grid h-8 w-20 place-items-center bg-black/40 font-lilita text-[17px] tabular-nums text-white">{qty}</span>
            <button
              type="button"
              aria-label="Increase amount"
              onClick={() => setQty((q) => Math.min(typeof recipe.id === "string" ? 1 : 16, q + 1))}
              className="wood-btn grid h-8 w-8 place-items-center"
            >
              <Plus className="h-4 w-4 stroke-[4]" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            disabled={!canMake}
            onClick={() => {
              onCraft(recipe.id, recipe.count * qty);
              setFlash(true);
              window.setTimeout(() => setFlash(false), 600);
            }}
            className="wood-btn h-11 w-full max-w-[260px] font-lilita text-[19px] disabled:opacity-50"
          >
            Make
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemIcon({ src }: { src: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="pointer-events-none h-[72%] w-[72%] object-contain [image-rendering:pixelated]"
    />
  );
}

function TabButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "wood-tab grid h-11 w-11 place-items-center text-white transition-transform active:scale-95",
        active && "is-active",
      )}
    >
      {children}
    </button>
  );
}
