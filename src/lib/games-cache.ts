import { db, auth } from "./firebase";
import { doc, setDoc, arrayUnion } from "firebase/firestore";

export function getRecentlyPlayedGameIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("qb_recently_played");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** A game only counts as "played" after 30 seconds of dwell time. */
export const RECENT_PLAY_DWELL_MS = 30_000;

/**
 * Starts a dwell timer for a game the player just opened. Returns a cancel
 * function — call it if the player backs out before 30s so quick peeks never
 * pollute the Recently Played row.
 */
export function schedulePlayedGame(gameId: string): () => void {
  if (typeof window === "undefined" || !gameId) return () => {};
  const timer = window.setTimeout(() => recordPlayedGame(gameId), RECENT_PLAY_DWELL_MS);
  return () => window.clearTimeout(timer);
}

export function recordPlayedGame(gameId: string) {
  if (typeof window === "undefined" || !gameId) return;
  try {
    const prev = getRecentlyPlayedGameIds();
    const next = [gameId, ...prev.filter((id) => id !== gameId)].slice(0, 10);
    localStorage.setItem("qb_recently_played", JSON.stringify(next));

    if (auth.currentUser) {
      setDoc(
        doc(db, "users", auth.currentUser.uid),
        { gamesPlayed: arrayUnion(gameId) },
        { merge: true },
      ).catch(() => undefined);
    }
  } catch {
    /* ignore */
  }
}
