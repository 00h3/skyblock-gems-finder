import { useEffect, useState } from "react";

export type MissionStat = "chests" | "dungeonVisits" | "forgerKills" | "dragonKills" | "accessories";

export interface MissionDef {
  id: string;
  title: string;
  detail: string;
  stat: MissionStat;
  goal: number;
  /** What this mission unlocks for the world. */
  reward: string;
  xp: number;
}

export const MISSIONS: MissionDef[] = [
  {
    id: "first-chest",
    title: "Treasure Hunter",
    detail: "Open a golden chest on any island",
    stat: "chests",
    goal: 1,
    reward: "Island Tier I",
    xp: 120,
  },
  {
    id: "enter-dungeon",
    title: "Into the Dark",
    detail: "Teleport to the Deep Dungeon",
    stat: "dungeonVisits",
    goal: 1,
    reward: "Dungeon Waypoint",
    xp: 150,
  },
  {
    id: "forgers",
    title: "Forger Hunt",
    detail: "Defeat 3 Golden Forgers",
    stat: "forgerKills",
    goal: 3,
    reward: "Island Tier II",
    xp: 300,
  },
  {
    id: "collector",
    title: "Accessory Collector",
    detail: "Collect 4 accessories from chests",
    stat: "accessories",
    goal: 4,
    reward: "Island Tier III",
    xp: 400,
  },
  {
    id: "dragon",
    title: "Slay the Red Dragon",
    detail: "Defeat the dragon in its arena",
    stat: "dragonKills",
    goal: 1,
    reward: "Dark Magic Staff",
    xp: 1500,
  },
];

export type MissionStats = Record<MissionStat, number>;
export interface MissionState {
  stats: MissionStats;
  done: string[];
}

const KEY = "qb_skyblock_missions_v1";
export const MISSION_EVENT = "qb-mission-update";
export const MISSION_DONE_EVENT = "qb-mission-done";

const empty = (): MissionState => ({
  stats: { chests: 0, dungeonVisits: 0, forgerKills: 0, dragonKills: 0, accessories: 0 },
  done: [],
});

let state: MissionState | null = null;

export function readMissions(): MissionState {
  if (state) return state;
  state = empty();
  if (typeof window === "undefined") return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MissionState>;
      state = {
        stats: { ...state.stats, ...(parsed.stats ?? {}) },
        done: Array.isArray(parsed.done) ? parsed.done : [],
      };
    }
  } catch {
    // Corrupt save: start fresh.
  }
  return state;
}

function commit(next: MissionState) {
  state = { stats: { ...next.stats }, done: [...next.done] };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode); progress still lives in memory.
  }
  window.dispatchEvent(new CustomEvent<MissionState>(MISSION_EVENT, { detail: state }));
}

/** Adds to a mission stat and fires a completion event for every mission that crosses its goal. */
export function bumpMission(stat: MissionStat, amount = 1) {
  const cur = readMissions();
  const next: MissionState = { stats: { ...cur.stats, [stat]: cur.stats[stat] + amount }, done: [...cur.done] };
  const finished: MissionDef[] = [];
  for (const m of MISSIONS) {
    if (!next.done.includes(m.id) && next.stats[m.stat] >= m.goal) {
      next.done.push(m.id);
      finished.push(m);
    }
  }
  commit(next);
  for (const m of finished) window.dispatchEvent(new CustomEvent<MissionDef>(MISSION_DONE_EVENT, { detail: m }));
}

export function currentMission(s: MissionState): MissionDef | null {
  return MISSIONS.find((m) => !s.done.includes(m.id)) ?? null;
}

export function useMissions(): MissionState {
  const [s, setS] = useState<MissionState>(() => empty());
  useEffect(() => {
    setS(readMissions());
    const on = (e: Event) => setS((e as CustomEvent<MissionState>).detail);
    window.addEventListener(MISSION_EVENT, on);
    return () => window.removeEventListener(MISSION_EVENT, on);
  }, []);
  return s;
}

/* ── Accessories & chest loot ─────────────────────────────────────────── */

export interface Reward {
  id: string;
  name: string;
  kind: "weapon" | "accessory";
  rarity: "common" | "rare" | "epic" | "legend";
  blurb: string;
  /** Hotbar item id for weapons. */
  itemId?: string;
}

const REWARD_TABLE: { reward: Reward; weight: number }[] = [
  { reward: { id: "diamond_sword", name: "Diamond Sword", kind: "weapon", rarity: "epic", blurb: "7 damage, long reach", itemId: "diamond_sword" }, weight: 8 },
  { reward: { id: "iron_sword", name: "Iron Sword", kind: "weapon", rarity: "rare", blurb: "6 damage, steady swings", itemId: "iron_sword" }, weight: 12 },
  { reward: { id: "lucky-charm", name: "Lucky Charm", kind: "accessory", rarity: "common", blurb: "A clover that hums softly", }, weight: 20 },
  { reward: { id: "ruby-ring", name: "Ruby Ring", kind: "accessory", rarity: "rare", blurb: "Warm to the touch", }, weight: 16 },
  { reward: { id: "sky-crown", name: "Sky Crown", kind: "accessory", rarity: "legend", blurb: "Worn by island kings", }, weight: 5 },
  { reward: { id: "wind-boots", name: "Wind Boots", kind: "accessory", rarity: "epic", blurb: "Light as a cloud", }, weight: 10 },
  { reward: { id: "ender-pendant", name: "Ender Pendant", kind: "accessory", rarity: "epic", blurb: "Whispers from the void", }, weight: 9 },
  { reward: { id: "gold-bracelet", name: "Gold Bracelet", kind: "accessory", rarity: "common", blurb: "Polished and proud", }, weight: 20 },
];

export function rollReward(): Reward {
  const total = REWARD_TABLE.reduce((a, r) => a + r.weight, 0);
  let t = Math.random() * total;
  for (const r of REWARD_TABLE) {
    t -= r.weight;
    if (t <= 0) return r.reward;
  }
  return REWARD_TABLE[0].reward;
}

const ACC_KEY = "qb_skyblock_accessories_v1";
export function readAccessories(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ACC_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function collectReward(reward: Reward) {
  if (reward.kind === "accessory") {
    const list = readAccessories();
    if (!list.includes(reward.id)) {
      list.push(reward.id);
      try {
        localStorage.setItem(ACC_KEY, JSON.stringify(list));
      } catch {
        // Ignore storage failures.
      }
    }
    bumpMission("accessories", 1);
  }
  bumpMission("chests", 1);
}

export const STAFF_KEY = "qb_skyblock_has_staff";
export const hasStaff = () => {
  try {
    return typeof window !== "undefined" && localStorage.getItem(STAFF_KEY) === "1";
  } catch {
    return false;
  }
};
export const grantStaff = () => {
  try {
    localStorage.setItem(STAFF_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
};
