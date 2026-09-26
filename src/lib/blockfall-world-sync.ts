import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type BlockFallBlockChange = {
  x: number;
  y: number;
  z: number;
  id: number;
};

const COLLECTION = "blockFallBlocks";

function blockKey(x: number, y: number, z: number) {
  return `${x}:${y}:${z}`;
}

export function subscribeBlockFallBlocks(
  onChange: (change: BlockFallBlockChange) => void,
  onError: (error: Error) => void,
  onReady?: () => void,
): Unsubscribe {
  let stopped = false;
  let unsubscribe: Unsubscribe = () => {};
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 1000;

  const connect = () => {
    if (stopped) return;
    unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        retryDelay = 1000;
        onReady?.();
        snapshot.docChanges().forEach((change) => {
          if (change.type === "removed") {
            const [x, y, z] = change.doc.id.split(":").map(Number);
            onChange({ x, y, z, id: 0 });
            return;
          }
          const data = change.doc.data();
          const x = Number(data.x);
          const y = Number(data.y);
          const z = Number(data.z);
          const id = Number(data.id);
          if ([x, y, z, id].every(Number.isFinite)) onChange({ x, y, z, id });
        });
      },
      (error) => {
        onError(error);
        const code = (error as { code?: string }).code;
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

export function writeBlockFallBlock(change: BlockFallBlockChange): Promise<void> {
  let uid = auth.currentUser?.uid;
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
  return setDoc(doc(db, COLLECTION, blockKey(change.x, change.y, change.z)), {
    ...change,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  });
}
