import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  limit,
} from "firebase/firestore";

export interface ServerPlayer {
  uid: string;
  name: string;
  username: string;
  photo?: string;
  frame?: string;
  joinedAt: number;
  lastSeen: number;
  isHost?: boolean;
}

export interface GameServer {
  id: string;
  gameId: string;
  name: string;
  region: string;
  ping: number;
  maxPlayers: 16; // strict 16 cap like requested
  players: ServerPlayer[];
  playerCount: number;
  isPrivate?: boolean;
  createdAt: number;
  lastActive: number;
}

const SERVER_CAP = 16;
const SERVERS_COL = "game_servers";

// Realistic avatars for lobby slots & simulated community players
export const COMMUNITY_BOT_PLAYERS: ServerPlayer[] = [
  {
    uid: "bot_ira",
    name: "IRA",
    username: "ira_official",
    photo: "https://file.garden/alGOOylwpAfCa6qP/IMG_6551_1786910421451.jpeg",
    frame: "staff",
    joinedAt: Date.now() - 1000 * 120,
    lastSeen: Date.now(),
    isHost: true,
  },
  {
    uid: "bot_ned",
    name: "Ned",
    username: "ned_the_builder",
    photo: "https://file.garden/alGOOylwpAfCa6qP/C24029F2-83D1-4C8B-B67C-71A7E0186ED4.png",
    frame: "early-beta",
    joinedAt: Date.now() - 1000 * 95,
    lastSeen: Date.now(),
  },
  {
    uid: "bot_nelly",
    name: "Nelly",
    username: "nelly_sky",
    photo: "https://file.garden/alGOOylwpAfCa6qP/file_000000007ea881f4a21aac7088884509.png",
    frame: "witch-rose",
    joinedAt: Date.now() - 1000 * 70,
    lastSeen: Date.now(),
  },
  {
    uid: "bot_pixel",
    name: "PixelKnight",
    username: "pixel_king99",
    photo: "https://api.dicebear.com/7.x/bottts/svg?seed=pixelking",
    frame: "emerald",
    joinedAt: Date.now() - 1000 * 50,
    lastSeen: Date.now(),
  },
  {
    uid: "bot_shadow",
    name: "ShadowNinja",
    username: "shadow_qblock",
    photo: "https://api.dicebear.com/7.x/bottts/svg?seed=shadowninja",
    frame: "neon-cyber",
    joinedAt: Date.now() - 1000 * 40,
    lastSeen: Date.now(),
  },
  {
    uid: "bot_luna",
    name: "LunaVoxel",
    username: "luna_builder",
    photo: "https://api.dicebear.com/7.x/bottts/svg?seed=lunavoxel",
    frame: "gold-treasure",
    joinedAt: Date.now() - 1000 * 30,
    lastSeen: Date.now(),
  },
  {
    uid: "bot_vortex",
    name: "VortexPulse",
    username: "vortex_pvp",
    photo: "https://api.dicebear.com/7.x/bottts/svg?seed=vortexpulse",
    frame: "ice",
    joinedAt: Date.now() - 1000 * 20,
    lastSeen: Date.now(),
  },
  {
    uid: "bot_ember",
    name: "EmberFlame",
    username: "ember_craft",
    photo: "https://api.dicebear.com/7.x/bottts/svg?seed=emberflame",
    joinedAt: Date.now() - 1000 * 10,
    lastSeen: Date.now(),
  },
];

// Fallback initial servers for offline or initial Firestore boots
function getDefaultInitialServers(gameId: string): GameServer[] {
  const normGame = gameId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const now = Date.now();
  return [
    {
      id: `${normGame}-server-1`,
      gameId,
      name: "Server #1 • Public",
      region: "US-East",
      ping: 28,
      maxPlayers: 16,
      players: COMMUNITY_BOT_PLAYERS.slice(0, 6),
      playerCount: 6,
      createdAt: now - 3600_000,
      lastActive: now,
    },
    {
      id: `${normGame}-server-2`,
      gameId,
      name: "Server #2 • Fast Ping",
      region: "EU-West",
      ping: 34,
      maxPlayers: 16,
      players: COMMUNITY_BOT_PLAYERS.slice(2, 5),
      playerCount: 3,
      createdAt: now - 1800_000,
      lastActive: now,
    },
    {
      id: `${normGame}-server-3`,
      gameId,
      name: "Server #3 • Casual Hub",
      region: "US-West",
      ping: 42,
      maxPlayers: 16,
      players: [],
      playerCount: 0,
      createdAt: now - 900_000,
      lastActive: now,
    },
  ];
}

/**
 * Ensures at least a baseline set of servers exist in Firestore for this game.
 */
export async function seedInitialServersIfEmpty(gameId: string): Promise<GameServer[]> {
  try {
    const q = query(
      collection(db, SERVERS_COL),
      where("gameId", "==", gameId),
      limit(10),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as GameServer);
    }

    // Otherwise create the default servers
    const defaults = getDefaultInitialServers(gameId);
    for (const srv of defaults) {
      await setDoc(doc(db, SERVERS_COL, srv.id), srv, { merge: true });
    }
    return defaults;
  } catch (err) {
    console.warn("Could not query/seed Firestore servers, using local default:", err);
    return getDefaultInitialServers(gameId);
  }
}

/**
 * Subscribe in real-time to active servers for this game.
 */
export function subscribeGameServers(
  gameId: string,
  onUpdate: (servers: GameServer[]) => void,
): () => void {
  let unsubscribed = false;

  // Make sure defaults exist first
  seedInitialServersIfEmpty(gameId).then((initialList) => {
    if (!unsubscribed) {
      onUpdate(initialList);
    }
  });

  try {
    const q = query(collection(db, SERVERS_COL), where("gameId", "==", gameId));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          onUpdate(getDefaultInitialServers(gameId));
          return;
        }
        const servers: GameServer[] = snap.docs.map((d) => {
          const data = d.data() as GameServer;
          const players = (data.players || []).slice(0, SERVER_CAP);
          return {
            ...data,
            maxPlayers: 16,
            players,
            playerCount: players.length,
          };
        });

        // Sort: active servers with players first, then lowest ping
        servers.sort((a, b) => {
          if (b.playerCount !== a.playerCount) {
            return b.playerCount - a.playerCount;
          }
          return a.ping - b.ping;
        });

        onUpdate(servers);
      },
      (err) => {
        console.warn("Server subscription error, using local defaults:", err);
        onUpdate(getDefaultInitialServers(gameId));
      },
    );

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
  } catch (err) {
    console.warn("Failed to listen to servers:", err);
    onUpdate(getDefaultInitialServers(gameId));
    return () => {
      unsubscribed = true;
    };
  }
}

/**
 * Fetch list of servers once
 */
export async function getGameServers(gameId: string): Promise<GameServer[]> {
  try {
    const q = query(collection(db, SERVERS_COL), where("gameId", "==", gameId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return await seedInitialServersIfEmpty(gameId);
    }
    return snap.docs.map((d) => {
      const data = d.data() as GameServer;
      const players = (data.players || []).slice(0, SERVER_CAP);
      return {
        ...data,
        maxPlayers: 16,
        players,
        playerCount: players.length,
      };
    });
  } catch {
    return getDefaultInitialServers(gameId);
  }
}

/**
 * Roblox Matchmaking Logic:
 * Find the best server with active players (< 16 and > 0).
 * If none found, returns null so caller can create a new server.
 */
export async function findBestServerWithPlayers(
  gameId: string,
  excludeServerId?: string,
): Promise<GameServer | null> {
  const servers = await getGameServers(gameId);
  const eligible = servers.filter(
    (s) =>
      s.id !== excludeServerId &&
      s.playerCount > 0 &&
      s.playerCount < SERVER_CAP,
  );

  if (eligible.length === 0) return null;

  // Pick the server with the most players (so games are full and active like Roblox)
  eligible.sort((a, b) => b.playerCount - a.playerCount);
  return eligible[0];
}

/**
 * Join a game server
 */
export async function joinGameServer(
  gameId: string,
  serverId: string,
  player: ServerPlayer,
): Promise<{ success: boolean; server?: GameServer; error?: string }> {
  try {
    const ref = doc(db, SERVERS_COL, serverId);
    const snap = await getDoc(ref);

    let serverData: GameServer;
    if (!snap.exists()) {
      // Create if missing
      serverData = {
        id: serverId,
        gameId,
        name: `Server #${serverId.slice(-3)}`,
        region: "Global",
        ping: 32,
        maxPlayers: 16,
        players: [player],
        playerCount: 1,
        createdAt: Date.now(),
        lastActive: Date.now(),
      };
      await setDoc(ref, serverData);
      return { success: true, server: serverData };
    }

    serverData = snap.data() as GameServer;
    const currentPlayers = serverData.players || [];

    // Check if player is already in server
    const existingIndex = currentPlayers.findIndex((p) => p.uid === player.uid);
    if (existingIndex !== -1) {
      currentPlayers[existingIndex] = { ...currentPlayers[existingIndex], ...player, lastSeen: Date.now() };
    } else {
      // Check 16 cap!
      if (currentPlayers.length >= SERVER_CAP) {
        return { success: false, error: "Server is full (16/16)" };
      }
      currentPlayers.push(player);
    }

    const updated: Partial<GameServer> = {
      players: currentPlayers,
      playerCount: currentPlayers.length,
      lastActive: Date.now(),
    };

    await updateDoc(ref, updated);
    return { success: true, server: { ...serverData, ...updated } };
  } catch (err) {
    console.warn("Failed to join server in Firestore:", err);
    return { success: true };
  }
}

/**
 * Leave a game server
 */
export async function leaveGameServer(serverId: string, playerUid: string): Promise<void> {
  try {
    const ref = doc(db, SERVERS_COL, serverId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data() as GameServer;
    const filtered = (data.players || []).filter((p) => p.uid !== playerUid && !p.uid.startsWith("bot_"));

    await updateDoc(ref, {
      players: filtered,
      playerCount: filtered.length,
      lastActive: Date.now(),
    });
  } catch (err) {
    console.warn("Failed to leave server in Firestore:", err);
  }
}

/**
 * Create a new custom or private 16-player server
 */
export async function createGameServer(
  gameId: string,
  serverName?: string,
  isPrivate = false,
  hostPlayer?: ServerPlayer,
): Promise<GameServer> {
  const normGame = gameId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const serverId = `${normGame}-srv-${randomSuffix}`;
  const now = Date.now();

  const newServer: GameServer = {
    id: serverId,
    gameId,
    name: serverName || `Server #${randomSuffix}`,
    region: "US-East",
    ping: 24,
    maxPlayers: 16,
    players: hostPlayer ? [hostPlayer] : [],
    playerCount: hostPlayer ? 1 : 0,
    isPrivate,
    createdAt: now,
    lastActive: now,
  };

  try {
    await setDoc(doc(db, SERVERS_COL, serverId), newServer);
  } catch (err) {
    console.warn("Failed to create server document in Firestore:", err);
  }

  return newServer;
}
