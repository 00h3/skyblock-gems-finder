import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
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

export async function loadBlockFallBlocks(
  onChange: (change: BlockFallBlockChange) => void,
  onError: (error: Error) => void,
  onReady?: () => void,
): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION));
    for (const document of snapshot.docs) {
      const data = document.data();
      const x = Number(data.x);
      const y = Number(data.y);
      const z = Number(data.z);
      const id = Number(data.id);
      if ([x, y, z, id].every(Number.isFinite)) onChange({ x, y, z, id });
    }
    onReady?.();
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
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
