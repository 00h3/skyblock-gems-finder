import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Send,
  Users,
  Smile,
  ShieldCheck,
  Crown,
  Settings,
  X,
  Flame,
  Plus,
  Trash2,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  subscribeGroupMessages,
  sendGroupChatMessage,
  joinGroupChat,
  boostGroupHype,
  addGroupAdmin,
  removeGroupAdmin,
  type GroupChatData,
  type GroupMessage,
} from "@/lib/group-chat";
import { ServerIconBadge } from "@/components/ServerIconBadge";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { HtmlSpinner } from "@/components/ui/HtmlLoadingScreen";
import { ShinyButton } from "@/components/ui/shiny-button";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface GroupChatRoomProps {
  group: GroupChatData;
  currentUser: {
    uid: string;
    displayName: string;
    username?: string;
    avatarSnapshot?: any;
    color?: string;
    staff?: boolean;
  };
  onBack: () => void;
}

const CUSTOM_SERVER_EMOJIS = [
  { code: ":qblock_fire:", label: "QBlock Fire", char: "🔥" },
  { code: ":bedwars_diamond:", label: "BedWars Diamond", char: "💎" },
  { code: ":hype_rocket:", label: "Hype Rocket", char: "🚀" },
  { code: ":golden_apple:", label: "Golden Apple", char: "🍏" },
  { code: ":pixel_sword:", label: "Pixel Sword", char: "⚔️" },
  { code: ":cosmic_spark:", label: "Cosmic Spark", char: "✨" },
  { code: ":mvp_crown:", label: "MVP Crown", char: "👑" },
  { code: ":block_heart:", label: "Voxel Heart", char: "❤️" },
];

type SettingsTab = "roles" | "rules" | "hype";

const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: "roles", label: "Roles" },
  { id: "rules", label: "Rules" },
  { id: "hype", label: "Hype" },
];

export function GroupChatRoom({ group: initialGroup, currentUser, onBack }: GroupChatRoomProps) {
  const [group, setGroup] = useState<GroupChatData>(initialGroup);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("roles");
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [isMember, setIsMember] = useState(
    initialGroup.members?.includes(currentUser.uid) || initialGroup.ownerId === currentUser.uid,
  );
  const [joining, setJoining] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [newAdminInput, setNewAdminInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen to real-time updates on the group document
  useEffect(() => {
    const groupRef = doc(db, "groups", initialGroup.id);
    const unsub = onSnapshot(
      groupRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as GroupChatData;
          setGroup({ ...data, id: snap.id });
          setIsMember(data.members?.includes(currentUser.uid) || data.ownerId === currentUser.uid);
        }
      },
      (err) => {
        console.warn("Group snapshot warning:", err);
      },
    );
    return () => unsub();
  }, [initialGroup.id, currentUser.uid]);

  // Messages subscription
  useEffect(() => {
    const unsub = subscribeGroupMessages(group.id, (newMsgs) => {
      setMessages(newMsgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });
    return () => unsub();
  }, [group.id]);

  const hype = group.hype || 0;
  const hypeGoal = group.hypeGoal || 1000;
  const isEmojiUnlocked = hype >= 1000;
  const isOwner = group.ownerId === currentUser.uid;
  const isAdmin = isOwner || (group.admins && group.admins.includes(currentUser.uid));

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    if (!isMember) {
      toast.error("Please join the group before chatting.");
      return;
    }

    setSending(true);
    setInputText("");
    try {
      await sendGroupChatMessage(group.id, {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || "Player",
        senderUsername: currentUser.username,
        senderAvatarSnapshot: currentUser.avatarSnapshot,
        senderColor: currentUser.color || "#fa4616",
        text,
        staff: currentUser.staff,
      });
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message.");
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  async function handleJoin() {
    setJoining(true);
    try {
      await joinGroupChat(group.id, currentUser.uid, currentUser.displayName || "Player");
      setIsMember(true);
      toast.success(`Joined ${group.name}!`);
    } catch (err) {
      console.error("Failed to join group:", err);
      toast.error("Failed to join group.");
    } finally {
      setJoining(false);
    }
  }

  async function handleBoostHype() {
    setBoosting(true);
    try {
      await boostGroupHype(group.id, 50);
      toast.success("🔥 Boosted squad +50 Hype!");
    } catch (err) {
      console.error("Failed to boost hype:", err);
      toast.error("Failed to boost hype.");
    } finally {
      setBoosting(false);
    }
  }

  async function handleAddAdmin() {
    const target = newAdminInput.trim();
    if (!target) return;
    try {
      await addGroupAdmin(group.id, target);
      setNewAdminInput("");
      toast.success(`Promoted user to Admin!`);
    } catch (err) {
      console.error("Failed to add admin:", err);
      toast.error("Failed to promote admin.");
    }
  }

  async function handleRemoveAdmin(adminUid: string) {
    try {
      await removeGroupAdmin(group.id, adminUid);
      toast.success("Admin role removed.");
    } catch (err) {
      console.error("Failed to remove admin:", err);
      toast.error("Failed to remove admin.");
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-white dark:bg-[#12141a] flex flex-col max-w-[480px] mx-auto select-none overflow-hidden">
      {/* Group Room Header */}
      <header className="h-[60px] px-3.5 pt-[max(env(safe-area-inset-top),8px)] pb-2 flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#12141a]/95 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="press h-8.5 w-8.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1f28] dark:hover:bg-[#252936] grid place-items-center text-slate-800 dark:text-slate-200 shrink-0 cursor-pointer transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Square PFP with Avatar Glossiness */}
          <div className="relative h-9 w-9 rounded-[11px] overflow-hidden border border-black/10 dark:border-white/12 bg-slate-100 shrink-0 shadow-xs">
            {group.customPfpUrl ? (
              <img
                src={group.customPfpUrl}
                alt={group.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ServerIconBadge
                iconName={group.iconName || "Gamepad2"}
                gradient={group.gradient || "from-orange-500 to-amber-500"}
                size="sm"
              />
            )}
            <span className="absolute inset-0 pointer-events-none rounded-[11px] bg-gradient-to-b from-white/45 via-transparent to-black/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85)]" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-[14px] font-extrabold text-slate-900 dark:text-white truncate">
              {group.name}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 fill-slate-400 text-slate-400" />
                {group.memberCount || 1} members
              </span>
              <span>•</span>
              <span className="text-[#fa4616] font-bold flex items-center gap-1">
                <img
                  src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
                  alt="Hype"
                  className="h-3.5 w-3.5 object-contain inline-block"
                />
                {hype} Hype
              </span>
            </div>
          </div>
        </div>

        {/* Clean in-header Settings Button (Renamed from Hierarchy, No Draggable Icon) */}
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="press px-3 h-8.5 rounded-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1f28] dark:hover:bg-[#252936] flex items-center gap-1.5 text-[12px] font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          title="Group Settings"
        >
          <Settings className="h-3.5 w-3.5 fill-slate-600 text-slate-600 dark:fill-slate-300 dark:text-slate-300" />
          <span>Settings</span>
        </button>
      </header>

      {/* Goal & Hype Bar */}
      <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-[#161922] border-b border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between text-[11.5px] gap-2">
        <div className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-300 font-semibold">
          <img
            src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
            alt="Hype"
            className="h-4 w-4 object-contain shrink-0"
          />
          <span className="truncate">
            {group.goal || "Reach 1,000 Hype for custom server emojis"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleBoostHype}
          disabled={boosting}
          className="press text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#fa4616] text-white shrink-0 shadow-xs cursor-pointer hover:bg-[#e03d12] transition-colors flex items-center gap-1"
        >
          <img
            src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
            alt=""
            className="h-3 w-3 object-contain"
          />
          <span>{boosting ? "..." : "+50 Boost"}</span>
        </button>
      </div>

      {/* Messages Stream - Exactly matching QBlock Chat Room UI */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-white dark:bg-[#12141a]">
        {/* Welcome Card */}
        <div className="p-4 rounded-[20px] bg-white dark:bg-[#161922] border border-black/[0.06] dark:border-white/[0.06] text-center space-y-2 mb-3 shadow-xs">
          <div className="relative h-13 w-13 rounded-[15px] overflow-hidden mx-auto border border-black/10 dark:border-white/12 bg-white shadow-xs">
            {group.customPfpUrl ? (
              <img
                src={group.customPfpUrl}
                alt={group.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#fa4616] to-amber-500 grid place-items-center text-white font-black text-[18px]">
                {group.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute inset-0 pointer-events-none rounded-[15px] bg-gradient-to-b from-white/45 via-transparent to-black/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85)]" />
          </div>
          <h2 className="text-[16px] font-extrabold text-slate-900 dark:text-white">
            Welcome to {group.name}!
          </h2>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {group.description || "Chat with the squad, boost hype, and climb the ranks!"}
          </p>
        </div>

        {messages.length === 0 && (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-[12px] font-medium">
            No messages yet. Send a message to start the squad conversation!
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.senderUid === currentUser.uid;
          const isSystem = msg.senderUid === "system";
          const prev = messages[i - 1];
          const grouped = prev?.senderUid === msg.senderUid;

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="py-1 px-3 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#1c1f28] rounded-full mx-auto max-w-sm"
              >
                {msg.text}
              </div>
            );
          }

          const isGroupOwner = msg.senderUid === group.ownerId;
          const isGroupAdmin =
            !isGroupOwner && group.admins && group.admins.includes(msg.senderUid);

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-1.5 ${isMe ? "justify-end" : "justify-start"}`}
            >
              {/* Other User Avatar with Glossy Finish */}
              {!isMe && (
                <div
                  className={`shrink-0 overflow-hidden rounded-[24%] bg-white dark:bg-[#1a1d24] shadow-xs relative ${
                    grouped ? "opacity-0 pointer-events-none" : ""
                  }`}
                  style={{ width: 28, height: 28 }}
                >
                  <GlossyAvatar
                    snapshot={msg.senderAvatarSnapshot}
                    height={28}
                    className="h-full w-full rounded-[24%]"
                    autoRotate={false}
                    focusZone="head"
                  />
                  <span className="absolute inset-0 pointer-events-none rounded-[24%] bg-gradient-to-b from-white/40 via-transparent to-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]" />
                </div>
              )}

              {/* Message Content & Badges */}
              <div className={`flex flex-col max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                {/* Header: Sender Name + Badges (Owner = Gold Crown, Admin = Pink Crown) */}
                {!isMe && !grouped && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11.5px] font-extrabold text-slate-900 dark:text-white">
                      {msg.senderName}
                    </span>

                    {/* Owner Badge: Red Owner Icon */}
                    {isGroupOwner && (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <img
                          src="https://maxwell.z3ki.dev/bot/_files/qblock-red-owner-png/qblock-red-owner-transparent.png"
                          alt="Owner"
                          className="h-3 w-3 object-contain"
                        />
                        <span>OWNER</span>
                      </span>
                    )}

                    {/* Admin Badge: Orange Admin Icon */}
                    {isGroupAdmin && (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        <img
                          src="https://maxwell.z3ki.dev/bot/_files/qblock-orange-admin-png/qblock-orange-admin-transparent.png"
                          alt="Admin"
                          className="h-3 w-3 object-contain"
                        />
                        <span>ADMIN</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Message Bubble matching QBlock chat style */}
                <div
                  className={`relative text-[13px] leading-snug px-3 py-2 rounded-[14px] break-words select-text ${
                    isMe
                      ? "bg-[#fa4616] text-white rounded-br-[4px] shadow-xs"
                      : "bg-[#f0f2f5] dark:bg-[#1a1d24] text-[#141414] dark:text-white rounded-bl-[4px]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>

              {/* My Avatar with Glossy Finish */}
              {isMe && (
                <div
                  className={`shrink-0 overflow-hidden rounded-[24%] bg-white dark:bg-[#1a1d24] shadow-xs relative ${
                    grouped ? "opacity-0 pointer-events-none" : ""
                  }`}
                  style={{ width: 28, height: 28 }}
                >
                  <GlossyAvatar
                    snapshot={currentUser.avatarSnapshot}
                    height={28}
                    className="h-full w-full rounded-[24%]"
                    autoRotate={false}
                    focusZone="head"
                  />
                  <span className="absolute inset-0 pointer-events-none rounded-[24%] bg-gradient-to-b from-white/40 via-transparent to-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Custom Emojis Drawer (Locked until 1,000 Hype) */}
      {showEmojiDrawer && (
        <div className="p-3 bg-white dark:bg-[#161922] border-t border-black/[0.08] dark:border-white/[0.08] animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 fill-[#fa4616] text-[#fa4616]" />
              <span className="text-[12px] font-extrabold text-slate-900 dark:text-white">
                Custom Squad Emojis
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowEmojiDrawer(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {!isEmojiUnlocked ? (
            <div className="p-3 rounded-[14px] bg-slate-50 dark:bg-[#1a1d27] border border-black/[0.06] dark:border-white/[0.06] text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-[12px]">
                <Lock className="h-3.5 w-3.5 text-[#fa4616]" />
                <span>Locked — Reach 1,000 Hype to Unlock!</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Current Hype: <span className="font-mono font-bold text-[#fa4616]">{hype}</span> /
                1,000
              </p>
              <div className="h-2 w-full max-w-[200px] mx-auto rounded-full bg-slate-200 dark:bg-[#252936] overflow-hidden relative">
                <div
                  className="h-full bg-[#fa4616] rounded-full"
                  style={{ width: `${Math.min(100, (hype / 1000) * 100)}%` }}
                />
              </div>
              <button
                type="button"
                onClick={handleBoostHype}
                disabled={boosting}
                className="press mt-1 px-4 py-1.5 rounded-[10px] bg-[#fa4616] text-white font-bold text-[11px] shadow-xs cursor-pointer hover:bg-[#e03d12] transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <img
                  src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
                />
                <span>{boosting ? "Boosting..." : "Boost Server (+50 Hype)"}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {CUSTOM_SERVER_EMOJIS.map((emoji) => (
                <button
                  key={emoji.code}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => `${prev} ${emoji.char} `);
                    setShowEmojiDrawer(false);
                  }}
                  className="press p-2 rounded-[12px] bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1d27] dark:hover:bg-[#232734] border border-black/[0.06] dark:border-white/[0.06] flex flex-col items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="text-[20px]">{emoji.char}</span>
                  <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-full">
                    {emoji.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Input Bar - Exact same structure as QBlock Chat */}
      <div className="p-2.5 bg-white dark:bg-[#12141a] border-t border-black/[0.06] dark:border-white/[0.06] pb-[max(env(safe-area-inset-bottom),10px)]">
        {!isMember ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-[16px] bg-slate-50 dark:bg-[#161922] border border-black/[0.06] dark:border-white/[0.06]">
            <div>
              <p className="text-[12.5px] font-extrabold text-slate-900 dark:text-white">
                You are previewing this squad
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Join to send messages and boost the server!
              </p>
            </div>
            <ShinyButton
              type="button"
              onClick={handleJoin}
              disabled={joining}
              loading={joining}
              className="h-9 px-4 text-[12px] rounded-[11px]"
            >
              Join Squad
            </ShinyButton>
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="flex h-11 items-center rounded-[16px] bg-[#f0f2f5] dark:bg-[#1a1d24] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden pl-2 pr-0 focus-within:border-black/20 dark:focus-within:border-white/20 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <button
              type="button"
              onClick={() => setShowEmojiDrawer((prev) => !prev)}
              className={`press h-8 w-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                showEmojiDrawer
                  ? "bg-[#fa4616]/10 text-[#fa4616]"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
              aria-label="Emoji"
            >
              <Smile className="h-4 w-4 fill-current text-gray-500" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message #${group.name}…`}
              maxLength={400}
              className="flex-1 min-w-0 bg-transparent px-2 outline-none text-[13.5px] font-medium text-[#141414] dark:text-white placeholder:text-gray-400"
            />

            {/* Attached glossy orange send button matching main chat */}
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="relative h-full px-4 shrink-0 bg-gradient-to-b from-[#ff6030] via-[#fa4616] to-[#dd380a] text-white flex items-center justify-center overflow-hidden transition-all duration-140 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] select-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer border-l border-[#e03a0c] shadow-[inset_1px_0_0_rgba(255,255,255,0.2)] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none"
              aria-label="Send"
            >
              <Send className="relative z-10 h-3.5 w-3.5 fill-white text-white ml-0.5" />
            </button>
          </form>
        )}
      </div>

      {/* FULL PAGE GROUP SETTINGS MODAL (With Step-by-Step Segmented Bar Styling) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-[#12141a] flex flex-col max-w-[480px] mx-auto animate-in fade-in duration-150 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between bg-white dark:bg-[#12141a]">
            <div className="flex items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-[11px] bg-slate-100 dark:bg-[#1c1f28] grid place-items-center text-slate-800 dark:text-slate-200">
                <Settings className="h-4 w-4 fill-slate-700 dark:fill-slate-300" />
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white">
                  Group Settings
                </h3>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-medium">
                  Roles, Rules & Hype Engine
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="press h-8 w-8 rounded-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1f28] dark:hover:bg-[#252936] grid place-items-center text-slate-600 dark:text-slate-300 cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Segmented Tab Indicator - Exact Same Clean White Styling from Wizard Steps (No Icons) */}
          <div className="px-4 pt-3 pb-1 bg-white dark:bg-[#12141a]">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-[13px] bg-slate-100 dark:bg-[#1a1d25] border border-black/[0.03] dark:border-white/[0.04]">
              {SETTINGS_TABS.map((t, idx) => {
                const isCurrent = activeSettingsTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveSettingsTab(t.id)}
                    className={`py-1.5 px-1 rounded-[9px] text-center transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-white dark:bg-[#262b37] text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="text-[9.5px] uppercase tracking-wider opacity-65">
                      {idx + 1}
                    </div>
                    <div className="text-[11.5px] truncate">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-[#12141a]">
            {/* TAB 1: ROLES (Owner has Red Owner badge, Admin has Orange Admin badge) */}
            {activeSettingsTab === "roles" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-[13px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <img
                      src="https://maxwell.z3ki.dev/bot/_files/qblock-red-owner-png/qblock-red-owner-transparent.png"
                      alt="Hierarchy"
                      className="h-4 w-4 object-contain"
                    />
                    <span>Server Hierarchy & Roles</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">
                    {1 + (group.admins?.length || 0)} Staff
                  </span>
                </div>

                {/* Owner Card with Red Owner Icon */}
                <div className="p-3.5 rounded-[16px] bg-white dark:bg-[#161922] border border-black/[0.08] dark:border-white/[0.08] shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-[11px] bg-rose-500/15 border border-rose-500/20 grid place-items-center p-1.5">
                      <img
                        src="https://maxwell.z3ki.dev/bot/_files/qblock-red-owner-png/qblock-red-owner-transparent.png"
                        alt="Owner"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{group.ownerName}</span>
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <img
                            src="https://maxwell.z3ki.dev/bot/_files/qblock-red-owner-png/qblock-red-owner-transparent.png"
                            alt="Owner"
                            className="h-2.5 w-2.5 object-contain"
                          />
                          <span>OWNER</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Full Server Ownership
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admins List with Orange Admin Icon */}
                <div className="space-y-2">
                  <span className="text-[11.5px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <img
                      src="https://maxwell.z3ki.dev/bot/_files/qblock-orange-admin-png/qblock-orange-admin-transparent.png"
                      alt="Admin"
                      className="h-3.5 w-3.5 object-contain"
                    />
                    <span>Server Admins</span>
                  </span>

                  {(group.admins || []).length === 0 && (
                    <div className="p-3 rounded-[13px] bg-slate-50 dark:bg-[#161922] border border-black/[0.05] dark:border-white/[0.05] text-center text-[12px] text-slate-400">
                      No additional admins yet. Promote trusted members below!
                    </div>
                  )}

                  {(group.admins || []).map((adminUid) => (
                    <div
                      key={adminUid}
                      className="p-3 rounded-[14px] bg-white dark:bg-[#161922] border border-black/[0.08] dark:border-white/[0.08] shadow-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Orange Admin badge */}
                        <div className="h-8 w-8 rounded-[10px] bg-orange-500/15 border border-orange-500/20 grid place-items-center p-1">
                          <img
                            src="https://maxwell.z3ki.dev/bot/_files/qblock-orange-admin-png/qblock-orange-admin-transparent.png"
                            alt="Admin"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="text-[13px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>
                              {adminUid === group.ownerId
                                ? `${group.ownerName} (Creator)`
                                : `Admin ${adminUid.slice(0, 8)}`}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                              <img
                                src="https://maxwell.z3ki.dev/bot/_files/qblock-orange-admin-png/qblock-orange-admin-transparent.png"
                                alt="Admin"
                                className="h-2.5 w-2.5 object-contain"
                              />
                              <span>ADMIN</span>
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-400">Moderator</div>
                        </div>
                      </div>

                      {isOwner && adminUid !== group.ownerId && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(adminUid)}
                          className="press p-1.5 text-slate-400 hover:text-rose-500 rounded-md cursor-pointer transition-colors"
                          title="Demote Admin"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add Admin Form (if Owner/Admin) */}
                  {isAdmin && (
                    <div className="pt-2 space-y-1.5">
                      <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <img
                          src="https://maxwell.z3ki.dev/bot/_files/qblock-orange-admin-png/qblock-orange-admin-transparent.png"
                          alt="Admin"
                          className="h-3.5 w-3.5 object-contain"
                        />
                        <span>Promote User to Admin</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newAdminInput}
                          onChange={(e) => setNewAdminInput(e.target.value)}
                          placeholder="Enter user UID..."
                          className="flex-1 h-9.5 px-3 rounded-[11px] border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#161922] text-[12.5px] font-medium text-slate-900 dark:text-white outline-none focus:border-pink-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddAdmin}
                          className="press px-3.5 h-9.5 rounded-[11px] bg-pink-500 hover:bg-pink-600 text-white font-bold text-[12px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Promote</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: RULES */}
            {activeSettingsTab === "rules" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <h4 className="text-[13px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 fill-emerald-500 text-emerald-600" />
                  <span>Server Rules ({group.rules?.length || 0})</span>
                </h4>

                <div className="space-y-1.5">
                  {(group.rules || []).map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[13px] bg-white dark:bg-[#161922] border border-black/[0.08] dark:border-white/[0.08] flex items-start gap-2 text-[12.5px] font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <span className="text-[#fa4616] font-bold">{idx + 1}.</span>
                      <span>{rule.replace(/^\d+\.\s*/, "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: HYPE & BOOST */}
            {activeSettingsTab === "hype" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 rounded-[18px] bg-white dark:bg-[#161922] border border-black/[0.08] dark:border-white/[0.08] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <img
                        src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
                        alt="Hype"
                        className="h-4 w-4 object-contain inline-block"
                      />
                      <span>Hype Progress & Perks</span>
                    </span>
                    <span className="text-[12px] font-mono font-extrabold text-[#fa4616]">
                      {hype} / {hypeGoal}
                    </span>
                  </div>

                  {/* Depth Glossy Bar */}
                  <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-[#232733] overflow-hidden relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 via-[#fa4616] to-amber-400 rounded-full relative"
                      style={{ width: `${Math.min(100, (hype / hypeGoal) * 100)}%` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-[45%] bg-white/40 rounded-t-full pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11.5px] text-slate-600 dark:text-slate-400 font-medium">
                      {isEmojiUnlocked
                        ? "✅ Custom Emojis Unlocked!"
                        : "🔒 Unlocks Custom Server Emojis at 1,000"}
                    </span>
                    <button
                      type="button"
                      onClick={handleBoostHype}
                      disabled={boosting}
                      className="press px-3.5 py-1.5 rounded-[11px] bg-[#fa4616] text-white font-bold text-[12px] shadow-xs cursor-pointer hover:bg-[#e03d12] transition-colors flex items-center gap-1.5"
                    >
                      <img
                        src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
                        alt=""
                        className="h-3.5 w-3.5 object-contain"
                      />
                      <span>{boosting ? "..." : "+50 Boost"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Close button with Change Password button style */}
          <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#12141a]">
            <ShinyButton
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full h-11"
            >
              Done
            </ShinyButton>
          </div>
        </div>
      )}
    </div>
  );
}
