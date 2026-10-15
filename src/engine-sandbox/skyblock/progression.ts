import { Store } from "../shared/store";

/**
 * Skyblock island progression. XP comes from building, mining, selling and
 * quests; island levels unlock new blocks, generators and a larger build
 * radius. Island quests (milestones) pay XP + coins. Data-table driven so a
 * new tier or quest is one entry.
 */

export type Metric = "placed" | "mined" | "level" | "height" | "events" | "sold" | "generated";

export type Milestone = {
  id: string;
  label: string;
  metric: Metric;
  target: number;
  rewardXp: number;
  rewardCoins: number;
};

export type IslandTier = {
  level: number;
  xp: number;
  title: string;
  /** Build radius (blocks from island centre) available at this level. */
  radius: number;
  unlockBlock?: number;
  unlockLabel?: string;
  unlockGenerator?: string;
};

export const ISLAND_TIERS: IslandTier[] = [
  { level: 1, xp: 0, title: "Castaway", radius: 12 },
  { level: 2, xp: 60, title: "Settler", radius: 16, unlockBlock: 10, unlockLabel: "Glass", unlockGenerator: "Ore Generator" },
  { level: 3, xp: 180, title: "Builder", radius: 20, unlockBlock: 18, unlockLabel: "Glowstone", unlockGenerator: "Lumber Mill" },
  { level: 4, xp: 380, title: "Architect", radius: 25, unlockBlock: 19, unlockLabel: "Gold Block", unlockGenerator: "Sand Sifter" },
  { level: 5, xp: 680, title: "Sky Baron", radius: 30, unlockBlock: 20, unlockLabel: "Diamond Block" },
  { level: 6, xp: 1100, title: "Island Legend", radius: 36, unlockBlock: 23, unlockLabel: "Amethyst" },
  { level: 7, xp: 1700, title: "Cloud Keeper", radius: 42, unlockBlock: 21, unlockLabel: "Emerald Block" },
  { level: 8, xp: 2500, title: "Sky Sovereign", radius: 50, unlockBlock: 22, unlockLabel: "Lapis Block" },
];

export const MILESTONES: Milestone[] = [
  { id: "place-10", label: "Place 10 blocks", metric: "placed", target: 10, rewardXp: 15, rewardCoins: 20 },
  { id: "mine-10", label: "Mine 10 blocks", metric: "mined", target: 10, rewardXp: 15, rewardCoins: 20 },
  { id: "sold-50", label: "Earn 50 coins selling", metric: "sold", target: 50, rewardXp: 25, rewardCoins: 30 },
  { id: "gen-20", label: "Collect 20 generated resources", metric: "generated", target: 20, rewardXp: 25, rewardCoins: 40 },
  { id: "height-24", label: "Build up to height 24", metric: "height", target: 24, rewardXp: 30, rewardCoins: 40 },
  { id: "place-60", label: "Place 60 blocks", metric: "placed", target: 60, rewardXp: 40, rewardCoins: 60 },
  { id: "event-1", label: "Take part in a world event", metric: "events", target: 1, rewardXp: 25, rewardCoins: 50 },
  { id: "level-3", label: "Reach island level 3", metric: "level", target: 3, rewardXp: 50, rewardCoins: 100 },
  { id: "sold-500", label: "Earn 500 coins selling", metric: "sold", target: 500, rewardXp: 80, rewardCoins: 150 },
  { id: "mine-80", label: "Mine 80 blocks", metric: "mined", target: 80, rewardXp: 60, rewardCoins: 90 },
  { id: "gen-250", label: "Collect 250 generated resources", metric: "generated", target: 250, rewardXp: 90, rewardCoins: 200 },
  { id: "level-5", label: "Reach island level 5", metric: "level", target: 5, rewardXp: 120, rewardCoins: 300 },
  { id: "place-200", label: "Place 200 blocks", metric: "placed", target: 200, rewardXp: 120, rewardCoins: 250 },
  { id: "sold-5000", label: "Earn 5,000 coins selling", metric: "sold", target: 5000, rewardXp: 250, rewardCoins: 800 },
];

export type ProgressNotice = { id: number; title: string; detail: string };

export type ProgressionState = {
  xp: number;
  level: number;
  title: string;
  radius: number;
  levelFloorXp: number;
  nextLevelXp: number | null;
  placed: number;
  mined: number;
  height: number;
  events: number;
  sold: number;
  generated: number;
  completed: string[];
  unlockedBlocks: number[];
  notice: ProgressNotice | null;
};

/** Counters persisted to the player profile; everything else is derived. */
export type ProgressionSave = Pick<
  ProgressionState,
  "xp" | "placed" | "mined" | "height" | "events" | "sold" | "generated" | "completed"
>;

const XP_PLACE = 2;
const XP_MINE = 3;

export function tierFor(xp: number) {
  let tier = ISLAND_TIERS[0];
  for (const t of ISLAND_TIERS) if (xp >= t.xp) tier = t;
  return tier;
}

function derived(xp: number) {
  const tier = tierFor(xp);
  return {
    level: tier.level,
    title: tier.title,
    radius: tier.radius,
    levelFloorXp: tier.xp,
    nextLevelXp: ISLAND_TIERS.find((t) => t.level === tier.level + 1)?.xp ?? null,
    unlockedBlocks: ISLAND_TIERS.filter((t) => t.level <= tier.level && t.unlockBlock !== undefined).map(
      (t) => t.unlockBlock!,
    ),
  };
}

export class Progression {
  readonly store: Store<ProgressionState>;
  xpMultiplier = 1;
  onUnlockBlock?: (blockId: number) => void;
  /** Fired once per completed island quest so the economy can pay coins. */
  onMilestone?: (m: Milestone) => void;
  private noticeId = 0;

  constructor() {
    this.store = new Store<ProgressionState>({
      xp: 0,
      placed: 0,
      mined: 0,
      height: 0,
      events: 0,
      sold: 0,
      generated: 0,
      completed: [],
      notice: null,
      ...derived(0),
    });
  }

  get state() {
    return this.store.get();
  }

  hydrate(save: Partial<ProgressionSave>) {
    const xp = Math.max(0, Number(save.xp) || 0);
    this.store.set({
      xp,
      placed: Number(save.placed) || 0,
      mined: Number(save.mined) || 0,
      height: Number(save.height) || 0,
      events: Number(save.events) || 0,
      sold: Number(save.sold) || 0,
      generated: Number(save.generated) || 0,
      completed: Array.isArray(save.completed) ? save.completed.filter((c) => typeof c === "string") : [],
      ...derived(xp),
    });
  }

  toSave(): ProgressionSave {
    const { xp, placed, mined, height, events, sold, generated, completed } = this.state;
    return { xp, placed, mined, height, events, sold, generated, completed };
  }

  recordPlace(y: number) {
    const s = this.state;
    this.apply({ placed: s.placed + 1, height: Math.max(s.height, y) }, XP_PLACE);
  }

  recordMine() {
    this.apply({ mined: this.state.mined + 1 }, XP_MINE);
  }

  recordEvent(bonusXp: number) {
    this.apply({ events: this.state.events + 1 }, bonusXp, true);
  }

  recordSale(coins: number) {
    this.apply({ sold: this.state.sold + coins }, Math.max(1, Math.round(coins / 8)));
  }

  recordGenerated(count: number) {
    this.apply({ generated: this.state.generated + count }, 0, true);
  }

  grantXp(xp: number) {
    this.apply({}, xp, true);
  }

  /** Next tier's rewards, for the "next unlock" progress UI. */
  nextTier() {
    return ISLAND_TIERS.find((t) => t.level === this.state.level + 1) ?? null;
  }

  private apply(patch: Partial<ProgressionState>, baseXp: number, flat = false) {
    const s = this.state;
    const gained = flat ? baseXp : Math.round(baseXp * this.xpMultiplier);
    let next: ProgressionState = { ...s, ...patch, xp: s.xp + gained };
    let notice: ProgressNotice | null = null;

    // Quests can chain (e.g. a quest reward triggers a level quest).
    for (let guard = 0; guard < 6; guard++) {
      const tier = tierFor(next.xp);
      if (tier.level > next.level) {
        const passed = ISLAND_TIERS.filter((t) => t.level > next.level && t.level <= tier.level);
        next = { ...next, ...derived(next.xp) };
        passed.forEach((t) => t.unlockBlock !== undefined && this.onUnlockBlock?.(t.unlockBlock));
        const last = passed.at(-1)!;
        const unlocks = [last.unlockLabel, last.unlockGenerator, `radius ${last.radius}`].filter(Boolean);
        notice = {
          id: ++this.noticeId,
          title: `Island level ${tier.level} - ${tier.title}`,
          detail: `Unlocked ${unlocks.join(", ")}`,
        };
      }

      const done = MILESTONES.filter(
        (m) => !next.completed.includes(m.id) && (next[m.metric] as number) >= m.target,
      );
      if (done.length === 0) break;
      next = {
        ...next,
        completed: [...next.completed, ...done.map((m) => m.id)],
        xp: next.xp + done.reduce((sum, m) => sum + m.rewardXp, 0),
      };
      done.forEach((m) => this.onMilestone?.(m));
      if (!notice) {
        notice = {
          id: ++this.noticeId,
          title: "Island quest complete",
          detail: `${done[0].label}  +${done[0].rewardXp} XP  +${done[0].rewardCoins} coins`,
        };
      }
    }

    this.store.set({ ...next, notice: notice ?? s.notice });
  }

  /** The next few unfinished island quests, for the HUD tracker. */
  upcoming(count = 2) {
    const s = this.state;
    return MILESTONES.filter((m) => !s.completed.includes(m.id))
      .slice(0, count)
      .map((m) => ({ ...m, progress: Math.min(m.target, s[m.metric] as number) }));
  }
}
