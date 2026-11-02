import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { GameChatIcon } from "@/components/game-icons";
import { badgeUrlsFor } from "@/lib/user-style";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";
import Cubes from "@/components/ui/Cubes";

export type ChatMsg = {
  id: string;
  from: string;
  uid?: string;
  text: string;
  at?: number;
  photo?: string;
  frame?: string;
  badges?: string[];
};

/** Frame ring colours matching the wearable frames. */
const FRAME_RING: Record<string, string> = {
  "star-program": "#f4b400",
  "blue-gold": "#1769e8",
  staff: "#22c55e",
  "early-beta": "#a855f7",
};

const USER_COLORS = [
  "#fa4616", // QBlock Orange
  "#38bdf8", // Sky Blue
  "#34d399", // Emerald Green
  "#f59e0b", // Amber Gold
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#60a5fa", // Bright Blue
  "#10b981", // Teal
  "#f43f5e", // Rose Red
  "#fbbf24", // Yellow Gold
];

export function getUserColor(name: string) {
  if (!name) return USER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

const CUSTOM_EMOJIS = [
  "drunk",
  "heybby",
  "kirakira",
  "maniacal",
  "nervous",
  "ninja",
  "o3o",
  "ohnoes",
  "owocry",
  "owonervous",
  "owosneaky",
  "pout",
  "pwease",
  "really",
  "smug",
  "snrk",
  "squee",
  "trepidation",
  "uwu",
  "wat",
  "weep",
  "wtf",
  "yawn",
  "zombie",
];

function renderTextWithEmojis(text: string) {
  const parts = text.split(/(:\w+:)/g);
  return parts.map((part, i) => {
    if (part.startsWith(":") && part.endsWith(":")) {
      const name = part.slice(1, -1);
      if (CUSTOM_EMOJIS.includes(name)) {
        return (
          <img
            key={i}
            src={`/emojis/face/${name}.png`}
            className="w-5 h-5 inline-block align-middle mx-0.5"
            alt={name}
          />
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Chat Preview Component — displays on the left side of the screen during gameplay.
 * Features Username [user] in different colors and message preview text.
 */
/**
 * Chat Preview Component — displays on the left side of the screen during gameplay.
 * Features Username [user] in different colors and message preview text with grey inventory style.
 */
export function ChatPreview({
  onOpen,
  messages: externalMsgs,
  className = "",
}: {
  onOpen: () => void;
  messages?: Array<{ id: string | number; from: string; text: string; me?: boolean; special?: string }>;
  className?: string;
}) {
  const [recentMsgs, setRecentMsgs] = useState<ChatMsg[]>([]);

  useEffect(() => {
    if (externalMsgs && externalMsgs.length > 0) return;
    const q = query(collection(db, "sandboxChat"), orderBy("at"), limitToLast(6));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRecentMsgs(
          snap.docs.map((d) => {
            const data = d.data() as {
              from?: string;
              uid?: string;
              text?: string;
              photo?: string;
              frame?: string;
              badges?: string[];
              at?: { toMillis?: () => number };
            };
            return {
              id: d.id,
              from: data.from || "Player",
              uid: data.uid,
              text: data.text || "",
              photo: data.photo,
              frame: data.frame,
              badges: data.badges ?? [],
              at: data.at?.toMillis?.() ?? 0,
            };
          }),
        );
      },
      () => {},
    );
    return unsub;
  }, [externalMsgs]);

  const displayList =
    externalMsgs && externalMsgs.length > 0
      ? externalMsgs.slice(-4).map((m) => ({
          id: String(m.id),
          from: m.from,
          text: m.text,
        }))
      : recentMsgs.slice(-4).map((m) => ({
          id: m.id,
          from: m.from,
          text: m.text,
        }));

  return (
    <div
      onClick={onOpen}
      className={`pointer-events-auto cursor-pointer max-w-[280px] sm:max-w-[340px] space-y-1.5 rounded-lg bg-[#161a24]/90 backdrop-blur-md p-2.5 border border-[#2c3549] shadow-[0_8px_24px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:bg-[#1a202d]/95 hover:border-[#38455e] active:scale-[0.98] font-['Inter'] font-semibold select-none ${className}`}
      title="Click to open chat"
    >
      <div className="flex items-center justify-between border-b border-[#2b3346] pb-1.5 px-0.5 mb-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
          <GameChatIcon className="h-3.5 w-3.5 text-[#fa4616]" />
          <span>Island Chat</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </span>
        <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
          Tap to chat
        </span>
      </div>
      {displayList.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic py-1">No messages yet. Tap to say hi 👋</p>
      ) : (
        displayList.map((m) => {
          const userColor = getUserColor(m.from);
          return (
            <div key={m.id} className="text-[12px] leading-snug truncate font-semibold">
              <span style={{ color: userColor }} className="font-bold">
                {m.from}
              </span>
              <span className="text-zinc-300 bg-white/10 text-[9.5px] font-mono font-semibold px-1 py-0.2 rounded mx-1">
                [user]
              </span>
              <span className="text-zinc-400 font-bold">: </span>
              <span className="text-slate-100 font-semibold">{renderTextWithEmojis(m.text)}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Realtime sandbox chat — Grey Inventory Aesthetic + Inter Semi-Bold Font + Embedded Cubes WebGL Landing Effect.
 */
export function SandboxChat({ onClose }: { onClose: () => void }) {
  const { qbUser } = useAuth();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [val, setVal] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileUser | null>(null);
  const [chatError, setChatError] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, "sandboxChat"), orderBy("at"), limitToLast(80));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMsgs(
          snap.docs.map((d) => {
            const data = d.data() as {
              from?: string;
              uid?: string;
              text?: string;
              photo?: string;
              frame?: string;
              badges?: string[];
              at?: { toMillis?: () => number };
            };
            return {
              id: d.id,
              from: data.from || "Player",
              uid: data.uid,
              text: data.text || "",
              photo: data.photo,
              frame: data.frame,
              badges: data.badges ?? [],
              at: data.at?.toMillis?.() ?? 0,
            };
          }),
        );
      },
      (err) => {
        setChatError("Live chat is unavailable. Please reconnect.");
        console.error("Sandbox chat listener failed:", err);
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const send = async () => {
    const text = val.trim();
    if (!text) return;
    if (sending) return;
    setVal("");
    setSending(true);
    setChatError("");

    let uid = qbUser?.uid;
    let name = qbUser?.displayName || qbUser?.username || "Guest";

    if (!uid) {
      try {
        let guestId = localStorage.getItem("qb_guest_id");
        if (!guestId) {
          guestId = "guest_" + Math.random().toString(36).substring(2, 9);
          localStorage.setItem("qb_guest_id", guestId);
        }
        uid = guestId;
      } catch {
        uid = "guest_player";
      }
    }

    try {
      await addDoc(collection(db, "sandboxChat"), {
        text: text.slice(0, 240),
        from: name,
        uid: uid,
        photo: qbUser?.profilePhoto || null,
        frame: qbUser?.avatarSnapshot?.frameId ?? "none",
        badges: qbUser ? badgeUrlsFor(qbUser) : [],
        at: serverTimestamp(),
      });
      window.dispatchEvent(new CustomEvent("qb-self-say", { detail: text.slice(0, 240) }));
    } catch (err: any) {
      setVal(text);
      if (err.code === "permission-denied") {
        setChatError("Missing permission to chat.");
      } else {
        setChatError("Message could not be sent. Please try again.");
      }
      console.error("Could not send sandbox chat message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0a0c10]/80 backdrop-blur-md p-3 sm:p-6 font-inter-semibold">
      {/* Container with Dark Grey Inventory Aesthetics & Metallic Frame */}
      <div className="relative flex h-[88vh] max-h-[720px] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#323846] bg-[#181b22] shadow-[0_12px_48px_rgba(0,0,0,0.85)]">
        {/* Interactive Cubes Landing Component Background */}
        <div className="pointer-events-auto absolute inset-0 opacity-25">
          <Cubes
            gridSize={8}
            faceColor="#12151c"
            edgeColor="#fa4616"
            rippleColor="#38bdf8"
            maxAngle={25}
            radius={2.5}
            autoAnimate={true}
          />
        </div>

        {/* Header - Grey Inventory Banner */}
        <div className="relative z-10 flex items-center justify-between border-b border-[#2d3342] bg-[#1d222c]/90 px-4 py-3 backdrop-blur-md">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-100">
            <GameChatIcon className="h-4 w-4 text-[#fa4616]" />
            <span>Sandbox Chat</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#3b4254] bg-[#252a36] text-[16px] font-semibold text-slate-300 transition-colors hover:bg-[#323848] active:scale-95"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/* Message Stream */}
        <div ref={scrollRef} className="relative z-10 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
          {msgs.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center space-y-1 text-center py-12">
              <GameChatIcon className="h-8 w-8 text-slate-500 opacity-50" />
              <p className="text-[12px] font-semibold text-slate-400">
                No messages yet — start the conversation! 👋
              </p>
            </div>
          )}
          {msgs.map((m) => {
            const me = !!qbUser && m.uid === qbUser.uid;
            const ring = m.frame ? FRAME_RING[m.frame] : undefined;
            const userColor = getUserColor(m.from);

            return (
              <div
                key={m.id}
                className="flex items-start gap-2.5 rounded-xl border border-[#2d3342]/60 bg-[#1e232f]/80 p-2 text-[13px] leading-snug shadow-sm backdrop-blur-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    m.uid
                      ? setSelectedProfile({
                          id: m.uid,
                          n: m.from,
                          username: m.from,
                          color: userColor,
                          online: true,
                          isOwn: m.uid === qbUser?.uid,
                          avatarSnapshot: m.frame
                            ? ({ frameId: m.frame } as ProfileUser["avatarSnapshot"])
                            : undefined,
                          profilePhoto: m.photo,
                        })
                      : undefined
                  }
                  className="mt-[1px] grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#383e50] bg-[#282d3c] active:scale-95"
                  aria-label={`View ${m.from}'s profile`}
                >
                  <span
                    style={ring ? { boxShadow: `inset 0 0 0 2px ${ring}` } : undefined}
                    className="grid h-full w-full place-items-center"
                  >
                    {m.photo ? (
                      <img
                        src={m.photo}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-300">
                        {m.from.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                </button>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span style={{ color: userColor }} className="font-semibold text-[13px]">
                      {m.from}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">[user]</span>
                    {(m.badges ?? []).map((b) => (
                      <img
                        key={b}
                        src={b}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-3.5 w-3.5 align-[-2px] object-contain"
                      />
                    ))}
                  </span>
                  <div className="mt-0.5 break-words font-semibold text-slate-200 text-[12.5px]">
                    {renderTextWithEmojis(m.text)}
                  </div>
                </span>
              </div>
            );
          })}
        </div>

        {selectedProfile ? (
          <ProfileSheet user={selectedProfile} onClose={() => setSelectedProfile(null)} />
        ) : null}

        {showEmoji && (
          <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-[#2d3342] bg-[#1a1e27] px-3 py-2 max-h-[140px] overflow-y-auto">
            {CUSTOM_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setVal((v) => (v ? `${v} :${e}:` : `:${e}:`))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-[#353c4f] bg-[#222734] transition-colors hover:bg-[#2e3446]"
                title={e}
              >
                <img src={`/emojis/face/${e}.png`} className="w-5 h-5 object-contain" alt={e} />
              </button>
            ))}
          </div>
        )}

        {chatError && (
          <p
            role="alert"
            className="relative z-10 border-t border-rose-500/20 bg-rose-950/40 px-4 py-2 text-[11px] font-semibold text-rose-400"
          >
            {chatError}
          </p>
        )}

        {/* Input Bar - Dark Grey Metallic Inventory Slot Style */}
        <div className="relative z-10 flex items-center gap-2 border-t border-[#2d3342] bg-[#161922]/95 px-4 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#383e50] bg-[#252a37] text-slate-300 transition-colors hover:bg-[#303646]"
            aria-label="Emoji"
          >
            <img src="/emojis/face/uwu.png" className="w-5 h-5 opacity-90" alt="emoji" />
          </button>
          <input
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") send();
            }}
            placeholder={qbUser ? "Message everyone…" : "Sign in to chat"}
            disabled={!qbUser || sending}
            maxLength={240}
            className="h-9 flex-1 rounded-lg border border-[#333a4c] bg-[#1f2430] px-3 text-[12.5px] font-semibold text-slate-100 placeholder-slate-400 outline-none focus:border-[#fa4616] focus:ring-1 focus:ring-[#fa4616]"
          />
          <button
            type="button"
            onClick={send}
            disabled={!qbUser || sending}
            className="h-9 shrink-0 rounded-lg bg-[#fa4616] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-[#ff5726] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-md"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
