import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EconomySave } from "@/engine/v2/economy";
import type { ProgressionSave } from "@/engine/v2/progression";

/**
 * Returns a persistent, device-sticky or auth-linked player ID that lasts forever.
 * For logged-in users, uses their Firebase uid.
 * For guests, creates and persists a permanent unique ID in localStorage so their
 * island progress is saved by person forever across refreshes and restarts.
 */
export function getPermanentPlayerId(qbUser?: { uid?: string } | null): string {
  if (qbUser?.uid) return qbUser.uid;
  if (typeof window !== "undefined") {
    try {
      let id = localStorage.getItem("qb_persistent_player_id");
      if (!id) {
        id =
          sessionStorage.getItem("qb_guest_uid") ||
          localStorage.getItem("qb_guest_id") ||
          "";
      }
      if (!id) {
        id =
          "player_" +
          Math.random().toString(36).substring(2, 9) +
          "_" +
          Date.now().toString(36).slice(-4);
      }
      localStorage.setItem("qb_persistent_player_id", id);
      return id;
    } catch {}
  }
  return "player_guest";
}

/** Per-player Skyblock save: coins, inventory, hotbar, generators, quests, island level, and XP. */
export type SkyblockProfile = {
  uid?: string;
  economy?: Partial<EconomySave>;
  progression: ProgressionSave;
  hotbar?: (number | string)[];
  inventory?: Record<string | number, number>;
  updatedAt: number;
  createdAt?: number;
};

const COLLECTION = "skyblockProfiles";

/**
 * Load saved island progression and profile for a specific user ID.
 * Uses local fast-cache first, then syncs with Firebase Firestore for persistent cloud truth.
 */
export async function loadSkyblockProfile(uid: string): Promise<SkyblockProfile | null> {
  if (!uid) return null;

  // 1. Read immediate local cache
  let localData: SkyblockProfile | null = null;
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`sb_prog_${uid}`);
      if (cached) localData = JSON.parse(cached);
    } catch {}
  }

  // 2. Query Firestore for cloud persistence
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (snap.exists()) {
      const remoteData = snap.data() as SkyblockProfile;

      // Merge local and remote data to guarantee no progression is ever lost
      const mergedProg: ProgressionSave = {
        xp: Math.max(localData?.progression?.xp ?? 0, remoteData.progression?.xp ?? 0),
        level: Math.max(localData?.progression?.level ?? 1, remoteData.progression?.level ?? 1),
        placed: Math.max(localData?.progression?.placed ?? 0, remoteData.progression?.placed ?? 0),
        broken: Math.max(localData?.progression?.broken ?? 0, remoteData.progression?.broken ?? 0),
        sold: Math.max(localData?.progression?.sold ?? 0, remoteData.progression?.sold ?? 0),
        bought: Math.max(localData?.progression?.bought ?? 0, remoteData.progression?.bought ?? 0),
        minedOres: Math.max(localData?.progression?.minedOres ?? 0, remoteData.progression?.minedOres ?? 0),
        treesFelled: Math.max(localData?.progression?.treesFelled ?? 0, remoteData.progression?.treesFelled ?? 0),
        cropsHarvested: Math.max(localData?.progression?.cropsHarvested ?? 0, remoteData.progression?.cropsHarvested ?? 0),
        generatorsBuilt: Math.max(localData?.progression?.generatorsBuilt ?? 0, remoteData.progression?.generatorsBuilt ?? 0),
        islandsVisited: Math.max(localData?.progression?.islandsVisited ?? 0, remoteData.progression?.islandsVisited ?? 0),
        completed: Array.from(
          new Set([...(localData?.progression?.completed ?? []), ...(remoteData.progression?.completed ?? [])]),
        ),
      };

      const mergedEconomy: Partial<EconomySave> = {
        coins: Math.max(localData?.economy?.coins ?? 0, remoteData.economy?.coins ?? 0),
        inventory: { ...(localData?.economy?.inventory ?? {}), ...(remoteData.economy?.inventory ?? {}) },
        hotbar: remoteData.economy?.hotbar || localData?.economy?.hotbar,
        generators: { ...(localData?.economy?.generators ?? {}), ...(remoteData.economy?.generators ?? {}) },
        daily: remoteData.economy?.daily || localData?.economy?.daily,
        day: remoteData.economy?.day || localData?.economy?.day,
      };

      const merged: SkyblockProfile = {
        uid,
        progression: mergedProg,
        economy: mergedEconomy,
        hotbar: remoteData.hotbar || localData?.hotbar,
        inventory: remoteData.inventory || localData?.inventory,
        updatedAt: Math.max(localData?.updatedAt ?? 0, remoteData.updatedAt ?? 0),
        createdAt: remoteData.createdAt || localData?.createdAt || Date.now(),
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`sb_prog_${uid}`, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    }
  } catch (err) {
    console.warn("Firestore Skyblock profile fetch warning, fallback to local:", err);
  }

  return localData;
}

/**
 * Persist Skyblock island progression forever to Firestore and localStorage.
 */
export async function saveSkyblockProfile(
  uid: string,
  profile: {
    progression: ProgressionSave;
    economy?: Partial<EconomySave>;
    hotbar?: (number | string)[];
    inventory?: Record<string | number, number>;
  },
): Promise<void> {
  if (!uid) return;

  const dataToSave: SkyblockProfile = {
    uid,
    progression: profile.progression,
    economy: profile.economy || {},
    hotbar: profile.hotbar,
    inventory: profile.inventory,
    updatedAt: Date.now(),
  };

  // Immediate local cache
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`sb_prog_${uid}`, JSON.stringify(dataToSave));
    } catch {}
  }

  // Cloud Firestore persistence forever
  try {
    await setDoc(doc(db, COLLECTION, uid), dataToSave, { merge: true });
  } catch (err) {
    console.error("Firestore saveSkyblockProfile error:", err);
  }
}
