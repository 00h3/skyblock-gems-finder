import { Store } from "../shared/store";

/**
 * Occasional, non-blocking island events. Each definition describes its
 * gameplay modifiers and atmosphere; the game loop applies them. Events are
 * spaced out so they enhance a session instead of interrupting it.
 */

export type WorldEventId = "golden-hour" | "starfall" | "trade-winds" | "clear-skies";

export type WorldEventDef = {
  id: WorldEventId;
  name: string;
  description: string;
  durationMs: number;
  xpMultiplier: number;
  cloudCover: number;
  tint?: string;
  tintAmount?: number;
  particles?: "sparks" | "motes";
  completionXp: number;
};

export const WORLD_EVENTS: WorldEventDef[] = [
  {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Warm light over the islands. All XP doubled.",
    durationMs: 40_000,
    xpMultiplier: 2,
    cloudCover: 0.35,
    tint: "#ffb45a",
    tintAmount: 0.55,
    particles: "motes",
    completionXp: 20,
  },
  {
    id: "starfall",
    name: "Starfall",
    description: "Shooting stars rain down. Mining XP boosted.",
    durationMs: 35_000,
    xpMultiplier: 1.75,
    cloudCover: 0.2,
    tint: "#8fb4ff",
    tintAmount: 0.35,
    particles: "sparks",
    completionXp: 25,
  },
  {
    id: "trade-winds",
    name: "Trade Winds",
    description: "Heavy clouds roll past. Building XP boosted.",
    durationMs: 45_000,
    xpMultiplier: 1.5,
    cloudCover: 0.85,
    particles: "motes",
    completionXp: 15,
  },
  {
    id: "clear-skies",
    name: "Clear Skies",
    description: "Perfect visibility across the horizon.",
    durationMs: 30_000,
    xpMultiplier: 1.25,
    cloudCover: 0.05,
    completionXp: 10,
  },
];

export type WorldEventState = {
  active: WorldEventDef | null;
  endsAt: number;
  nextAt: number;
  history: WorldEventId[];
};

const FIRST_EVENT_MS = 45_000;
const MIN_GAP_MS = 80_000;
const MAX_GAP_MS = 150_000;

export class WorldEvents {
  readonly store: Store<WorldEventState>;
  onStart?: (e: WorldEventDef) => void;
  onEnd?: (e: WorldEventDef) => void;

  constructor(t = Date.now()) {
    this.store = new Store<WorldEventState>({
      active: null,
      endsAt: 0,
      nextAt: t + FIRST_EVENT_MS,
      history: [],
    });
  }

  get state() {
    return this.store.get();
  }

  tick(t: number) {
    const s = this.state;
    if (s.active && t >= s.endsAt) {
      const ended = s.active;
      this.store.set({
        active: null,
        endsAt: 0,
        nextAt: t + MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS),
      });
      this.onEnd?.(ended);
    } else if (!s.active && t >= s.nextAt) {
      const last = s.history.at(-1);
      const pool = WORLD_EVENTS.filter((e) => e.id !== last);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.store.set({
        active: pick,
        endsAt: t + pick.durationMs,
        history: [...s.history, pick.id].slice(-6),
      });
      this.onStart?.(pick);
    }
  }
}
