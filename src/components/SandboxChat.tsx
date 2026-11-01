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

type ChatMsg = {
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
 * Realtime sandbox chat — same Firestore backend and visual language as the
 * Skyblock chat overlay, scoped to its own `sandboxChat` room.
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
      if (err.code === 'permission-denied') {
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
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#0e1116]/70 backdrop-blur-md">
      <div className="flex min-h-0 flex-1 flex-col bg-white/95 pt-[max(8px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <span className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-tight text-[#16181d]">
            <GameChatIcon className="h-4 w-4 text-[#fa4616]" />
            Sandbox chat
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg bg-black/5 text-[16px] font-bold text-black/50"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {msgs.length === 0 && (
            <p className="py-6 text-center text-[11px] text-black/35">
              No messages yet — say hi 👋
            </p>
          )}
          {msgs.map((m) => {
            const me = !!qbUser && m.uid === qbUser.uid;
            const ring = m.frame ? FRAME_RING[m.frame] : undefined;
            return (
              <div key={m.id} className="flex items-start gap-2 text-[13px] leading-snug">
                <button
                  type="button"
                  onClick={() =>
                    m.uid
                      ? setSelectedProfile({
                          id: m.uid,
                          n: m.from,
                          username: m.from,
                          color: "#f4c430",
                          online: true,
                          isOwn: m.uid === qbUser?.uid,
                          avatarSnapshot: m.frame
                            ? ({ frameId: m.frame } as ProfileUser["avatarSnapshot"])
                            : undefined,
                          profilePhoto: m.photo,
                        })
                      : undefined
                  }
                  className="mt-[1px] grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#eef2f6] press"
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
                      <span className="text-[11px] font-extrabold text-black/40">
                        {m.from.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                </button>
                <span className="min-w-0 flex-1">
                  <span className={`font-bold ${me ? "text-[#f4b400]" : "text-[#16181d]"}`}>
                    {m.from}
                  </span>
                  {(m.badges ?? []).map((b) => (
                    <img
                      key={b}
                      src={b}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="ml-1 inline-block h-3.5 w-3.5 align-[-2px] object-contain"
                    />
                  ))}
                  <span className="text-black/30">: </span>
                  <span className="break-words text-black/75">{renderTextWithEmojis(m.text)}</span>
                </span>
              </div>
            );
          })}
        </div>

        {selectedProfile ? (
          <ProfileSheet user={selectedProfile} onClose={() => setSelectedProfile(null)} />
        ) : null}

        {showEmoji && (
          <div className="flex flex-wrap gap-1.5 border-t border-black/5 px-3 py-2 max-h-[140px] overflow-y-auto">
            {CUSTOM_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setVal((v) => (v ? `${v} :${e}:` : `:${e}:`))}
                className="grid h-8 w-8 place-items-center rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
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
            className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] font-bold text-rose-600"
          >
            {chatError}
          </p>
        )}
        <div className="flex items-center gap-2 border-t border-black/5 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/5"
            aria-label="Emoji"
          >
            <img src="/emojis/face/uwu.png" className="w-5 h-5 opacity-80" alt="emoji" />
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
            className="h-8 flex-1 rounded-lg border border-black/10 bg-white px-2.5 text-[12px] text-[#16181d] outline-none focus:border-[#fa4616]"
          />
          <button
            type="button"
            onClick={send}
            disabled={!qbUser || sending}
            className="h-8 shrink-0 rounded-lg bg-[#fa4616] px-3 text-[12px] font-bold text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
