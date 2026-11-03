import { useEffect, useRef, useState, useMemo } from "react";
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
import { badgeUrlsFor } from "@/lib/user-style";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";

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

export const USER_COLORS = [
  "#ff8c00", // BedWars Orange
  "#00e5ff", // Cyan
  "#3b82f6", // Blue
  "#39e75f", // Green
  "#ffcc00", // Yellow
  "#ff3333", // Red
  "#ec4899", // Pink
  "#a855f7", // Purple
];

export function getUserColor(name: string) {
  if (!name) return USER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

function getAvatarUrl(from: string, photo?: string) {
  if (photo && photo.trim()) return photo;
  if (from === "System" || from === "Server") {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=game`;
  }
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(from || "player")}`;
}

/**
 * Chat Preview Component — the "0 opacity one" that sits on the left side of the screen during gameplay.
 * Features Roblox BedWars chat HUD styling with transparent row backgrounds and crisp text shadow.
 */
export function ChatPreview({
  onOpen,
  messages: externalMsgs,
  className = "",
}: {
  onOpen: () => void;
  messages?: Array<{ id: string | number; from: string; text: string; me?: boolean; special?: string; photo?: string }>;
  className?: string;
}) {
  const [recentMsgs, setRecentMsgs] = useState<ChatMsg[]>([]);

  useEffect(() => {
    if (externalMsgs && externalMsgs.length > 0) return;
    const q = query(collection(db, "sandboxChat"), orderBy("at"), limitToLast(8));
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

  const displayList = useMemo(() => {
    if (externalMsgs && externalMsgs.length > 0) {
      return externalMsgs.slice(-5).map((m) => ({
        id: String(m.id),
        from: m.from,
        text: m.text,
        photo: m.photo,
      }));
    }
    return recentMsgs.slice(-5).map((m) => ({
      id: m.id,
      from: m.from,
      text: m.text,
      photo: m.photo,
    }));
  }, [externalMsgs, recentMsgs]);

  if (displayList.length === 0) return null;

  return (
    <div
      onClick={onOpen}
      className={`pointer-events-auto cursor-pointer flex flex-col gap-1 select-none font-['Inter',sans-serif] font-semibold ${className}`}
      title="Click to open chat"
      style={{
        width: "min(540px, 92vw)",
      }}
    >
      {displayList.map((m) => {
        const isSystem = m.from === "System" || m.from === "Server";
        const avatarUrl = getAvatarUrl(m.from, m.photo);
        return (
          <div
            key={m.id}
            className="flex items-center gap-2 px-1.5 py-0.5 rounded-none transition-opacity hover:opacity-90"
            style={{
              background: "rgba(0, 0, 0, 0)", // 0 opacity background requested by user
              border: "1px solid transparent",
            }}
          >
            {/* Square 22x22 avatar with border */}
            <img
              src={avatarUrl}
              alt=""
              className="w-[22px] h-[22px] rounded-[2px] shrink-0 object-cover bg-[#1e293b]"
              style={{
                border: isSystem ? "1px solid rgba(255, 140, 0, 0.6)" : "1px solid rgba(255, 255, 255, 0.35)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.from)}`;
              }}
            />
            {/* Chat line with crisp drop shadow */}
            <div
              className="text-[14px] sm:text-[14.5px] leading-[1.25] tracking-[-0.2px] break-words text-white truncate max-w-[calc(100%-32px)]"
              style={{
                textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9)",
              }}
            >
              <span className="text-[#ff8c00] font-semibold mr-1">{m.from}</span>
              <span>: </span>
              <span className="text-white">{m.text}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Full Page Realtime Roblox BedWars Chat HUD
 * Matches the user-provided layout in index_b829a50c.html
 */
export function SandboxChat({ onClose }: { onClose: () => void }) {
  const { qbUser } = useAuth();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [val, setVal] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileUser | null>(null);
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
        console.error("Sandbox chat listener error:", err);
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
    if (!text || sending) return;
    setVal("");
    setSending(true);

    let uid = qbUser?.uid;
    let name = qbUser?.displayName || qbUser?.username || "Player";

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
    } catch (err) {
      setVal(text);
      console.error("Could not send sandbox chat message:", err);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100000] w-screen h-screen overflow-hidden select-none font-['Inter',sans-serif] font-semibold bg-[#0b0c10]"
      style={{
        backgroundImage: "radial-gradient(ellipse at 50% 30%, rgba(30, 41, 59, 0.4) 0%, rgba(11, 12, 16, 0.95) 100%)",
      }}
    >
      {/* Backdrop tint */}
      <div className="absolute inset-0 bg-black/45 pointer-events-none" />

      {/* Close button top right */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-3 z-50 h-8 w-8 grid place-items-center rounded bg-black/50 border border-white/20 text-white font-bold text-lg hover:bg-black/80 transition active:scale-95 cursor-pointer"
        aria-label="Close chat"
        title="Close chat"
      >
        ✕
      </button>

      {/* Chat Container starting high up */}
      <div
        ref={scrollRef}
        className="absolute top-[6px] left-[10px] w-[540px] max-w-[95vw] flex flex-col gap-1 z-10 pointer-events-auto overflow-y-auto"
        style={{
          maxHeight: "calc(100vh - 48px)",
          scrollbarWidth: "none",
        }}
      >
        {msgs.length === 0 ? (
          <div
            className="flex items-center gap-2 p-2 rounded-none text-white text-[14px]"
            style={{
              background: "rgba(0, 0, 0, 0.42)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}
          >
            <img
              src="https://api.dicebear.com/7.x/identicon/svg?seed=game"
              alt=""
              className="w-[22px] h-[22px] rounded-[2px] border border-[#ff8c00]/60 shrink-0 object-cover bg-[#1e293b]"
            />
            <div
              className="text-[14.5px] leading-[1.25] text-white"
              style={{
                textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9)",
              }}
            >
              <span className="text-[#ff8c00]">Server:</span> Connected to live QBLOCK BedWars chat.
            </div>
          </div>
        ) : (
          msgs.map((m) => {
            const isSystem = m.from === "System" || m.from === "Server";
            const avatarUrl = getAvatarUrl(m.from, m.photo);
            return (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-none px-[7px] py-[3px]"
                style={{
                  background: "rgba(0, 0, 0, 0.42)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    m.uid
                      ? setSelectedProfile({
                          id: m.uid,
                          n: m.from,
                          username: m.from,
                          color: getUserColor(m.from),
                          online: true,
                          isOwn: m.uid === qbUser?.uid,
                          avatarSnapshot: m.frame
                            ? ({ frameId: m.frame } as ProfileUser["avatarSnapshot"])
                            : undefined,
                          profilePhoto: m.photo,
                        })
                      : undefined
                  }
                  className="shrink-0 p-0 m-0 border-0 bg-transparent cursor-pointer"
                  title={`View ${m.from}`}
                >
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-[22px] h-[22px] rounded-[2px] shrink-0 object-cover bg-[#1e293b]"
                    style={{
                      border: isSystem
                        ? "1px solid rgba(255, 140, 0, 0.6)"
                        : "1px solid rgba(255, 255, 255, 0.35)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(m.from)}`;
                    }}
                  />
                </button>

                <div
                  className="text-[14.5px] leading-[1.25] text-white tracking-[-0.2px] break-words flex-1 min-w-0"
                  style={{
                    textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9)",
                  }}
                >
                  <span className="text-[#ff8c00] font-semibold mr-1">{m.from}</span>
                  <span>: </span>
                  <span className="text-white">{m.text}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedProfile && (
        <ProfileSheet user={selectedProfile} onClose={() => setSelectedProfile(null)} />
      )}

      {/* Interactive simulated input at bottom */}
      <div
        className="absolute bottom-0 inset-x-0 h-[38px] flex items-center px-3 gap-2 z-10"
        style={{
          background: "rgba(20, 28, 38, 0.95)",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") send();
          }}
          placeholder="Type a custom message and press Enter..."
          disabled={sending}
          maxLength={240}
          className="flex-1 bg-transparent border-none outline-none text-white text-[13px] font-semibold placeholder:text-white/45"
          style={{ fontFamily: "'Inter', sans-serif" }}
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !val.trim()}
          className="px-3.5 py-1 text-white font-semibold rounded text-[12.5px] transition cursor-pointer active:scale-95 disabled:opacity-50"
          style={{
            background: "#ff8c00",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
