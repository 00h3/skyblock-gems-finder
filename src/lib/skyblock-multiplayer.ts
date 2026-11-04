import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import type { AvatarSnapshot } from "@/lib/avatar";

export interface PersistentIsland {
  ownerId: string;
  ownerName: string;
  islandName: string;
  deltaBlocks: Record<string, number>; // "x,y,z" -> blockType. If blockType === -1, it means broken/removed
  brokenBlocks?: string[];
  placedBlocks?: Record<string, number>;
  likesCount?: number;
  likedBy?: string[];
  lastModified: number;
  createdAt: number;
  visitorCount?: number;
}

export interface LiveSkyblockPlayer {
  uid: string;
  name: string;
  username?: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  islandId: string;
  lastSeen: number;
  avatarSnapshot?: AvatarSnapshot;
  profilePhoto?: string;
  holdingItem?: string;
}

export interface SkyblockChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderTag: "OWNER" | "VIP" | "BUILDER" | "PLAYER";
  tag?: string;
  senderColor?: string;
  text: string;
  createdAt: number;
}

// In-memory cache for instant loads
const islandCache = new Map<string, PersistentIsland>();
const pendingBlockUpdates: Record<string, Record<string, number>> = {};
const updateDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/**
 * Standardize island IDs so that whether a user passes "player123" or "island_v2_player123",
 * both resolve to the exact same canonical Firestore document path.
 */
export function canonicalIslandId(rawId: string | null | undefined): string {
  if (!rawId) return "island_v2_default";
  const clean = String(rawId).trim();
  if (clean.startsWith("island_v2_")) return clean;
  return `island_v2_${clean}`;
}

/**
 * Load or initialize an island for a user
 */
export async function getOrCreateIsland(
  rawIslandId: string,
  ownerName: string,
): Promise<PersistentIsland> {
  const islandId = canonicalIslandId(rawIslandId);
  // Check local cache first
  const cached = islandCache.get(islandId);
  if (cached) return cached;

  try {
    const islandRef = doc(db, "islands", islandId);
    const snap = await getDoc(islandRef);

    if (snap.exists()) {
      const data = snap.data() as PersistentIsland;
      const island: PersistentIsland = {
        ownerId: data.ownerId || islandId,
        ownerName: data.ownerName || ownerName || "Player",
        islandName: data.islandName || `${data.ownerName || ownerName || "Player"}'s Island`,
        deltaBlocks: data.deltaBlocks || {},
        likesCount:
          typeof data.likesCount === "number" ? data.likesCount : data.likedBy?.length || 0,
        likedBy: data.likedBy || [],
        lastModified: data.lastModified || Date.now(),
        createdAt: data.createdAt || Date.now(),
      };
      islandCache.set(islandId, island);
      return island;
    }

    // Create new island record
    const newIsland: PersistentIsland = {
      ownerId: islandId,
      ownerName: ownerName || "Player",
      islandName: `${ownerName || "Player"}'s Island`,
      deltaBlocks: {},
      likesCount: 0,
      likedBy: [],
      lastModified: Date.now(),
      createdAt: Date.now(),
    };

    await setDoc(islandRef, newIsland, { merge: true });
    islandCache.set(islandId, newIsland);
    return newIsland;
  } catch (err) {
    console.warn("Failed to load island from Firestore, using local state:", err);
    // Fallback to local storage
    if (typeof window !== "undefined") {
      const localKey = `sb_island_${islandId}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          islandCache.set(islandId, parsed);
          return parsed;
        } catch {}
      }
    }

    const fallback: PersistentIsland = {
      ownerId: islandId,
      ownerName: ownerName || "Player",
      islandName: `${ownerName || "Player"}'s Island`,
      deltaBlocks: {},
      likesCount: 0,
      likedBy: [],
      lastModified: Date.now(),
      createdAt: Date.now(),
    };
    islandCache.set(islandId, fallback);
    return fallback;
  }
}

/**
 * Toggle like on an island and sync with Firestore
 */
export async function toggleIslandLike(
  rawIslandId: string,
  userId: string,
): Promise<{ liked: boolean; likesCount: number }> {
  const islandId = canonicalIslandId(rawIslandId);
  try {
    const islandRef = doc(db, "islands", islandId);
    const snap = await getDoc(islandRef);
    let likedBy: string[] = [];
    if (snap.exists()) {
      likedBy = (snap.data()?.likedBy as string[]) || [];
    }
    const alreadyLiked = likedBy.includes(userId);
    const newLikedBy = alreadyLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
    const newLikesCount = newLikedBy.length;

    await setDoc(
      islandRef,
      {
        likedBy: newLikedBy,
        likesCount: newLikesCount,
        lastModified: Date.now(),
      },
      { merge: true },
    );

    const cached = islandCache.get(islandId);
    if (cached) {
      cached.likedBy = newLikedBy;
      cached.likesCount = newLikesCount;
    }
    return { liked: !alreadyLiked, likesCount: newLikesCount };
  } catch (err) {
    console.warn("Failed to toggle island like in Firestore:", err);
    const cached = islandCache.get(islandId);
    const likedBy = cached?.likedBy || [];
    const alreadyLiked = likedBy.includes(userId);
    const newLikedBy = alreadyLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
    const newCount = newLikedBy.length;
    if (cached) {
      cached.likedBy = newLikedBy;
      cached.likesCount = newCount;
    }
    return { liked: !alreadyLiked, likesCount: newCount };
  }
}

/**
 * Subscribe to real-time likes count of an island
 */
export function subscribeToIslandLikes(
  rawIslandId: string,
  onLikesUpdate: (likesCount: number, likedBy: string[]) => void,
): () => void {
  try {
    const islandId = canonicalIslandId(rawIslandId);
    const islandRef = doc(db, "islands", islandId);
    return onSnapshot(
      islandRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as PersistentIsland;
        const likedBy = data.likedBy || [];
        const likesCount = typeof data.likesCount === "number" ? data.likesCount : likedBy.length;
        onLikesUpdate(likesCount, likedBy);
      },
      (err) => {
        console.warn("Error subscribing to island likes:", err);
      },
    );
  } catch {
    return () => {};
  }
}

/**
 * Send real-time chat message to the island
 */
export async function sendSkyblockChatMessage(
  rawIslandId: string,
  msg: {
    senderId: string;
    senderName: string;
    senderTag?: "OWNER" | "VIP" | "BUILDER" | "PLAYER";
    tag?: string;
    senderColor?: string;
    text: string;
  },
) {
  try {
    const islandId = canonicalIslandId(rawIslandId);
    const msgsCol = collection(db, "islands", islandId, "messages");
    const newMsgRef = doc(msgsCol);
    await setDoc(newMsgRef, {
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderTag: msg.senderTag || "PLAYER",
      senderColor: msg.senderColor || "#38bdf8",
      text: msg.text.trim().slice(0, 160),
      createdAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn("Failed to send skyblock chat message:", err);
    return false;
  }
}

/**
 * Subscribe to live chat on the current island
 */
export function subscribeToSkyblockChat(
  rawIslandId: string,
  onNewMessage: (msg: SkyblockChatMessage) => void,
  onAllMessages?: (msgs: SkyblockChatMessage[]) => void,
): () => void {
  try {
    const islandId = canonicalIslandId(rawIslandId);
    const msgsCol = collection(db, "islands", islandId, "messages");
    const q = query(msgsCol, limit(40));
    let initial = false;

    return onSnapshot(
      q,
      (snap) => {
        const msgs: SkyblockChatMessage[] = [];
        snap.forEach((d) => {
          msgs.push({ id: d.id, ...(d.data() as Omit<SkyblockChatMessage, "id">) });
        });
        msgs.sort((a, b) => a.createdAt - b.createdAt);
        if (onAllMessages) onAllMessages(msgs);

        if (!initial) {
          initial = true;
          if (msgs.length > 0) {
            onNewMessage(msgs[msgs.length - 1]);
          }
          return;
        }

        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = {
              id: change.doc.id,
              ...(change.doc.data() as Omit<SkyblockChatMessage, "id">),
            };
            onNewMessage(data);
          }
        });
      },
      (err) => {
        console.warn("Skyblock chat listener:", err);
      },
    );
  } catch {
    return () => {};
  }
}

/**
 * Queue and persist a block change (place or break) to Firestore
 */
export function persistBlockChange(
  rawIslandId: string,
  x: number,
  y: number,
  z: number,
  blockType: number | null,
) {
  const islandId = canonicalIslandId(rawIslandId);
  const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
  const val = blockType === null ? -1 : blockType;

  // Update in-memory cache
  const cached = islandCache.get(islandId);
  if (cached) {
    cached.deltaBlocks[key] = val;
    cached.lastModified = Date.now();
  }

  // Backup to localStorage for instant offline recovery
  if (typeof window !== "undefined") {
    try {
      const localKey = `sb_island_${islandId}`;
      const localData = cached || {
        ownerId: islandId,
        ownerName: "Player",
        islandName: "Island",
        deltaBlocks: { [key]: val },
        lastModified: Date.now(),
        createdAt: Date.now(),
      };
      localStorage.setItem(localKey, JSON.stringify(localData));
    } catch {}
  }

  // Buffer change for batched Firestore update
  if (!pendingBlockUpdates[islandId]) {
    pendingBlockUpdates[islandId] = {};
  }
  pendingBlockUpdates[islandId][key] = val;

  if (updateDebounceTimers[islandId]) {
    clearTimeout(updateDebounceTimers[islandId]);
  }

  updateDebounceTimers[islandId] = setTimeout(async () => {
    const batch = { ...pendingBlockUpdates[islandId] };
    delete pendingBlockUpdates[islandId];
    delete updateDebounceTimers[islandId];

    if (Object.keys(batch).length === 0) return;

    try {
      const islandRef = doc(db, "islands", islandId);
      const updates: Record<string, unknown> = {
        lastModified: Date.now(),
      };
      for (const [k, v] of Object.entries(batch)) {
        updates[`deltaBlocks.${k}`] = v;
      }
      await updateDoc(islandRef, updates);
    } catch {
      // If doc doesn't exist, create it with setDoc merge
      try {
        const islandRef = doc(db, "islands", islandId);
        await setDoc(
          islandRef,
          {
            ownerId: islandId,
            deltaBlocks: batch,
            lastModified: Date.now(),
          },
          { merge: true },
        );
      } catch (err) {
        console.warn("Could not save block deltas to Firestore:", err);
      }
    }
  }, 400);
}

export const saveIslandBlockDelta = persistBlockChange;

/**
 * Subscribe to real-time block changes from other players on the active island
 */
export function subscribeToIslandBlocks(
  rawIslandId: string,
  onRemoteBlockUpdate: (x: number, y: number, z: number, blockType: number | null) => void,
): () => void {
  try {
    const islandId = canonicalIslandId(rawIslandId);
    const islandRef = doc(db, "islands", islandId);
    let initialLoaded = false;

    const unsubscribe = onSnapshot(
      islandRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as PersistentIsland;
        if (!initialLoaded) {
          initialLoaded = true;
          islandCache.set(islandId, data);
          return;
        }

        const remoteDeltas = data.deltaBlocks || {};
        const local = islandCache.get(islandId);
        const localDeltas = local?.deltaBlocks || {};

        for (const [k, v] of Object.entries(remoteDeltas)) {
          if (localDeltas[k] !== v) {
            localDeltas[k] = v;
            const [sx, sy, sz] = k.split(",").map(Number);
            if (!isNaN(sx) && !isNaN(sy) && !isNaN(sz)) {
              onRemoteBlockUpdate(sx, sy, sz, v === -1 ? null : v);
            }
          }
        }
      },
      (err) => {
        console.warn("Island block subscription error:", err);
      },
    );

    return unsubscribe;
  } catch {
    return () => {};
  }
}

/**
 * Real-time player presence tracking across multiplayer islands
 */
let presenceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPresencePlayer: LiveSkyblockPlayer | null = null;
let lastPresencePos = { x: 0, y: 0, z: 0, rotY: 0 };
let lastPresenceWriteTime = 0;

export function updatePlayerPresence(
  player: {
    uid: string;
    name: string;
    username?: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    islandId: string;
    avatarSnapshot?: AvatarSnapshot;
    profilePhoto?: string;
    holdingItem?: string;
  },
  immediate = false,
) {
  if (!player || !player.uid) return;
  const canonicalId = canonicalIslandId(player.islandId);
  const normalized: LiveSkyblockPlayer = {
    ...player,
    islandId: canonicalId,
    lastSeen: Date.now(),
  };

  const dist =
    Math.abs(normalized.x - lastPresencePos.x) +
    Math.abs(normalized.y - lastPresencePos.y) +
    Math.abs(normalized.z - lastPresencePos.z) +
    Math.abs(normalized.rotY - lastPresencePos.rotY);

  pendingPresencePlayer = normalized;

  const now = Date.now();
  const shouldWriteNow = immediate || !presenceTimer || (now - lastPresenceWriteTime > 750 && dist > 0.25);

  if (shouldWriteNow) {
    lastPresenceWriteTime = now;
    lastPresencePos = { x: normalized.x, y: normalized.y, z: normalized.z, rotY: normalized.rotY };
    pendingPresencePlayer = null;

    if (presenceTimer) {
      clearTimeout(presenceTimer);
      presenceTimer = null;
    }

    const playerRef = doc(db, "skyblock_players", normalized.uid);
    setDoc(
      playerRef,
      {
        uid: normalized.uid,
        name: normalized.name || "Player",
        username: normalized.username || normalized.name || "Player",
        x: Math.round(normalized.x * 100) / 100,
        y: Math.round(normalized.y * 100) / 100,
        z: Math.round(normalized.z * 100) / 100,
        rotY: Math.round(normalized.rotY * 100) / 100,
        islandId: canonicalId,
        lastSeen: Date.now(),
        avatarSnapshot: normalized.avatarSnapshot || null,
        profilePhoto: normalized.profilePhoto || null,
        holdingItem: normalized.holdingItem || null,
      },
      { merge: true },
    ).catch(() => {});

    // Schedule flush for when the player stops moving
    presenceTimer = setTimeout(() => {
      presenceTimer = null;
      if (pendingPresencePlayer) {
        updatePlayerPresence(pendingPresencePlayer, true);
      }
    }, 350);
  }
}

/**
 * Clean up presence on disconnect / leave
 */
export async function clearPlayerPresence(uid: string) {
  if (!uid) return;
  try {
    await deleteDoc(doc(db, "skyblock_players", uid));
  } catch {}
}

/**
 * Subscribe to all live players currently in the same Skyblock island
 */
export function subscribeToIslandPlayers(
  rawIslandId: string,
  myUid: string,
  onPlayersChange: (players: LiveSkyblockPlayer[]) => void,
): () => void {
  try {
    const islandId = canonicalIslandId(rawIslandId);
    const q = query(collection(db, "skyblock_players"), where("islandId", "==", islandId));

    let latestPlayers: LiveSkyblockPlayer[] = [];
    const emitActivePlayers = () => {
      const now = Date.now();
      onPlayersChange(
        latestPlayers.filter(
          (player) => player.uid !== myUid && now - (player.lastSeen || 0) < 120000,
        ),
      );
    };

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        latestPlayers = snap.docs.map((d) => d.data() as LiveSkyblockPlayer);
        emitActivePlayers();
      },
      (err) => {
        console.warn("Skyblock players listener error:", err);
      },
    );

    // Refresh every 10 seconds so inactive players gracefully expire
    const expiryTimer = setInterval(emitActivePlayers, 10000);
    return () => {
      clearInterval(expiryTimer);
      unsubscribe();
    };
  } catch {
    return () => {};
  }
}

/**
 * Send an island invitation to a friend
 */
export async function sendIslandInvite(
  fromUser: { uid: string; displayName?: string; username?: string },
  toUserId: string,
  islandId: string,
  islandName: string,
) {
  const senderName = fromUser.displayName || fromUser.username || "Friend";
  const inviteText = `🏝 Join my Skyblock Island: ${islandName}!`;

  // Find or create canonical chat ID
  const members = [fromUser.uid, toUserId].sort();
  const chatId = `${members[0]}_${members[1]}`;

  try {
    // 1. Post message in canonical chat subcollection
    const msgRef = doc(collection(db, "chats", chatId, "messages"));
    await setDoc(msgRef, {
      senderId: fromUser.uid,
      senderName,
      text: inviteText,
      special: "island_invite",
      islandId,
      islandOwner: fromUser.uid,
      createdAt: Date.now(),
      timestamp: new Date(),
    });

    // 2. Update chatMeta so the thread is highlighted in chat list
    const metaRef = doc(db, "chatMeta", chatId);
    await setDoc(
      metaRef,
      {
        members: [fromUser.uid, toUserId],
        lastMessage: inviteText,
        lastAt: new Date(),
      },
      { merge: true },
    );

    // 3. Also post to inbox notification
    const mailRef = doc(collection(db, "inbox"));
    await setDoc(mailRef, {
      from: fromUser.uid,
      fromName: senderName,
      to: toUserId,
      type: "island_invite",
      title: "Skyblock Island Invite",
      body: `${senderName} invited you to join their Skyblock Island!`,
      islandId,
      createdAt: Date.now(),
      status: "unread",
    });

    return true;
  } catch (err) {
    console.warn("Failed to send island invite:", err);
    return false;
  }
}
