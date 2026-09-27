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
import { GlbAvatar } from "./GlbAvatar";
import {
  normalizeAvatarFrameId,
  normalizeAvatarSnapshot,
  type AvatarSnapshot,
  type AvatarFrameId,
  CHARACTER_1_GLTF,
  CHARACTER_2_GLTF,
} from "@/lib/avatar";
import { badgeUrlsFor, getUserBadges, UserNameWithBadges } from "@/lib/user-style";
import { setNavHidden } from "@/lib/ui-bus";
import { useAuth } from "@/lib/auth-context";
import {
  acceptFriendRequest,
  getFriendship,
  sendFriendRequest,
  type FriendStatus,
} from "@/lib/friends-utils";
import { db } from "@/lib/firebase";
import { doc, getDocFromServer, onSnapshot, updateDoc, increment } from "firebase/firestore";
import { getRecentlyPlayedGameIds } from "@/lib/games-cache";
import baseplateIcon from "@/assets/game-baseplate.jpg";
import { useNavigate } from "@tanstack/react-router";
import { ClapIcon } from "@/components/QbIcons";

import { QBlockProfileSettingsIcon } from "@/components/icons";
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
    (typeof user.username === "string" && user.username.toLowerCase() === "mammaettahiri") ||
    (typeof user.displayName === "string" && user.displayName.toLowerCase() === "mammaettahiri")
  )
    return "IRA";
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
              staff: data.staff ?? prev?.staff,
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
    <div className="fixed inset-0 z-[100] flex justify-center bg-black/40 backdrop-blur-xs">
      <motion.section
        initial={{ y: "100%", opacity: 0.8, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
        aria-label={`${name} profile`}
        className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-[#f4f5f8] dark:bg-[#0c0d11]"
      >
        <div className="flex-1 w-full overflow-y-auto ios-scroll hide-scrollbar flex flex-col relative">
          {/* ── 3D AVATAR STAGE BACKGROUND (FULL CONTAINER PREVIEW) ── */}
          <div className="relative h-[220px] shrink-0 w-full overflow-hidden bg-[#e9ebf2] dark:bg-[#12141a] flex flex-col justify-between p-4 border-b border-black/[0.04] dark:border-white/5">
            {/* Live 3D character on the stage covering full space */}
            <iframe
              src={
                user.email === "mammaettahiri@gmail.com"
                  ? "https://maxwell.z3ki.dev/bot/avatar-id4-breathe-preview/"
                  : "https://maxwell.z3ki.dev/bot/avatar-boy-preview/"
              }
              title="3D Avatar"
              className="w-full h-full border-0 absolute inset-0 bg-transparent z-0"
              style={{ pointerEvents: "auto", border: "none", width: "100%", height: "100%" }}
              allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            />

            <AvatarFrameOverlay
              frame={user.frame ?? user.avatarSnapshot?.frameId}
              className="inset-x-8 inset-y-3"
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
            {/* Profile Header Row (PFP, Name, ID - NO LIKES) */}
            <div className="p-4 pb-3 flex items-center gap-3 border-b border-black/[0.04] dark:border-white/5">
              {/* PFP container with 3D avatar iframe */}
              <div className="relative shrink-0 h-[52px] w-[52px] rounded-[14px] overflow-hidden border border-black/10 dark:border-white/10 bg-[#e9ebf2] dark:bg-[#12141a]">
                <iframe
                  src={
                    user.email === "mammaettahiri@gmail.com"
                      ? "https://maxwell.z3ki.dev/bot/avatar-id4-breathe-preview/"
                      : "https://maxwell.z3ki.dev/bot/avatar-boy-preview/"
                  }
                  title="PFP Avatar"
                  className="w-full h-full border-0 absolute inset-0 bg-transparent pointer-events-none"
                  style={{ border: "none" }}
                />
              </div>

              {/* Name and ID */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <UserNameWithBadges
                    user={user}
                    name={name}
                    badgeSize={18}
                    className="truncate text-[17px] font-extrabold tracking-tight"
                    defaultColorClass="text-[#1c1e24] dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[6px] bg-slate-100 dark:bg-white/5 text-[#73788c] dark:text-slate-400 select-text cursor-text">
                    ID: {displayId}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        user.online ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {user.online ? "Online" : "Offline"}
                  </span>
                </div>
              </div>

              {/* Clap Button (Squircle Shaped) */}
              <button
                type="button"
                onClick={async () => {
                  if (!user || !user.id) return;
                  try {
                    await updateDoc(doc(db, "users", user.id), {
                      claps: increment(1),
                    });
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="qb-squircle press shrink-0 flex flex-col items-center justify-center bg-slate-100/90 dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/10 rounded-[16px] h-[52px] min-w-[52px] px-3 hover:bg-orange-500/10 hover:border-[#fa4616]/40 hover:text-[#fa4616] text-[#141414] dark:text-white transition-all shadow-xs"
                title="Clap"
              >
                <ClapIcon className="h-5 w-5 mb-0.5 text-[#fa4616]" />
                <span className="text-[11.5px] font-black">{user.claps || 0}</span>
              </button>
            </div>

            {/* Navigation Tabs (Personal Information | Game Data) with Orange Accents */}
            <div className="flex items-center border-b border-black/[0.05] dark:border-white/5 bg-slate-50/50 dark:bg-[#111218] px-3">
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className={`flex-1 py-2.5 text-center text-[13.5px] font-bold transition-all relative ${
                  activeTab === "personal"
                    ? "text-[#fa4616] font-extrabold"
                    : "text-[#73788c] dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                Personal Information
                {activeTab === "personal" && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-full bg-[#fa4616]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("game")}
                className={`flex-1 py-2.5 text-center text-[13.5px] font-bold transition-all relative ${
                  activeTab === "game"
                    ? "text-[#fa4616] font-extrabold"
                    : "text-[#73788c] dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                Game Data
                {activeTab === "game" && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2.5px] w-10 rounded-full bg-[#fa4616]" />
                )}
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 p-3.5 space-y-3 bg-[#f8f9fa] dark:bg-[#0c0d12]">
              {activeTab === "personal" && (
                <div className="space-y-2.5 animate-fade-in">
                  {/* Titles */}
                  <div className="rounded-[14px] bg-white dark:bg-[#16171e] p-3.5 border border-black/5 dark:border-white/5 shadow-none flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                      Titles:
                    </span>
                    <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                      None
                    </span>
                  </div>

                  {/* Bio Card */}
                  <div className="rounded-[14px] bg-white dark:bg-[#16171e] p-3.5 border border-black/5 dark:border-white/5 shadow-none">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span>Bio</span>
                    </div>
                    <p className="text-[12.5px] font-medium text-[#73788c] dark:text-slate-400 leading-relaxed">
                      {user.bio && user.bio.trim().length > 0 ? user.bio.trim() : "None"}
                    </p>
                  </div>

                  {/* Account Details */}
                  <div className="rounded-[14px] bg-white dark:bg-[#16171e] p-3.5 border border-black/5 dark:border-white/5 shadow-none space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Username
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        @{user.username || name.toLowerCase().replace(/\s+/g, "")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] pt-2 border-t border-black/5 dark:border-white/5">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Status
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            user.online ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {user.online ? "Online in Game" : "Offline"}
                      </span>
                    </div>
                  </div>

                  {userBadges.length > 0 && (
                    <div className="rounded-[14px] bg-white dark:bg-[#16171e] p-3.5 border border-black/5 dark:border-white/5 shadow-none">
                      <div className="flex flex-wrap gap-1.5">
                        {userBadges.map((badge) => (
                          <span
                            key={badge.id}
                            className="inline-flex items-center gap-1.5 rounded-[8px] bg-slate-100 dark:bg-white/5 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-black/5 dark:border-white/5"
                          >
                            <img
                              src={badge.iconUrl}
                              alt={badge.name}
                              className="h-3.5 w-3.5 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            {badge.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "game" && (
                <div className="space-y-2.5 animate-fade-in">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#73788c] dark:text-slate-400 px-1">
                    Player Game Data
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        id: "skyblock",
                        title: "Skyblock",
                        mode: "Island Survival",
                        time: "0.0h",
                        icon: "https://maxwell.z3ki.dev/bot/_files/qblock-phoenix-island/file_000000001170820a9af3a6c47a27b006.jpg",
                      },
                      {
                        id: "blockfall",
                        title: "Block Fall",
                        mode: "Hexagon Tumble",
                        time: "0.0h",
                        icon: "/assets/hud/v2/run_asset.png",
                      },
                      {
                        id: "bedwars",
                        title: "BedWars",
                        mode: "Floating Arena",
                        time: "0.0h",
                        icon: "/assets/controls/icon_fire.png",
                      },
                    ].map((g) => (
                      <div
                        key={g.id}
                        className="rounded-[14px] bg-white dark:bg-[#16171e] p-3 border border-black/5 dark:border-white/5 shadow-none flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-[10px] overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 grid place-items-center border border-black/5 dark:border-white/5">
                            <img
                              src={g.icon}
                              alt={g.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                            <Gamepad2 className="h-5 w-5 text-[#fa4616] hidden" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[14px] font-lilita text-[#1c1e24] dark:text-white truncate tracking-wide">
                              {g.title}
                            </h4>
                            <p className="text-[11px] font-semibold text-[#73788c] dark:text-slate-400 truncate mt-0.5">
                              {g.mode}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-[8px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-[11px] font-mono font-bold shrink-0">
                          {g.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Action Button with Orange Accents */}
            <div className="p-3.5 bg-white dark:bg-[#14151b] border-t border-black/5 dark:border-white/10 space-y-2">
              {!isOwnProfile ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddFriend}
                      disabled={
                        friendStatus === "friends" ||
                        friendStatus === "sent" ||
                        addingFriend ||
                        Boolean(friendError)
                      }
                      className="press flex-1 py-3 rounded-[13px] bg-[#141414] hover:bg-[#252525] dark:bg-[#22242c] dark:hover:bg-[#2c2f38] text-white font-medium text-[12.5px] flex items-center justify-center shadow-none active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    >
                      {addingFriend
                        ? "Sending…"
                        : friendStatus === "friends"
                          ? "Friends"
                          : friendStatus === "received"
                            ? "Accept request"
                            : friendStatus === "sent"
                              ? "Requested"
                              : "Add friend"}
                    </button>
                    {onChat && (
                      <button
                        type="button"
                        onClick={onChat}
                        disabled={friendStatus !== "friends" || Boolean(friendError)}
                        title={
                          friendStatus === "friends"
                            ? "Open conversation"
                            : "Accept the friend request before messaging"
                        }
                        className={`press flex-1 py-3 rounded-[13px] font-extrabold text-[12.5px] flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-none ${
                          friendStatus === "friends"
                            ? "bg-[#141414] dark:bg-[#22242c] text-white"
                            : "cursor-not-allowed bg-[#eef0f3] dark:bg-white/5 text-[#9aa1ab]"
                        }`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        {friendStatus === "friends" ? "Message" : "Message locked"}
                      </button>
                    )}
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
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate({ to: "/profile" as never });
                    }}
                    className="press w-full py-3 rounded-[13px] bg-[#141414] hover:bg-[#252525] dark:bg-[#22242c] dark:hover:bg-[#2c2f38] text-white font-extrabold text-[13px] flex items-center justify-center gap-2 shadow-none active:scale-[0.98] cursor-pointer"
                  >
                    <QBlockProfileSettingsIcon className="h-4 w-4" filled />
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="press w-full py-2.5 rounded-[13px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Go Back</span>
                  </button>
                </div>
              )}
              {!isOwnProfile && (
                <button
                  type="button"
                  onClick={onClose}
                  className="press w-full py-2.5 rounded-[13px] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer mt-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Go Back</span>
                </button>
              )}
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
