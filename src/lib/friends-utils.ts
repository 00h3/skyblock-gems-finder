/**
 * Friends system — Firestore-backed.
 *
 * IMPORTANT: All queries use a SINGLE where() clause only.
 * Multiple where() or orderBy() combinations require composite indexes
 * that don't exist yet. We filter client-side instead.
 *
 * Schema: friendRequests/{auto-id}
 *   from:      string  (uid who sent it)
 *   to:        string  (uid who receives it)
 *   status:    "pending" | "accepted" | "rejected"
 *   createdAt: serverTimestamp
 *
 * Inbox: inbox/{auto-id} is a denormalized copy for the mailbox so
 * friend requests still appear if the friendRequests query is denied.
 */
import {
  collection,
  query,
  where,
  getDocs,
  getDocsFromCache,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  writeBatch,
  updateDoc,
  setDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  avatarFrameFrom,
  normalizeAvatarSnapshot,
  type AvatarSnapshot,
  type AvatarFrameId,
} from "./avatar";

export type FriendStatus = "none" | "sent" | "received" | "friends";

export type FriendRequest = {
  id: string;
  from: string;
  to: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: unknown;
  fromUsername?: string;
  fromDisplayName?: string;
  fromColor?: string;
  fromAvatar?: AvatarSnapshot;
  fromBio?: string;
};

export type Friend = {
  uid: string;
  username: string;
  displayName: string;
  customId: string;
  online: boolean;
  color: string;
  profilePhoto?: string;
  avatarSnapshot?: AvatarSnapshot;
  friendCount?: number;
  createdAt?: unknown;
  requestId: string;
  bio?: string;
  frame?: AvatarFrameId;
};

export function uidColor(uid: string): string {
  const palette = [
    "#F4C430",
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#DDA0DD",
    "#FF9A3C",
    "#7C83FD",
  ];
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function friendshipId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export function userDisplayName(data: DocumentData | undefined, uid: string): string {
  const displayName = typeof data?.displayName === "string" ? data.displayName.trim() : "";
  const username = typeof data?.username === "string" ? data.username.trim() : "";
  if (displayName) return displayName;
  if (username) return username;
  return uid ? `Player ${uid.slice(-6)}` : "Player";
}

async function readUserProfile(uid: string): Promise<DocumentData | undefined> {
  try {
    const snap = await getDocFromServer(doc(db, "users", uid));
    if (snap && snap.exists()) return snap.data() as DocumentData;
  } catch {
    // Profile enrichment is optional; the request itself remains authoritative.
  }
  return undefined;
}

function requestFromDoc(id: string, data: DocumentData, profile?: DocumentData): FriendRequest {
  return {
    id,
    from: String(data.from ?? ""),
    to: String(data.to ?? ""),
    status: data.status === "accepted" || data.status === "rejected" ? data.status : "pending",
    createdAt: data.createdAt,
    fromUsername: (profile?.username ?? data.fromUsername ?? "") as string,
    fromDisplayName: (profile?.displayName ??
      data.fromDisplayName ??
      profile?.username ??
      data.fromUsername ??
      "") as string,
    fromColor: (data.fromColor as string | undefined) || uidColor(String(data.from ?? id)),
    fromAvatar: (profile?.avatarSnapshot ?? data.fromAvatar) as AvatarSnapshot | undefined,
    fromBio:
      typeof profile?.bio === "string"
        ? profile.bio
        : typeof data.fromBio === "string"
          ? data.fromBio
          : undefined,
  };
}

export async function ensureChatMeta(myUid: string, otherUid: string): Promise<string> {
  const chatId = friendshipId(myUid, otherUid);
  const myProfile = await readUserProfile(myUid);
  const otherProfile = await readUserProfile(otherUid);
  await setDoc(
    doc(db, "chatMeta", chatId),
    {
      members: [myUid, otherUid],
      requestId: chatId,
      memberProfiles: {
        [myUid]: {
          username: myProfile?.username ?? "",
          displayName: userDisplayName(myProfile, myUid),
          avatarSnapshot: myProfile?.avatarSnapshot ?? null,
          profilePhoto: myProfile?.profilePhoto ?? null,
          bio: myProfile?.bio ?? "",
        },
        [otherUid]: {
          username: otherProfile?.username ?? "",
          displayName: userDisplayName(otherProfile, otherUid),
          avatarSnapshot: otherProfile?.avatarSnapshot ?? null,
          profilePhoto: otherProfile?.profilePhoto ?? null,
          bio: otherProfile?.bio ?? "",
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return chatId;
}

export async function sendFriendRequest(fromUid: string, toUid: string): Promise<void> {
  if (!fromUid || !toUid) throw new Error("Invalid user parameters.");
  if (fromUid === toUid) throw new Error("You cannot add yourself.");
  const status = await getFriendStatus(fromUid, toUid);
  if (status !== "none") {
    throw new Error(
      status === "friends"
        ? "You are already friends."
        : status === "received"
          ? "This player already sent you a request."
          : "A request is already pending.",
    );
  }
  const profile = await readUserProfile(fromUid);
  const payload = {
    from: fromUid,
    to: toUid,
    status: "pending" as const,
    createdAt: serverTimestamp(),
    fromUsername: typeof profile?.username === "string" ? profile.username : "",
    fromDisplayName: userDisplayName(profile, fromUid),
    fromColor: uidColor(fromUid),
    fromAvatar: profile?.avatarSnapshot ?? null,
    fromBio: typeof profile?.bio === "string" ? profile.bio : "",
  };
  const reqRef = doc(collection(db, "friendRequests"));
  const batch = writeBatch(db);
  batch.set(reqRef, payload);
  batch.set(doc(db, "inbox", `${toUid}_${reqRef.id}`), {
    ...payload,
    type: "friend_request",
    requestId: reqRef.id,
  });
  await batch.commit();
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, "friendRequests", requestId);
  let requestSnap = await getDoc(requestRef).catch(() => null);
  if (!requestSnap || !requestSnap.exists()) {
    requestSnap = await getDocFromServer(requestRef).catch(() => null);
  }
  if (!requestSnap || !requestSnap.exists()) throw new Error("Friend request no longer exists.");
  const data = requestSnap.data() as DocumentData;
  if (data.status !== "pending") throw new Error("Friend request is no longer pending.");

  const fromUid = String(data.from);
  const toUid = String(data.to);

  const friendshipRef = doc(db, "friendships", friendshipId(fromUid, toUid));
  await Promise.all([
    setDoc(requestRef, { status: "accepted" }, { merge: true }),
    setDoc(
      friendshipRef,
      {
        members: [fromUid, toUid],
        requestId,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    ),
    markInboxStatus(toUid, requestId, "accepted"),
  ]);
  await ensureChatMeta(fromUid, toUid);
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, "friendRequests", requestId);
  const requestSnap = await getDocFromServer(requestRef);
  if (!requestSnap.exists()) throw new Error("Friend request no longer exists.");
  const data = requestSnap.data() as DocumentData;
  if (data.status !== "pending") throw new Error("Friend request is no longer pending.");
  await updateDoc(requestRef, { status: "rejected" });
  await markInboxStatus(String(data.to), requestId, "rejected");
}

async function markInboxStatus(toUid: string, requestId: string, status: "accepted" | "rejected") {
  const snap = await getDocs(query(collection(db, "inbox"), where("to", "==", toUid)));
  const matches = snap.docs.filter((d) => d.data().requestId === requestId);
  await Promise.all(matches.map((d) => updateDoc(d.ref, { status })));
}

export async function getFriendStatus(myUid: string, otherUid: string): Promise<FriendStatus> {
  const friendship = await getFriendship(myUid, otherUid);
  return friendship.status;
}

export async function getFriendship(
  myUid: string,
  otherUid: string,
): Promise<{ status: FriendStatus; requestId?: string }> {
  // Check requests first. They are scoped to the signed-in user's own
  // from/to fields and remain readable in projects that protect the
  // denormalized friendships collection more strictly.
  let verificationError: unknown;
  const sentQuery = query(collection(db, "friendRequests"), where("from", "==", myUid));
  let sentSnap;
  try {
    sentSnap = await getDocs(sentQuery);
  } catch (serverError) {
    try {
      sentSnap = await getDocsFromCache(sentQuery);
    } catch {
      verificationError = serverError;
    }
  }
  for (const d of sentSnap?.docs ?? []) {
    const data = d.data() as DocumentData;
    if (data.to === otherUid && (data.status === "pending" || data.status === "accepted")) {
      return {
        status: data.status === "accepted" ? "friends" : "sent",
        requestId: d.id,
      };
    }
  }

  const receivedQuery = query(collection(db, "friendRequests"), where("to", "==", myUid));
  let receivedSnap;
  try {
    receivedSnap = await getDocs(receivedQuery);
  } catch (serverError) {
    try {
      receivedSnap = await getDocsFromCache(receivedQuery);
    } catch {
      verificationError ??= serverError;
    }
  }
  for (const d of receivedSnap?.docs ?? []) {
    const data = d.data() as DocumentData;
    if (data.from === otherUid && (data.status === "pending" || data.status === "accepted")) {
      return {
        status: data.status === "accepted" ? "friends" : "received",
        requestId: d.id,
      };
    }
  }

  const fid = friendshipId(myUid, otherUid);
  let fsSnap;
  try {
    fsSnap = await getDocFromServer(doc(db, "friendships", fid));
  } catch (serverError) {
    // A transient Firestore connection should not erase a known friendship.
    // Use the local Firestore cache before surfacing a verification failure.
    try {
      fsSnap = await getDocFromCache(doc(db, "friendships", fid));
    } catch {
      throw serverError;
    }
  }
  if (fsSnap.exists()) {
    const data = fsSnap.data() as DocumentData;
    return {
      status: "friends",
      requestId: typeof data.requestId === "string" ? data.requestId : undefined,
    };
  }

  if (verificationError) throw verificationError;
  return { status: "none" };
}

export async function areFriends(myUid: string, otherUid: string): Promise<boolean> {
  const friendship = await getFriendship(myUid, otherUid);
  return friendship.status === "friends";
}

export function subscribeFriends(
  myUid: string,
  callback: (friends: Friend[]) => void,
): Unsubscribe {
  let sentDocs: DocumentData[] = [];
  let recvDocs: DocumentData[] = [];
  let mergeVersion = 0;

  async function merge() {
    const version = ++mergeVersion;
    const accepted = [
      ...sentDocs.filter((d) => d.status === "accepted"),
      ...recvDocs.filter((d) => d.status === "accepted"),
    ];

    const friends: Friend[] = [];
    for (const d of accepted) {
      const otherUid = d.from === myUid ? d.to : d.from;
      try {
        const u = await readUserProfile(otherUid);
        if (!u) {
          friends.push({
            uid: otherUid,
            username: "",
            displayName: userDisplayName(undefined, otherUid),
            customId: "",
            online: false,
            color: uidColor(otherUid),
            requestId: d.id,
          });
          continue;
        }
        friends.push({
          uid: otherUid,
          username: typeof u.username === "string" ? u.username.trim() : "",
          displayName: userDisplayName(u, otherUid),
          customId: u.customId ?? "",
          online: u.online ?? false,
          color: uidColor(otherUid),
          avatarSnapshot: normalizeAvatarSnapshot(u) as AvatarSnapshot | undefined,
          friendCount: typeof u.friendCount === "number" ? u.friendCount : undefined,
          createdAt: u.createdAt,
          requestId: d.id,
          bio: typeof u.bio === "string" ? u.bio : undefined,
          profilePhoto: typeof u.profilePhoto === "string" ? u.profilePhoto : undefined,
          frame: avatarFrameFrom(u),
        });
      } catch {
        /* skip */
      }
    }
    if (version !== mergeVersion) return;
    callback(friends);
    updateDoc(doc(db, "users", myUid), { friendCount: friends.length }).catch(() => {});
  }

  const unsub1 = onSnapshot(
    query(collection(db, "friendRequests"), where("from", "==", myUid)),
    (snap) => {
      sentDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      void merge();
    },
    () => {
      // Keep the last good friend list during transient permission/network errors.
    },
  );
  const unsub2 = onSnapshot(
    query(collection(db, "friendRequests"), where("to", "==", myUid)),
    (snap) => {
      recvDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      void merge();
    },
    () => {
      // Keep the last good friend list during transient permission/network errors.
    },
  );

  return () => {
    unsub1();
    unsub2();
  };
}

export function subscribeIncomingRequests(
  myUid: string,
  callback: (reqs: FriendRequest[]) => void,
): Unsubscribe {
  let fromRequests: FriendRequest[] = [];
  let fromInbox: FriendRequest[] = [];
  let enrichVersion = 0;

  function emit() {
    const map = new Map<string, FriendRequest>();
    for (const req of [...fromInbox, ...fromRequests]) {
      if (!req.id && !req.from) continue;
      if (req.status && req.status !== "pending") continue;
      map.set(req.id || `from:${req.from}`, req);
    }
    callback([...map.values()]);
  }

  async function enrich(list: FriendRequest[]) {
    const version = ++enrichVersion;
    const next = await Promise.all(
      list.map(async (req) => {
        if (req.fromDisplayName && req.fromUsername) return req;
        const profile = await readUserProfile(req.from);
        if (!profile) return req;
        return requestFromDoc(req.id, req as unknown as DocumentData, profile);
      }),
    );
    return { version, next };
  }

  const unsubRequests = onSnapshot(
    query(collection(db, "friendRequests"), where("to", "==", myUid)),
    (snap) => {
      fromRequests = snap.docs
        .filter((d) => {
          const status = d.data().status;
          return status === "pending" || status == null;
        })
        .map((d) => requestFromDoc(d.id, d.data() as DocumentData));
      emit();
      void enrich(fromRequests).then(({ version, next }) => {
        if (version !== enrichVersion) return;
        fromRequests = next;
        emit();
      });
    },
    () => {
      // Keep the last good request list during transient errors.
    },
  );

  const unsubInbox = onSnapshot(
    query(collection(db, "inbox"), where("to", "==", myUid)),
    (snap) => {
      fromInbox = snap.docs
        .map((d) => {
          const data = d.data() as DocumentData;
          const id = String(data.requestId || d.id);
          return requestFromDoc(id, data);
        })
        .filter((req) => req.status === "pending");
      emit();
    },
    () => {
      // Keep the last good request list during transient errors.
    },
  );

  return () => {
    unsubRequests();
    unsubInbox();
  };
}
