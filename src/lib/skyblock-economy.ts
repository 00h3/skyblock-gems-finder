import { useEffect, useState } from "react";
import { GameAudio } from "@/lib/game-audio";
import { addCurrency } from "@/lib/currency";

// Key persistence constants
const PURSE_KEY = "qb_skyblock_purse";
const BANK_KEY = "qb_skyblock_bank";
const QUESTS_KEY = "qb_skyblock_quests";
const ISLAND_UPGRADE_KEY = "qb_skyblock_island_level";
const STREAK_KEY = "qb_skyblock_streak";

export interface DailyQuest {
  id: "stone" | "crops" | "mobs";
  title: string;
  desc: string;
  current: number;
  target: number;
  reward: number;
  claimed: boolean;
}

export interface IslandUpgradeInfo {
  level: number;
  boundarySize: number; // e.g. 40, 50, 60, 70, 80 blocks
  nextCost: number;
  maxLevel: number;
}

export interface DailyStreakInfo {
  currentDay: number;
  lastClaimDate: string;
  canClaim: boolean;
}

// In-memory state with lazy init
let purseCoins = 500;
let bankCoins = 1000;
let islandLevel = 1;
let dailyQuests: DailyQuest[] = [
  {
    id: "stone",
    title: "MINE 100 STONE",
    desc: "Mine 100 stone or cobblestone in deepstone or island",
    current: 0,
    target: 100,
    reward: 250,
    claimed: false,
  },
  {
    id: "crops",
    title: "HARVEST 50 CROPS",
    desc: "Harvest 50 wheat, crops, or timber logs",
    current: 0,
    target: 50,
    reward: 300,
    claimed: false,
  },
  {
    id: "mobs",
    title: "SLAY 10 MONSTERS",
    desc: "Defeat 10 hostile island or deepstone monsters",
    current: 0,
    target: 10,
    reward: 500,
    claimed: false,
  },
];
let questDate = "";
let dailyStreak: DailyStreakInfo = {
  currentDay: 1,
  lastClaimDate: "",
  canClaim: true,
};

const subscribers = new Set<() => void>();
let initialized = false;

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function initSkyblockEconomy() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    const savedPurse = localStorage.getItem(PURSE_KEY);
    if (savedPurse !== null) {
      const p = parseInt(savedPurse, 10);
      if (!isNaN(p) && p >= 0) purseCoins = p;
    }

    const savedBank = localStorage.getItem(BANK_KEY);
    if (savedBank !== null) {
      const b = parseInt(savedBank, 10);
      if (!isNaN(b) && b >= 0) bankCoins = b;
    }

    const savedLevel = localStorage.getItem(ISLAND_UPGRADE_KEY);
    if (savedLevel !== null) {
      const lvl = parseInt(savedLevel, 10);
      if (!isNaN(lvl) && lvl >= 1) islandLevel = lvl;
    }

    const today = getTodayString();
    const savedQuests = localStorage.getItem(QUESTS_KEY);
    if (savedQuests) {
      const parsed = JSON.parse(savedQuests);
      if (parsed.date === today && Array.isArray(parsed.quests)) {
        dailyQuests = parsed.quests;
        questDate = today;
      } else {
        // Reset for the new day
        resetDailyQuests(today);
      }
    } else {
      resetDailyQuests(today);
    }

    const savedStreak = localStorage.getItem(STREAK_KEY);
    if (savedStreak) {
      const parsed = JSON.parse(savedStreak);
      dailyStreak = {
        currentDay: parsed.currentDay || 1,
        lastClaimDate: parsed.lastClaimDate || "",
        canClaim: parsed.lastClaimDate !== today,
      };
    }
  } catch (e) {
    console.warn("Skyblock economy init notice:", e);
  }

  notifySubscribers();
}

function persistState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PURSE_KEY, String(purseCoins));
    localStorage.setItem(BANK_KEY, String(bankCoins));
    localStorage.setItem(ISLAND_UPGRADE_KEY, String(islandLevel));
    localStorage.setItem(
      QUESTS_KEY,
      JSON.stringify({ date: questDate || getTodayString(), quests: dailyQuests }),
    );
    localStorage.setItem(STREAK_KEY, JSON.stringify(dailyStreak));
  } catch (e) {
    // quota guard
  }
}

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

function resetDailyQuests(today: string) {
  questDate = today;
  dailyQuests = [
    {
      id: "stone",
      title: "MINE 100 STONE",
      desc: "Mine 100 stone or cobblestone in deepstone or island",
      current: 0,
      target: 100,
      reward: 250,
      claimed: false,
    },
    {
      id: "crops",
      title: "HARVEST 50 CROPS",
      desc: "Harvest 50 wheat, crops, or timber logs",
      current: 0,
      target: 50,
      reward: 300,
      claimed: false,
    },
    {
      id: "mobs",
      title: "SLAY 10 MONSTERS",
      desc: "Defeat 10 hostile island or deepstone monsters",
      current: 0,
      target: 10,
      reward: 500,
      claimed: false,
    },
  ];
  persistState();
}

export function getPurseCoins(): number {
  if (!initialized) initSkyblockEconomy();
  return purseCoins;
}

export function getBankCoins(): number {
  if (!initialized) initSkyblockEconomy();
  return bankCoins;
}

export function setPurseCoins(amount: number) {
  if (!initialized) initSkyblockEconomy();
  purseCoins = Math.max(0, Math.floor(amount));
  persistState();
  notifySubscribers();
}

export function setBankCoins(amount: number) {
  if (!initialized) initSkyblockEconomy();
  bankCoins = Math.max(0, Math.floor(amount));
  persistState();
  notifySubscribers();
}

export function addPurseCoins(amount: number) {
  if (amount === 0) return;
  setPurseCoins(getPurseCoins() + amount);
}

// ── Bank Operations ──────────────────────────────────────────────────────────
export function depositToBank(amount: number | "all"): { success: boolean; deposited: number; message: string } {
  if (!initialized) initSkyblockEconomy();
  const currentPurse = purseCoins;
  const toDeposit = amount === "all" ? currentPurse : Math.floor(Number(amount));

  if (toDeposit <= 0) {
    return { success: false, deposited: 0, message: "Deposit amount must be greater than 0." };
  }
  if (toDeposit > currentPurse) {
    return {
      success: false,
      deposited: 0,
      message: `Insufficient purse coins. You have ${currentPurse.toLocaleString()} coins.`,
    };
  }

  purseCoins -= toDeposit;
  bankCoins += toDeposit;
  persistState();
  notifySubscribers();
  GameAudio.playCashRegister?.();

  return {
    success: true,
    deposited: toDeposit,
    message: `Deposited ${toDeposit.toLocaleString()} coins into Bank Vault. (Safe from deaths!)`,
  };
}

export function withdrawFromBank(amount: number | "all"): { success: boolean; withdrawn: number; message: string } {
  if (!initialized) initSkyblockEconomy();
  const currentBank = bankCoins;
  const toWithdraw = amount === "all" ? currentBank : Math.floor(Number(amount));

  if (toWithdraw <= 0) {
    return { success: false, withdrawn: 0, message: "Withdraw amount must be greater than 0." };
  }
  if (toWithdraw > currentBank) {
    return {
      success: false,
      withdrawn: 0,
      message: `Insufficient bank funds. You have ${currentBank.toLocaleString()} in your bank.`,
    };
  }

  bankCoins -= toWithdraw;
  purseCoins += toWithdraw;
  persistState();
  notifySubscribers();
  GameAudio.playCashRegister?.();

  return {
    success: true,
    withdrawn: toWithdraw,
    message: `Withdrew ${toWithdraw.toLocaleString()} coins from Bank Vault to purse.`,
  };
}

// ── Pay Command with 1% Transaction Tax ───────────────────────────────────────
export function payPlayer(
  targetPlayer: string,
  amount: number,
): { success: boolean; sent: number; tax: number; message: string } {
  if (!initialized) initSkyblockEconomy();
  const amt = Math.floor(amount);
  if (amt <= 0) {
    return { success: false, sent: 0, tax: 0, message: "Payment amount must be greater than 0." };
  }

  const tax = Math.max(1, Math.ceil(amt * 0.01)); // 1% anti-inflation tax
  const totalDeduction = amt;

  if (purseCoins < totalDeduction) {
    return {
      success: false,
      sent: 0,
      tax: 0,
      message: `Insufficient purse coins. You need ${totalDeduction.toLocaleString()} coins.`,
    };
  }

  purseCoins -= totalDeduction;
  const netReceived = amt - tax;
  persistState();
  notifySubscribers();
  GameAudio.playCashRegister?.();

  return {
    success: true,
    sent: amt,
    tax,
    message: `Paid ${amt.toLocaleString()} coins to ${targetPlayer}. (1% tax: ${tax} coins burned, recipient gets ${netReceived.toLocaleString()} coins).`,
  };
}

// ── Death Penalties (PvE: 10% Purse lost, Void: 20% Purse lost; Bank: 100% safe)
export function applyVoidDeathPenalty(): { lost: number; remainingPurse: number; bankSafe: number } {
  if (!initialized) initSkyblockEconomy();
  const lost = Math.floor(purseCoins * 0.2); // 20% void penalty
  purseCoins = Math.max(0, purseCoins - lost);
  persistState();
  notifySubscribers();
  return { lost, remainingPurse: purseCoins, bankSafe: bankCoins };
}

export function applyPveDeathPenalty(): { lost: number; remainingPurse: number; bankSafe: number } {
  if (!initialized) initSkyblockEconomy();
  const lost = Math.floor(purseCoins * 0.1); // 10% PvE penalty
  purseCoins = Math.max(0, purseCoins - lost);
  persistState();
  notifySubscribers();
  return { lost, remainingPurse: purseCoins, bankSafe: bankCoins };
}

// ── Mining & Farming Coin Payouts ─────────────────────────────────────────────
export function earnMiningCoin(
  blockType: number,
  blockName: string,
): { coins: number; name: string } {
  if (!initialized) initSkyblockEconomy();
  const b = blockName.toLowerCase();
  let coins = 0;
  let isCropOrWood = false;
  let isStone = false;

  if (b.includes("diamond")) {
    coins = Math.floor(Math.random() * 11) + 20; // 20 - 30
  } else if (b.includes("emerald")) {
    coins = Math.floor(Math.random() * 16) + 25; // 25 - 40
  } else if (b.includes("gold")) {
    coins = Math.floor(Math.random() * 6) + 10; // 10 - 15
  } else if (b.includes("iron")) {
    coins = Math.floor(Math.random() * 4) + 5; // 5 - 8
  } else if (b.includes("coal")) {
    coins = Math.floor(Math.random() * 2) + 3; // 3 - 4
  } else if (b.includes("obsidian")) {
    coins = Math.floor(Math.random() * 9) + 12; // 12 - 20
  } else if (
    b.includes("wheat") ||
    b.includes("carrot") ||
    b.includes("potato") ||
    b.includes("melon") ||
    b.includes("pumpkin") ||
    b.includes("cane")
  ) {
    coins = Math.floor(Math.random() * 4) + 2; // 2 - 5
    isCropOrWood = true;
  } else if (b.includes("log") || b.includes("wood")) {
    coins = Math.floor(Math.random() * 2) + 1; // 1 - 2
    isCropOrWood = true;
  } else if (b.includes("stone") || b.includes("cobble") || blockType === 2 || blockType === 15) {
    coins = Math.floor(Math.random() * 2) + 1; // 1 - 2
    isStone = true;
  }

  if (coins > 0) {
    purseCoins += coins;
    GameAudio.playCoinPickup?.();

    // Quest progress ticks
    if (isStone) incrementDailyQuestProgress("stone", 1);
    if (isCropOrWood) incrementDailyQuestProgress("crops", 1);

    persistState();
    notifySubscribers();

    // Broadcast toast event for HUD feedback
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("qb-coin-earned", {
          detail: { coins, source: blockName, total: purseCoins },
        }),
      );
    }
  }

  return { coins, name: blockName };
}

// ── Mob Bounty Payouts ────────────────────────────────────────────────────────
export function earnMobBounty(mobName: string = "Monster"): { coins: number; mob: string } {
  if (!initialized) initSkyblockEconomy();
  const coins = Math.floor(Math.random() * 21) + 5; // 5 - 25 coins
  purseCoins += coins;
  GameAudio.playCoinPickup?.();

  incrementDailyQuestProgress("mobs", 1);
  persistState();
  notifySubscribers();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("qb-coin-earned", {
        detail: { coins, source: `Mob Bounty (${mobName})`, total: purseCoins },
      }),
    );
  }

  return { coins, mob: mobName };
}

// ── Daily Quests ──────────────────────────────────────────────────────────────
export function getDailyQuests(): DailyQuest[] {
  if (!initialized) initSkyblockEconomy();
  return [...dailyQuests];
}

export function incrementDailyQuestProgress(questId: "stone" | "crops" | "mobs", delta: number) {
  const quest = dailyQuests.find((q) => q.id === questId);
  if (!quest || quest.claimed) return;
  quest.current = Math.min(quest.target, quest.current + delta);
  persistState();
  notifySubscribers();
}

export function claimDailyQuest(questId: "stone" | "crops" | "mobs"): {
  success: boolean;
  reward: number;
  message: string;
} {
  if (!initialized) initSkyblockEconomy();
  const quest = dailyQuests.find((q) => q.id === questId);
  if (!quest) return { success: false, reward: 0, message: "Quest not found." };
  if (quest.current < quest.target) {
    return {
      success: false,
      reward: 0,
      message: `Quest not complete yet (${quest.current}/${quest.target}).`,
    };
  }
  if (quest.claimed) {
    return { success: false, reward: 0, message: "Reward already claimed today." };
  }

  quest.claimed = true;
  purseCoins += quest.reward;
  persistState();
  notifySubscribers();
  GameAudio.playLevelUp?.();

  return {
    success: true,
    reward: quest.reward,
    message: `Claimed ${quest.reward.toLocaleString()} coins for completing ${quest.title}!`,
  };
}

// ── Island Boundary & Level Upgrades ──────────────────────────────────────────
const ISLAND_UPGRADE_COSTS: Record<number, number> = {
  1: 1000, // Upgrade to Lvl 2: 50x50 boundary
  2: 2500, // Upgrade to Lvl 3: 60x60 boundary
  3: 5000, // Upgrade to Lvl 4: 70x70 boundary
  4: 10000, // Upgrade to Lvl 5: 80x80 boundary
};

export function getIslandUpgradeInfo(): IslandUpgradeInfo {
  if (!initialized) initSkyblockEconomy();
  const boundarySize = 40 + (islandLevel - 1) * 10;
  const nextCost = ISLAND_UPGRADE_COSTS[islandLevel] || 0;
  return {
    level: islandLevel,
    boundarySize,
    nextCost,
    maxLevel: 5,
  };
}

export function upgradeIslandBoundary(): { success: boolean; newLevel: number; message: string } {
  if (!initialized) initSkyblockEconomy();
  const info = getIslandUpgradeInfo();
  if (info.level >= info.maxLevel) {
    return { success: false, newLevel: islandLevel, message: "Island is already at maximum level!" };
  }
  if (purseCoins < info.nextCost) {
    return {
      success: false,
      newLevel: islandLevel,
      message: `Insufficient coins. Need ${info.nextCost.toLocaleString()} coins to expand island boundary.`,
    };
  }

  purseCoins -= info.nextCost;
  islandLevel += 1;
  persistState();
  notifySubscribers();
  GameAudio.playLevelUp?.();

  const newBoundary = 40 + (islandLevel - 1) * 10;
  return {
    success: true,
    newLevel: islandLevel,
    message: `Island upgraded to Level ${islandLevel}! Boundary size expanded to ${newBoundary}x${newBoundary} blocks.`,
  };
}

// ── Daily Streak Login Bonus ──────────────────────────────────────────────────
const STREAK_REWARDS: Record<number, { coins: number; desc: string }> = {
  1: { coins: 150, desc: "150 Coins" },
  2: { coins: 300, desc: "300 Coins" },
  3: { coins: 500, desc: "500 Coins" },
  4: { coins: 750, desc: "750 Coins" },
  5: { coins: 1000, desc: "1,000 Coins" },
  6: { coins: 1500, desc: "1,500 Coins" },
  7: { coins: 3000, desc: "3,000 Coins + Rare Key" },
};

export function getDailyStreakInfo(): DailyStreakInfo {
  if (!initialized) initSkyblockEconomy();
  return { ...dailyStreak };
}

export function claimDailyStreak(): { success: boolean; reward: number; message: string } {
  if (!initialized) initSkyblockEconomy();
  const today = getTodayString();
  if (dailyStreak.lastClaimDate === today) {
    return { success: false, reward: 0, message: "You already claimed your streak today! Come back tomorrow." };
  }

  const dayNum = ((dailyStreak.currentDay - 1) % 7) + 1;
  const rewardData = STREAK_REWARDS[dayNum] || { coins: 200, desc: "200 Coins" };

  purseCoins += rewardData.coins;
  dailyStreak = {
    currentDay: dailyStreak.currentDay + 1,
    lastClaimDate: today,
    canClaim: false,
  };
  persistState();
  notifySubscribers();
  GameAudio.playLevelUp?.();

  return {
    success: true,
    reward: rewardData.coins,
    message: `Day ${dayNum} Login Bonus: Claimed ${rewardData.desc}!`,
  };
}

// ── Reactive React Hook ───────────────────────────────────────────────────────
export function useSkyblockEconomy() {
  const [, setTick] = useState(0);

  useEffect(() => {
    initSkyblockEconomy();
    const handleUpdate = () => setTick((t) => t + 1);
    subscribers.add(handleUpdate);
    return () => {
      subscribers.delete(handleUpdate);
    };
  }, []);

  return {
    purse: purseCoins,
    bank: bankCoins,
    dailyQuests,
    islandInfo: getIslandUpgradeInfo(),
    streak: dailyStreak,
    depositToBank,
    withdrawFromBank,
    payPlayer,
    claimDailyQuest,
    upgradeIslandBoundary,
    claimDailyStreak,
  };
}
