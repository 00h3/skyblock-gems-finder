import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type GameMode = "skyblock" | "blockfall";
export type LeaderboardEntry = { id: string; name: string; score: number };

const col = (mode: GameMode) => `qblock_lb_${mode}`;

export function subscribeLeaderboard(mode: GameMode, cb: (rows: LeaderboardEntry[]) => void) {
  const q = query(collection(db, col(mode)), orderBy("score", "desc"), limit(10));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, name: String(d.data().name ?? "Player"), score: Number(d.data().score ?? 0) }))),
    () => cb([]),
  );
}

export async function getMyScore(mode: GameMode, uid: string) {
  try {
    const snap = await getDoc(doc(db, col(mode), uid));
    return snap.exists() ? Number(snap.data().score ?? 0) : 0;
  } catch {
    return 0;
  }
}

export async function submitScore(mode: GameMode, uid: string, name: string, score: number) {
  const prev = await getMyScore(mode, uid);
  if (score <= prev) return;
  await setDoc(doc(db, col(mode), uid), { name, score, updatedAt: serverTimestamp() }, { merge: true });
}
