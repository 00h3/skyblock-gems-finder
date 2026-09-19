import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ChevronLeft, Send, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { userDisplayName, friendshipId } from "@/lib/friends-utils";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";
import { UserNameWithBadges } from "@/lib/user-style";
import {
  avatarFrameFrom,
  normalizeAvatarSnapshot,
  type AvatarFrameId,
  type AvatarSnapshot,
} from "@/lib/avatar";

export const Route = createFileRoute("/global-chat")({
  head: () => ({ meta: [{ title: "Global Chat — QBlock" }] }),
  component: GlobalChat,
});

type Msg = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  avatarSnapshot?: AvatarSnapshot;
  frame?: AvatarFrameId;
  profilePhoto?: string;
  username?: string;
  staff?: boolean;
  badgeEquipped?: boolean;
};

function GlobalChat() {
  const { qbUser, firebaseUser } = useAuth();
  const nav = useNavigate();
  const myUid = qbUser?.uid ?? firebaseUser?.uid ?? null;

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [val, setVal] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ProfileUser | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const q = query(collection(db, "global_chat"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, async (snap) => {
      const senderIds = [
        ...new Set(snap.docs.map((item) => String(item.data().senderId ?? "")).filter(Boolean)),
      ];
      const profiles = await Promise.all(
        senderIds.map(async (uid) => {
          try {
            const profileSnap = await getDoc(doc(db, "users", uid));
            return [uid, profileSnap.exists() ? profileSnap.data() : null] as const;
          } catch {
            return [uid, null] as const;
          }
        }),
      );
      if (!active) return;
      const profileByUid = new Map(profiles);
      const list: Msg[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        const profile = profileByUid.get(String(d.senderId ?? "")) ?? undefined;
        const avatarSnapshot = normalizeAvatarSnapshot({
          avatarSnapshot: profile?.avatarSnapshot ?? d.avatarSnapshot,
          frameId: profile?.frameId ?? d.frameId,
          equippedFrame: profile?.equippedFrame ?? d.equippedFrame,
        }) as AvatarSnapshot | undefined;
        const senderName = profile
          ? userDisplayName(profile, d.senderId)
          : d.senderName || "Unknown";
        list.push({
          id: doc.id,
          senderId: d.senderId,
          senderName,
          text: d.text || "",
          timestamp: d.timestamp?.toDate().toISOString() || new Date().toISOString(),
          avatarSnapshot,
          frame: avatarFrameFrom({
            avatarSnapshot,
            frameId: profile?.frameId ?? d.frameId,
            equippedFrame: profile?.equippedFrame ?? d.equippedFrame,
          }),
          profilePhoto:
            typeof profile?.profilePhoto === "string" ? profile.profilePhoto : undefined,
          username: typeof profile?.username === "string" ? profile.username : undefined,
          staff: profile?.staff === true,
          badgeEquipped: profile?.badgeEquipped === true,
        });
      });
      setMsgs(list.reverse());
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function send() {
    const text = val.trim();
    if (!text || !myUid || !qbUser) return;
    setVal("");
    try {
      await addDoc(collection(db, "global_chat"), {
        senderId: qbUser.uid,
        senderName: userDisplayName(qbUser, qbUser.uid),
        username: qbUser.username,
        profilePhoto: qbUser.profilePhoto || null,
        avatarSnapshot: qbUser.avatarSnapshot ?? null,
        frameId: avatarFrameFrom(qbUser) ?? null,
        text,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      send();
    }
  }

  function openProfile(message: Msg) {
    const senderId = message.senderId;
    const senderName = message.senderName;
    if (!senderId) return;
    setSelectedProfile({
      id: senderId,
      n: senderName,
      username: message.username || senderName,
      color: "#f4c430",
      online: true,
      isOwn: senderId === myUid,
      staff: message.staff || senderName.toLowerCase().includes("ira"),
      badgeEquipped: message.badgeEquipped,
      avatarSnapshot: message.avatarSnapshot,
      frame: message.frame,
      profilePhoto: message.profilePhoto,
    });
  }

  return (
    <MobileShell hideNav>
      <div className="flex flex-col min-h-dvh bg-white">
        <header
          className="min-h-14 px-3 flex items-center justify-between sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100"
          style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
        >
          <Link
            to="/chat"
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="h-[22px] w-[22px]" />
          </Link>
          <div className="flex flex-col items-center flex-1">
            <div className="text-[14px] font-bold text-gray-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-500" /> Global Chat
            </div>
            <div className="text-[10px] font-semibold text-emerald-500">Live Server</div>
          </div>
          <div className="w-8"></div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto ios-scroll hide-scrollbar px-3 py-4 space-y-3 pb-[108px] bg-[#f8f9fa]"
        >
          {msgs.length === 0 && (
            <div className="h-full min-h-[50vh] grid place-items-center text-center text-text-muted">
              <div>
                <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="text-[13px] font-semibold mt-3">Welcome to Global Chat</div>
                <div className="text-[11.5px] mt-1 max-w-[200px]">Say hi to everyone!</div>
              </div>
            </div>
          )}
          {msgs.map((m, i) => {
            const isMe = m.senderId === myUid;
            const prev = msgs[i - 1];
            const grouped = prev?.senderId === m.senderId;
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => openProfile(m)}
                    className={`shrink-0 cursor-pointer press ${grouped ? "opacity-0" : ""}`}
                    aria-label={`View ${m.senderName}'s profile`}
                  >
                    <GlossyAvatar height={32} className="h-8 w-8 rounded-full" autoRotate={false} />
                  </button>
                )}
                <div
                  className={`ios-chat-bubble relative max-w-[78%] text-[14.5px] leading-snug ${isMe ? "ios-chat-bubble-me" : ""} animate-fade-in`}
                >
                  {!isMe && !grouped && (
                    <button
                      type="button"
                      onClick={() => openProfile(m)}
                      className="mb-1 block text-left text-[11px] font-extrabold text-slate-700 hover:underline dark:text-slate-200"
                    >
                      <UserNameWithBadges
                        user={{ username: m.senderName, n: m.senderName }}
                        name={m.senderName}
                        badgeSize={11}
                        className="text-[11px] font-extrabold"
                        defaultColorClass="text-slate-700 dark:text-slate-200"
                      />
                    </button>
                  )}
                  <span className="whitespace-pre-wrap break-words">{m.text}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 dark:bg-[#121418]/95 backdrop-blur-md border-t border-black/[0.06] dark:border-white/[0.08] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2.5">
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex h-11 items-center rounded-[16px] bg-[#f0f2f5] dark:bg-[#1a1d24] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden pl-3 pr-0 focus-within:border-black/20 dark:focus-within:border-white/20 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <input
                type="text"
                placeholder="Message global chat..."
                className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px] font-medium text-[#141414] dark:text-white placeholder:text-gray-400"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={400}
              />
              <button
                type="button"
                onClick={send}
                disabled={!val.trim()}
                className="relative h-full px-4 shrink-0 bg-gradient-to-b from-[#ff6030] via-[#fa4616] to-[#dd380a] text-white flex items-center justify-center overflow-hidden transition-all duration-140 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] select-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-l border-[#e03a0c] shadow-[inset_1px_0_0_rgba(255,255,255,0.2)] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none"
                aria-label="Send"
              >
                <Send className="relative z-10 h-3.5 w-3.5 fill-white text-white ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {selectedProfile && (
          <ProfileSheet
            user={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onChat={() => {
              if (myUid && selectedProfile.id) {
                const cid = friendshipId(myUid, selectedProfile.id);
                setSelectedProfile(null);
                nav({ to: "/chat/$id" as never, params: { id: cid } as never });
              }
            }}
          />
        )}
      </div>
    </MobileShell>
  );
}
