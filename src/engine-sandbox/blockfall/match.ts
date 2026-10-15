import { Store } from "../shared/store";

/**
 * Competitive round flow:
 * LOBBY -> COUNTDOWN -> PLAYING -> ROUND_END -> RESULTS -> (next round | match over)
 *
 * Every transition is derived from absolute wall-clock deadlines
 * (`Date.now()`), not from animation timers. Rounds start on shared
 * `SYNC_WINDOW_MS` boundaries so every client that joins the same window
 * counts 3-2-1 in lockstep without needing a dedicated game server.
 */

export type MatchPhase = "lobby" | "countdown" | "playing" | "roundEnd" | "results";

export type RoundResult = {
  round: number;
  placement: number;
  players: number;
  survivedMs: number;
  deepestFloor: number;
  score: number;
  survived: boolean;
};

export type MatchState = {
  phase: MatchPhase;
  round: number;
  totalRounds: number;
  /** Epoch ms when the current phase ends (0 = waits for player input). */
  phaseEndsAt: number;
  roundStartedAt: number;
  playersTotal: number;
  playersAlive: number;
  floor: number;
  deepestFloor: number;
  eliminated: boolean;
  placement: number;
  totalScore: number;
  lastRound: RoundResult | null;
  history: RoundResult[];
};

export const COUNTDOWN_MS = 3000;
export const ROUND_MS = 90_000;
const LOBBY_MIN_MS = 2500;
const SYNC_WINDOW_MS = 5000;
const ROUND_END_MS = 2600;
const PLACEMENT_BONUS = [600, 350, 200, 100];

export const now = () => Date.now();

function nextSyncBoundary(from: number) {
  return Math.ceil((from + LOBBY_MIN_MS) / SYNC_WINDOW_MS) * SYNC_WINDOW_MS;
}

export class MatchController {
  readonly store: Store<MatchState>;
  onPhaseChange?: (phase: MatchPhase, state: MatchState) => void;

  constructor(totalRounds = 3) {
    this.store = new Store<MatchState>(this.initial(totalRounds));
  }

  private initial(totalRounds: number): MatchState {
    const lobbyEnds = nextSyncBoundary(now());
    return {
      phase: "lobby",
      round: 1,
      totalRounds,
      phaseEndsAt: lobbyEnds,
      roundStartedAt: 0,
      playersTotal: 1,
      playersAlive: 1,
      floor: 1,
      deepestFloor: 1,
      eliminated: false,
      placement: 0,
      totalScore: 0,
      lastRound: null,
      history: [],
    };
  }

  get state() {
    return this.store.get();
  }

  get canMove() {
    const s = this.state;
    return s.phase === "playing" && !s.eliminated;
  }

  /** Called every frame by the game loop. Drives all timed transitions. */
  tick(t: number, livePlayers: { total: number; alive: number }) {
    const s = this.state;
    if (s.phase === "lobby" || s.phase === "countdown") {
      if (s.playersTotal !== livePlayers.total) {
        this.store.set({ playersTotal: livePlayers.total, playersAlive: livePlayers.total });
      }
    } else if (s.phase === "playing" && s.playersAlive !== livePlayers.alive) {
      this.store.set({ playersAlive: livePlayers.alive, playersTotal: Math.max(s.playersTotal, livePlayers.total) });
    }

    if (s.phaseEndsAt === 0 || t < s.phaseEndsAt) return;

    switch (s.phase) {
      case "lobby":
        this.go("countdown", { phaseEndsAt: s.phaseEndsAt + COUNTDOWN_MS });
        break;
      case "countdown":
        this.go("playing", { roundStartedAt: s.phaseEndsAt, phaseEndsAt: s.phaseEndsAt + ROUND_MS });
        break;
      case "playing":
        this.finishRound(t, true, 1);
        break;
      case "roundEnd":
        this.go("results", { phaseEndsAt: 0 });
        break;
      default:
        break;
    }
  }

  setFloor(floor: number) {
    const s = this.state;
    if (floor === s.floor) return;
    this.store.set({ floor, deepestFloor: Math.max(s.deepestFloor, floor) });
  }

  /** Local player fell out. Placement = everyone still standing + 1. */
  eliminate(t: number, othersAlive: number) {
    if (this.state.phase !== "playing" || this.state.eliminated) return;
    this.finishRound(t, false, othersAlive + 1);
  }

  private finishRound(t: number, survived: boolean, placement: number) {
    const s = this.state;
    const survivedMs = Math.max(0, Math.min(t, s.roundStartedAt + ROUND_MS) - s.roundStartedAt);
    const score =
      Math.round(survivedMs / 100) +
      (survived ? 250 : 0) +
      (PLACEMENT_BONUS[placement - 1] ?? 0) +
      (s.deepestFloor - 1) * 25;
    const result: RoundResult = {
      round: s.round,
      placement,
      players: Math.max(s.playersTotal, placement),
      survivedMs,
      deepestFloor: s.deepestFloor,
      score,
      survived,
    };
    this.go("roundEnd", {
      eliminated: !survived,
      placement,
      phaseEndsAt: t + ROUND_END_MS,
      totalScore: s.totalScore + score,
      lastRound: result,
      history: [...s.history, result],
    });
  }

  get isMatchOver() {
    const s = this.state;
    return s.phase === "results" && s.round >= s.totalRounds;
  }

  /** Player chose "Next round" (or "Play again" after the final round). */
  advance() {
    const s = this.state;
    if (s.phase !== "results") return;
    const matchOver = s.round >= s.totalRounds;
    const base = matchOver ? this.initial(s.totalRounds) : s;
    this.go("lobby", {
      ...base,
      round: matchOver ? 1 : s.round + 1,
      phaseEndsAt: nextSyncBoundary(now()),
      eliminated: false,
      placement: 0,
      floor: 1,
      deepestFloor: 1,
      roundStartedAt: 0,
    });
  }

  private go(phase: MatchPhase, patch: Partial<MatchState>) {
    this.store.set({ ...patch, phase });
    this.onPhaseChange?.(phase, this.state);
  }
}
