import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface LiveBlockFallPlayer {
  uid: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  photo?: string;
  frame?: string;
  badges?: string[];
  lastSeen: number;
}

const COL = "blockFallPlayers";
const STALE_MS = 20_000;

let lastWrite = 0;

const HEARTBEAT_MS = 500;

/** Throttled presence heartbeat so Firestore writes do not queue behind gameplay. */
export function updateBlockFallPresence(p: Omit<LiveBlockFallPlayer, "lastSeen">): Promise<void> {
  const now = Date.now();
  if (now - lastWrite < HEARTBEAT_MS) return Promise.resolve();
  lastWrite = now;
  let uid = p.uid;
  if (!uid) {
    try {
      let guestId = localStorage.getItem("qb_guest_id");
      if (!guestId) {
        guestId = "guest_" + Math.random().toString(36).substring(2, 9);
        localStorage.setItem("qb_guest_id", guestId);
      }
      uid = guestId;
    } catch {
      uid = "guest_player";
    }
  }
  return setDoc(doc(db, COL, uid), { ...p, uid, lastSeen: now }, { merge: true });
}

export function clearBlockFallPresence(uid: string): Promise<void> {
  return deleteDoc(doc(db, COL, uid));
}

/** Live list of everyone else currently in Block Fall. */
export function subscribeToBlockFallPlayers(
  selfUid: string,
  cb: (players: LiveBlockFallPlayer[]) => void,
  onError?: (error: Error) => void,
  onReady?: () => void,
): Unsubscribe {
  let stopped = false;
  let unsubscribe: Unsubscribe = () => {};
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 1000;

  const connect = () => {
    if (stopped) return;
    unsubscribe = onSnapshot(
      collection(db, COL),
      (snap) => {
        retryDelay = 1000;
        onReady?.();
        const now = Date.now();
        cb(
          snap.docs
            .map((d) => d.data() as LiveBlockFallPlayer)
            .filter((p) => p && p.uid !== selfUid && now - (p.lastSeen ?? 0) < STALE_MS),
        );
      },
      (err) => {
        onError?.(err);
        const code = (err as { code?: string }).code;
        if (code === "permission-denied" || code === "unauthenticated") return;
        if (stopped) return;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          unsubscribe();
          connect();
        }, retryDelay);
        retryDelay = Math.min(15000, retryDelay * 2);
      },
    );
  };

  connect();
  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    unsubscribe();
  };
}
