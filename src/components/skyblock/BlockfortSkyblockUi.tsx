import { useCallback, useEffect, useState } from "react";
import { GameAudio } from "@/lib/game-audio";
import {
  useSkyblockEconomy,
  getPurseCoins,
  setPurseCoins,
  type DailyQuest,
} from "@/lib/skyblock-economy";
import { useCurrency, spendCurrency, addCurrency } from "@/lib/currency";

export interface IslandTierDef {
  tier: number;
  name: string;
  image: string;
  cost: number;
  boundary: number;
  hpBonus: number;
  buildSlots: number;
  perk: string;
  description: string;
}

export const ISLAND_TIERS: IslandTierDef[] = [
  {
    tier: 1,
    name: "Frost Shelf",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-snow-1.png",
    cost: 0,
    boundary: 40,
    hpBonus: 250,
    buildSlots: 2,
    perk: "Starter sanctuary with basic generator",
    description: "Compact floating island with pure glacial stone and starter oak tree.",
  },
  {
    tier: 2,
    name: "Meadow Shelf",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-grass-1.png",
    cost: 800,
    boundary: 50,
    hpBonus: 500,
    buildSlots: 4,
    perk: "Unlocks Wheat & Oak auto-growth",
    description: "Lush green grass island with nutrient-rich topsoil for expanding farms.",
  },
  {
    tier: 3,
    name: "Cliff Garden",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-mixed-1.png",
    cost: 1800,
    boundary: 60,
    hpBonus: 750,
    buildSlots: 6,
    perk: "Deepstone ore vein yield +25%",
    description: "Terraced mountain outcrop rich in iron and coal deposits.",
  },
  {
    tier: 4,
    name: "Green Isle",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-grass-2.png",
    cost: 3500,
    boundary: 70,
    hpBonus: 1000,
    buildSlots: 8,
    perk: "Cobblestone generator speed +50%",
    description: "Expanded dual-tier platform with twin ancient willow trees.",
  },
  {
    tier: 5,
    name: "Snowy Isle",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-snow-2.png",
    cost: 6000,
    boundary: 80,
    hpBonus: 1500,
    buildSlots: 10,
    perk: "Mining Fortune II & rare mob spawn bonus",
    description: "Alpine plateau shrouded in crystalline mist and diamond geodes.",
  },
  {
    tier: 6,
    name: "Forest Isle",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-forest.png",
    cost: 10000,
    boundary: 90,
    hpBonus: 2000,
    buildSlots: 12,
    perk: "Netherite & Amethyst deep vein access",
    description: "Vast canopy woodland sanctuary with emerald-rich root systems.",
  },
  {
    tier: 7,
    name: "Lake Isle",
    image: "/assets/qblock-ui-kit/kit/assets/islands/island-lake.png",
    cost: 20000,
    boundary: 100,
    hpBonus: 3000,
    buildSlots: 16,
    perk: "Infinite water core & 2x Island XP multiplier",
    description: "The pinnacle realm: a floating freshwater lake with mystical aurora aura.",
  },
];

export interface ShopItem {
  id: string;
  name: string;
  tab: "blocks" | "tools" | "decor";
  cost: number;
  icon: string;
  blockType?: number | string;
  desc: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Blocks
  { id: "grass", name: "Grass Block", tab: "blocks", cost: 20, icon: "/textures/blocks/grass_block_side.png", blockType: 1, desc: "Fresh topsoil for flowers and crops." },
  { id: "dirt", name: "Dirt Block", tab: "blocks", cost: 10, icon: "/textures/blocks/dirt.png", blockType: 3, desc: "Standard building earth." },
  { id: "stone", name: "Stone Block", tab: "blocks", cost: 40, icon: "/textures/blocks/stone.png", blockType: 2, desc: "Sturdy structural stone." },
  { id: "wood", name: "Oak Wood", tab: "blocks", cost: 35, icon: "/textures/blocks/oak_log.png", blockType: 4, desc: "Solid timber for crafting and walls." },
  { id: "sand", name: "Sand", tab: "blocks", cost: 30, icon: "/textures/blocks/sand.png", blockType: 10, desc: "Fine desert sand." },
  { id: "gold_ore", name: "Gold Ore", tab: "blocks", cost: 160, icon: "/textures/blocks/gold_block.png", blockType: 6, desc: "Precious gold ore vein." },
  { id: "glass", name: "Clear Glass", tab: "blocks", cost: 60, icon: "/textures/blocks/glass.png", blockType: 7, desc: "Smooth transparent glass." },
  { id: "bricks", name: "Stone Bricks", tab: "blocks", cost: 90, icon: "/textures/blocks/stone_bricks.png", blockType: 15, desc: "Chiseled fortified fortress bricks." },

  // Tools
  { id: "pick_iron", name: "Iron Pickaxe", tab: "tools", cost: 300, icon: "/items/diamond_axe.png", blockType: "iron_pickaxe", desc: "Mines stone and ores twice as fast." },
  { id: "pick_diamond", name: "Diamond Pickaxe", tab: "tools", cost: 800, icon: "/items/netherite_axe.png", blockType: "diamond_pickaxe", desc: "Supreme mining speed and obsidian tier." },
  { id: "axe_iron", name: "Iron Axe", tab: "tools", cost: 220, icon: "/items/diamond_axe.png", blockType: "iron_axe", desc: "Chops trees and logs with ease." },
  { id: "shovel_iron", name: "Iron Shovel", tab: "tools", cost: 180, icon: "/public/items/iron_shovel.png", blockType: "iron_shovel", desc: "Instantly scoops dirt and sand." },

  // Decor
  { id: "lucky_block", name: "Lucky Cat Block", tab: "decor", cost: 350, icon: "/lucky-block-cat.png", blockType: "lucky_block", desc: "Break to unleash surprising rare rewards!" },
  { id: "sky_crown", name: "Golden Sky Crown", tab: "decor", cost: 1200, icon: "/public/assets/ui/icon-crown.svg", desc: "Gilded headpiece of island royalty." },
  { id: "chest_rare", name: "Ancient Relic Chest", tab: "decor", cost: 2500, icon: "/public/chest_gold_1788909061642.png", desc: "Contains legendary enchanted loot." },
  { id: "dragon_egg", name: "Red Dragon Egg", tab: "decor", cost: 5000, icon: "/textures/blocks/obsidian.png", desc: "Hatchable core from the Deep Dungeon boss." },
];

interface Props {
  onEquipHotbar?: (blockType: number | string) => void;
  hotbar?: (number | string)[];
  tileUrls?: Record<number | string, string>;
  onOpenSettings?: () => void;
}

export function BlockfortSkyblockUi({
  onEquipHotbar,
  hotbar = [],
  tileUrls = {},
  onOpenSettings,
}: Props) {
  const econ = useSkyblockEconomy();
  const globalGold = useCurrency("gold");

  // Keep in-sync real balance (highest of purse or global gold, sync changes)
  const realBalance = Math.max(econ.purse, globalGold);

  // Active modals
  const [manorOpen, setManorOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [backpackOpen, setBackpackOpen] = useState(false);

  // Toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Manor Upgrade state
  const [selectedTierIdx, setSelectedTierIdx] = useState<number>(() => {
    return Math.min(ISLAND_TIERS.length - 1, Math.max(0, econ.islandInfo.level - 1));
  });

  // Shop state
  const [shopTab, setShopTab] = useState<"blocks" | "tools" | "decor">("blocks");
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem>(SHOP_ITEMS[0]);

  // Esc key closes any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setManorOpen(false);
        setShopOpen(false);
        setDailyOpen(false);
        setQuestsOpen(false);
        setBackpackOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

  // Sync purse coins if difference detected
  const spendRealCoins = async (amount: number): Promise<boolean> => {
    if (realBalance < amount) return false;
    const ok = await spendCurrency("gold", amount);
    if (ok) {
      setPurseCoins(Math.max(0, econ.purse - amount));
      return true;
    }
    return false;
  };

  const addRealCoins = (amount: number) => {
    addCurrency("gold", amount);
    setPurseCoins(econ.purse + amount);
  };

  // ── Manor Upgrade Action ───────────────────────────────────────────────────
  const handleUpgradeIsland = async (targetTier: IslandTierDef) => {
    if (econ.islandInfo.level >= targetTier.tier) {
      showToast(`${targetTier.name} is already unlocked!`);
      return;
    }
    if (targetTier.tier !== econ.islandInfo.level + 1) {
      showToast(`Upgrade to Level ${econ.islandInfo.level + 1} first!`);
      return;
    }
    if (realBalance < targetTier.cost) {
      showToast(`Need ${targetTier.cost.toLocaleString()} Star Coins!`);
      return;
    }

    const ok = await spendRealCoins(targetTier.cost);
    if (!ok) {
      showToast("Transaction failed. Try again.");
      return;
    }

    econ.upgradeIslandBoundary();
    GameAudio.playLevelUp?.();
    showToast(`Island upgraded to ${targetTier.name}! (+${targetTier.hpBonus} HP, +${targetTier.buildSlots} Slots)`);
  };

  // ── Shop Buy Action ────────────────────────────────────────────────────────
  const handleBuyShopItem = async (item: ShopItem) => {
    if (realBalance < item.cost) {
      showToast(`Need ${item.cost.toLocaleString()} Star Coins!`);
      return;
    }

    const ok = await spendRealCoins(item.cost);
    if (!ok) {
      showToast("Purchase failed. Insufficient funds.");
      return;
    }

    GameAudio.playCashRegister?.();
    if (item.blockType !== undefined && onEquipHotbar) {
      onEquipHotbar(item.blockType);
    }
    showToast(`Bought ${item.name}! Added to hotbar.`);
  };

  // ── Claim Daily Reward ─────────────────────────────────────────────────────
  const dailyStreakRewards = [50, 75, 100, 150, 200, 300, 500];
  const currentDayIndex = Math.min(6, Math.max(0, econ.streak.currentDay - 1));

  const handleClaimDaily = () => {
    if (!econ.streak.canClaim) {
      showToast("Come back tomorrow for your next reward!");
      return;
    }
    const res = econ.claimDailyStreak();
    if (res.success) {
      addRealCoins(res.reward);
      showToast(`+${res.reward} Star Coins claimed!`);
    } else {
      showToast(res.message);
    }
  };

  // ── Claim Quest ────────────────────────────────────────────────────────────
  const handleClaimQuest = (q: DailyQuest) => {
    const res = econ.claimDailyQuest(q.id);
    if (res.success) {
      addRealCoins(res.reward);
      showToast(`+${res.reward} Star Coins! Quest complete.`);
    } else {
      showToast(res.message);
    }
  };

  const selectedTier = ISLAND_TIERS[selectedTierIdx] || ISLAND_TIERS[0];
  const isSelectedTierUnlocked = econ.islandInfo.level >= selectedTier.tier;
  const isSelectedTierNext = selectedTier.tier === econ.islandInfo.level + 1;

  return (
    <>
      {/* ── TOP-LEFT: Star Coin Balance Chip ───────────────────────────────── */}
      <div className="fixed left-3.5 top-3.5 z-40 pointer-events-auto flex items-center gap-2">
        <div className="balance" aria-label="Star Coins">
          <i className="bf-icon bf-icon--coin" />
          <span id="stars">{realBalance.toLocaleString()}</span>
          <button
            type="button"
            className="plus"
            onClick={() => setShopOpen(true)}
            aria-label="Get more in the shop"
            title="Open Shop"
          >
            +
          </button>
        </div>
      </div>

      {/* ── RIGHT-RAIL: Compact Game Buttons (Small, Crisp, Sleek) ─────────── */}
      <div
        className="fixed right-3.5 top-3.5 z-40 pointer-events-auto flex flex-col gap-1.5 items-end"
        style={{ transformOrigin: "top right" }}
      >
        <button
          type="button"
          className="bf-btn bf-btn--build"
          onClick={() => setManorOpen(true)}
          title="Island Upgrades"
        >
          <span className="bf-btn__label">Upgrades</span>
        </button>
        <button
          type="button"
          className="bf-btn bf-btn--build"
          onClick={() => setShopOpen(true)}
          title="Island Store"
        >
          <span className="bf-btn__label">Shop</span>
        </button>
        <button
          type="button"
          className="bf-btn bf-btn--mail"
          onClick={() => setDailyOpen(true)}
          title="Daily Rewards"
        >
          <span className="bf-btn__label">Rewards</span>
        </button>
        <button
          type="button"
          className="bf-btn bf-btn--home"
          onClick={() => setBackpackOpen(true)}
          title="Backpack Inventory"
        >
          <span className="bf-btn__label">Backpack</span>
        </button>
        <button
          type="button"
          className="bf-btn bf-btn--plain"
          onClick={() => setQuestsOpen(true)}
          title="Island Quests"
        >
          <span className="bf-btn__label">Quests</span>
        </button>
        {onOpenSettings && (
          <button
            type="button"
            className="bf-btn bf-btn--plain"
            onClick={onOpenSettings}
            title="Settings"
          >
            <span className="bf-btn__label">Settings</span>
          </button>
        )}
      </div>

      {/* ── TOAST NOTIFICATION ─────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed left-1/2 bottom-20 -translate-x-1/2 z-[2000] pointer-events-none animate-bounce">
          <div className="bf-toast">{toastMsg}</div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MANOR / ISLAND UPGRADE MODAL ───────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {manorOpen && (
        <div
          className="bf-overlay is-open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setManorOpen(false);
          }}
        >
          <div className="bf-modal-wrap bf-modal-wrap--board">
            <section
              className="bf-modal bf-panel bf-panel--board"
              role="dialog"
              aria-modal="true"
              aria-labelledby="manor-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bf-panel__title" style={{ top: -72, height: 86 }}>
                <div className="bf-banner-crown" aria-hidden="true" />
              </div>
              <h2 className="bf-sr" id="manor-title">
                Island Upgrade
              </h2>
              <button
                type="button"
                className="bf-close bf-panel__close"
                aria-label="Close"
                onClick={() => setManorOpen(false)}
              />

              {/* 7 Island Selection Shelf */}
              <div className="manor-islands mt-2" data-bf-selectable>
                {ISLAND_TIERS.map((tier, idx) => {
                  const unlocked = econ.islandInfo.level >= tier.tier;
                  const isSelected = selectedTierIdx === idx;
                  return (
                    <button
                      key={tier.name}
                      type="button"
                      onClick={() => setSelectedTierIdx(idx)}
                      className={`bf-island ${isSelected ? "is-selected" : ""} ${!unlocked ? "is-locked" : ""}`}
                      title={`${tier.name} (Level ${tier.tier})`}
                      style={{ ["--h" as string]: `${68 + idx * 4}px` }}
                    >
                      <img src={tier.image} alt={tier.name} draggable={false} />
                    </button>
                  );
                })}
              </div>

              {/* Island Details & Stats */}
              <div className="flex gap-5 justify-center items-center mt-3">
                <div className="bf-note">
                  <img
                    src={selectedTier.image}
                    alt={selectedTier.name}
                    style={{ maxHeight: 110 }}
                    draggable={false}
                  />
                </div>
                <div className="w-[340px] flex flex-col gap-1">
                  <div className="bf-row">
                    <span className="bf-icon bf-icon--up" />
                    <span className="bf-row__grow text-[16px] font-black">{selectedTier.name}</span>
                    <b className="text-amber-600">Lv {selectedTier.tier}</b>
                  </div>
                  <div className="bf-row">
                    <span className="bf-icon bf-icon--heart" />
                    <span className="bf-row__grow">Health Bonus</span>
                    <b>+{selectedTier.hpBonus} HP</b>
                  </div>
                  <div className="bf-row">
                    <span className="bf-icon bf-icon--cube" />
                    <span className="bf-row__grow">Build Slots / Minions</span>
                    <b>+{selectedTier.buildSlots}</b>
                  </div>
                  <div className="bf-row">
                    <span className="bf-icon bf-icon--chevron" style={{ transform: "rotate(-90deg)" }} />
                    <span className="bf-row__grow">Boundary Size</span>
                    <b>{selectedTier.boundary}x{selectedTier.boundary}</b>
                  </div>
                  <div className="bf-row">
                    <span className="bf-icon bf-icon--coin" />
                    <span className="bf-row__grow">Upgrade Cost</span>
                    <b className={realBalance < selectedTier.cost && isSelectedTierNext ? "text-red-600" : ""}>
                      {selectedTier.cost === 0 ? "Unlocked" : `${selectedTier.cost.toLocaleString()} Coins`}
                    </b>
                  </div>

                  <div className="mt-2 flex justify-center">
                    {isSelectedTierUnlocked ? (
                      <button type="button" className="bf-btn bf-btn--plain" disabled>
                        <span className="bf-btn__label">Unlocked</span>
                      </button>
                    ) : isSelectedTierNext ? (
                      <button
                        type="button"
                        className="bf-btn bf-btn--build"
                        onClick={() => handleUpgradeIsland(selectedTier)}
                      >
                        <span className="bf-btn__label">Upgrade</span>
                      </button>
                    ) : (
                      <button type="button" className="bf-btn bf-btn--plain" disabled>
                        <span className="bf-btn__label">Requires Lv {selectedTier.tier - 1}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── STORE / SHOP MODAL ─────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {shopOpen && (
        <div
          className="bf-overlay is-open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShopOpen(false);
          }}
        >
          <div className="bf-modal-wrap">
            <section
              className="bf-modal bf-panel bf-panel--store"
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bf-panel__title" style={{ left: -118 }}>
                <span className="bf-plate bf-plate--title" id="shop-title">
                  Shop
                </span>
              </div>
              <div className="bf-panel__side" style={{ top: -14 }}>
                <div style={{ height: 20 }} />
                <button
                  type="button"
                  className={`bf-tab ${shopTab === "blocks" ? "is-active" : ""}`}
                  onClick={() => setShopTab("blocks")}
                >
                  Blocks
                </button>
                <button
                  type="button"
                  className={`bf-tab ${shopTab === "tools" ? "is-active" : ""}`}
                  onClick={() => setShopTab("tools")}
                >
                  Tools
                </button>
                <button
                  type="button"
                  className={`bf-tab ${shopTab === "decor" ? "is-active" : ""}`}
                  onClick={() => setShopTab("decor")}
                >
                  Decor
                </button>
              </div>
              <button
                type="button"
                className="bf-close bf-panel__close"
                aria-label="Close"
                onClick={() => setShopOpen(false)}
              />

              <div className="flex gap-5 items-start">
                <div className="flex-1">
                  <div className="bf-slot-grid" style={{ ["--cols" as string]: 4 }}>
                    {SHOP_ITEMS.filter((item) => item.tab === shopTab).map((item) => {
                      const isSelected = selectedShopItem.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedShopItem(item)}
                          className={`bf-slot ${isSelected ? "is-selected" : ""}`}
                          aria-label={item.name}
                        >
                          <img
                            src={item.icon}
                            alt={item.name}
                            className="[image-rendering:pixelated]"
                            draggable={false}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detail column */}
                <div className="bf-panel bf-panel--scroll text-center flex flex-col items-center justify-between p-2">
                  <div className="flex flex-col items-center">
                    <div className="h-28 w-28 grid place-items-center mt-2">
                      <img
                        src={selectedShopItem.icon}
                        alt={selectedShopItem.name}
                        className="max-h-20 max-w-20 object-contain [image-rendering:pixelated] drop-shadow-md"
                        draggable={false}
                      />
                    </div>
                    <h3 className="bf-ink text-[19px] font-black">{selectedShopItem.name}</h3>
                    <p className="text-[13px] text-amber-800 leading-snug px-2 mt-1">
                      {selectedShopItem.desc}
                    </p>
                  </div>

                  <div className="flex flex-col items-center mb-3">
                    <div className="inline-flex items-center gap-1.5 text-[18px] font-black text-amber-900">
                      <i className="bf-icon bf-icon--coin" />
                      <span className={realBalance < selectedShopItem.cost ? "text-red-600" : ""}>
                        {selectedShopItem.cost.toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="bf-btn bf-btn--plain mt-2"
                      onClick={() => handleBuyShopItem(selectedShopItem)}
                      disabled={realBalance < selectedShopItem.cost}
                    >
                      <span className="bf-btn__label">Buy</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── DAILY REWARDS MODAL ────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {dailyOpen && (
        <div
          className="bf-overlay is-open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDailyOpen(false);
          }}
        >
          <div className="bf-modal-wrap bf-modal-wrap--board">
            <section
              className="bf-modal bf-dialog"
              style={{ minWidth: 420, maxWidth: 540 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="daily-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bf-dialog__title">
                <span className="bf-plate bf-plate--title" id="daily-title">
                  Daily Rewards
                </span>
              </div>
              <button
                type="button"
                className="bf-close bf-panel__close"
                aria-label="Close"
                onClick={() => setDailyOpen(false)}
              />

              <div className="bf-dialog__body">
                <p className="text-[14px] text-amber-900 mb-3 font-semibold">
                  Log in daily to claim escalating Star Coin bounties!
                </p>
                <div className="grid grid-cols-7 gap-1.5 justify-center mt-2">
                  {dailyStreakRewards.map((reward, i) => {
                    const isDone = i < currentDayIndex;
                    const isToday = i === currentDayIndex;
                    return (
                      <div
                        key={i}
                        className={`bf-slot flex flex-col items-center justify-center text-[12px] font-black !w-[58px] !h-[64px] ${
                          isDone ? "opacity-60 grayscale" : ""
                        } ${isToday ? "is-selected" : ""}`}
                      >
                        <i className="bf-icon bf-icon--coin" />
                        <span className="text-[11px] tabular-nums mt-0.5">+{reward}</span>
                        <span className="text-[9px] text-amber-200">Day {i + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bf-dialog__actions">
                <button
                  type="button"
                  className="bf-btn bf-btn--plain"
                  onClick={handleClaimDaily}
                  disabled={!econ.streak.canClaim}
                >
                  <span className="bf-btn__label">
                    {econ.streak.canClaim ? "Claim Today" : "Claimed Today"}
                  </span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── QUESTS MODAL ───────────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {questsOpen && (
        <div
          className="bf-overlay is-open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuestsOpen(false);
          }}
        >
          <div className="bf-modal-wrap bf-modal-wrap--board">
            <section
              className="bf-modal bf-panel bf-panel--board"
              style={{ width: 620, minHeight: 380 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="quests-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bf-panel__title">
                <span className="bf-plate bf-plate--title" id="quests-title">
                  Daily Quests
                </span>
              </div>
              <button
                type="button"
                className="bf-close bf-panel__close"
                aria-label="Close"
                onClick={() => setQuestsOpen(false)}
              />

              <div className="flex flex-col gap-2 mt-4 px-2">
                {econ.dailyQuests.map((q) => {
                  const pct = Math.min(100, Math.round((q.current / q.target) * 100));
                  const isDone = q.current >= q.target;
                  return (
                    <div key={q.id} className="bf-row flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-[15px]">{q.title}</span>
                          <span className="text-[12px] font-bold text-amber-700">
                            {q.current} / {q.target}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900/80 leading-none mt-0.5">{q.desc}</p>
                        <div className="w-full bg-[#3d2716] h-2 rounded overflow-hidden mt-1.5 border border-[#5a3f23]">
                          <div
                            className="bg-gradient-to-r from-amber-400 to-amber-600 h-full transition-[width] duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-black text-amber-900 text-[14px]">
                          <i className="bf-icon bf-icon--coin" />
                          +{q.reward}
                        </span>
                        <button
                          type="button"
                          className="bf-btn bf-btn--plain !min-w-[80px] !h-8 text-[13px]"
                          disabled={!isDone || q.claimed}
                          onClick={() => handleClaimQuest(q)}
                        >
                          <span className="bf-btn__label">
                            {q.claimed ? "Claimed" : isDone ? "Claim" : "In Progress"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── BACKPACK INVENTORY MODAL ───────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {backpackOpen && (
        <div
          className="bf-overlay is-open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBackpackOpen(false);
          }}
        >
          <div className="bf-modal-wrap bf-modal-wrap--board">
            <section
              className="bf-modal bf-panel bf-panel--board"
              style={{ width: 680, minHeight: 420 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="backpack-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bf-panel__title">
                <span className="bf-plate bf-plate--title" id="backpack-title">
                  Backpack
                </span>
              </div>
              <button
                type="button"
                className="bf-close bf-panel__close"
                aria-label="Close"
                onClick={() => setBackpackOpen(false)}
              />

              <div className="mt-3">
                <p className="text-[13px] text-amber-900 font-bold text-center mb-3">
                  Tap an item to equip it to your current active hotbar slot
                </p>
                <div
                  className="bf-slot-grid justify-center"
                  style={{ ["--cols" as string]: 7 }}
                >
                  {hotbar.map((itemId, i) => {
                    const url = tileUrls[itemId] || "";
                    return (
                      <button
                        key={`${itemId}-${i}`}
                        type="button"
                        onClick={() => {
                          if (onEquipHotbar) onEquipHotbar(itemId);
                          showToast(`Slot ${i + 1} selected!`);
                        }}
                        className="bf-slot"
                        aria-label={`Item ${i + 1}`}
                      >
                        {url ? (
                          <img
                            src={url}
                            alt=""
                            className="[image-rendering:pixelated]"
                            draggable={false}
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-amber-900/40">Empty</span>
                        )}
                        <span className="bf-slot__count">{itemId ? 64 : ""}</span>
                      </button>
                    );
                  })}
                  {/* Fill empty slots up to 21 */}
                  {Array.from({ length: Math.max(0, 21 - hotbar.length) }).map((_, i) => (
                    <button
                      key={`empty-${i}`}
                      type="button"
                      className="bf-slot is-locked"
                      aria-label="Empty slot"
                    />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
