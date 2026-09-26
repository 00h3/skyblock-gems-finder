import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { MobileShell } from "@/components/MobileShell";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";
import {
  Search,
  MessageCircle,
  X,
  Check,
  SquarePen,
  Users,
  UserPlus,
  UserCheck,
  Clock,
  Lock,
  Pin,
  HelpCircle,
  Gamepad2,
  Sparkles,
  BookOpen,
  ChevronRight,
  Plus,
  Compass,
  ShieldCheck,
} from "lucide-react";
import { UserNameWithBadges } from "@/lib/user-style";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ServerIconBadge } from "@/components/ServerIconBadge";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { GroupChatRoom } from "@/components/GroupChatRoom";
import { JoinGroupModal } from "@/components/JoinGroupModal";
import { GroupCard } from "@/components/GroupCard";
import { ShinyButton } from "@/components/ui/shiny-button";
import {
  subscribeUserGroups,
  subscribeDiscoverableGroups,
  ensureDefaultCommunityGroups,
  joinGroupChat,
  type GroupChatData,
} from "@/lib/group-chat";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  limit,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GlossyAvatar, type AvatarFrame } from "@/components/GlossyAvatar";
import {
  sendFriendRequest,
  getFriendship,
  acceptFriendRequest,
  ensureChatMeta,
  uidColor,
  subscribeFriends,
  subscribeIncomingRequests,
  rejectFriendRequest,
  userDisplayName,
  friendshipId,
  type Friend,
  type FriendStatus,
  type FriendRequest,
} from "@/lib/friends-utils";
import { avatarFrameFrom, normalizeAvatarSnapshot, type AvatarSnapshot } from "@/lib/avatar";

import { FirstTimeSectionLoader } from "@/components/ui/FirstTimeSectionLoader";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chats — QBlock" }] }),
  component: () => (
    <FirstTimeSectionLoader id="chat">
      <ChatList />
    </FirstTimeSectionLoader>
  ),
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Thread = {
  chatId: string;
  uid: string;
  username: string;
  displayName: string;
  customId: string;
  lastMessage: string;
  lastTime: string;
  online: boolean;
  unread: number;
  color: string;
  avatarSnapshot?: AvatarSnapshot;
  friendCount?: number;
  lastAtMillis: number;
  bio?: string;
  frame?: AvatarFrame;
  profilePhoto?: string;
  email?: string;
  staff?: boolean;
  badgeEquipped?: boolean;
};

type FoundUser = {
  uid: string;
  username: string;
  displayName: string;
  customId: string;
  online: boolean;
  color: string;
  status: FriendStatus;
  avatarSnapshot?: AvatarSnapshot;
  requestId?: string;
  bio?: string;
  frame?: AvatarFrame;
  profilePhoto?: string;
  email?: string;
  staff?: boolean;
  badgeEquipped?: boolean;
};

function timeAgo(ts: unknown): string {
  if (!ts) return "";
  const date = (ts as { toDate?: () => Date }).toDate?.() ?? new Date(ts as string);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

function timestampMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof (ts as { toMillis?: () => number }).toMillis === "function") {
    return (ts as { toMillis: () => number }).toMillis();
  }
  if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
    return (ts as { toDate: () => Date }).toDate().getTime();
  }
  const millis = new Date(ts as string | number).getTime();
  return Number.isFinite(millis) ? millis : 0;
}

function Avatar({
  name,
  size = 48,
  color,
  snapshot,
  frame,
  isIra,
  profilePhoto,
}: {
  name: string;
  size?: number;
  color?: string;
  snapshot?: AvatarSnapshot;
  frame?: AvatarFrame;
  profilePhoto?: string;
  isIra?: boolean;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <GlossyAvatar
        snapshot={snapshot}
        frame={frame ?? snapshot?.frameId}
        portrait={isIra}
        photoUrl={profilePhoto}
        height={size}
        className="h-full w-full"
        autoRotate={false}
        focusZone="head"
      />
    </div>
  );
}

// ── User card for search results ─────────────────────────────────────────────
function UserSearchCard({
  user,
  onAddFriend,
  onMessage,
}: {
  user: FoundUser;
  onAddFriend: () => Promise<void>;
  onMessage: () => void;
}) {
  const [localStatus, setLocalStatus] = useState<FriendStatus>(user.status);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setLocalStatus(user.status);
  }, [user.status]);

  async function handleAdd() {
    setBusy(true);
    setActionError("");
    try {
      const wasReceived = localStatus === "received";
      await onAddFriend();
      setLocalStatus(wasReceived ? "friends" : "sent");
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      setActionError(
        code === "permission-denied"
          ? "Firebase blocked this request. Please try again after signing in."
          : "Couldn’t update friendship. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const isFriend = localStatus === "friends";
  const isSent = localStatus === "sent";
  const isReceived = localStatus === "received";
  const isIra = user.username?.toLowerCase() === "ira";

  return (
    <div
      className="rounded-[22px] overflow-hidden"
      style={{
        background: "var(--surface-2)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(15,23,42,0.05), 0 8px 24px rgba(15,23,42,0.10)",
      }}
    >
      {/* ── Avatar banner ── */}
      <div
        className="w-full flex items-center justify-center relative overflow-hidden"
        style={{
          height: 96,
          background: `linear-gradient(140deg, ${user.color}40 0%, ${user.color}18 60%, transparent 100%)`,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-center h-full w-full p-3">
          <GlossyAvatar
            snapshot={user.avatarSnapshot}
            frame={user.frame ?? user.avatarSnapshot?.frameId}
            portrait={isIra}
            height={72}
            className="h-[72px] w-[72px]"
            autoRotate={false}
            focusZone="head"
          />
        </div>
      </div>

      {/* ── Info ── */}
      <div className="px-4 pt-3 pb-4">
        <div className="text-[16px] font-extrabold leading-tight">
          <UserNameWithBadges user={user} name={user.displayName} badgeSize={16} />
        </div>
        <div className="text-[12px] text-text-secondary mt-0.5 font-semibold">@{user.username}</div>
        {user.customId && (
          <div className="text-[10.5px] text-text-muted mt-0.5">{user.customId}</div>
        )}
        {user.bio && user.bio.trim().length > 0 && (
          <div className="mt-2 text-[12px] text-text-secondary line-clamp-2 leading-relaxed">
            {user.bio.trim()}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="mt-3 flex gap-2">
          {isFriend ? (
            <button
              onClick={onMessage}
              className="press flex-1 h-9 rounded-full bg-primary text-primary-foreground text-[12px] font-extrabold flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Message
            </button>
          ) : isSent ? (
            <div className="flex-1 h-9 rounded-full bg-surface-2 border border-border-soft text-[12px] font-semibold text-text-muted flex items-center justify-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Request sent
            </div>
          ) : isReceived ? (
            <button
              onClick={handleAdd}
              disabled={busy}
              className="press flex-1 h-9 rounded-full text-[12px] font-extrabold flex items-center justify-center gap-1.5"
              style={{ background: "linear-gradient(135deg,#4ECDC4,#45B7D1)", color: "#fff" }}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Accept
            </button>
          ) : (
            <button
              onClick={handleAdd}
              disabled={busy}
              className="press flex-1 h-9 rounded-full text-[12px] font-medium flex items-center justify-center disabled:opacity-60 cursor-pointer"
              style={{ background: "linear-gradient(135deg,#ff8a68,#fa4616)", color: "#ffffff" }}
            >
              {busy ? "Sending…" : "Add Friend"}
            </button>
          )}
        </div>
        {actionError ? (
          <p className="mt-2 text-center text-[10.5px] text-red-500">{actionError}</p>
        ) : null}

        {!isFriend && (
          <p className="mt-2 text-[10.5px] text-text-muted text-center flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            Become friends to start chatting
          </p>
        )}
      </div>
    </div>
  );
}

const DEV_TEST_USER_THREAD: Thread = {
  chatId: "demo-h3",
  uid: "h3-uid",
  username: "h3",
  displayName: "h3",
  customId: "QB-DEV-001",
  lastMessage: "You: bro this is so cool",
  lastTime: "9:41",
  online: true,
  unread: 0,
  color: "#fa4616",
  staff: true,
  badgeEquipped: false,
  lastAtMillis: Date.now(),
  bio: "Developer",
};

// ── Main component ────────────────────────────────────────────────────────────
function ChatList() {
  const nav = useNavigate();
  const { qbUser } = useAuth();
  const [tab, setTab] = useState<"friends" | "groups">("friends");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [userGroups, setUserGroups] = useState<GroupChatData[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<GroupChatData[]>([]);
  const [activeGroupRoom, setActiveGroupRoom] = useState<GroupChatData | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [groupSearchQ, setGroupSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("find") === "1"
    ) {
      setSearchOpen(true);
    }
  }, []);
  const [findQ, setFindQ] = useState("");
  const [findResults, setFindResults] = useState<FoundUser[]>([]);
  const [finding, setFinding] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [toast, setToast] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<{
    user: ProfileUser;
    chatId?: string;
  } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }

  // ── Realtime group chat subscriptions ─────────────────────────────────────
  useEffect(() => {
    if (!qbUser) return;
    void ensureDefaultCommunityGroups(qbUser.uid);
    const unsubUser = subscribeUserGroups(qbUser.uid, (groups) => {
      setUserGroups(groups);
    });
    const unsubDiscover = subscribeDiscoverableGroups((groups) => {
      setDiscoverGroups(groups);
    });
    return () => {
      unsubUser();
      unsubDiscover();
    };
  }, [qbUser]);

  // ── Realtime thread list ──────────────────────────────────────────────────
  useEffect(() => {
    if (!qbUser) return;
    let latestSnapshot = 0;
    let unsub: (() => void) | undefined;
    try {
      const q = query(
        collection(db, "chatMeta"),
        where("members", "array-contains", qbUser.uid),
        limit(50),
      );
      unsub = onSnapshot(
        q,
        async (snap) => {
          const snapshotVersion = ++latestSnapshot;
          const list = await Promise.all(
            snap.docs.map(async (d): Promise<Thread | null> => {
              const data = d.data() as DocumentData;
              const members = Array.isArray(data.members)
                ? data.members.filter((m): m is string => typeof m === "string")
                : [];
              const otherUid = members.find((m) => m !== qbUser.uid);
              if (!otherUid) return null;
              let u: DocumentData | undefined;
              try {
                const userSnap = await Promise.race([
                  getDoc(doc(db, "users", otherUid)),
                  new Promise<null>((r) => setTimeout(() => r(null), 2000)),
                ]);
                if (userSnap && userSnap.exists()) u = userSnap.data() as DocumentData;
              } catch {
                // The cached chat remains useful when the profile is temporarily unavailable.
              }
              const username = typeof u?.username === "string" ? u.username.trim() : "";
              const memberProfile = data.memberProfiles?.[otherUid] as DocumentData | undefined;
              const avatarSnapshot = normalizeAvatarSnapshot({
                avatarSnapshot: u?.avatarSnapshot ?? memberProfile?.avatarSnapshot,
                frameId: u?.frameId ?? memberProfile?.frameId,
                equippedFrame: u?.equippedFrame ?? memberProfile?.equippedFrame,
              }) as AvatarSnapshot | undefined;
              const bio =
                typeof u?.bio === "string"
                  ? u.bio
                  : typeof memberProfile?.bio === "string"
                    ? memberProfile.bio
                    : undefined;
              const frame = avatarFrameFrom({
                avatarSnapshot,
                frameId: u?.frameId ?? memberProfile?.frameId,
                equippedFrame: u?.equippedFrame ?? memberProfile?.equippedFrame,
              });
              return {
                chatId: d.id,
                uid: otherUid,
                username:
                  username ||
                  (typeof memberProfile?.username === "string" ? memberProfile.username : ""),
                displayName: userDisplayName(u ?? memberProfile, otherUid),
                customId: typeof u?.customId === "string" ? u.customId : "",
                lastMessage: data.lastMessage ?? "",
                lastTime: timeAgo(data.lastAt),
                online: u?.online === true,
                unread: (data.unreadCounts?.[qbUser.uid] as number) ?? 0,
                color: uidColor(otherUid),
                avatarSnapshot,
                friendCount: typeof u?.friendCount === "number" ? u.friendCount : undefined,
                lastAtMillis: timestampMillis(data.lastAt),
                bio,
                frame,
                profilePhoto: u?.profilePhoto ?? memberProfile?.profilePhoto,
                email: typeof u?.email === "string" ? u.email : undefined,
                staff: u?.staff === true,
                badgeEquipped: u?.badgeEquipped === true,
              };
            }),
          );
          if (snapshotVersion !== latestSnapshot) return;
          setThreads(
            list
              .filter((thread): thread is Thread => thread !== null)
              .sort((a, b) => b.lastAtMillis - a.lastAtMillis),
          );
        },
        () => {
          setToast("Chats are temporarily unavailable. Please try again.");
        },
      );
    } catch {
      setToast("Chats are temporarily unavailable. Please try again.");
    }
    return () => unsub?.();
  }, [qbUser]);

  // Keep accepted friends visible in Chat even before a first message exists.
  useEffect(() => {
    if (!qbUser) return;
    return subscribeFriends(qbUser.uid, setFriends);
  }, [qbUser]);

  useEffect(() => {
    if (!qbUser) return;
    return subscribeIncomingRequests(qbUser.uid, setRequests);
  }, [qbUser]);

  // ── User search ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = findQ.trim();
    let active = true;
    if (!q) {
      setFindResults([]);
      setSearchError("");
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setFinding(true);
      setSearchError("");
      try {
        let snap;
        const isEmailSearch = q.includes("@");
        if (isEmailSearch) {
          snap = await getDocs(
            query(collection(db, "users"), where("email", "==", q.toLowerCase()), limit(5)),
          );
        } else if (q.toUpperCase().startsWith("QB-")) {
          snap = await getDocs(
            query(collection(db, "users"), where("customId", "==", q.toUpperCase())),
          );
        } else {
          snap = await getDocs(
            query(collection(db, "users"), where("username", ">=", q), limit(15)),
          );
        }
        const results: FoundUser[] = await Promise.all(
          snap.docs
            .filter((d) => {
              if (d.id === qbUser?.uid) return false;
              if (isEmailSearch) {
                return (
                  String(d.data().email ?? "")
                    .trim()
                    .toLowerCase() === q.toLowerCase()
                );
              }
              if (q.toUpperCase().startsWith("QB-")) return true;
              const username = String(d.data().username ?? "").toLowerCase();
              return username.startsWith(q.toLowerCase());
            })
            .map(async (d) => {
              const data = d.data() as DocumentData;
              const friendship = qbUser
                ? await getFriendship(qbUser.uid, d.id)
                : { status: "none" as const };
              return {
                uid: d.id,
                username: typeof data.username === "string" ? data.username.trim() : "",
                displayName: userDisplayName(data, d.id),
                customId: typeof data.customId === "string" ? data.customId : "",
                online: data.online ?? false,
                color: uidColor(d.id),
                status: friendship.status,
                avatarSnapshot: normalizeAvatarSnapshot({
                  avatarSnapshot: data.avatarSnapshot,
                  frameId: data.frameId,
                  equippedFrame: data.equippedFrame,
                }) as AvatarSnapshot | undefined,
                friendCount: typeof data.friendCount === "number" ? data.friendCount : undefined,
                requestId: friendship.requestId,
                bio: typeof data.bio === "string" ? data.bio : undefined,
                frame: avatarFrameFrom({
                  avatarSnapshot: data.avatarSnapshot,
                  frameId: data.frameId,
                  equippedFrame: data.equippedFrame,
                }),
                email: typeof data.email === "string" ? data.email : undefined,
                staff: data.staff === true,
                badgeEquipped: data.badgeEquipped === true,
              };
            }),
        );
        if (!active) return;
        setFindResults(results);
      } catch {
        if (!active) return;
        setFindResults([]);
        setSearchError("Search is temporarily unavailable. Please try again.");
      } finally {
        if (active) setFinding(false);
      }
    }, 350);
    return () => {
      active = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [findQ, qbUser]);

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => findInputRef.current?.focus(), 80);
  }

  useEffect(() => {
    if (searchOpen) setTimeout(() => findInputRef.current?.focus(), 100);
  }, [searchOpen]);
  function closeSearch() {
    setSearchOpen(false);
    setFindQ("");
    setFindResults([]);
  }

  async function openOrCreateChat(otherUid: string, chatId?: string) {
    if (chatId && chatId.startsWith("demo-")) {
      closeSearch();
      nav({ to: "/chat/$id" as never, params: { id: chatId } as never });
      return;
    }
    if (!qbUser) return;
    try {
      const cid = await ensureChatMeta(qbUser.uid, otherUid);
      closeSearch();
      nav({ to: "/chat/$id" as never, params: { id: cid } as never });
    } catch (err) {
      console.error("Could not open chat:", err);
      showToast("Couldn’t open chat yet — accept each other as friends first.");
    }
  }

  function openProfile(user: ProfileUser, chatId?: string) {
    setSelectedProfile({ user, chatId });
  }

  const activeThreads = threads;
  const filtered = activeThreads.filter(
    (t) =>
      !searchQ ||
      (typeof t.displayName === "string" &&
        t.displayName.toLowerCase().includes(searchQ.toLowerCase())) ||
      (typeof t.username === "string" && t.username.toLowerCase().includes(searchQ.toLowerCase())),
  );
  const visibleFriends = friends.filter(
    (friend) => !activeThreads.some((thread) => thread.uid === friend.uid),
  );

  return (
    <MobileShell>
      <div className="min-h-[100dvh] bg-white pb-28">
        <header className="px-3.5 pt-[max(env(safe-area-inset-top),12px)] pb-2 flex items-center justify-between">
          <h1 className="text-[19px] font-extrabold tracking-[-0.02em] text-[#141414]">Chat</h1>
        </header>

        <div className="px-3.5 pb-2.5">
          <div className="flex h-[38px] items-center gap-2.5 rounded-[13px] border border-black/[0.08] dark:border-white/[0.08] bg-gradient-to-b from-white/95 to-[#f5f7fa]/90 dark:from-[#1c1e24] dark:to-[#17191e] px-3 shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]">
            <Search className="w-[15px] h-[15px] text-[#8b929d] shrink-0" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search chats..."
              className="bg-transparent outline-none text-[12.5px] font-medium flex-1 text-[#141414] dark:text-white placeholder:text-[#8b929d]"
            />
          </div>
        </div>

        {/* Friends / Friend Groups Top Bar (Requests removed and moved to Inbox) */}
        <div className="mx-3.5 flex gap-1.5 rounded-[22px] p-1 mb-3 bg-black/[0.04] dark:bg-white/[0.06]">
          {(
            [
              { id: "friends", label: "Friends" },
              { id: "groups", label: "Friend Groups", count: userGroups.length },
            ] as const
          ).map((t) => {
            const isSelected = tab === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                layout
                initial={false}
                animate={{
                  borderRadius: isSelected ? "13px" : "9999px",
                }}
                transition={{
                  duration: 0.18,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`relative z-10 flex-1 py-2 px-1 text-[12px] font-medium flex items-center justify-center gap-1.5 select-none cursor-pointer transition-colors duration-200 ${
                  isSelected
                    ? "bg-[#141414] dark:bg-white text-white dark:text-[#141414] shadow-sm"
                    : "text-[#6b7280] dark:text-[#9ca3af] hover:text-foreground"
                }`}
              >
                <span className="truncate">{t.label}</span>
                {t.id === "groups" && t.count > 0 && (
                  <span className="rounded-full bg-[#fa4616] px-1.5 py-0.2 text-[9px] font-medium text-white">
                    {t.count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {tab === "friends" ? (
          <div className="px-3.5">
            {filtered.length === 0 && visibleFriends.length === 0 ? (
              <div className="py-14 text-center text-text-muted flex flex-col items-center gap-2">
                <MessageCircle className="w-7 h-7" />
                <p className="text-[13px] font-medium">No conversations yet</p>
              </div>
            ) : null}

            {filtered.map((t) => (
              <button
                key={t.chatId}
                onClick={() => openOrCreateChat(t.uid, t.chatId)}
                className="w-full text-left px-1 py-2.5 flex items-center gap-2.5 border-b border-black/[0.05] active:bg-black/[0.02]"
              >
                <div
                  className="w-10 h-10 shrink-0 rounded-[12px] overflow-hidden bg-slate-100 dark:bg-slate-800 press cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    openProfile(
                      {
                        id: t.uid,
                        n: t.displayName,
                        username: t.username,
                        customId: t.customId,
                        bio: t.bio,
                        color: "#fa4616",
                        online: t.online,
                        avatarSnapshot: t.avatarSnapshot,
                        profilePhoto: t.profilePhoto,
                        email: t.email,
                        staff: t.staff || t.username?.toLowerCase() === "ira",
                        badgeEquipped: t.badgeEquipped,
                      },
                      t.chatId,
                    );
                  }}
                  title="View Profile"
                >
                  <GlossyAvatar
                    snapshot={t.avatarSnapshot}
                    frame={t.frame}
                    photoUrl={t.profilePhoto}
                    height={40}
                    className="w-full h-full rounded-[12px]"
                    autoRotate={false}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[13.5px] text-[#141414] truncate">
                      {t.displayName}
                    </span>
                    <span className="text-[10.5px] text-text-muted shrink-0 font-medium">
                      {t.lastTime}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-text-secondary truncate mt-0.5">
                    {t.lastMessage}
                  </div>
                </div>
                {t.unread > 0 ? (
                  <span className="ml-1 grid h-4.5 min-w-[18px] place-items-center rounded-full bg-[#fa4616] px-1 text-[9.5px] font-black text-white shadow-sm shrink-0">
                    {t.unread}
                  </span>
                ) : null}
              </button>
            ))}

            {tab === "friends" &&
              visibleFriends.map((f) => (
                <button
                  key={f.uid}
                  onClick={() => openOrCreateChat(f.uid)}
                  className="w-full text-left px-1 py-2.5 flex items-center gap-2.5 border-b border-black/[0.05] active:bg-black/[0.02]"
                >
                  <div
                    className="w-10 h-10 shrink-0 rounded-[12px] overflow-hidden bg-slate-100 dark:bg-slate-800 press cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      openProfile({
                        id: f.uid,
                        n: userDisplayName(f as unknown as DocumentData, f.uid),
                        username: f.username,
                        customId: f.customId,
                        bio: f.bio,
                        color: "#fa4616",
                        online: f.online ?? false,
                        avatarSnapshot: normalizeAvatarSnapshot(f) as AvatarSnapshot | undefined,
                        frame: avatarFrameFrom(f),
                        profilePhoto: f.profilePhoto,
                        staff: f.username?.toLowerCase() === "ira",
                      });
                    }}
                    title="View Profile"
                  >
                    <GlossyAvatar
                      snapshot={normalizeAvatarSnapshot(f) as AvatarSnapshot | undefined}
                      frame={avatarFrameFrom(f)}
                      photoUrl={f.profilePhoto}
                      height={40}
                      className="w-full h-full rounded-[12px]"
                      autoRotate={false}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[13.5px] text-[#141414] truncate">
                      {userDisplayName(f as unknown as DocumentData, f.uid)}
                    </div>
                    <div className="text-[11px] text-text-muted">Tap to message</div>
                  </div>
                </button>
              ))}
          </div>
        ) : tab === "groups" ? (
          <div className="px-3.5 space-y-3.5 pb-24">
            {/* Minimal Search Servers & Create Bar */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 rounded-[14px] px-3 h-[40px] flex-1 border border-black/5 dark:border-white/5">
                <input
                  type="text"
                  value={groupSearchQ}
                  onChange={(e) => setGroupSearchQ(e.target.value)}
                  placeholder="Search servers..."
                  className="bg-transparent outline-none text-[13px] font-normal flex-1 text-black dark:text-white placeholder:text-neutral-400"
                />
                {groupSearchQ && (
                  <button
                    type="button"
                    onClick={() => setGroupSearchQ("")}
                    className="text-[12px] font-normal text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowCreateGroup(true)}
                className="press h-[40px] px-3.5 rounded-[14px] bg-black text-white dark:bg-white dark:text-black text-[12px] font-normal cursor-pointer shadow-xs shrink-0"
              >
                + Create
              </button>
            </div>

            {/* Groups Grid */}
            <div className="space-y-3">
              {(() => {
                // Deduplicate groups by id
                const combinedMap = new Map<string, GroupChatData>();
                userGroups.forEach((g) => combinedMap.set(g.id, g));
                discoverGroups.forEach((g) => {
                  if (!combinedMap.has(g.id)) combinedMap.set(g.id, g);
                });

                const allGroups = Array.from(combinedMap.values());
                const filteredGroups = allGroups.filter((g) => {
                  if (!groupSearchQ.trim()) return true;
                  const q = groupSearchQ.toLowerCase();
                  return (
                    g.name.toLowerCase().includes(q) ||
                    Boolean(g.goal && g.goal.toLowerCase().includes(q)) ||
                    Boolean(g.description && g.description.toLowerCase().includes(q))
                  );
                });

                if (filteredGroups.length === 0) {
                  return (
                    <div className="py-12 text-center text-neutral-400 flex flex-col items-center gap-1.5">
                      <p className="text-[13px] font-normal">No servers found</p>
                    </div>
                  );
                }

                return filteredGroups.map((group) => {
                  const isMember = Boolean(qbUser && group.members?.includes(qbUser.uid));
                  return (
                    <GroupCard
                      key={group.id}
                      group={group}
                      isMember={isMember}
                      onOpen={(g) => setActiveGroupRoom(g)}
                      onJoin={async (g) => {
                        if (!qbUser) return;
                        try {
                          await joinGroupChat(g.id, qbUser.uid, qbUser.displayName || "Player");
                          setActiveGroupRoom(g);
                        } catch (err) {
                          console.error("Failed to join group:", err);
                        }
                      }}
                      onViewRules={(g) => setActiveGroupRoom(g)}
                    />
                  );
                });
              })()}
            </div>
          </div>
        ) : null}

        {searchOpen ? (
          <div className="fixed inset-0 z-50 bg-white flex flex-col">
            <div className="px-4 pt-5 pb-2 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#f8f9fa] border border-border-soft rounded-2xl px-3 py-2 flex-1">
                <UserPlus className="w-4 h-4 text-text-muted" />
                <input
                  ref={findInputRef}
                  value={findQ}
                  onChange={(e) => setFindQ(e.target.value)}
                  placeholder="Find people by email, username or ID"
                  className="bg-transparent outline-none text-[15px] flex-1"
                />
              </div>
              <button onClick={closeSearch} className="text-[14px] font-bold px-2">
                Cancel
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-1.5">
              {finding ? <div className="py-10 text-center text-text-muted">Searching…</div> : null}
              {searchError ? (
                <div className="py-3 text-center text-[13px] text-red-500">{searchError}</div>
              ) : null}
              {findResults.map((u) => (
                <UserSearchCard
                  key={u.uid}
                  user={u}
                  onAddFriend={async () => {
                    if (!qbUser) return;
                    if (u.status === "received" && u.requestId) {
                      await acceptFriendRequest(u.requestId);
                      showToast("Friend added");
                    } else {
                      await sendFriendRequest(qbUser.uid, u.uid);
                      showToast("Friend request sent");
                    }
                  }}
                  onMessage={() => openOrCreateChat(u.uid)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {selectedProfile ? (
          <ProfileSheet
            user={selectedProfile.user}
            onChat={() => openOrCreateChat(selectedProfile.user.id)}
            onClose={() => setSelectedProfile(null)}
          />
        ) : null}

        {toast ? (
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60] bg-[#141414] text-white text-[13px] font-medium px-4 py-2 rounded-full">
            {toast}
          </div>
        ) : null}

        {/* Create Group Modal */}
        {showCreateGroup && (
          <CreateGroupModal
            isOpen={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            currentUser={
              qbUser
                ? {
                    uid: qbUser.uid,
                    displayName: qbUser.displayName || qbUser.username || "Player",
                    username: qbUser.username,
                  }
                : null
            }
            onGroupCreated={(_newGroupId) => {
              setShowCreateGroup(false);
              showToast("Group created!");
            }}
          />
        )}

        {/* Join Group Modal */}
        {showJoinGroup && (
          <JoinGroupModal
            isOpen={showJoinGroup}
            onClose={() => setShowJoinGroup(false)}
            currentUser={
              qbUser
                ? {
                    uid: qbUser.uid,
                    displayName: qbUser.displayName || qbUser.username || "Player",
                    username: qbUser.username,
                  }
                : null
            }
            onOpenGroup={(group) => {
              setShowJoinGroup(false);
              setActiveGroupRoom(group);
            }}
          />
        )}

        {/* Active Group Chat Room */}
        {activeGroupRoom && (
          <GroupChatRoom
            group={activeGroupRoom}
            currentUser={{
              uid: qbUser?.uid || "guest",
              displayName: qbUser?.displayName || qbUser?.username || "Player",
              username: qbUser?.username,
              avatarSnapshot: qbUser?.avatarSnapshot,
              color: qbUser?.color,
              staff: qbUser?.staff,
            }}
            onBack={() => setActiveGroupRoom(null)}
          />
        )}
      </div>
    </MobileShell>
  );
}
