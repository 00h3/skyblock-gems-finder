import { Store } from "./store";

/**
 * Skyblock island progression. XP comes from building and mining; island
 * levels unlock new block types, milestones pay out bonus XP. Designed as a
 * data table so new tiers/milestones are one entry each.
 */

export type Metric = "placed" | "mined" | "level" | "height" | "events";

export type Milestone = {
  id: string;
  label: string;
  metric: Metric;
  target: number;
  rewardXp: number;
};

export type IslandTier = {
  level: number;
  xp: number;
  title: string;
  unlockBlock?: number;
  unlockLabel?: string;
};

export const ISLAND_TIERS: IslandTier[] = [
  { level: 1, xp: 0, title: "Castaway" },
  { level: 2, xp: 60, title: "Settler", unlockBlock: 10, unlockLabel: "Glass" },
  { level: 3, xp: 160, title: "Builder", unlockBlock: 18, unlockLabel: "Glowstone" },
  { level: 4, xp: 320, title: "Architect", unlockBlock: 19, unlockLabel: "Gold Block" },
  { level: 5, xp: 560, title: "Sky Baron", unlockBlock: 20, unlockLabel: "Diamond Block" },
  { level: 6, xp: 900, title: "Island Legend", unlockBlock: 23, unlockLabel: "Amethyst" },
];

export const MILESTONES: Milestone[] = [
  { id: "place-10", label: "Place 10 blocks", metric: "placed", target: 10, rewardXp: 15 },
  { id: "mine-10", label: "Mine 10 blocks", metric: "mined", target: 10, rewardXp: 15 },
  { id: "height-24", label: "Build up to height 24", metric: "height", target: 24, rewardXp: 30 },
  { id: "place-60", label: "Place 60 blocks", metric: "placed", target: 60, rewardXp: 40 },
  { id: "event-1", label: "Take part in a world event", metric: "events", target: 1, rewardXp: 25 },
  { id: "level-3", label: "Reach island level 3", metric: "level", target: 3, rewardXp: 50 },
  { id: "mine-80", label: "Mine 80 blocks", metric: "mined", target: 80, rewardXp: 60 },
  { id: "place-200", label: "Place 200 blocks", metric: "placed", target: 200, rewardXp: 120 },
];

export type ProgressNotice = { id: number; title: string; detail: string };

export type ProgressionState = {
  xp: number;
  level: number;
  title: string;
  levelFloorXp: number;
  nextLevelXp: number | null;
  placed: number;
  mined: number;
  height: number;
  events: number;
  completed: string[];
  unlockedBlocks: number[];
  notice: ProgressNotice | null;
};

const XP_PLACE = 2;
const XP_MINE = 3;

function tierFor(xp: number) {
  let tier = ISLAND_TIERS[0];
  for (const t of ISLAND_TIERS) if (xp >= t.xp) tier = t;
  return tier;
}

export class Progression {
  readonly store: Store<ProgressionState>;
  xpMultiplier = 1;
  onUnlockBlock?: (blockId: number) => void;
  private noticeId = 0;

  constructor() {
    const t = tierFor(0);
    this.store = new Store<ProgressionState>({
      xp: 0,
      level: t.level,
      title: t.title,
      levelFloorXp: 0,
      nextLevelXp: ISLAND_TIERS[1]?.xp ?? null,
      placed: 0,
      mined: 0,
      height: 0,
      events: 0,
      completed: [],
      unlockedBlocks: [],
      notice: null,
    });
  }

  get state() {
    return this.store.get();
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

  private apply(patch: Partial<ProgressionState>, baseXp: number, flat = false) {
    const s = this.state;
    const gained = flat ? baseXp : Math.round(baseXp * this.xpMultiplier);
    let next: ProgressionState = { ...s, ...patch, xp: s.xp + gained };
    let notice: ProgressNotice | null = null;

    // Milestones can chain (e.g. a milestone reward triggers a level milestone).
    for (let guard = 0; guard < 4; guard++) {
      const tier = tierFor(next.xp);
      if (tier.level > next.level) {
        const newlyUnlocked = ISLAND_TIERS.filter(
          (t) => t.level > next.level && t.level <= tier.level && t.unlockBlock !== undefined,
        );
        next = {
          ...next,
          level: tier.level,
          title: tier.title,
          levelFloorXp: tier.xp,
          nextLevelXp: ISLAND_TIERS.find((t) => t.level === tier.level + 1)?.xp ?? null,
          unlockedBlocks: [...next.unlockedBlocks, ...newlyUnlocked.map((t) => t.unlockBlock!)],
        };
        newlyUnlocked.forEach((t) => this.onUnlockBlock?.(t.unlockBlock!));
        const unlock = newlyUnlocked.at(-1)?.unlockLabel;
        notice = {
          id: ++this.noticeId,
          title: `Island level ${tier.level}`,
          detail: unlock ? `${tier.title} - ${unlock} unlocked` : tier.title,
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
      if (!notice) {
        notice = {
          id: ++this.noticeId,
          title: "Milestone complete",
          detail: `${done[0].label}  +${done[0].rewardXp} XP`,
        };
      }
    }

    this.store.set({ ...next, notice: notice ?? s.notice });
  }

  /** The next few unfinished milestones, for the HUD tracker. */
  upcoming(count = 2) {
    const s = this.state;
    return MILESTONES.filter((m) => !s.completed.includes(m.id))
      .slice(0, count)
      .map((m) => ({ ...m, progress: Math.min(m.target, s[m.metric] as number) }));
  }
}
