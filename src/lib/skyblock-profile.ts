import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EconomySave } from "@/engine/v2/economy";
import type { ProgressionSave } from "@/engine/v2/progression";

/** Per-player Skyblock save: coins, inventory, generators, quests and XP. */
export type SkyblockProfile = {
  economy: EconomySave;
  progression: ProgressionSave;
  updatedAt: number;
};

const COLLECTION = "skyblockProfiles";

export async function loadSkyblockProfile(uid: string): Promise<SkyblockProfile | null> {
  const snap = await getDoc(doc(db, COLLECTION, uid));
  return snap.exists() ? (snap.data() as SkyblockProfile) : null;
}

export function saveSkyblockProfile(uid: string, profile: Omit<SkyblockProfile, "updatedAt">) {
  return setDoc(doc(db, COLLECTION, uid), { ...profile, updatedAt: Date.now() });
}
