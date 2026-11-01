import {
  AlertTriangle,
  AtSign,
  Calendar,
  Flag,
  Hash,
  ChevronLeft,
  MoreHorizontal,
  X,
  Gamepad2,
  MessageSquare,
  Pencil,
  UserPlus,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AvatarFrameOverlay, GlossyAvatar } from "./GlossyAvatar";
import { BronzeCorniceUpper, BronzeCorniceAvatar } from "./BronzeCornice";
import { GlbAvatar } from "./GlbAvatar";
import {
  normalizeAvatarFrameId,
  normalizeAvatarSnapshot,
  type AvatarSnapshot,
  type AvatarFrameId,
  CHARACTER_1_GLTF,
  CHARACTER_2_GLTF,
  getAvatarViewerUrl,
} from "@/lib/avatar";
import { badgeUrlsFor, getUserBadges, UserNameWithBadges, isH3User, isStrUser, isIraUser } from "@/lib/user-style";
import FolderFloat from "@/components/ui/FolderFloat";
import { setNavHidden } from "@/lib/ui-bus";
import { useAuth } from "@/lib/auth-context";
import {
  acceptFriendRequest,
  getFriendship,
  sendFriendRequest,
  unfriendUser,
  type FriendStatus,
} from "@/lib/friends-utils";
import { db } from "@/lib/firebase";
import { doc, getDocFromServer, onSnapshot, updateDoc, increment } from "firebase/firestore";
import { getRecentlyPlayedGameIds } from "@/lib/games-cache";
import baseplateIcon from "@/assets/game-baseplate.jpg";
import { useNavigate } from "@tanstack/react-router";
import { ClapIcon } from "@/components/QbIcons";
import { ShinyButton } from "@/components/ui/shiny-button";

import { ProfileIcon } from "@/components/icons";
export function getCleanName(
  user:
    | {
        email?: unknown;
        username?: unknown;
        displayName?: unknown;
        n?: unknown;
        name?: unknown;
      }
    | null
    | undefined,
): string {
  if (!user) return "Player";
  if (
    user.email === "mammaettahiri@gmail.com" ||
    (typeof user.username === "string" &&
      (user.username.toLowerCase() === "mammaettahiri" || user.username.toLowerCase() === "ira")) ||
    (typeof user.displayName === "string" &&
      (user.displayName.toLowerCase() === "mammaettahiri" || user.displayName.toLowerCase() === "ira"))
  )
    return "IRA";
  if (
    (typeof user.username === "string" && user.username.toLowerCase() === "die") ||
    (typeof user.displayName === "string" && user.displayName.toLowerCase() === "die")
  )
    return "Die";
  const raw = user.username || user.displayName || user.n || user.name;
  if (!raw) {
    return typeof user.email === "string" ? user.email.split("@")[0] : "Player";
  }
  const value = String(raw);
  if (value.includes("@")) return value.split("@")[0];
  return value;
}

export type ProfileUser = {
  id: string;
  n: string;
  color: string;
  online: boolean;
  staff?: boolean;
  bio?: string;
  isOwn?: boolean;
  username?: string;
  customId?: string;
  avatarSnapshot?: AvatarSnapshot;
  frame?: AvatarFrameId;
  profilePhoto?: string;
  email?: string;
  badgeEquipped?: boolean;
  badges?: string[];
  badgesList?: string[];
  gradientName?: string;
  nameGradient?: string;
  nameStyle?: "default" | "gradient";
  useGradientName?: boolean;
  isYouTuber?: boolean;
  admin?: boolean;
  dev?: boolean;
  friendCount?: number;
  createdAt?: unknown;
  islandId?: string;
  gamesPlayed?: string[];
  claps?: number;
};

const KNOWN_GAMES_INFO: Record<string, { title: string; mode: string; icon?: string }> = {
  sandbox: {
    title: "Sandbox",
    mode: "Voxel Baseplate",
    icon: baseplateIcon,
  },
  skyblock: {
    title: "Skyblock: New Horizon",
    mode: "Island Survival",
  },
  scp: {
    title: "SCP Escape",
    mode: "Action & Survival",
  },
};

const REPORT_REASONS = [
  "Harassment or Bullying",
  "Cheating or Exploits",
  "Inappropriate Content",
  "Spam or Scams",
  "Impersonation",
  "Other",
];

export interface ProfileSheetProps {
  user: ProfileUser;
  onClose: () => void;
  onChat?: () => void;
  onAddFriend?: () => void;
  onVisitIsland?: (islandId: string) => void;
  variant?: "modal" | "page";
}

export function ProfileSheet({
  user: initialUser,
  onClose,
  onChat,
  onAddFriend,
  onVisitIsland,
}: ProfileSheetProps) {
  const { qbUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<ProfileUser>(initialUser);
  const [activeTab, setActiveTab] = useState<"personal" | "game">("personal");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendRequestId, setFriendRequestId] = useState<string | undefined>();
  const [addingFriend, setAddingFriend] = useState(false);
  const [firebaseGamesPlayed, setFirebaseGamesPlayed] = useState<string[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);
  const [profileError, setProfileError] = useState("");
  const [friendError, setFriendError] = useState("");

  // Hydrate user with fresh Firestore data
  useEffect(() => {
    setUser(initialUser);
    if (
      !initialUser ||
      !initialUser.id ||
      typeof initialUser.id !== "string" ||
      !initialUser.id.trim()
    ) {
      setLoadingGames(false);
      return;
    }
    const uid = initialUser.id.trim();
    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const gamesFromDb = (
            Array.isArray(data.gamesPlayed)
              ? data.gamesPlayed
              : Array.isArray(data.gameHistory)
                ? data.gameHistory
                : []
          ).filter(
            (gameId): gameId is string => typeof gameId === "string" && gameId.trim().length > 0,
          );
          setFirebaseGamesPlayed(gamesFromDb);

          setUser((prev) => {
            const rawSnapshot = normalizeAvatarSnapshot({
              avatarSnapshot: data.avatarSnapshot,
              frameId: data.frameId,
              equippedFrame: data.equippedFrame,
            });
            const frame = normalizeAvatarFrameId(rawSnapshot?.frameId);
            const avatarSnapshot = rawSnapshot as AvatarSnapshot | undefined;

            return {
              ...prev,
              n: data.displayName || data.username || prev?.n || "Player",
              email: typeof data.email === "string" ? data.email : prev?.email,
              username: data.username ?? prev?.username,
              customId: data.customId ?? prev?.customId,
              avatarSnapshot,
              frame,
              profilePhoto: data.profilePhoto ?? prev?.profilePhoto,
              bio: typeof data.bio === "string" ? data.bio : prev?.bio,
              friendCount:
                typeof data.friendCount === "number" ? data.friendCount : prev?.friendCount,
              createdAt: data.createdAt ?? prev?.createdAt,
              islandId: data.islandId ?? prev?.islandId,
              staff:
                data.staff === true ||
                data.username?.toLowerCase() === "ira" ||
                data.username?.toLowerCase() === "die" ||
                prev?.username?.toLowerCase() === "ira" ||
                prev?.username?.toLowerCase() === "die" ||
                prev?.staff === true,
              badgeEquipped: data.badgeEquipped ?? prev?.badgeEquipped,
              badges: data.badges ?? data.badgesList ?? data.ownedBadges ?? prev?.badges,
              gradientName: data.gradientName ?? data.nameGradient ?? prev?.gradientName,
              nameGradient: data.nameGradient ?? data.gradientName ?? prev?.nameGradient,
              nameStyle:
                data.nameStyle ??
                (data.useGradientName === false
                  ? "default"
                  : data.useGradientName === true
                    ? "gradient"
                    : prev?.nameStyle),
              useGradientName:
                data.useGradientName ??
                (data.nameStyle === "gradient"
                  ? true
                  : data.nameStyle === "default"
                    ? false
                    : prev?.useGradientName),
              isYouTuber: data.isYouTuber ?? data.youtuber ?? prev?.isYouTuber,
              admin: data.admin ?? prev?.admin,
              dev: data.dev ?? data.developer ?? prev?.dev,
              gamesPlayed: gamesFromDb,
              claps: typeof data.claps === "number" ? data.claps : prev?.claps,
            };
          });
          setLoadingGames(false);
        }
      },
      (err) => {
        setProfileError("Live profile data is unavailable. Please try again.");
        console.error("Could not hydrate profile sheet user:", err);
        setLoadingGames(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [initialUser]);

  useEffect(() => {
    setNavHidden(true);
    return () => setNavHidden(false);
  }, []);

  useEffect(() => {
    let active = true;
    if (!qbUser || !user || !user.id || user.isOwn || qbUser.uid === user.id) return;
    getFriendship(qbUser.uid, user.id)
      .then(({ status, requestId }) => {
        if (active) {
          setFriendStatus(status);
          setFriendRequestId(requestId);
        }
      })
      .catch((err) => {
        if (active) setFriendError("Friend status could not be verified.");
        console.error("Could not load friendship status:", err);
      });
    return () => {
      active = false;
    };
  }, [qbUser?.uid, user?.id, user?.isOwn]);

  async function handleAddFriend() {
    if (onAddFriend) {
      onAddFriend();
      return;
    }
    if (!qbUser || !user.id || user.isOwn || qbUser.uid === user.id || addingFriend) return;
    if (friendStatus === "friends" || friendStatus === "sent") return;
    setAddingFriend(true);
    try {
      if (friendStatus === "received" && friendRequestId) {
        await acceptFriendRequest(friendRequestId);
        setFriendStatus("friends");
      } else {
        await sendFriendRequest(qbUser.uid, user.id);
        setFriendStatus("sent");
      }
    } catch (e) {
      setFriendError(e instanceof Error ? e.message : "Couldn’t update friendship.");
      console.error("Could not send friend request", e);
    } finally {
      setAddingFriend(false);
    }
  }

  async function handleUnfriend() {
    if (!qbUser || !user.id || addingFriend) return;
    setAddingFriend(true);
    try {
      await unfriendUser(qbUser.uid, user.id);
      setFriendStatus("none");
      setFriendRequestId(null);
    } catch (e) {
      setFriendError(e instanceof Error ? e.message : "Couldn’t unfriend user.");
    } finally {
      setAddingFriend(false);
    }
  }

  async function handleMessageClick() {
    if (onChat) {
      onChat();
      return;
    }
    if (user.id === "support" || user.id?.toLowerCase() === "support") {
      onClose();
      navigate({ to: "/chat_/$id" as never, params: { id: "support" } as never });
      return;
    }
    if (!qbUser) {
      onClose();
      navigate({ to: "/chat_/$id" as never, params: { id: user.id || "support" } as never });
      return;
    }
    if (!user.id) return;
    try {
      const chatId = await ensureChatMeta(qbUser.uid, user.id);
      onClose();
      navigate({ to: "/chat_/$id" as never, params: { id: chatId } as never });
    } catch (err) {
      console.warn("Could not ensureChatMeta from profile sheet, falling back to direct chat:", err);
      onClose();
      const fallbackChatId = friendshipId(qbUser.uid, user.id);
      navigate({ to: "/chat_/$id" as never, params: { id: fallbackChatId } as never });
    }
  }

  const name = getCleanName(user);
  const displayId =
    typeof user.customId === "string" && user.customId.trim()
      ? user.customId.trim()
      : user.id
        ? user.id.slice(0, 10).toUpperCase()
        : "2582138126";

  const isOwnProfile = Boolean(user.isOwn || (qbUser && qbUser.uid === user.id));
  const userBadges = getUserBadges(user);

  // Combine Firestore gamesPlayed and local cache games if own profile
  const localPlayed = isOwnProfile ? getRecentlyPlayedGameIds() : [];
  const combinedGameIds = Array.from(
    new Set([...firebaseGamesPlayed, ...(user.gamesPlayed || []), ...localPlayed]),
  );

  function submitReport() {
    if (!selectedReason) return;
    setReportSent(true);
    setTimeout(() => {
      setReportOpen(false);
      setReportSent(false);
      setSelectedReason(null);
    }, 1800);
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-center bg-black/60">
      <motion.section
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 340, mass: 0.7 }}
        aria-label={`${name} profile`}
        className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-[#f4f5f8] dark:bg-[#0c0d11] transform-gpu"
      >
        <div className="flex-1 w-full overflow-y-auto ios-scroll hide-scrollbar flex flex-col relative">
          {/* ── PROFILE HEADER (PFP + NAME) ── */}
          <div className="relative h-[220px] shrink-0 w-full overflow-hidden bg-[#e9ebf2] dark:bg-[#12141a] flex flex-col justify-between p-4 border-b border-black/[0.04] dark:border-white/5">
            {/* Bronze Cornice crowning upper edge behind PFP stage */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
              <BronzeCorniceUpper size={120} />
            </div>

            {/* 3D Character thumbnail web view preview matching QBlock search */}
            <div className="w-full h-full absolute inset-0 bg-[#eef2f6] dark:bg-[#12141a] z-10 flex items-center justify-center overflow-hidden">
              <iframe
                src={getAvatarViewerUrl({
                  username: user.username || user.n,
                  customId: user.customId,
                  characterId: user.avatarSnapshot?.selectedCharacter,
                  gender: user.avatarSnapshot?.gender,
                  isIra: isIraUser(user),
                  isStr: isStrUser(user),
                  isH3: isH3User(user),
                  shirt: user.avatarSnapshot?.shopEquipped?.shirt,
                  pants: user.avatarSnapshot?.shopEquipped?.pants,
                })}
                className="w-full h-full border-0 absolute inset-0 bg-transparent"
                style={{ border: "none" }}
                loading="lazy"
                allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope"
                title={`${name} 3D Avatar`}
              />
            </div>

            <AvatarFrameOverlay
              frame={user.frame ?? user.avatarSnapshot?.frameId}
              className="inset-x-8 inset-y-3 pointer-events-none"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-16 bg-gradient-to-t from-[#f4f5f8]/80 dark:from-[#0c0d11]/80 to-transparent" />

            {/* Top Bar Navigation */}
            <div className="relative z-10 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="press flex items-center gap-1.5 px-3 py-1.5 rounded-[12px] bg-white/95 dark:bg-[#1a1c24]/95 text-slate-800 dark:text-white border border-black/10 dark:border-white/10 shadow-sm cursor-pointer font-bold text-[13px]"
                aria-label="Go Back"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Go Back</span>
              </button>

              {!isOwnProfile && (
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="press grid h-9 w-9 place-items-center rounded-[12px] bg-white/90 dark:bg-[#1a1c24] text-slate-700 dark:text-white border border-black/10 dark:border-white/10 shadow-none cursor-pointer"
                  aria-label="Options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── 50% FLATTER WHITE & GREY PROFILE SHEET CONTAINER ── */}
          <div className="relative z-20 flex-1 flex flex-col bg-white dark:bg-[#14151b] overflow-hidden border-t border-black/[0.06] dark:border-white/10">
            {/* Profile Header Row (Squircle PFP, Name, ID) */}
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-2">
                {/* Squircle PFP part with user/our pfp */}
                <div className="relative h-13 w-13 shrink-0 flex items-center justify-center overflow-visible">
                  <div className="h-13 w-13 rounded-[16px] overflow-hidden border-2 border-black/10 dark:border-white/10 shadow-sm bg-gradient-to-br from-orange-500/10 via-amber-400/20 to-orange-600/10 flex items-center justify-center">
                    {user.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#fa4616] to-[#ff9800] text-white font-black text-lg [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <AvatarFrameOverlay
                    frame={user.frame ?? user.avatarSnapshot?.frameId}
                    className="scale-[1.22]"
                  />
                </div>

                {/* User Info */}
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <UserNameWithBadges
                      user={user}
                      name={name}
                      badgeSize={20}
                      className="text-[20px] font-extrabold tracking-tight"
                      defaultColorClass="text-[#1A1D20] dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded-[8px] bg-black/5 dark:bg-white/10 text-[#6B7280] dark:text-slate-400">
                      ID: {displayId}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#6B7280] dark:text-slate-400">
                      <span className={`h-2 w-2 rounded-full ${user.online ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {user.online ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ●●● Options Button */}
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="press h-10 w-10 shrink-0 grid place-items-center rounded-2xl bg-white/10 dark:bg-black/20 border border-black/5 dark:border-white/10"
                aria-label="Options"
              >
                <MoreHorizontal className="h-5 w-5 text-[#1A1D20] dark:text-white" />
              </button>
            </div>

            {/* Navigation Tabs (Info | Game Data) */}
            <div className="flex px-4 gap-2 border-b border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={`pb-3 text-[14px] font-bold ${activeTab === "personal" ? "text-[#fa4616] border-b-2 border-[#fa4616]" : "text-[#6B7280]"}`}
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("game")}
                className={`pb-3 text-[14px] font-bold ${activeTab === "game" ? "text-[#fa4616] border-b-2 border-[#fa4616]" : "text-[#6B7280]"}`}
              >
                Game Data
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 space-y-4">
              {activeTab === "personal" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white dark:bg-black/20 p-4 border border-black/5 dark:border-white/5">
                    <h3 className="text-[13px] font-bold text-[#6B7280] mb-2">Bio</h3>
                    <p className="text-[14px]">{user.bio || "No bio yet"}</p>
                  </div>
                </div>
              )}
              
              {activeTab === "game" && (
                <div className="space-y-4">
                  {/* React Bits FolderFloat Component named our name with floating game items */}
                  <div className="flex flex-col items-center justify-center pt-2 pb-1 overflow-visible">
                    <FolderFloat
                      items={[
                        "Cell 99",
                        "SkyBlock",
                        "Island Survival",
                        "Voxel Baseplate",
                      ]}
                      label={name || "Player"}
                      sublabel="Game Data"
                      trigger="click"
                      defaultOpen={true}
                      physics={true}
                      folderColor="#27272a"
                      frontColor="#fa4616"
                      labelColor="#ffffff"
                      itemColor="#ffffff"
                      itemTextColor="#18181b"
                      spread={150}
                      lift={22}
                      width={190}
                      height={135}
                    />
                    <span className="text-[11px] font-bold text-slate-400 mt-2 text-center">
                      Tap folder to toggle notes • drag & throw pills
                    </span>
                  </div>

                  {/* Connected Game Data Cards: Cell 99, SkyBlock */}
                  <div className="space-y-2.5">
                    {/* Cell 99 Card */}
                    <div className="rounded-[16px] p-3.5 border border-black/8 dark:border-white/10 bg-white dark:bg-[#1a1c24] flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-[12px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                          C99
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-[14px] text-[#1A1D20] dark:text-white truncate">
                            Cell 99
                          </div>
                          <div className="text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400">
                            Classic Building Canvas • Sandbox
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate({ to: "/game/$id" as never, params: { id: "baseplate" } as never });
                        }}
                        className="press px-3.5 py-1.5 rounded-[10px] bg-[#141414] dark:bg-white text-white dark:text-[#141414] font-extrabold text-[12px] shrink-0"
                      >
                        Play
                      </button>
                    </div>

                    {/* SkyBlock Card */}
                    <div className="rounded-[16px] p-3.5 border border-black/8 dark:border-white/10 bg-white dark:bg-[#1a1c24] flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded-[12px] bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                          SB
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-[14px] text-[#1A1D20] dark:text-white truncate">
                            SkyBlock: New Horizon
                          </div>
                          <div className="text-[11.5px] font-medium text-amber-600 dark:text-amber-400">
                            Floating Island • Survival
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate({ to: "/game/$id" as never, params: { id: "skyblock" } as never });
                        }}
                        className="press px-3.5 py-1.5 rounded-[10px] bg-[#fa4616] text-white font-extrabold text-[12px] shrink-0 shadow-sm"
                      >
                        Play
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Action Button with Orange Accents */}
            <div className="p-3.5 bg-white dark:bg-[#14151b] border-t border-black/5 dark:border-white/10 space-y-2">
              {!isOwnProfile ? (
                <>
                  <div className="flex items-center gap-2">
                    {friendStatus === "friends" ? (
                      <button
                        type="button"
                        onClick={handleUnfriend}
                        disabled={addingFriend}
                        className="qb-squircle press relative h-10 px-4 shrink-0 flex items-center justify-center font-extrabold text-[12.5px] text-[#e11d48] active:scale-95 transition-transform select-none cursor-pointer disabled:opacity-50"
                      >
                        {addingFriend ? "Removing…" : "Unfriend"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAddFriend}
                        disabled={
                          friendStatus === "sent" ||
                          addingFriend ||
                          Boolean(friendError)
                        }
                        className="qb-squircle press relative h-10 px-4 flex-1 flex items-center justify-center font-extrabold text-[12.5px] text-[#17191d] dark:text-white active:scale-95 transition-transform select-none cursor-pointer disabled:opacity-50"
                      >
                        {addingFriend
                          ? "Sending…"
                          : friendStatus === "received"
                            ? "Accept request"
                            : friendStatus === "sent"
                              ? "Requested"
                              : "Add friend"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleMessageClick}
                      className="qb-squircle press relative h-10 px-4 flex-1 flex items-center justify-center font-extrabold text-[12.5px] text-[#17191d] dark:text-white active:scale-95 transition-transform select-none cursor-pointer"
                      title="Open conversation"
                    >
                      Message
                    </button>
                  </div>
                  {(friendError || profileError) && (
                    <p
                      role="alert"
                      className="mt-1 text-center text-[11px] font-bold text-rose-600"
                    >
                      {friendError || profileError}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <ShinyButton
                    type="button"
                    variant="orange"
                    onClick={() => {
                      onClose();
                      navigate({ to: "/profile" as never });
                    }}
                    className="h-11 w-full text-[13.5px]"
                  >
                    <ProfileIcon className="h-4 w-4" filled />
                    <span>Edit Profile</span>
                  </ShinyButton>
                </div>
              )}
              <ShinyButton
                type="button"
                variant="glass"
                onClick={onClose}
                className="h-11 w-full text-[13.5px] mt-1"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Go Back</span>
              </ShinyButton>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 animate-fade-in"
            onClick={() => setReportOpen(false)}
          />
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-t-[24px] bg-white dark:bg-[#181a20] p-5 animate-sheet-up shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-slate-800 dark:text-white">
                <AlertTriangle className="h-5 w-5 text-rose-500" strokeWidth={2.2} />
                Report {name}
              </h2>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="press grid h-8 w-8 place-items-center rounded-[8px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                aria-label="Close report"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {reportSent ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="mb-3 grid h-12 w-12 place-items-center rounded-[12px] bg-emerald-100 text-emerald-600">
                  <Check className="h-6 w-6" />
                </div>
                <div className="text-[15px] font-extrabold text-slate-800 dark:text-white">
                  Report submitted
                </div>
                <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  Thank you — our team will review this.
                </div>
              </div>
            ) : (
              <div className="pt-3">
                <p className="mb-3 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  Select a category for reporting this account:
                </p>
                <div className="space-y-1.5">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      type="button"
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`press flex w-full items-center justify-between rounded-[10px] px-3.5 py-2.5 text-left text-[12.5px] font-bold ${
                        selectedReason === reason
                          ? "border-2 border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                          : "border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span>{reason}</span>
                      {selectedReason === reason && <span className="text-rose-600">✓</span>}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={!selectedReason}
                  className={`press mt-4 h-11 w-full rounded-[12px] text-[13px] font-extrabold transition ${
                    selectedReason
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "bg-slate-200 dark:bg-white/10 text-slate-400"
                  }`}
                >
                  Submit Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
