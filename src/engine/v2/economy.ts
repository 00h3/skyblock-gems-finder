import { Store } from "./store";
import type { Progression } from "./progression";

/**
 * Skyblock economy: finite block inventory, coins, a shop, passive resource
 * generators and daily quests. Everything that changes the UI goes through
 * `store`; generator timers tick privately so the render loop never causes
 * React re-renders on its own.
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

type Resource = { value: number; rarity: Rarity };

/** Sell value per block id. Blocks not listed can be placed but not sold. */
export const RESOURCES: Record<number, Resource> = {
  1: { value: 1, rarity: "common" },
  2: { value: 1, rarity: "common" },
  3: { value: 2, rarity: "common" },
  4: { value: 2, rarity: "common" },
  6: { value: 2, rarity: "common" },
  9: { value: 1, rarity: "common" },
  13: { value: 2, rarity: "common" },
  15: { value: 2, rarity: "common" },
  7: { value: 4, rarity: "common" },
  38: { value: 5, rarity: "uncommon" },
  39: { value: 6, rarity: "uncommon" },
  17: { value: 4, rarity: "uncommon" },
  10: { value: 6, rarity: "uncommon" },
  36: { value: 8, rarity: "uncommon" },
  37: { value: 14, rarity: "rare" },
  18: { value: 18, rarity: "rare" },
  22: { value: 24, rarity: "rare" },
  19: { value: 40, rarity: "epic" },
  23: { value: 55, rarity: "epic" },
  21: { value: 70, rarity: "epic" },
  20: { value: 110, rarity: "legendary" },
};

export const sellPrice = (id: number) => RESOURCES[id]?.value ?? 0;
export const buyPrice = (id: number) => Math.max(3, Math.ceil(sellPrice(id) * 3.5));
export const rarityOf = (id: number): Rarity => RESOURCES[id]?.rarity ?? "common";

/** Always purchasable; island levels add more via Progression.unlockedBlocks. */
export const BASE_SHOP = [1, 2, 3, 4, 6, 7, 9, 13, 15];

export const STARTER_INVENTORY: Record<number, number> = {
  7: 8,
  9: 8,
  2: 16,
  4: 16,
  6: 8,
  13: 16,
  1: 16,
  3: 8,
};
const STARTER_ORDER = [7, 9, 2, 4, 6, 13, 1, 3];
export const HOTBAR_SIZE = 10;

export type GeneratorDef = {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  baseInterval: number;
  baseCost: number;
  /** Weighted output table; weight can scale with generator level. */
  output: (level: number) => { id: number; weight: number }[];
};

export const MAX_GENERATOR_LEVEL = 10;

export const GENERATORS: GeneratorDef[] = [
  {
    id: "cobble",
    name: "Cobble Generator",
    description: "Steady cobblestone, with stone at higher levels",
    unlockLevel: 1,
    baseInterval: 8,
    baseCost: 40,
    output: (l) => [
      { id: 4, weight: 10 },
      { id: 3, weight: Math.max(0, l - 1) * 1.5 },
    ],
  },
  {
    id: "ore",
    name: "Ore Generator",
    description: "Coal to diamond. Upgrades improve rare odds",
    unlockLevel: 2,
    baseInterval: 14,
    baseCost: 150,
    output: (l) => [
      { id: 36, weight: 60 },
      { id: 37, weight: 20 + l },
      { id: 22, weight: 8 + l * 1.2 },
      { id: 19, weight: 4 + l * 1.4 },
      { id: 21, weight: 1.5 + l },
      { id: 20, weight: 0.6 + l * 0.7 },
    ],
  },
  {
    id: "wood",
    name: "Lumber Mill",
    description: "Logs and leaves for building",
    unlockLevel: 3,
    baseInterval: 10,
    baseCost: 90,
    output: (l) => [
      { id: 7, weight: 10 },
      { id: 9, weight: 6 },
      { id: 38, weight: 2 + l },
      { id: 39, weight: 1 + l * 0.8 },
    ],
  },
  {
    id: "sand",
    name: "Sand Sifter",
    description: "Sand, gravel, ice and the odd pane of glass",
    unlockLevel: 4,
    baseInterval: 9,
    baseCost: 120,
    output: (l) => [
      { id: 6, weight: 10 },
      { id: 15, weight: 6 },
      { id: 17, weight: 2 + l * 0.5 },
      { id: 10, weight: 1 + l * 0.6 },
    ],
  },
];

export const generatorInterval = (def: GeneratorDef, level: number) =>
  def.baseInterval * Math.pow(0.86, Math.max(0, level - 1));
export const generatorCost = (def: GeneratorDef, level: number) =>
  Math.round(def.baseCost * Math.pow(1.7, level));

export type QuestMetric = "mined" | "placed" | "earned" | "collected" | "ores" | "upgrades" | "bought";

export type DailyQuest = {
  id: string;
  label: string;
  metric: QuestMetric;
  target: number;
  progress: number;
  rewardXp: number;
  rewardCoins: number;
  done: boolean;
};

const DAILY_POOL: Omit<DailyQuest, "progress" | "done">[] = [
  { id: "d-mine-40", label: "Mine 40 blocks", metric: "mined", target: 40, rewardXp: 40, rewardCoins: 60 },
  { id: "d-place-50", label: "Place 50 blocks", metric: "placed", target: 50, rewardXp: 40, rewardCoins: 60 },
  { id: "d-earn-150", label: "Earn 150 coins selling", metric: "earned", target: 150, rewardXp: 50, rewardCoins: 80 },
  { id: "d-collect-30", label: "Collect 30 generated resources", metric: "collected", target: 30, rewardXp: 45, rewardCoins: 70 },
  { id: "d-ores-10", label: "Mine 10 ore blocks", metric: "ores", target: 10, rewardXp: 60, rewardCoins: 90 },
  { id: "d-upgrade-2", label: "Upgrade generators twice", metric: "upgrades", target: 2, rewardXp: 60, rewardCoins: 50 },
  { id: "d-buy-32", label: "Buy 32 blocks from the shop", metric: "bought", target: 32, rewardXp: 35, rewardCoins: 40 },
  { id: "d-mine-100", label: "Mine 100 blocks", metric: "mined", target: 100, rewardXp: 90, rewardCoins: 140 },
];

const ORE_IDS = new Set([36, 37, 22, 19, 21, 20]);

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function dailyQuestsFor(day: string, seed: string): DailyQuest[] {
  let h = hash(`${day}:${seed}`);
  const pool = [...DAILY_POOL];
  const picked: DailyQuest[] = [];
  while (picked.length < 3 && pool.length) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const [q] = pool.splice(h % pool.length, 1);
    picked.push({ ...q, progress: 0, done: false });
  }
  return picked;
}

export type EconomyNotice = { id: number; title: string; detail: string };

export type GeneratorState = { level: number };

export type EconomyState = {
  coins: number;
  inventory: Record<number, number>;
  hotbar: number[];
  generators: Record<string, GeneratorState>;
  day: string;
  daily: DailyQuest[];
  notice: EconomyNotice | null;
};

export type EconomySave = Omit<EconomyState, "notice"> & { savedAt: number };

const OFFLINE_CAP_SECONDS = 2 * 60 * 60;

export class Economy {
  readonly store: Store<EconomyState>;
  private timers: Record<string, number> = {};
  private noticeId = 0;
  private seed = "guest";
  /** Bumped on every persisted change so the saver knows when to write. */
  revision = 0;

  constructor(private progression: Progression) {
    this.store = new Store<EconomyState>({
      coins: 25,
      inventory: { ...STARTER_INVENTORY },
      hotbar: [...STARTER_ORDER],
      generators: { cobble: { level: 1 } },
      day: todayKey(),
      daily: dailyQuestsFor(todayKey(), "guest"),
      notice: null,
    });
    progression.onMilestone = (m) => this.addCoins(m.rewardCoins);
  }

  get state() {
    return this.store.get();
  }

  private commit(patch: Partial<EconomyState> | ((s: EconomyState) => EconomyState)) {
    this.revision++;
    this.store.set(patch);
  }

  private notify(title: string, detail: string) {
    this.store.set({ notice: { id: ++this.noticeId, title, detail } });
  }

  // ── Persistence ────────────────────────────────────────────────────────

  hydrate(save: Partial<EconomySave> | null, seed: string) {
    this.seed = seed;
    if (!save) {
      this.commit({ daily: dailyQuestsFor(todayKey(), seed), day: todayKey() });
      return;
    }
    const inventory: Record<number, number> = {};
    for (const [k, v] of Object.entries(save.inventory ?? {})) {
      const n = Math.max(0, Math.floor(Number(v) || 0));
      if (n > 0) inventory[Number(k)] = n;
    }
    const hotbar = Array.isArray(save.hotbar)
      ? save.hotbar.filter((n) => Number.isInteger(n)).slice(0, HOTBAR_SIZE)
      : [...STARTER_ORDER];
    const generators: Record<string, GeneratorState> = {};
    for (const def of GENERATORS) {
      const lvl = Math.min(MAX_GENERATOR_LEVEL, Math.max(0, Math.floor(save.generators?.[def.id]?.level ?? 0)));
      if (lvl > 0) generators[def.id] = { level: lvl };
    }
    if (!generators.cobble) generators.cobble = { level: 1 };

    const day = todayKey();
    const daily = save.day === day && Array.isArray(save.daily) ? save.daily : dailyQuestsFor(day, seed);

    this.store.set({
      coins: Math.max(0, Math.floor(Number(save.coins) || 0)),
      inventory,
      hotbar,
      generators,
      day,
      daily,
    });

    const away = save.savedAt ? Math.min(OFFLINE_CAP_SECONDS, (Date.now() - save.savedAt) / 1000) : 0;
    if (away > 30) {
      const gained = this.simulate(away);
      if (gained > 0) this.notify("Welcome back", `Your generators made ${gained} resources while you were away`);
    }
  }

  toSave(): EconomySave {
    const { notice: _notice, ...rest } = this.state;
    return { ...rest, savedAt: Date.now() };
  }

  // ── Inventory ──────────────────────────────────────────────────────────

  count(id: number) {
    return this.state.inventory[id] ?? 0;
  }

  /** Adds items; new block types take a free (or empty) hotbar slot. */
  give(id: number, amount: number) {
    if (amount <= 0) return;
    this.commit((s) => {
      const inventory = { ...s.inventory, [id]: (s.inventory[id] ?? 0) + amount };
      let hotbar = s.hotbar;
      if (!hotbar.includes(id)) {
        if (hotbar.length < HOTBAR_SIZE) hotbar = [...hotbar, id];
        else {
          const empty = hotbar.findIndex((h) => (s.inventory[h] ?? 0) <= 0);
          if (empty >= 0) hotbar = hotbar.map((h, i) => (i === empty ? id : h));
        }
      }
      return { ...s, inventory, hotbar };
    });
  }

  /** Removes one block for placement. Returns false when out of stock. */
  consume(id: number) {
    const have = this.count(id);
    if (have <= 0) return false;
    this.commit((s) => {
      const inventory = { ...s.inventory };
      if (have - 1 <= 0) delete inventory[id];
      else inventory[id] = have - 1;
      return { ...s, inventory };
    });
    this.track("placed", 1);
    return true;
  }

  collectMined(id: number) {
    this.give(id, 1);
    this.track("mined", 1);
    if (ORE_IDS.has(id)) this.track("ores", 1);
  }

  setHotbarSlot(slot: number, id: number) {
    this.commit((s) => {
      const hotbar = [...s.hotbar];
      const existing = hotbar.indexOf(id);
      if (slot < hotbar.length) {
        // Swap so the displaced block keeps a slot instead of vanishing.
        if (existing >= 0) hotbar[existing] = hotbar[slot];
        hotbar[slot] = id;
      } else if (existing < 0 && hotbar.length < HOTBAR_SIZE) {
        hotbar.push(id);
      }
      return { ...s, hotbar };
    });
  }

  // ── Coins & shop ───────────────────────────────────────────────────────

  addCoins(amount: number) {
    if (amount <= 0) return;
    this.commit((s) => ({ ...s, coins: s.coins + amount }));
  }

  sell(id: number, amount: number) {
    const price = sellPrice(id);
    const n = Math.min(amount, this.count(id));
    if (price <= 0 || n <= 0) return 0;
    const earned = price * n;
    this.commit((s) => {
      const inventory = { ...s.inventory };
      const left = (inventory[id] ?? 0) - n;
      if (left <= 0) delete inventory[id];
      else inventory[id] = left;
      return { ...s, inventory, coins: s.coins + earned };
    });
    this.progression.recordSale(earned);
    this.track("earned", earned);
    return earned;
  }

  /** Sells every sellable stack except what is currently on the hotbar. */
  sellAllLoose() {
    const { inventory, hotbar } = this.state;
    let total = 0;
    for (const key of Object.keys(inventory)) {
      const id = Number(key);
      if (hotbar.includes(id) || sellPrice(id) <= 0) continue;
      total += this.sell(id, inventory[id]);
    }
    return total;
  }

  shopItems() {
    const unlocked = this.progression.state.unlockedBlocks;
    return [...BASE_SHOP, ...unlocked.filter((id) => !BASE_SHOP.includes(id))];
  }

  buy(id: number, amount: number) {
    if (!this.shopItems().includes(id)) return false;
    const cost = buyPrice(id) * amount;
    if (this.state.coins < cost) return false;
    this.commit((s) => ({ ...s, coins: s.coins - cost }));
    this.give(id, amount);
    this.track("bought", amount);
    return true;
  }

  // ── Generators ─────────────────────────────────────────────────────────

  generatorLevel(id: string) {
    return this.state.generators[id]?.level ?? 0;
  }

  /** 0..1 progress toward the next drop, read by the UI on a poll. */
  generatorProgress(id: string) {
    const def = GENERATORS.find((g) => g.id === id);
    const level = this.generatorLevel(id);
    if (!def || level <= 0) return 0;
    return Math.min(1, (this.timers[id] ?? 0) / generatorInterval(def, level));
  }

  upgradeGenerator(id: string) {
    const def = GENERATORS.find((g) => g.id === id);
    if (!def) return false;
    const level = this.generatorLevel(id);
    if (level >= MAX_GENERATOR_LEVEL || this.progression.state.level < def.unlockLevel) return false;
    const cost = generatorCost(def, level);
    if (this.state.coins < cost) return false;
    this.commit((s) => ({
      ...s,
      coins: s.coins - cost,
      generators: { ...s.generators, [id]: { level: level + 1 } },
    }));
    this.progression.grantXp(level === 0 ? 20 : 10 + level * 4);
    this.track("upgrades", 1);
    this.notify(level === 0 ? `${def.name} built` : `${def.name} upgraded`, `Now level ${level + 1}`);
    return true;
  }

  private roll(def: GeneratorDef, level: number) {
    const table = def.output(level).filter((o) => o.weight > 0);
    const total = table.reduce((sum, o) => sum + o.weight, 0);
    let r = Math.random() * total;
    for (const o of table) {
      r -= o.weight;
      if (r <= 0) return o.id;
    }
    return table[0].id;
  }

  /** Advances generators by `seconds`; returns number of resources produced. */
  private simulate(seconds: number) {
    const drops: Record<number, number> = {};
    let produced = 0;
    for (const def of GENERATORS) {
      const level = this.generatorLevel(def.id);
      if (level <= 0) continue;
      const interval = generatorInterval(def, level);
      let t = (this.timers[def.id] ?? 0) + seconds;
      let guard = 0;
      while (t >= interval && guard++ < 2000) {
        t -= interval;
        const id = this.roll(def, level);
        drops[id] = (drops[id] ?? 0) + 1;
        produced++;
      }
      this.timers[def.id] = t % interval;
    }
    if (produced > 0) {
      for (const [id, n] of Object.entries(drops)) this.give(Number(id), n);
      this.progression.recordGenerated(produced);
      this.track("collected", produced);
    }
    return produced;
  }

  tick(dt: number) {
    this.simulate(dt);
    if (this.state.day !== todayKey()) {
      this.commit({ day: todayKey(), daily: dailyQuestsFor(todayKey(), this.seed) });
      this.notify("New daily quests", "Three fresh objectives are ready");
    }
  }

  // ── Daily quests ───────────────────────────────────────────────────────

  private track(metric: QuestMetric, amount: number) {
    const quests = this.state.daily;
    if (!quests.some((q) => q.metric === metric && !q.done)) return;
    const finished: DailyQuest[] = [];
    const daily = quests.map((q) => {
      if (q.metric !== metric || q.done) return q;
      const progress = Math.min(q.target, q.progress + amount);
      const done = progress >= q.target;
      const next = { ...q, progress, done };
      if (done) finished.push(next);
      return next;
    });
    this.commit({ daily });
    for (const q of finished) {
      this.addCoins(q.rewardCoins);
      this.progression.grantXp(q.rewardXp);
      this.notify("Daily quest complete", `${q.label}  +${q.rewardXp} XP  +${q.rewardCoins} coins`);
    }
  }
}
