import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  // ── Real Voxel Blocks ──────────────────────────────────────────────────────
  { id: "grass", name: "Grass Block", tab: "blocks", cost: 20, icon: "/textures/blocks/grass_block_side.png", blockType: 1, desc: "Fresh topsoil for flowers, saplings, and expanding your island." },
  { id: "dirt", name: "Dirt Block", tab: "blocks", cost: 10, icon: "/textures/blocks/dirt.png", blockType: 2, desc: "Standard building earth for farming terraces." },
  { id: "stone", name: "Smooth Stone", tab: "blocks", cost: 30, icon: "/textures/blocks/stone.png", blockType: 3, desc: "Solid quarried bedrock stone for sturdy structures." },
  { id: "cobble", name: "Cobblestone", tab: "blocks", cost: 25, icon: "/textures/blocks/cobblestone.png", blockType: 4, desc: "Classic masonry stone for bridges and walls." },
  { id: "bricks", name: "Stone Bricks", tab: "blocks", cost: 60, icon: "/textures/blocks/stone_bricks.png", blockType: 5, desc: "Reinforced fortress bricks." },
  { id: "sand", name: "Desert Sand", tab: "blocks", cost: 25, icon: "/textures/blocks/sand.png", blockType: 6, desc: "Fine yellow sand for smelting into glass." },
  { id: "oak_log", name: "Oak Wood Log", tab: "blocks", cost: 45, icon: "/textures/blocks/oak_log.png", blockType: 7, desc: "Heavy hardwood timber for structural beams." },
  { id: "oak_planks", name: "Oak Planks", tab: "blocks", cost: 35, icon: "/textures/blocks/oak_planks.png", blockType: 13, desc: "Polished wooden planks for manor floors and ceilings." },
  { id: "glass", name: "Clear Glass", tab: "blocks", cost: 50, icon: "/textures/blocks/glass.png", blockType: 10, desc: "Crystal transparent architectural glass." },
  { id: "ice", name: "Glacial Ice", tab: "blocks", cost: 80, icon: "/textures/blocks/ice.png", blockType: 17, desc: "Slick mountain ice block for water flows." },
  { id: "glowstone", name: "Glowstone", tab: "blocks", cost: 200, icon: "/textures/blocks/glowstone.png", blockType: 18, desc: "Luminous crystalline block radiating permanent golden light." },
  { id: "gold_block", name: "Gold Block", tab: "blocks", cost: 600, icon: "/textures/blocks/gold_block.png", blockType: 19, desc: "Pure solid gilded bullion block for royal builds." },
  { id: "diamond_block", name: "Diamond Block", tab: "blocks", cost: 1800, icon: "/textures/blocks/diamond_block.png", blockType: 20, desc: "Gleaming condensed diamond block of ultimate status." },
  { id: "emerald_block", name: "Emerald Block", tab: "blocks", cost: 1400, icon: "/textures/blocks/emerald_block.png", blockType: 21, desc: "Vibrant emerald block for high-tier island beacons." },
  { id: "lapis_block", name: "Lapis Lazuli Block", tab: "blocks", cost: 400, icon: "/textures/blocks/lapis_block.png", blockType: 22, desc: "Deep mystical azure mineral block." },
  { id: "amethyst", name: "Amethyst Block", tab: "blocks", cost: 500, icon: "/textures/blocks/amethyst_block.png", blockType: 23, desc: "Resonant purple crystal geode block." },
  { id: "obsidian", name: "Obsidian", tab: "blocks", cost: 1500, icon: "/textures/blocks/obsidian.png", blockType: 11, desc: "Blast-resistant volcanic glass of supreme density." },

  // ── Authentic Tools & Weapons ──────────────────────────────────────────────
  { id: "short_sword", name: "Hunter Short Sword", tab: "tools", cost: 150, icon: "/public/short-sword.svg", blockType: "short_sword", desc: "Reliable starting blade for mob defense." },
  { id: "iron_sword", name: "Iron Broadsword", tab: "tools", cost: 800, icon: "/items/diamond_axe.png", blockType: "iron_sword", desc: "Forged iron blade dealing +8 combat damage." },
  { id: "diamond_sword", name: "Diamond Katana", tab: "tools", cost: 3500, icon: "/items/netherite_axe.png", blockType: "diamond_sword", desc: "High-grade tempered diamond blade with swift critical strike." },
  { id: "staff_dark", name: "Dark Magic Sickle Staff", tab: "tools", cost: 15000, icon: "/textures/blocks/amethyst_block.png", blockType: "dark_magic_staff", desc: "LEGENDARY: Mythic WoW-inspired celestial weapon that shoots piercing fireball bursts!" },
  { id: "pick_iron", name: "Iron Pickaxe", tab: "tools", cost: 350, icon: "/public/items/diamond_axe.png", blockType: "iron_pickaxe", desc: "Mines stone, coal, and iron ore at 2x baseline speed." },
  { id: "pick_diamond", name: "Diamond Pickaxe", tab: "tools", cost: 1200, icon: "/public/items/netherite_axe.png", blockType: "diamond_pickaxe", desc: "High-durability pickaxe capable of fracturing deep obsidian." },
  { id: "axe_diamond", name: "Diamond Great Axe", tab: "tools", cost: 700, icon: "/public/items/diamond_axe.png", blockType: "iron_axe", desc: "Instantly fells ancient oak and birch trees." },
  { id: "shovel_diamond", name: "Diamond Spade", tab: "tools", cost: 400, icon: "/public/items/diamond_shovel.png", blockType: "diamond_shovel", desc: "Rapidly excavates topsoil, sand, and gravel deposits." },

  // ── Real Decor & Sky Relics ───────────────────────────────────────────────
  { id: "lucky_block", name: "Lucky Cat Block", tab: "decor", cost: 350, icon: "/lucky-block-cat.png", blockType: "lucky_block", desc: "Break to unleash surprising rare island rewards!" },
  { id: "ancient_chest", name: "Golden Treasure Chest", tab: "decor", cost: 2200, icon: "/public/chest_gold_1788909061642.png", desc: "Gilded chest containing ancient Skyblock relics and gemstones." },
  { id: "dragon_trophy", name: "Red Dragon Crest", tab: "decor", cost: 6500, icon: "/public/3d-trophy.png", desc: "Gilded victory trophy forged from the fiery breath of the Red Dragon." },
  { id: "sky_crown", name: "Golden Sky Crown", tab: "decor", cost: 10000, icon: "/public/assets/ui/icon-crown.svg", desc: "The ultimate crown worn only by sovereign island lords." },
];

interface Props {
  onEquipHotbar?: (blockType: number | string) => void;
  hotbar?: (number | string)[];
  tileUrls?: Record<number | string, string>;
}

export function BlockfortSkyblockUi({
  onEquipHotbar,
  hotbar = [],
  tileUrls = {},
}: Props) {
  const econ = useSkyblockEconomy();
  const globalGold = useCurrency("gold");

  // Keep in-sync real balance (highest of purse or global gold, sync changes)
  const realBalance = Math.max(econ.purse, globalGold);

  // Buttons collapsible state
  const [buttonsExpanded, setButtonsExpanded] = useState(true);

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

  const closeAllModals = useCallback(() => {
    setManorOpen(false);
    setShopOpen(false);
    setDailyOpen(false);
    setQuestsOpen(false);
    setBackpackOpen(false);
  }, []);

  // Responsive modal fit scaling so windows always fit viewport compactly
  const [bfFit, setBfFit] = useState<number>(1);
  useEffect(() => {
    const updateFit = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.min(1, (w - 24) / 580, (h - 24) / 360);
      setBfFit(Math.max(0.68, Math.min(1, scale)));
    };
    updateFit();
    window.addEventListener("resize", updateFit);
    return () => window.removeEventListener("resize", updateFit);
  }, []);

  // Esc key closes any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeAllModals]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2800);
  }, []);

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
      {/* ── TOP-LEFT: Star Coin Balance Chip with Luxury Blur ────────────────── */}
      <motion.div
        initial={{ opacity: 0, filter: "blur(10px)", y: -10 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 350 }}
        className="fixed left-3 top-3 z-40 pointer-events-auto flex items-center gap-2 select-none"
      >
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
      </motion.div>

      {/* ── RIGHT-RAIL: Ultra-compact, Sleek Collapsible Buttons with Toggle ─── */}
      <div
        className="fixed right-3 top-3 z-40 pointer-events-auto flex flex-col items-end gap-1 select-none"
        style={{ transformOrigin: "top right" }}
      >
        {/* Toggle button in Blockfort style: X to close, Menu to open */}
        <div className="flex items-center gap-1 mb-0.5">
          {buttonsExpanded ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setButtonsExpanded(false)}
              className="bf-close bf-close--sm"
              aria-label="Close buttons menu"
              title="Close buttons menu (✕)"
            />
          ) : (
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              onClick={() => setButtonsExpanded(true)}
              className="bf-toggle-btn"
              aria-label="Open buttons menu"
              title="Open Skyblock buttons"
            >
              <i className="bf-icon bf-icon--cube" style={{ transform: "scale(0.75)" }} />
              <span>Menu</span>
            </motion.button>
          )}
        </div>

        {/* Collapsible buttons list with welcome-page blur & spring animation */}
        <AnimatePresence>
          {buttonsExpanded && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(12px)", x: 22, scale: 0.88 }}
              animate={{ opacity: 1, filter: "blur(0px)", x: 0, scale: 1 }}
              exit={{ opacity: 0, filter: "blur(12px)", x: 22, scale: 0.88 }}
              transition={{ type: "spring", damping: 24, stiffness: 380, mass: 0.4 }}
              className="flex flex-col gap-1 items-end"
            >
              <motion.button
                whileTap={{ scale: 0.93 }}
                type="button"
                className="bf-btn bf-btn--build bf-btn--mini"
                onClick={() => setManorOpen(true)}
                title="Island Upgrades"
              >
                <span className="bf-btn__label">Upgrades</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                type="button"
                className="bf-btn bf-btn--build bf-btn--mini"
                onClick={() => setShopOpen(true)}
                title="Island Store"
              >
                <span className="bf-btn__label">Shop</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                type="button"
                className="bf-btn bf-btn--mail bf-btn--mini"
                onClick={() => setDailyOpen(true)}
                title="Daily Rewards"
              >
                <span className="bf-btn__label">Rewards</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                type="button"
                className="bf-btn bf-btn--home bf-btn--mini"
                onClick={() => setBackpackOpen(true)}
                title="Backpack Inventory"
              >
                <span className="bf-btn__label">Backpack</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                type="button"
                className="bf-btn bf-btn--plain bf-btn--mini !min-w-[96px] !min-h-[30px] cursor-pointer touch-manipulation active:scale-95"
                onClick={() => setQuestsOpen(true)}
                title="Daily Quests"
              >
                <span className="bf-btn__label">Quests</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── TOAST NOTIFICATION WITH LUXURY BLUR ────────────────────────────── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, filter: "blur(14px)", y: 20, scale: 0.92 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0, scale: 1 }}
            exit={{ opacity: 0, filter: "blur(14px)", y: 20, scale: 0.92 }}
            transition={{ type: "spring", damping: 24, stiffness: 360 }}
            className="fixed left-1/2 bottom-20 -translate-x-1/2 z-[2000] pointer-events-none"
          >
            <div className="bf-toast">{toastMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MANOR / ISLAND UPGRADE MODAL ────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {manorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap bf-modal-wrap--board"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
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
                  onClick={closeAllModals}
                >
                  ✕
                </button>

                {/* 7 Island Selection Shelf - compact & balanced */}
                <div className="manor-islands mt-1" data-bf-selectable>
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
                        style={{ ["--h" as string]: `${46 + idx * 3}px` }}
                      >
                        <img src={tier.image} alt={tier.name} draggable={false} />
                      </button>
                    );
                  })}
                </div>

                {/* Island Details & Stats - compact 2-column layout */}
                <div className="flex gap-3 justify-center items-center mt-2">
                  <div className="bf-note">
                    <img
                      src={selectedTier.image}
                      alt={selectedTier.name}
                      style={{ maxHeight: 85 }}
                      draggable={false}
                    />
                  </div>
                  <div className="w-[290px] flex flex-col gap-0.5">
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--up" />
                      <span className="bf-row__grow text-[14.5px] font-semibold">{selectedTier.name}</span>
                      <b className="text-amber-700 font-semibold">Lv {selectedTier.tier}</b>
                    </div>
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--heart" />
                      <span className="bf-row__grow text-[13.5px]">Health Bonus</span>
                      <b className="font-semibold">+{selectedTier.hpBonus} HP</b>
                    </div>
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--cube" />
                      <span className="bf-row__grow text-[13.5px]">Build Slots / Minions</span>
                      <b className="font-semibold">+{selectedTier.buildSlots}</b>
                    </div>
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--chevron" style={{ transform: "rotate(-90deg)" }} />
                      <span className="bf-row__grow text-[13.5px]">Boundary Size</span>
                      <b className="font-semibold">{selectedTier.boundary}x{selectedTier.boundary}</b>
                    </div>
                    <div className="bf-row">
                      <span className="bf-icon bf-icon--coin" />
                      <span className="bf-row__grow text-[13.5px]">Upgrade Cost</span>
                      <b className={`font-semibold ${realBalance < selectedTier.cost && isSelectedTierNext ? "text-red-600" : ""}`}>
                        {selectedTier.cost === 0 ? "Unlocked" : `${selectedTier.cost.toLocaleString()} Coins`}
                      </b>
                    </div>

                    <div className="mt-2 flex justify-center gap-2">
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
                      <button
                        type="button"
                        className="bf-btn bf-btn--plain"
                        onClick={closeAllModals}
                      >
                        <span className="bf-btn__label">Close</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── STORE / SHOP MODAL ──────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {shopOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
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
                  onClick={closeAllModals}
                >
                  ✕
                </button>

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

                    <div className="flex flex-col items-center mb-2 gap-1.5">
                      <div className="inline-flex items-center gap-1.5 text-[18px] font-black text-amber-900">
                        <i className="bf-icon bf-icon--coin" />
                        <span className={realBalance < selectedShopItem.cost ? "text-red-600" : ""}>
                          {selectedShopItem.cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="bf-btn bf-btn--plain"
                          onClick={() => handleBuyShopItem(selectedShopItem)}
                          disabled={realBalance < selectedShopItem.cost}
                        >
                          <span className="bf-btn__label">Buy</span>
                        </button>
                        <button
                          type="button"
                          className="bf-btn bf-btn--plain"
                          onClick={closeAllModals}
                        >
                          <span className="bf-btn__label">Close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── DAILY REWARDS MODAL ─────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {dailyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap bf-modal-wrap--board"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
                className="bf-modal bf-dialog"
                style={{ minWidth: 380, maxWidth: 540 }}
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
                  onClick={closeAllModals}
                >
                  ✕
                </button>

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
                          className={`bf-slot flex flex-col items-center justify-center text-[12px] font-black !w-[56px] !h-[62px] ${
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

                <div className="bf-dialog__actions gap-2">
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
                  <button
                    type="button"
                    className="bf-btn bf-btn--plain"
                    onClick={closeAllModals}
                  >
                    <span className="bf-btn__label">Close</span>
                  </button>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── QUESTS MODAL ────────────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {questsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap bf-modal-wrap--board"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
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
                  onClick={closeAllModals}
                >
                  ✕
                </button>

                <div className="flex flex-col gap-2.5 mt-4 px-2 max-h-[380px] overflow-y-auto pr-1">
                  {econ.dailyQuests.map((q) => {
                    const pct = Math.min(100, Math.round((q.current / q.target) * 100));
                    const isDone = q.current >= q.target;
                    const isClaimed = Boolean(q.claimed);

                    const handleQuestAction = () => {
                      if (isDone && !isClaimed) {
                        handleClaimQuest(q);
                      } else if (!isDone) {
                        showToast(`In progress: ${q.title} (${q.current}/${q.target}). ${q.desc}`);
                      } else {
                        showToast(`Quest already claimed today! +${q.reward} Star Coins received.`);
                      }
                    };

                    return (
                      <div
                        key={q.id}
                        onClick={handleQuestAction}
                        className={`bf-row flex items-center justify-between gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                          isDone && !isClaimed
                            ? "ring-2 ring-amber-500 bg-amber-50/90 shadow-md"
                            : isClaimed
                              ? "opacity-75"
                              : "hover:brightness-105"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-black text-[15px] truncate text-amber-950 flex items-center gap-1.5">
                              {isDone && !isClaimed && <span className="text-amber-500 animate-pulse">⭐</span>}
                              {q.title}
                            </span>
                            <span className="text-[12px] font-bold text-amber-800 shrink-0 ml-2">
                              {q.current} / {q.target}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-amber-900/85 leading-tight">{q.desc}</p>
                          <div className="w-full bg-[#3d2716] h-2.5 rounded-full overflow-hidden mt-2 border border-[#5a3f23]">
                            <div
                              className={`h-full transition-[width] duration-300 ${
                                isDone
                                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                  : "bg-gradient-to-r from-amber-400 to-amber-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1 font-black text-amber-900 text-[14px]">
                            <i className="bf-icon bf-icon--coin" />
                            +{q.reward}
                          </span>
                          <button
                            type="button"
                            className={`bf-btn bf-btn--plain !min-w-[96px] !h-9 text-[13px] font-black cursor-pointer touch-manipulation active:scale-95 ${
                              isDone && !isClaimed
                                ? "!brightness-110 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                                : isClaimed
                                  ? "opacity-60"
                                  : ""
                            }`}
                            onClick={handleQuestAction}
                          >
                            <span className="bf-btn__label">
                              {isClaimed ? "✓ Done" : isDone ? "Claim!" : `${q.current}/${q.target}`}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center mt-3">
                  <button
                    type="button"
                    className="bf-btn bf-btn--plain !min-w-[100px] !h-9"
                    onClick={closeAllModals}
                  >
                    <span className="bf-btn__label">Close</span>
                  </button>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── BACKPACK INVENTORY MODAL ────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {backpackOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bf-overlay is-open"
            onClick={closeAllModals}
          >
            <div
              className="bf-modal-wrap bf-modal-wrap--board"
              style={{ transform: `scale(${bfFit})`, transformOrigin: "center center" }}
              onClick={closeAllModals}
            >
              <motion.section
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 25, stiffness: 380 }}
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
                  onClick={closeAllModals}
                >
                  ✕
                </button>

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

                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    className="bf-btn bf-btn--plain"
                    onClick={closeAllModals}
                  >
                    <span className="bf-btn__label">Close</span>
                  </button>
                </div>
              </motion.section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
