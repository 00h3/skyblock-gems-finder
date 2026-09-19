import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  type DocumentData,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { AvatarSnapshot } from "@/lib/avatar";

const LOCAL_GROUPS_KEY = "qb_custom_groups_v2";

function getLocalGroups(): GroupChatData[] {
  try {
    const raw = localStorage.getItem(LOCAL_GROUPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalGroup(group: GroupChatData) {
  try {
    const list = getLocalGroups();
    const filtered = list.filter((g) => g.id !== group.id);
    filtered.unshift(group);
    localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(filtered.slice(0, 50)));
    // Dispatch custom event to notify local listeners
    window.dispatchEvent(new CustomEvent("qb_groups_updated"));
  } catch (err) {
    console.warn("Could not save group to local cache:", err);
  }
}

export interface ServerIconDefinition {
  id: string;
  name: string;
  gradient: string;
  iconName: string;
}

export const SERVER_ICON_PACK: ServerIconDefinition[] = [
  {
    id: "discord-blurple",
    name: "Gaming Hub",
    gradient: "from-[#5865F2] to-[#3a45a5]",
    iconName: "Gamepad2",
  },
  {
    id: "cyber-violet",
    name: "Cyber Guild",
    gradient: "from-[#8b5cf6] to-[#5b21b6]",
    iconName: "Crown",
  },
  {
    id: "voxel-flame",
    name: "BedWars Squad",
    gradient: "from-[#fa4616] to-[#b91c1c]",
    iconName: "Swords",
  },
  {
    id: "emerald-guild",
    name: "Builders Union",
    gradient: "from-[#10b981] to-[#047857]",
    iconName: "Box",
  },
  {
    id: "neon-cyan",
    name: "Arcade Zone",
    gradient: "from-[#06b6d4] to-[#0e7490]",
    iconName: "Zap",
  },
  {
    id: "amber-sun",
    name: "Skyblock Empire",
    gradient: "from-[#f59e0b] to-[#b45309]",
    iconName: "Shield",
  },
  {
    id: "sakura-pink",
    name: "Social Lounge",
    gradient: "from-[#ec4899] to-[#9d174d]",
    iconName: "Sparkles",
  },
  {
    id: "obsidian-dark",
    name: "Shadow Realm",
    gradient: "from-[#1e293b] to-[#0f172a]",
    iconName: "Skull",
  },
  {
    id: "cosmic-blue",
    name: "Cosmic Odyssey",
    gradient: "from-[#3b82f6] to-[#1d4ed8]",
    iconName: "Rocket",
  },
  {
    id: "ghostly-spirit",
    name: "Phantom Club",
    gradient: "from-[#64748b] to-[#334155]",
    iconName: "Ghost",
  },
  {
    id: "golden-trophy",
    name: "Tournament Pros",
    gradient: "from-[#eab308] to-[#ca8a04]",
    iconName: "Trophy",
  },
  {
    id: "nature-compass",
    name: "Explorers Guild",
    gradient: "from-[#14b8a6] to-[#0f766e]",
    iconName: "Compass",
  },
];

export const DEFAULT_RULES_TEMPLATES: string[] = [
  "1. Be respectful to all group members. Harassment or hate speech is strictly forbidden.",
  "2. No spamming, flood messaging, or unapproved promotional links.",
  "3. Keep all conversation safe, welcoming, and friendly (PG-13).",
  "4. Fair play and teamwork: No griefing, cheating, or toxicity during games.",
  "5. Respect server hosts and heed moderator guidance.",
];

export interface GroupChatData {
  id: string;
  name: string;
  description: string;
  goal?: string;
  hype?: number;
  hypeGoal?: number;
  customPfpUrl?: string;
  rules: string[];
  iconId: string;
  gradient: string;
  iconName: string;
  ownerId: string;
  ownerName: string;
  admins?: string[];
  members: string[];
  memberCount: number;
  memberAvatars?: string[];
  isPublic: boolean;
  createdAt?: unknown;
  lastMessage?: string;
  lastMessageTime?: unknown;
  lastMessageSender?: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderUid: string;
  senderName: string;
  senderUsername?: string;
  senderAvatarSnapshot?: AvatarSnapshot;
  senderColor?: string;
  text: string;
  createdAt?: unknown;
  staff?: boolean;
}

/**
 * Creates a brand new Discord-style group chat with custom rules, custom PFP, and unique goals.
 */
export async function createGroupChat(params: {
  name: string;
  description: string;
  goal?: string;
  rules: string[];
  customPfpUrl?: string;
  iconId?: string;
  ownerUid?: string;
  ownerName?: string;
  isPublic?: boolean;
}): Promise<string> {
  const iconDef = SERVER_ICON_PACK.find((i) => i.id === params.iconId) || SERVER_ICON_PACK[0];

  const effectiveOwnerUid =
    (params.ownerUid && params.ownerUid.trim()) ||
    auth.currentUser?.uid ||
    "player_" + Math.random().toString(36).slice(2, 9);

  const effectiveOwnerName =
    (params.ownerName && params.ownerName.trim()) || auth.currentUser?.displayName || "Player";

  // Sanitize custom avatar
  let safePfp = params.customPfpUrl || "";
  if (safePfp.length > 250000) {
    // If it's a huge uncompressed base64 data url, cap or fallback
    safePfp =
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80";
  }

  const groupRef = doc(collection(db, "groups"));
  const newGroup: GroupChatData = {
    id: groupRef.id,
    name: params.name.trim(),
    description: params.description.trim() || "Active community squad",
    goal: params.goal?.trim() || "Reach 1,000 Hype & level up the squad",
    hype: 0,
    hypeGoal: 1000,
    customPfpUrl: safePfp,
    rules:
      params.rules && params.rules.length > 0 ? params.rules : DEFAULT_RULES_TEMPLATES.slice(0, 3),
    iconId: iconDef.id,
    gradient: iconDef.gradient,
    iconName: iconDef.iconName,
    ownerId: effectiveOwnerUid,
    ownerName: effectiveOwnerName,
    admins: [effectiveOwnerUid],
    members: [effectiveOwnerUid],
    memberCount: 1,
    memberAvatars: safePfp ? [safePfp] : [],
    isPublic: params.isPublic !== false,
    createdAt: serverTimestamp(),
    lastMessage: `Group created by ${effectiveOwnerName}`,
    lastMessageTime: serverTimestamp(),
    lastMessageSender: effectiveOwnerName,
  };

  // Always save to local store immediately so user can see it without delay
  saveLocalGroup({
    ...newGroup,
    createdAt: new Date().toISOString(),
    lastMessageTime: new Date().toISOString(),
  });

  try {
    await setDoc(groupRef, newGroup);

    // Add initial announcement message
    try {
      await addDoc(collection(db, "groups", groupRef.id, "messages"), {
        groupId: groupRef.id,
        senderUid: "system",
        senderName: "Server Bot",
        senderUsername: "bot",
        senderColor: "#5865F2",
        text: `🎉 Welcome to **${params.name.trim()}**! Please check the server rules and enjoy chatting with the squad.`,
        createdAt: serverTimestamp(),
        staff: true,
      });
    } catch (msgErr) {
      console.warn("Could not post initial bot message:", msgErr);
    }
  } catch (firestoreErr) {
    console.warn("Firestore setDoc group error (cached locally):", firestoreErr);
  }

  return groupRef.id;
}

/**
 * Join an existing group chat.
 */
export async function joinGroupChat(
  groupId: string,
  userUid: string,
  userName: string,
): Promise<void> {
  const localList = getLocalGroups();
  const localMatch = localList.find((g) => g.id === groupId);
  if (localMatch && !localMatch.members.includes(userUid)) {
    localMatch.members.push(userUid);
    localMatch.memberCount = (localMatch.memberCount || 1) + 1;
    saveLocalGroup(localMatch);
  }

  try {
    const groupRef = doc(db, "groups", groupId);
    const snap = await getDoc(groupRef);
    if (snap.exists()) {
      const data = snap.data() as GroupChatData;
      if (!data.members?.includes(userUid)) {
        await updateDoc(groupRef, {
          members: arrayUnion(userUid),
          memberCount: increment(1),
        });

        await addDoc(collection(db, "groups", groupId, "messages"), {
          groupId,
          senderUid: "system",
          senderName: "Server Bot",
          senderUsername: "bot",
          senderColor: "#5865F2",
          text: `👋 **${userName}** just joined the group! Say hello!`,
          createdAt: serverTimestamp(),
          staff: true,
        });
      }
    }
  } catch (err) {
    console.warn("joinGroupChat firestore error (handled locally):", err);
  }
}

/**
 * Leave a group chat.
 */
export async function leaveGroupChat(groupId: string, userUid: string): Promise<void> {
  const localList = getLocalGroups();
  const localMatch = localList.find((g) => g.id === groupId);
  if (localMatch && localMatch.members.includes(userUid)) {
    localMatch.members = localMatch.members.filter((m) => m !== userUid);
    localMatch.memberCount = Math.max(0, (localMatch.memberCount || 1) - 1);
    saveLocalGroup(localMatch);
  }

  try {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(userUid),
      memberCount: increment(-1),
    });
  } catch (err) {
    console.warn("leaveGroupChat error:", err);
  }
}

function mergeGroups(remoteList: GroupChatData[], userUid?: string): GroupChatData[] {
  const localList = getLocalGroups();
  const map = new Map<string, GroupChatData>();

  for (const item of remoteList) {
    map.set(item.id, item);
  }

  for (const item of localList) {
    if (userUid && !item.members?.includes(userUid) && item.ownerId !== userUid) {
      continue;
    }
    // Remote version takes priority unless local is newer
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

/**
 * Subscribe to all groups the user is a member of.
 */
export function subscribeUserGroups(
  userUid: string,
  onGroups: (groups: GroupChatData[]) => void,
): () => void {
  let remoteDocs: GroupChatData[] = [];

  const broadcast = () => {
    onGroups(mergeGroups(remoteDocs, userUid));
  };

  // Immediate emission from local storage
  broadcast();

  const handleStorage = () => broadcast();
  window.addEventListener("qb_groups_updated", handleStorage);

  try {
    const q = query(collection(db, "groups"), where("members", "array-contains", userUid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        remoteDocs = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as GroupChatData);
        broadcast();
      },
      (err) => {
        console.warn("subscribeUserGroups error, using local groups:", err);
        broadcast();
      },
    );

    return () => {
      unsub();
      window.removeEventListener("qb_groups_updated", handleStorage);
    };
  } catch {
    return () => {
      window.removeEventListener("qb_groups_updated", handleStorage);
    };
  }
}

/**
 * Subscribe to all discoverable public groups for the server directory.
 */
export function subscribeDiscoverableGroups(
  onGroups: (groups: GroupChatData[]) => void,
): () => void {
  let remoteDocs: GroupChatData[] = [];

  const broadcast = () => {
    const local = getLocalGroups();
    const map = new Map<string, GroupChatData>();
    for (const d of remoteDocs) map.set(d.id, d);
    for (const l of local) {
      if (!map.has(l.id)) map.set(l.id, l);
    }
    onGroups(Array.from(map.values()));
  };

  broadcast();

  const handleStorage = () => broadcast();
  window.addEventListener("qb_groups_updated", handleStorage);

  try {
    const q = query(collection(db, "groups"), limit(30));
    const unsub = onSnapshot(
      q,
      (snap) => {
        remoteDocs = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as GroupChatData);
        broadcast();
      },
      (err) => {
        console.warn("subscribeDiscoverableGroups error:", err);
        broadcast();
      },
    );

    return () => {
      unsub();
      window.removeEventListener("qb_groups_updated", handleStorage);
    };
  } catch {
    return () => {
      window.removeEventListener("qb_groups_updated", handleStorage);
    };
  }
}

function getLocalGroupMessages(groupId: string): GroupMessage[] {
  try {
    const raw = localStorage.getItem(`qb_group_msgs_${groupId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalGroupMessage(groupId: string, msg: GroupMessage) {
  try {
    const list = getLocalGroupMessages(groupId);
    list.push(msg);
    if (list.length > 200) list.shift();
    localStorage.setItem(`qb_group_msgs_${groupId}`, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(`qb_group_msgs_${groupId}`));
  } catch (e) {
    console.warn("saveLocalGroupMessage error:", e);
  }
}

/**
 * Subscribe to messages in a specific group chat.
 */
export function subscribeGroupMessages(
  groupId: string,
  onMessages: (messages: GroupMessage[]) => void,
): () => void {
  let remoteMsgs: GroupMessage[] = [];

  const broadcast = () => {
    const localMsgs = getLocalGroupMessages(groupId);
    const map = new Map<string, GroupMessage>();
    for (const m of remoteMsgs) map.set(m.id, m);
    for (const m of localMsgs) {
      if (!map.has(m.id)) map.set(m.id, m);
    }
    const combined = Array.from(map.values());
    combined.sort((a, b) => {
      const getMs = (val: any) => {
        if (!val) return 0;
        if (typeof val === "string") return new Date(val).getTime();
        if (val.toMillis) return val.toMillis();
        if (val.seconds) return val.seconds * 1000;
        return 0;
      };
      return getMs(a.createdAt) - getMs(b.createdAt);
    });
    onMessages(combined);
  };

  broadcast();

  const handleLocal = () => broadcast();
  window.addEventListener(`qb_group_msgs_${groupId}`, handleLocal);

  try {
    const q = query(
      collection(db, "groups", groupId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        remoteMsgs = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as GroupMessage);
        broadcast();
      },
      (err) => {
        console.warn("subscribeGroupMessages firestore warning (falling back to local):", err);
        broadcast();
      },
    );

    return () => {
      unsub();
      window.removeEventListener(`qb_group_msgs_${groupId}`, handleLocal);
    };
  } catch {
    return () => {
      window.removeEventListener(`qb_group_msgs_${groupId}`, handleLocal);
    };
  }
}

/**
 * Send a message to a group chat.
 */
export async function sendGroupChatMessage(
  groupId: string,
  message: {
    senderUid: string;
    senderName: string;
    senderUsername?: string;
    senderAvatarSnapshot?: AvatarSnapshot;
    senderColor?: string;
    text: string;
    staff?: boolean;
  },
): Promise<void> {
  // 1. Optimistic instant local save
  const localMsg: GroupMessage = {
    id: `local_msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    groupId,
    ...message,
    createdAt: new Date().toISOString(),
  };
  saveLocalGroupMessage(groupId, localMsg);

  // 2. Persist to Firestore
  try {
    const groupRef = doc(db, "groups", groupId);
    await addDoc(collection(db, "groups", groupId, "messages"), {
      groupId,
      ...message,
      createdAt: serverTimestamp(),
    });

    await updateDoc(groupRef, {
      lastMessage: message.text,
      lastMessageTime: serverTimestamp(),
      lastMessageSender: message.senderName,
      hype: increment(2),
    });
  } catch (err) {
    console.warn("sendGroupChatMessage firestore error (handled via local cache):", err);
  }
}

/**
 * Seed initial popular public groups if collection is empty, so players immediately have active servers to browse & join.
 */
export async function ensureDefaultCommunityGroups(currentUid?: string): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, "groups"), limit(1)));
    if (!snap.empty) return; // Already seeded

    const defaults: Omit<GroupChatData, "id">[] = [
      {
        name: "Official QBlock Lounge",
        description:
          "The official gathering place for QBlock players! Chat, find match parties, and discuss game updates.",
        goal: "Reach Level 50 & 1,000 Hype for custom community emotes",
        hype: 240,
        hypeGoal: 1000,
        rules: [
          "1. Be welcoming and respectful to all players.",
          "2. No spamming, flood chat, or unsolicited links.",
          "3. Keep all content PG-13 and safe for everyone.",
          "4. Share your custom voxel builds and game highlights!",
        ],
        iconId: "discord-blurple",
        gradient: "from-[#5865F2] to-[#3a45a5]",
        iconName: "Gamepad2",
        ownerId: "system_admin",
        ownerName: "QBlock Team",
        admins: ["system_admin"],
        members: currentUid ? ["system_admin", currentUid] : ["system_admin"],
        memberCount: 48,
        memberAvatars: [
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80",
        ],
        isPublic: true,
        lastMessage: "Welcome everyone! Feel free to invite friends.",
      },
      {
        name: "BedWars Champions League",
        description:
          "Competitive BedWars squad matchmaking, rush strategies, and scrim tournaments.",
        goal: "Win 100 4v4 Quad BedWars Scrims this season",
        hype: 620,
        hypeGoal: 1000,
        rules: [
          "1. Communicate and coordinate positively with teammates.",
          "2. No rage quitting or griefing bed defenses.",
          "3. Share bed defense blueprints and iron rush tactics.",
        ],
        iconId: "voxel-flame",
        gradient: "from-[#fa4616] to-[#b91c1c]",
        iconName: "Swords",
        ownerId: "system_bedwars",
        ownerName: "BedWars Host",
        admins: ["system_bedwars"],
        members: currentUid ? ["system_bedwars", currentUid] : ["system_bedwars"],
        memberCount: 32,
        memberAvatars: [
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        ],
        isPublic: true,
        lastMessage: "Who's ready for 4v4 BedWars squads?",
      },
      {
        name: "Master Builders Society",
        description:
          "Show off creative sandbox creations, voxel islands, and collaborate on massive world projects.",
        goal: "Construct the Mega Sky Citadel & reach 1,000 Hype",
        hype: 410,
        hypeGoal: 1000,
        rules: [
          "1. Respect each creator's architectural style.",
          "2. Constructive criticism only.",
          "3. Team up to build landmark sandbox structures.",
        ],
        iconId: "emerald-guild",
        gradient: "from-[#10b981] to-[#047857]",
        iconName: "Box",
        ownerId: "system_architect",
        ownerName: "MasterBuilder",
        admins: ["system_architect"],
        members: currentUid ? ["system_architect", currentUid] : ["system_architect"],
        memberCount: 26,
        memberAvatars: [
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
        ],
        isPublic: true,
        lastMessage: "Check out the new cathedral build in Sandbox!",
      },
    ];

    for (const group of defaults) {
      const gRef = doc(collection(db, "groups"));
      await setDoc(gRef, {
        ...group,
        id: gRef.id,
        createdAt: serverTimestamp(),
        lastMessageTime: serverTimestamp(),
      });
      await addDoc(collection(db, "groups", gRef.id, "messages"), {
        groupId: gRef.id,
        senderUid: group.ownerId,
        senderName: group.ownerName,
        senderUsername: group.ownerName.toLowerCase().replace(/\s+/g, ""),
        senderColor: "#fa4616",
        text: `Welcome to **${group.name}**! Read our server rules and say hi! 👋`,
        createdAt: serverTimestamp(),
        staff: true,
      });
    }
  } catch (err) {
    console.warn("Could not seed default groups:", err);
  }
}

/**
 * Boosts group hype in Firestore (e.g. +50 hype from a member cheer).
 */
export async function boostGroupHype(groupId: string, amount: number = 50): Promise<number> {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    hype: increment(amount),
  });
  return amount;
}

/**
 * Adds an admin to the group's hierarchy.
 */
export async function addGroupAdmin(groupId: string, userUid: string): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    admins: arrayUnion(userUid),
  });
}

/**
 * Removes an admin from the group's hierarchy.
 */
export async function removeGroupAdmin(groupId: string, userUid: string): Promise<void> {
  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    admins: arrayRemove(userUid),
  });
}
