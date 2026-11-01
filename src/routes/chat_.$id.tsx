import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import {
  ChevronLeft,
  Send,
  MoreHorizontal,
  X,
  BadgeCheck,
  Lock,
  ImagePlus,
  Check,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  setDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocFromServer,
  increment,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { ensureChatMeta, getFriendship, userDisplayName, friendshipId } from "@/lib/friends-utils";
import { recordChatSent } from "@/lib/daily-events";

import { GlossyAvatar } from "@/components/GlossyAvatar";
import { ProfileSheet } from "@/components/ProfileSheet";
import { normalizeAvatarSnapshot, type AvatarSnapshot } from "@/lib/avatar";
import { UserNameWithBadges } from "@/lib/user-style";
import { TextureButton } from "@/components/ui/texture-button";
import { Watcher } from "@/components/Watcher";
import { AgentWorkflow, ThinkingState, type AgentPhase } from "@/components/ui/ai-agent-response";

import { HtmlSpinner } from "@/components/ui/HtmlLoadingScreen";

export const Route = createFileRoute("/chat_/$id")({
  head: () => ({ meta: [{ title: "Chat — QBlock" }] }),
  component: ChatRoom,
});

// ── Unified Emojis Pack (Discord + WeChat combined) ─────────────────────────
type EmojiPack = { id: string; label: string; emojis: { name: string; path: string }[] };

const EMOJI_PACKS: EmojiPack[] = [
  {
    id: "emojis",
    label: "Emojis",
    emojis: [
      { name: "wechat-clap", path: "/emojis/wechat/342085-wechat-clap.png" },
      { name: "wechat-silent", path: "/emojis/wechat/121502-wechat-silent.png" },
      { name: "wechat-smile", path: "/emojis/wechat/342085-wechat-smile.png" },
      { name: "wechat-shocked", path: "/emojis/wechat/816297-wechat-shocked.png" },
      { name: "wechat-sob", path: "/emojis/wechat/239087-wechat-sob.png" },
      { name: "wechat-whimper", path: "/emojis/wechat/275780-wechat-whimper.png" },
      { name: "wechat-sly", path: "/emojis/wechat/16662-wechatsly.png" },
      { name: "uwu", path: "/emojis/face/uwu.png" },
      { name: "weep", path: "/emojis/face/weep.png" },
      { name: "yawn", path: "/emojis/face/yawn.png" },
      { name: "smug", path: "/emojis/face/smug.png" },
      { name: "pout", path: "/emojis/face/pout.png" },
      { name: "nervous", path: "/emojis/face/nervous.png" },
      { name: "drunk", path: "/emojis/face/drunk.png" },
      { name: "zombie", path: "/emojis/face/zombie.png" },
      { name: "wtf", path: "/emojis/face/wtf.png" },
      { name: "pwease", path: "/emojis/face/pwease.png" },
      { name: "squee", path: "/emojis/face/squee.png" },
      { name: "maniacal", path: "/emojis/face/maniacal.png" },
      { name: "kirakira", path: "/emojis/face/kirakira.png" },
    ],
  },
];

const EMOJI_MAP: Record<string, string> = {};
EMOJI_PACKS.forEach((p) =>
  p.emojis.forEach((e) => {
    EMOJI_MAP[`${p.id}:${e.name}`] = e.path;
    EMOJI_MAP[`wechat:${e.name}`] = e.path;
    EMOJI_MAP[`face:${e.name}`] = e.path;
    EMOJI_MAP[`qblock:${e.name}`] = e.path;
  }),
);

/** Search GIFs using provided Giphy API key */
async function searchGifs(query: string, limit = 14) {
  const apiKey = "sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh";
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
    query,
  )}&limit=${limit}&rating=g`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const json = await res.json();
    return (json.data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      url: item.images.original.url,
      preview: item.images.fixed_height_small.url,
      mp4: item.images.original.mp4,
    }));
  } catch (err) {
    console.error("Failed to fetch GIFs:", err);
    return [];
  }
}

function GifPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("trending");
  const [gifs, setGifs] = useState<
    Array<{ id: string; title: string; url: string; preview: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchGifs(query || "trending", 14).then((res) => {
        if (!cancelled) {
          setGifs(res);
          setLoading(false);
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/55 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-[420px] rounded-t-[28px] bg-white border border-white shadow-[0_-18px_60px_rgba(15,23,42,0.28)] overflow-hidden flex flex-col max-h-[88vh] animate-slide-up">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <h3 className="text-[16px] font-bold text-slate-900 tracking-tight">GIF Library</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs (e.g. dance, gg, laugh)..."
            className="w-full h-10 px-3.5 rounded-xl bg-slate-100 text-slate-900 placeholder-slate-400 text-[13px] outline-none border border-slate-200 focus:border-amber-400/60 transition-colors"
            autoFocus
          />
        </div>

        {/* Quick Tag Pills */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto hide-scrollbar border-b border-slate-200 bg-slate-50">
          {["Trending", "GG", "Dance", "Laugh", "Bye", "Hyped", "Victory", "Flex"].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag.toLowerCase())}
              className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                query.toLowerCase() === tag.toLowerCase()
                  ? "bg-amber-500 text-black"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* GIF Grid */}
        <div className="p-3 flex-1 overflow-y-auto ios-scroll hide-scrollbar min-h-[220px]">
          {loading ? (
            <div className="h-48 grid place-items-center">
              <HtmlSpinner size={24} />
            </div>
          ) : gifs.length === 0 ? (
            <div className="h-48 grid place-items-center text-center p-4 text-slate-500 text-[13px]">
              No GIFs found. Try searching something else!
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onSelect(g.url);
                    onClose();
                  }}
                  className="group relative rounded-xl overflow-hidden bg-white aspect-video border border-slate-200 hover:border-amber-400 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-[0_3px_10px_rgba(15,23,42,0.12)]"
                >
                  <img
                    src={g.url}
                    alt={g.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-transparent opacity-90" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Parse text with [emoji:pack:name] tokens
type Part = { type: "text"; v: string } | { type: "emoji"; key: string; url: string };
function parseMsg(text: string): Part[] {
  const parts: Part[] = [];
  const re = /\[emoji:([^\]]+)\]/g;
  let last = 0,
    m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", v: text.slice(last, m.index) });
    const url = EMOJI_MAP[m[1]];
    if (url) parts.push({ type: "emoji", key: m[1], url });
    else parts.push({ type: "text", v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", v: text.slice(last) });
  return parts;
}

function MsgText({ text }: { text: string }) {
  return (
    <>
      {parseMsg(text).map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.v}</span>
        ) : (
          <img
            key={i}
            src={p.url}
            alt=""
            className="inline-block align-middle"
            style={{ width: 22, height: 22, objectFit: "contain" }}
          />
        ),
      )}
    </>
  );
}

function Avatar({
  name,
  size = 28,
  snapshot,
  isIra,
  photoUrl,
}: {
  name: string;
  size?: number;
  snapshot?: AvatarSnapshot;
  isIra?: boolean;
  photoUrl?: string;
}) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-[24%] bg-white dark:bg-[#1a1d24]"
      style={{ width: size, height: size }}
    >
      <GlossyAvatar
        snapshot={snapshot}
        frame={snapshot?.frameId}
        height={size}
        className="h-full w-full rounded-[24%]"
        autoRotate={false}
        focusZone="head"
        photoUrl={photoUrl}
        portrait={isIra}
      />
    </div>
  );
}

// ── Chat Room ─────────────────────────────────────────────────────────────────
type Msg = {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp?: unknown;
  special?: string;
  islandId?: string;
  islandOwner?: string;
  imageUrl?: string;
  phases?: AgentPhase[];
  isThinking?: boolean;
};

type OtherUser = {
  uid: string;
  profilePhoto?: string;
  displayName: string;
  online: boolean;
  avatarSnapshot?: AvatarSnapshot;
  username?: string;
  customId?: string;
  bio?: string;
  friendCount?: number;
  createdAt?: unknown;
  email?: string;
  staff?: boolean;
  badgeEquipped?: boolean;
};

function legacyOtherUid(chatId: string | undefined, myUid: string | null): string | null {
  if (!chatId || typeof chatId !== "string" || !myUid || typeof myUid !== "string") return null;
  // Old chat IDs use "uid1_uid2". Checking the whole prefix/suffix is safe
  // even when a Firebase UID itself contains underscores.
  if (chatId.startsWith(`${myUid}_`)) return chatId.slice(myUid.length + 1) || null;
  if (chatId.endsWith(`_${myUid}`)) return chatId.slice(0, -(myUid.length + 1)) || null;
  return null;
}

function ChatRoom() {
  const { id: chatId } = Route.useParams();
  const { qbUser, firebaseUser, loading: authLoading } = useAuth();
  const myUid = qbUser?.uid ?? firebaseUser?.uid ?? null;

  // Resolve initial active chatId and recipient
  const initialOtherUid =
    myUid && chatId
      ? legacyOtherUid(chatId, myUid) || (!chatId.includes("_") ? chatId : null)
      : null;
  const initialActiveChatId =
    myUid && initialOtherUid ? friendshipId(myUid, initialOtherUid) : chatId || "";

  const [activeChatId, setActiveChatId] = useState<string>(initialActiveChatId);
  const [recipientUid, setRecipientUid] = useState<string | null>(initialOtherUid);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [val, setVal] = useState("");
  const [sendState, setSendState] = useState<"idle" | "sent">("idle");
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState(0);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(() => {
    if (initialOtherUid) {
      return {
        uid: initialOtherUid,
        displayName: userDisplayName(undefined, initialOtherUid),
        online: false,
      };
    }
    return null;
  });

  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string; text: string } | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState<"self" | "other" | "support">("other");
  const [sendError, setSendError] = useState("");
  const [chatHype, setChatHype] = useState(0);
  const [boostingHype, setBoostingHype] = useState(false);
  const [access, setAccess] = useState<"allowed" | "checking" | "blocked">("allowed");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastBackspace = useRef<number>(0);

  // Sync typing indicator
  useEffect(() => {
    if (!activeChatId || !recipientUid || activeChatId === "support") return;
    const unsub = onSnapshot(doc(db, "chatMeta", activeChatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const typingMap = data.typing || {};
        const lastTypedAt = typingMap[recipientUid];
        if (typeof lastTypedAt === "number" && Date.now() - lastTypedAt < 3500) {
          setIsOtherTyping(true);
        } else {
          setIsOtherTyping(false);
        }
      }
    });
    return unsub;
  }, [activeChatId, recipientUid]);

  // Update own typing indicator
  useEffect(() => {
    if (!activeChatId || !qbUser?.uid || activeChatId === "support") return;
    if (val.trim()) {
      updateDoc(doc(db, "chatMeta", activeChatId), {
        [`typing.${qbUser.uid}`]: Date.now(),
      }).catch(() => {});
    }
  }, [val, activeChatId, qbUser?.uid]);

  // Resolve recipient metadata
  useEffect(() => {
    let cancelled = false;

    if (!myUid && !authLoading) {
      setAccess("blocked");
      return;
    }

    if (!myUid) return;

    async function resolveRecipient() {
      const currentUid = myUid;
      if (!currentUid) return;

      if (chatId === "support" || chatId === "official-support") {
        setAccess("allowed");
        const supportUser = {
          uid: "support-ai",
          displayName: "Official Support",
          username: "OfficialSupport",
          online: true,
          staff: true,
          badgeEquipped: true,
          bio: "Official QBLOCK AI Support Assistant",
        };
        setOtherUser(supportUser);
        setActiveChatId("support");
        setRecipientUid("support-ai");
        return;
      }

      if (chatId && chatId.startsWith("demo-")) {
        setAccess("allowed");
        const isH3 = chatId === "demo-h3";
        const demoUser = isH3
          ? {
              uid: "h3-uid",
              displayName: "h3",
              username: "h3",
              online: true,
              staff: true,
              badgeEquipped: true,
              bio: "Developer & Bedwars Champion",
            }
          : {
              uid: `${chatId}-uid`,
              displayName: chatId.replace("demo-", "").toUpperCase(),
              username: chatId.replace("demo-", ""),
              online: true,
            };
        setOtherUser(demoUser);
        setActiveChatId(chatId);
        setRecipientUid(demoUser.uid);
        setAccess("allowed");
        if (isH3) {
          setMsgs([
            {
              id: "h3-intro",
              senderId: "h3-uid",
              senderName: "h3",
              text: "protect your bed, collect resources, and be the last team standing! Bedwars brings classic bedwars with a fresh, modern twist.",
              imageUrl: "/assets/games/bedwars.png",
            },
            {
              id: "h3-me",
              senderId: currentUid,
              senderName: "You",
              text: "bro this is so cool",
            },
          ]);
        }
        return;
      }

      let otherUid = legacyOtherUid(chatId, currentUid);
      if (!otherUid && chatId && !chatId.includes("_") && chatId !== currentUid) {
        otherUid = chatId;
      }

      if (otherUid && otherUid !== currentUid) {
        const canonicalId = friendshipId(currentUid, otherUid);
        setActiveChatId(canonicalId);
        setRecipientUid(otherUid);
      }

      setAccess("allowed");

      try {
        const friendship = await getFriendship(currentUid, otherUid || "");
        setAccess("allowed");

        const metaSnap = await getDocFromServer(
          doc(db, "chatMeta", friendshipId(currentUid, otherUid)),
        );
        if (metaSnap.exists() && !cancelled) {
          const meta = metaSnap.data() as DocumentData;
          const members = Array.isArray(meta.members)
            ? meta.members.filter((m): m is string => typeof m === "string")
            : [];
          const foundOther = members.find((m) => m !== currentUid);
          if (foundOther) {
            otherUid = foundOther;
            const canonicalId = friendshipId(currentUid, otherUid);
            setActiveChatId(canonicalId);
            setRecipientUid(otherUid);

            // The chat metadata is deliberately denormalized. It lets an
            // existing conversation render a real name/avatar while the user
            // document is unavailable or briefly offline.
            const memberProfile = meta.memberProfiles?.[foundOther] as DocumentData | undefined;
            if (memberProfile && !cancelled) {
              setOtherUser((current) => ({
                uid: foundOther,
                displayName: userDisplayName(memberProfile, foundOther),
                online: current?.online ?? false,
                avatarSnapshot: normalizeAvatarSnapshot(memberProfile) as
                  AvatarSnapshot | undefined,
                profilePhoto:
                  typeof memberProfile.profilePhoto === "string"
                    ? memberProfile.profilePhoto
                    : undefined,
                username:
                  typeof memberProfile.username === "string" ? memberProfile.username : undefined,
                bio: typeof memberProfile.bio === "string" ? memberProfile.bio : undefined,
                email: typeof memberProfile.email === "string" ? memberProfile.email : undefined,
                staff: memberProfile.staff === true,
                badgeEquipped: memberProfile.badgeEquipped === true,
              }));
            }
          }
        }
      } catch (error) {
        setAccess("blocked");
        setSendError("This conversation could not be verified.");
        console.error("Could not verify chat access:", error);
      }

      if (!otherUid || otherUid === currentUid) return;

      try {
        const userSnap = await getDocFromServer(doc(db, "users", otherUid));
        if (cancelled) return;
        if (userSnap.exists()) {
          const profile = userSnap.data() as DocumentData;
          setOtherUser({
            uid: otherUid,
            displayName: userDisplayName(profile, otherUid),
            online: profile?.online === true,
            avatarSnapshot: normalizeAvatarSnapshot(profile) as AvatarSnapshot | undefined,
            profilePhoto:
              typeof profile?.profilePhoto === "string" ? profile.profilePhoto : undefined,
            username: typeof profile?.username === "string" ? profile.username : undefined,
            customId: typeof profile?.customId === "string" ? profile.customId : undefined,
            bio: typeof profile?.bio === "string" ? profile.bio : undefined,
            email: typeof profile?.email === "string" ? profile.email : undefined,
            staff: profile?.staff === true,
            badgeEquipped: profile?.badgeEquipped === true,
            friendCount: typeof profile?.friendCount === "number" ? profile.friendCount : undefined,
            createdAt: profile?.createdAt,
          });
        }
      } catch {}
    }

    void resolveRecipient();

    return () => {
      cancelled = true;
    };
  }, [chatId, myUid, authLoading]);

  // Realtime messages via onSnapshot
  useEffect(() => {
    if (!myUid || !activeChatId) return;
    if (activeChatId === "support") {
      try {
        const saved = localStorage.getItem("qblock_support_msgs");
        if (saved) {
          setMsgs(JSON.parse(saved));
        } else {
          const initialMsgs: Msg[] = [
            {
              id: "support-welcome",
              senderId: "support-ai",
              senderName: "Official Support",
              text: "Hey there! I'm QBLOCK Official Support. I can help you with Skyblock progression, island building, rare ores, controls, avatar customization, shop items, events, and platform rules. What can I help you with today?",
              phases: [
                {
                  trace: [
                    {
                      type: "reasoning",
                      sentences: [
                        "Initializing QBLOCK Official Support agent v2.4...",
                        "Indexed Skyblock guides, mining rules, and platform features.",
                        "Ready to assist players with platform questions and mechanics.",
                      ],
                      durationSeconds: 1.2,
                    },
                    {
                      type: "tool",
                      primary: "Agent Online",
                      secondary: "qblock/support-cluster",
                    },
                  ],
                  message:
                    "Hey there! I'm QBLOCK Official Support. I can help you with Skyblock progression, island building, rare ores, controls, avatar customization, shop items, events, and platform rules. What can I help you with today?",
                },
              ],
            },
          ];
          setMsgs(initialMsgs);
          localStorage.setItem("qblock_support_msgs", JSON.stringify(initialMsgs));
        }
      } catch {
        // fallback
      }
      return;
    }
    const q = query(
      collection(db, "chats", activeChatId, "messages"),
      orderBy("timestamp", "asc"),
      limit(200),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Msg[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Msg, "id">),
        }));
        setMsgs(list);
        setSendError("");
      },
      (err) => {
        setSendError("Live chat is temporarily unavailable. Please try again.");
        console.error("Message listener failed:", err);
      },
    );
    return unsub;
  }, [activeChatId, myUid]);

  // Sync chat hype
  useEffect(() => {
    if (!activeChatId) return;
    const unsub = onSnapshot(doc(db, "chatMeta", activeChatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.hype === "number") {
          setChatHype(data.hype);
        }
      }
    });
    return unsub;
  }, [activeChatId]);

  async function boostChatHype() {
    if (boostingHype) return;
    setBoostingHype(true);
    setChatHype((h) => h + 50);
    try {
      if (activeChatId) {
        await setDoc(
          doc(db, "chatMeta", activeChatId),
          { hype: increment(50) },
          { merge: true },
        );
      }
    } catch {
      // Local state already updated
    } finally {
      setTimeout(() => setBoostingHype(false), 300);
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "instant" });
  }, [msgs.length]);

  // Mark online presence
  useEffect(() => {
    if (!qbUser) return;
    const ref = doc(db, "users", qbUser.uid);
    updateDoc(ref, { online: true }).catch(() => {});
    return () => {
      updateDoc(ref, { online: false }).catch(() => {});
    };
  }, [qbUser]);

  async function send() {
    if (!val.trim() || !qbUser) return;
    const text = val.trim();
    const otherUid =
      recipientUid || (chatId.includes("_") ? legacyOtherUid(chatId, qbUser.uid) : chatId);
    if (!otherUid) return;

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }

    const targetCid = activeChatId || friendshipId(qbUser.uid, otherUid);
    setSendError("");

    if (activeChatId === "support") {
      const userMsg: Msg = {
        id: `user-${Date.now()}`,
        senderId: qbUser.uid,
        senderName: userDisplayName(qbUser, qbUser.uid),
        text,
      };
      const thinkingId = `ai-thinking-${Date.now()}`;
      const thinkingMsg: Msg = {
        id: thinkingId,
        senderId: "support-ai",
        senderName: "Official Support",
        text: "",
        isThinking: true,
      };

      const updated = [...msgs, userMsg, thinkingMsg];
      setMsgs(updated);
      setVal("");
      setSendState("sent");
      window.setTimeout(() => setSendState("idle"), 1200);

      try {
        const historyPayload = msgs.slice(-6).map((m) => ({
          role: m.senderId === qbUser.uid ? "user" : "model",
          content: m.text,
        }));
        const res = await fetch("/api/support-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, history: historyPayload }),
        });
        const data = await res.json();
        const phases: AgentPhase[] = [
          {
            trace: [
              {
                type: "reasoning",
                sentences: data.thinkingSteps || [
                  "Consulting QBLOCK knowledge repository for user question...",
                  "Evaluating gameplay constraints and platform rules...",
                ],
                durationSeconds: 2.5,
              },
              {
                type: "tool",
                primary: data.actionLabel || "Inspect game index",
                secondary: data.actionDetail || "qblock/knowledge-base",
              },
            ],
            message: data.message || "How can I help you in QBLOCK?",
          },
        ];

        setMsgs((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingId);
          const finalMsg: Msg = {
            id: `support-${Date.now()}`,
            senderId: "support-ai",
            senderName: "Official Support",
            text: data.message || "",
            phases,
          };
          const nextMsgs = [...filtered, finalMsg];
          try {
            localStorage.setItem("qblock_support_msgs", JSON.stringify(nextMsgs));
          } catch {}
          return nextMsgs;
        });
      } catch (err) {
        setMsgs((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingId);
          const errorMsg: Msg = {
            id: `support-${Date.now()}`,
            senderId: "support-ai",
            senderName: "Official Support",
            text: "I had a brief connection issue reaching the QBLOCK support cluster. Please ask again in a moment!",
          };
          return [...filtered, errorMsg];
        });
      }
      return;
    }

    if (chatId.startsWith("demo-")) {
      const newMsg: Msg = {
        id: `demo-${Date.now()}`,
        senderId: qbUser.uid,
        senderName: userDisplayName(qbUser, qbUser.uid),
        text,
      };
      setMsgs((prev) => [...prev, newMsg]);
      setVal("");
      setSendState("sent");
      window.setTimeout(() => setSendState("idle"), 1200);

      // Automated friendly response
      if (chatId === "demo-h3") {
        window.setTimeout(() => {
          const replies = [
            "let's squad up for Bedwars!",
            "I'm queuing right now, hop in!",
            "gg!",
            "check out the new custom weapons in shop!",
          ];
          const replyText = replies[Math.floor(Math.random() * replies.length)];
          setMsgs((prev) => [
            ...prev,
            {
              id: `h3-reply-${Date.now()}`,
              senderId: "h3-uid",
              senderName: "h3",
              text: replyText,
            },
          ]);
        }, 1100);
      }
      return;
    }

    try {
      const msgRef = collection(db, "chats", targetCid, "messages");
      await addDoc(msgRef, {
        senderId: qbUser.uid,
        senderName: userDisplayName(qbUser, qbUser.uid),
        text,
        replyTo: replyTo ? { id: replyTo.id, senderName: replyTo.senderName, text: replyTo.text } : null,
        timestamp: serverTimestamp(),
      });
      recordChatSent();

      const metaRef = doc(db, "chatMeta", targetCid);
      await setDoc(
        metaRef,
        {
          members: [qbUser.uid, otherUid],
          lastMessage: text,
          lastAt: serverTimestamp(),
        },
        { merge: true },
      );
      setVal("");
      setReplyTo(null);
      setSendState("sent");
      window.setTimeout(() => setSendState("idle"), 1200);
    } catch (err) {
      setSendError("Message could not be sent. Please try again.");
      console.error("Could not send chat message:", err);
    }
  }

  async function sendImage(file: File) {
    if (!qbUser || !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setSendError("Choose an image smaller than 8 MB.");
      return;
    }
    const otherUid =
      recipientUid || (chatId.includes("_") ? legacyOtherUid(chatId, qbUser.uid) : chatId);
    if (!otherUid) return;
    const targetCid = activeChatId || friendshipId(qbUser.uid, otherUid);
    setImageUploading(true);
    setSendError("");
    try {
      let imageUrl = "";
      try {
        const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").slice(-80) || "image";
        const imageRef = storageRef(
          storage,
          `chat-media/${targetCid}/${qbUser.uid}/${Date.now()}-${safeName}`,
        );
        await uploadBytes(imageRef, file, { contentType: file.type });
        imageUrl = await getDownloadURL(imageRef);
      } catch {
        // Fallback to inline Data URL if storage is restricted
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      await addDoc(collection(db, "chats", targetCid, "messages"), {
        senderId: qbUser.uid,
        senderName: userDisplayName(qbUser, qbUser.uid),
        text: "",
        imageUrl,
        timestamp: serverTimestamp(),
      });
      await setDoc(
        doc(db, "chatMeta", targetCid),
        {
          members: [qbUser.uid, otherUid],
          lastMessage: "Photo",
          lastAt: serverTimestamp(),
        },
        { merge: true },
      );
      recordChatSent();
      setSendState("sent");
      window.setTimeout(() => setSendState("idle"), 1200);
    } catch (err) {
      console.error("Could not send chat image:", err);
      // Ensure optimistic display so the user doesn't lose their photo
      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        setMsgs((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            senderId: qbUser.uid,
            senderName: userDisplayName(qbUser, qbUser.uid),
            text: "",
            imageUrl: dataUrl,
          },
        ]);
        setSendState("sent");
        window.setTimeout(() => setSendState("idle"), 1200);
      } catch {
        setSendError("Photo could not be processed. Please try again.");
      }
    } finally {
      setImageUploading(false);
    }
  }

  const headerName =
    otherUser?.displayName ?? (recipientUid ? userDisplayName(undefined, recipientUid) : "Chat");

  if (access === "checking") {
    return (
      <MobileShell hideNav>
        <div className="min-h-dvh grid place-items-center text-text-muted">
          <RefreshChatLoader />
        </div>
      </MobileShell>
    );
  }


  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      send();
    } else if (e.key === "Backspace") {
      const now = Date.now();
      if (now - lastBackspace.current < 120) {
        e.preventDefault();
      } else {
        lastBackspace.current = now;
      }
    }
  }

  return (
    <MobileShell hideNav>
      <div className="flex flex-col min-h-dvh bg-white">
        {/* Minimal Clean Header */}
        <header
          className="min-h-13 px-3 py-1 flex items-center justify-between sticky top-0 z-20 bg-white/95 dark:bg-[#121418]/95 backdrop-blur-md border-b border-black/[0.06] dark:border-white/[0.08]"
          style={{ paddingTop: "max(env(safe-area-inset-top), 6px)" }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              to={"/chat" as never}
              className="p-1.5 -ml-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            {activeChatId === "support" || chatId === "support" ? (
              <button
                type="button"
                onClick={() => {
                  setProfileTarget("support");
                  setProfileOpen(true);
                }}
                className="flex items-center gap-2 press py-0.5 text-left min-w-0 cursor-pointer"
              >
                <div className="w-8.5 h-8.5 rounded-[10px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Watcher shape="Cube" eyes="Slant" size={28} follow={35} bounce={18} />
                </div>
                <div className="min-w-0 flex flex-col items-start justify-center">
                  <span className="text-[13.5px] font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent truncate leading-tight">
                    Official Support
                  </span>
                  <span className="text-[9.5px] font-semibold text-emerald-500 leading-tight mt-0.5">
                    Active now
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setProfileTarget("other");
                  setProfileOpen(true);
                }}
                className="flex items-center gap-2 press cursor-pointer py-0.5 text-left min-w-0"
              >
                <Avatar
                  name={headerName}
                  size={34}
                  snapshot={otherUser?.avatarSnapshot}
                  isIra={otherUser?.username?.toLowerCase() === "ira"}
                  photoUrl={otherUser?.profilePhoto}
                />
                <div className="min-w-0 flex flex-col items-start justify-center">
                  <span className="text-[13.5px] font-bold text-[#141414] dark:text-white truncate max-w-[190px] leading-tight">
                    @{otherUser?.username || headerName}
                  </span>
                  {otherUser?.online && (
                    <span className="text-[9.5px] font-semibold text-emerald-500 leading-tight mt-0.5">
                      Active now
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeChatId === "support" || chatId === "support") {
                setProfileTarget("support");
              } else {
                setProfileTarget("other");
              }
              setProfileOpen(true);
            }}
            className="p-2 -mr-1 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 press cursor-pointer rounded-full"
            aria-label="View profile"
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto ios-scroll hide-scrollbar px-3 py-3 space-y-1.5 pb-[96px]"
        >
          {msgs.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 select-none">
              <p className="text-[12px] font-medium">
                No messages yet. Send a message to start chatting!
              </p>
            </div>
          )}
          {msgs.map((m, i) => {
            const isMe = m.senderId === qbUser?.uid;
            const messageName =
              m.senderName?.trim() ||
              (m.senderId === recipientUid
                ? headerName
                : userDisplayName(qbUser ?? undefined, qbUser?.uid ?? ""));
            const prev = msgs[i - 1];
            const grouped = prev?.senderId === m.senderId;
            const isIraSender =
              m.senderId === recipientUid
                ? otherUser?.username?.toLowerCase() === "ira"
                : qbUser?.username?.toLowerCase() === "ira";
            const isBot =
              !isMe &&
              (activeChatId === "support" ||
                m.senderId === "support-ai" ||
                m.senderId === "bot" ||
                m.senderId === "system");

            let timeStr = "10:45 AM";
            if (m.timestamp) {
              try {
                const d =
                  (m.timestamp as { toDate?: () => Date }).toDate?.() ??
                  new Date(m.timestamp as string | number);
                if (!isNaN(d.getTime())) {
                  timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                }
              } catch {}
            }

            if (isBot) {
              const botPhases: AgentPhase[] =
                m.phases && m.phases.length > 0
                  ? m.phases
                  : [
                      {
                        trace: [
                          {
                            type: "reasoning",
                            sentences: [
                              "Consulted QBLOCK knowledge repository for platform guidance.",
                              "Verified game rules, Skyblock progression, and player safety.",
                            ],
                            durationSeconds: 1.2,
                          },
                          {
                            type: "tool",
                            primary: "Inspect game index",
                            secondary: "qblock/knowledge-base",
                          },
                        ],
                        message: m.text,
                      },
                    ];

              return (
                <div key={m.id} className="flex items-start gap-3 justify-start my-3 w-full">
                  <div className={`shrink-0 pt-0.5 ${grouped ? "opacity-0" : ""}`}>
                    <div className="w-8 h-8 rounded-[10px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
                      <Watcher shape="Cube" eyes="Slant" size={26} follow={30} bounce={15} />
                    </div>
                  </div>

                  <div className="relative flex-1 min-w-0 max-w-[94%] sm:max-w-[560px]">
                    {!grouped && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[12px] font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent truncate">
                          {messageName || "Official Support"}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono font-medium">{timeStr}</span>
                      </div>
                    )}

                    {m.isThinking ? (
                      <div className="w-full">
                        <ThinkingState
                          nodes={[
                            {
                              type: "reasoning",
                              sentences: [
                                "Consulting QBLOCK knowledge repository for user question...",
                                "Evaluating gameplay mechanics, platform policies, and rules...",
                              ],
                              durationSeconds: 2.5,
                            },
                            {
                              type: "tool",
                              primary: "Support Cluster",
                              secondary: "gemini-3.8-flash",
                            },
                          ]}
                          autoPlay={true}
                          workingLabel="Thinking about QBLOCK..."
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        <AgentWorkflow
                          phases={botPhases}
                          workingLabel="Thinking about QBLOCK..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                onTouchStart={(e) => {
                  touchStartX.current = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  if (touchStartX.current !== null) {
                    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
                    if (deltaX > 45) {
                      if (typeof navigator !== "undefined" && navigator.vibrate) {
                        navigator.vibrate(25);
                      }
                      setReplyTo({
                        id: m.id,
                        senderName: messageName,
                        text: m.text || (m.imageUrl ? "Photo" : "Message"),
                      });
                    }
                  }
                  touchStartX.current = null;
                }}
                className={`flex items-end gap-1.5 ${isMe ? "justify-end" : "justify-start"} transition-transform active:translate-x-1`}
              >
                {!isMe && (
                  <div className={`shrink-0 ${grouped ? "opacity-0" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen(true)}
                      className="cursor-pointer press"
                      aria-label="View user profile"
                    >
                      <Avatar
                        name={messageName}
                        size={28}
                        snapshot={
                          m.senderId === qbUser?.uid
                            ? qbUser?.avatarSnapshot
                            : otherUser?.avatarSnapshot
                        }
                        isIra={isIraSender}
                        photoUrl={
                          m.senderId === qbUser?.uid
                            ? qbUser?.profilePhoto
                            : otherUser?.profilePhoto
                        }
                      />
                    </button>
                  </div>
                )}
                <div
                  className={`relative max-w-[85%] text-[13px] leading-snug px-3 py-2 rounded-[14px] ${
                    isMe
                      ? "bg-[#fa4616] text-white"
                      : "bg-[#f0f2f5] dark:bg-[#1a1d24] text-[#141414] dark:text-white"
                  }`}
                >
                  {!isMe && !grouped && (
                    <div className="mb-1 text-[10px] font-bold text-gray-500">
                      {messageName}
                    </div>
                  )}

                  {/* Quoted reply pill inside message bubble */}
                  {m.replyTo && (
                    <div className="mb-1.5 px-2.5 py-1 rounded-[8px] bg-black/15 dark:bg-white/10 border-l-2 border-amber-400 text-[11px] leading-tight">
                      <div className="font-bold text-amber-300 dark:text-amber-400 truncate">
                        {m.replyTo.senderName}
                      </div>
                      <div className="text-white/80 dark:text-white/80 truncate">
                        {m.replyTo.text || "Photo"}
                      </div>
                    </div>
                  )}

                  {m.imageUrl ? (
                    <img
                      src={m.imageUrl}
                      alt="Shared image"
                      className="max-h-[260px] max-w-full rounded-[12px] object-cover"
                      loading="lazy"
                    />
                  ) : m.special === "island_invite" ? (
                    <div className="space-y-2 py-0.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-[8px] bg-[#fa4616]/15 p-1 shrink-0 grid place-items-center">
                          <img
                            src="https://file.garden/alGOOylwpAfCa6qP/IMG_7240.png"
                            alt="Skyblock Island"
                            className="h-5 w-5 object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-black text-slate-900 leading-tight">
                            Sandbox World Invite
                          </div>
                          <div className="text-[10.5px] text-slate-600 font-semibold truncate">
                            {m.text}
                          </div>
                        </div>
                      </div>
                      <Link
                        to="/game/sandbox"
                        className="press flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-[10px] text-[11px] font-black text-white shadow-sm"
                        style={{
                          background: "linear-gradient(135deg, #ff6230, #fa4616)",
                        }}
                      >
                        <img
                          src="https://file.garden/alGOOylwpAfCa6qP/IMG_7240.png"
                          alt=""
                          className="h-3 w-3 object-contain"
                        />
                        <span>Visit Island</span>
                      </Link>
                    </div>
                  ) : (
                    <MsgText text={m.text} />
                  )}
                </div>
                {isMe && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileTarget("self");
                      setProfileOpen(true);
                    }}
                    className={`shrink-0 press ${grouped ? "opacity-0" : ""}`}
                    aria-label="View your profile"
                  >
                    <Avatar
                      name={qbUser?.displayName ?? "Me"}
                      size={28}
                      snapshot={qbUser?.avatarSnapshot}
                      isIra={qbUser?.username?.toLowerCase() === "ira"}
                      photoUrl={qbUser?.profilePhoto}
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Discord-style Typing Indicator */}
        {isOtherTyping && (
          <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-[440px] px-4 py-1 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 dark:bg-white/10 backdrop-blur-md text-[11px] font-bold text-amber-400 shadow-md">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>{headerName} is typing...</span>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-white dark:bg-[#121418] border-t border-black/[0.06] dark:border-white/[0.08] px-3 pt-1.5"
          style={{
            paddingBottom: "max(10px,env(safe-area-inset-bottom))",
          }}
        >
          {/* Replying quote bar preview */}
          {replyTo && (
            <div className="mb-1.5 px-3 py-1.5 rounded-[12px] bg-slate-100 dark:bg-[#1f222a] border-l-3 border-amber-400 flex items-center justify-between text-[11.5px] shadow-xs">
              <div className="min-w-0 pr-2">
                <span className="font-bold text-amber-500">Replying to {replyTo.senderName}</span>
                <p className="text-gray-600 dark:text-gray-300 truncate font-medium">{replyTo.text}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {emojiOpen && (
            <div className="mb-2 rounded-[16px] bg-white dark:bg-[#1a1d24] border border-border-soft shadow-md animate-fade-in overflow-hidden">
              <div className="flex border-b border-border-soft px-2 pt-1.5 gap-1">
                {EMOJI_PACKS.map((pack, pi) => (
                  <button
                    key={pack.id}
                    onClick={() => setEmojiTab(pi)}
                    className={`press px-2.5 h-7 rounded-t-[8px] text-[10.5px] font-extrabold ${emojiTab === pi ? "bg-primary-soft text-primary-hover" : "text-text-muted"}`}
                  >
                    {pack.label}
                  </button>
                ))}
              </div>
              <div className="p-2 max-h-[150px] overflow-y-auto ios-scroll hide-scrollbar">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_PACKS[emojiTab].emojis.map((em) => (
                    <button
                      key={em.name}
                      onClick={() =>
                        setVal((v) => v + `[emoji:${EMOJI_PACKS[emojiTab].id}:${em.name}]`)
                      }
                      className="press h-9 w-9 rounded-[8px] grid place-items-center hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <img src={em.path} alt={em.name} className="h-6 w-6 object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div>
            {sendError && (
              <div className="mb-1 px-2 text-center text-[10.5px] font-semibold text-red-600">
                {sendError}
              </div>
            )}
            <div className="flex h-11 items-center rounded-[16px] bg-[#f0f2f5] dark:bg-[#1a1d24] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden pl-2 pr-0 focus-within:border-black/20 dark:focus-within:border-white/20 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="press h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
                aria-label="Send image"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void sendImage(file);
                }}
              />
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                className={`press h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  emojiOpen
                    ? "bg-[#fa4616]/10 text-[#fa4616]"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
                aria-label="Emoji"
              >
                <img
                  src="https://cdn.hugeicons.com/icons/outline/24/smile.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              </button>
              <button
                type="button"
                onClick={() => setGifOpen(true)}
                className="press px-2 h-7 rounded-full flex items-center justify-center shrink-0 text-[10.5px] font-extrabold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors mr-1 cursor-pointer"
                aria-label="GIFs"
              >
                <img
                  src="https://cdn.hugeicons.com/icons/outline/24/gif-02.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              </button>
              <input
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setEmojiOpen(false)}
                placeholder={
                  activeChatId === "support"
                    ? "Ask Official Support about QBLOCK..."
                    : "Message…"
                }
                className="flex-1 min-w-0 bg-transparent px-1.5 outline-none text-[13.5px] font-medium text-[#141414] dark:text-white placeholder:text-gray-400"
              />
              {/* Attached glossy send button */}
              <button
                type="button"
                onClick={send}
                disabled={imageUploading || (!val.trim() && sendState !== "sent")}
                className={`relative h-full px-4 shrink-0 text-white flex items-center justify-center overflow-hidden transition-all duration-140 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] select-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-l shadow-[inset_1px_0_0_rgba(255,255,255,0.2)] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none ${
                  activeChatId === "support"
                    ? "bg-gradient-to-b from-[#f59e0b] via-[#d97706] to-[#b45309] border-[#b45309]"
                    : "bg-gradient-to-b from-[#ff6030] via-[#fa4616] to-[#dd380a] border-[#e03a0c]"
                }`}
                aria-label={sendState === "sent" ? "Sent" : "Send"}
              >
                {sendState === "sent" ? (
                  <Check className="relative z-10 h-4 w-4 stroke-[2.5]" />
                ) : (
                  <Send className="relative z-10 h-3.5 w-3.5 fill-white text-white ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
        {profileOpen && (
          <ProfileSheet
            user={
              profileTarget === "support" || activeChatId === "support" || chatId === "support"
                ? {
                    id: "support",
                    n: "Official Support",
                    username: "support",
                    customId: "QB-SUPPORT",
                    email: "support@qblock.world",
                    bio: "Official QBLOCK Game & Player Support. We're here to help with gameplay, Skyblock, items, and community questions 24/7!",
                    online: true,
                    color: "#f59e0b",
                    staff: true,
                    badgeEquipped: true,
                    badges: ["SUPPORT", "STAFF", "VERIFIED"],
                  }
                : profileTarget === "self" && qbUser
                  ? {
                      id: qbUser.uid,
                      n: qbUser.displayName || qbUser.username || "Player",
                      username: qbUser.username,
                      customId: qbUser.customId,
                      email: qbUser.email ?? undefined,
                      bio: qbUser.bio,
                      online: true,
                      color: "#fa4616",
                      isOwn: true,
                      avatarSnapshot: qbUser.avatarSnapshot,
                      profilePhoto: qbUser.profilePhoto,
                      staff: qbUser.staff,
                      badgeEquipped: qbUser.badgeEquipped,
                    }
                  : {
                      id: otherUser?.uid || recipientUid || (chatId !== "support" ? chatId : "player"),
                      n: otherUser?.displayName || headerName || "Player",
                      username: otherUser?.username || headerName,
                      customId: otherUser?.customId,
                      email: otherUser?.email,
                      bio: otherUser?.bio,
                      friendCount: otherUser?.friendCount,
                      createdAt: otherUser?.createdAt,
                      online: otherUser?.online ?? false,
                      color: "#fa4616",
                      avatarSnapshot: otherUser?.avatarSnapshot,
                      profilePhoto: otherUser?.profilePhoto,
                      staff:
                        otherUser?.staff ||
                        otherUser?.username?.toLowerCase() === "ira" ||
                        otherUser?.username?.toLowerCase() === "die",
                      badgeEquipped: otherUser?.badgeEquipped,
                    }
            }
            onClose={() => setProfileOpen(false)}
          />
        )}
        {gifOpen && (
          <GifPickerModal
            onClose={() => setGifOpen(false)}
            onSelect={(gifUrl) => {
              if (!qbUser) return;
              const otherUid =
                recipientUid || (chatId.includes("_") ? legacyOtherUid(chatId, qbUser.uid) : chatId);
              if (!otherUid) return;
              const targetCid = activeChatId || friendshipId(qbUser.uid, otherUid);
              addDoc(collection(db, "chats", targetCid, "messages"), {
                senderId: qbUser.uid,
                senderName: userDisplayName(qbUser, qbUser.uid),
                text: "",
                imageUrl: gifUrl,
                timestamp: serverTimestamp(),
              });
              setDoc(
                doc(db, "chatMeta", targetCid),
                {
                  members: [qbUser.uid, otherUid],
                  lastMessage: "GIF",
                  lastAt: serverTimestamp(),
                },
                { merge: true },
              );
              recordChatSent();
            }}
          />
        )}
      </div>
    </MobileShell>
  );
}

function RefreshChatLoader() {
  return <HtmlSpinner size={28} />;
}
