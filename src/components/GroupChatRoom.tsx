import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Send,
  Smile,
  ChevronDown,
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
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { BlurReveal } from "@/components/ui/blur-reveal";
import { AgentWorkflow } from "@/components/ui/ai-agent-response";

const RUNNING_CAT_GIF = "https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif";

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
  { code: ":qblock_fire:", label: "Fire", char: "🔥" },
  { code: ":bedwars_diamond:", label: "Diamond", char: "💎" },
  { code: ":hype_rocket:", label: "Rocket", char: "🚀" },
  { code: ":golden_apple:", label: "Golden Apple", char: "🍏" },
  { code: ":pixel_sword:", label: "Sword", char: "⚔️" },
  { code: ":cosmic_spark:", label: "Sparkle", char: "✨" },
];

type SettingsTab = "roles" | "rules" | "hype";

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

  // Full-page rules gate state
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);
  const [showFullRulesManually, setShowFullRulesManually] = useState(false);
  const rulesScrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

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
    if (!rulesAcknowledged) return;
    const unsub = subscribeGroupMessages(group.id, (newMsgs) => {
      setMessages(newMsgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });
    return () => unsub();
  }, [group.id, rulesAcknowledged]);

  const hype = group.hype || 0;
  const hypeGoal = group.hypeGoal || 1000;
  const isOwner = group.ownerId === currentUser.uid;
  const isAdmin = isOwner || (group.admins && group.admins.includes(currentUser.uid));

  // Detect scroll progression to unlock chat
  function handleRulesScroll() {
    const el = rulesScrollRef.current;
    if (!el) return;
    const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (scrollBottom <= 40) {
      setScrolledToBottom(true);
    }
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;
    if (!isMember) {
      toast.error("Please join the group before sending messages!");
      return;
    }

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      await sendGroupChatMessage(group.id, {
        senderUid: currentUser.uid,
        senderDisplayName: currentUser.displayName,
        senderUsername: currentUser.username,
        senderColor: currentUser.color || "#000",
        senderAvatarSnapshot: currentUser.avatarSnapshot,
        text,
      });
    } catch (err) {
      console.error("Failed to send group message:", err);
      toast.error("Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function handleJoin() {
    if (isMember || joining) return;
    setJoining(true);
    try {
      await joinGroupChat(group.id, currentUser.uid);
      setIsMember(true);
      toast.success(`Joined ${group.name}!`);
    } catch (err) {
      console.error("Failed to join group:", err);
      toast.error("Could not join group.");
    } finally {
      setJoining(false);
    }
  }

  async function handleBoostHype() {
    if (boosting) return;
    setBoosting(true);
    try {
      await boostGroupHype(group.id, 50);
      toast.success("+50 Hype boosted!");
    } catch (err) {
      console.error("Failed to boost hype:", err);
    } finally {
      setBoosting(false);
    }
  }

  async function handleAddAdmin() {
    if (!newAdminInput.trim() || !isAdmin) return;
    try {
      await addGroupAdmin(group.id, newAdminInput.trim());
      setNewAdminInput("");
      toast.success("Admin added.");
    } catch {
      toast.error("Could not add admin.");
    }
  }

  async function handleRemoveAdmin(uid: string) {
    if (!isAdmin) return;
    try {
      await removeGroupAdmin(group.id, uid);
      toast.success("Admin removed.");
    } catch {
      toast.error("Could not remove admin.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. FULL PAGE RULES SCREEN WITH LOGIN/SIGNUP BLUR FADING ANIMATION ON SCROLL
  // ─────────────────────────────────────────────────────────────────────────────
  const isViewingRules = !rulesAcknowledged || showFullRulesManually;

  if (isViewingRules) {
    const rulesList = group.rules && group.rules.length > 0
      ? group.rules
      : [
          "Be respectful to all squad members. Harassment, hate speech, and toxicity are strictly forbidden.",
          "No spamming, repetitive flood messaging, unauthorized bots, or commercial advertising links.",
          "Keep all conversation safe, welcoming, and friendly for players of all ages.",
          "Fair play and sportsmanship: No cheating, griefing, or disrupting server activities.",
          "Respect server hosts and heed appointed moderator guidance at all times.",
        ];

    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-[#000000] text-black dark:text-white flex flex-col w-full h-full overflow-hidden">
        {/* Full-Width Header */}
        <header className="w-full px-4 sm:px-6 py-3.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#000000] shrink-0">
          <button
            type="button"
            onClick={() => {
              if (showFullRulesManually) {
                setShowFullRulesManually(false);
              } else {
                onBack();
              }
            }}
            className="press h-8 px-3 rounded-[12px] bg-neutral-100 dark:bg-neutral-900 flex items-center gap-1.5 text-[12px] font-normal cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{showFullRulesManually ? "Back to Chat" : "All Servers"}</span>
          </button>

          <div className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
            Community Rules & Conduct
          </div>

          <div className="w-20 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setRulesAcknowledged(true);
                setShowFullRulesManually(false);
              }}
              className="press text-[12px] font-normal text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
            >
              Skip to Chat
            </button>
          </div>
        </header>

        {/* Scrollable Full Page Rules Container */}
        <div
          ref={rulesScrollRef}
          onScroll={handleRulesScroll}
          className="flex-1 overflow-y-auto hide-scrollbar w-full flex flex-col"
        >
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6 flex-1 flex flex-col">
            {/* Server Identity Hero with Blur Fade Animation */}
            <motion.div
              initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="text-center pt-2 pb-2"
            >
              <div className="h-20 w-20 mx-auto rounded-[24px] overflow-hidden border border-black/10 dark:border-white/15 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shadow-md">
                {group.customPfpUrl ? (
                  <img src={group.customPfpUrl} alt={group.name} className="h-full w-full object-cover" />
                ) : (
                  <div
                    className={`h-full w-full bg-gradient-to-br ${group.gradient || "from-neutral-900 to-black"} flex items-center justify-center text-white text-[20px] font-medium`}
                  >
                    {group.name ? group.name.slice(0, 2).toUpperCase() : "SV"}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <BlurReveal
                  delay={0.05}
                  speedReveal={1.3}
                  className="text-[22px] font-medium tracking-tight text-black dark:text-white justify-center"
                >
                  {group.name}
                </BlurReveal>
              </div>

              <p className="mt-1.5 text-[13px] font-normal text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                {group.description || "Welcome to our squad server. Please review the community rules below before chatting."}
              </p>

              {/* Byline with Old GIF Icon next to Hype */}
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-[12px] font-medium text-black dark:text-white">
                  <img
                    src={RUNNING_CAT_GIF}
                    alt="Hype"
                    className="h-4 w-4 object-contain inline-block shrink-0"
                  />
                  <span>{hype} / {hypeGoal} Hype</span>
                </span>
                <span className="text-[12px] text-neutral-400">·</span>
                <span className="text-[12px] font-normal text-neutral-500 dark:text-neutral-400">
                  {group.memberCount || 1} {group.memberCount === 1 ? "member" : "members"}
                </span>
                {group.ownerName && (
                  <>
                    <span className="text-[12px] text-neutral-400">·</span>
                    <span className="text-[12px] font-normal text-neutral-500 dark:text-neutral-400">
                      Owner: {group.ownerName}
                    </span>
                  </>
                )}
              </div>
            </motion.div>

            {/* Rules Section Header */}
            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: 12 }}
              whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex items-center justify-between px-1"
            >
              <h2 className="text-[14px] font-medium text-black dark:text-white">
                Server Rules & Agreement
              </h2>
              <span className="text-[11px] font-normal text-neutral-400">
                {rulesList.length} rules enforced
              </span>
            </motion.div>

            {/* Rules Cards with Scroll-Triggered Blur Fading Animation */}
            <div className="space-y-3">
              {rulesList.map((rule, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
                  whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(idx * 0.06, 0.3),
                    ease: "easeOut",
                  }}
                  className="p-4 rounded-[20px] bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/10 flex items-start gap-3.5 transition hover:border-black/20 dark:hover:border-white/20"
                >
                  <span className="h-6 w-6 rounded-[10px] bg-neutral-200 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-normal leading-relaxed text-black dark:text-white">
                      {rule}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Squad Guidelines & Conduct Tip with Blur Fade */}
            <motion.div
              initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
              whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="p-4 rounded-[20px] bg-neutral-100/70 dark:bg-neutral-900/60 border border-black/5 dark:border-white/5 space-y-1.5"
            >
              <div className="text-[12.5px] font-medium text-black dark:text-white">
                Safety & Moderation Notice
              </div>
              <p className="text-[12px] font-normal text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Server owners and appointed admins possess full authority to mute, remove, or ban members who fail to comply with these rules. By continuing, you agree to uphold our community standards.
              </p>
            </motion.div>

            {/* Scroll Down-to-Up Unlock Prompt & Action with Blur Fade */}
            <motion.div
              initial={{ opacity: 0, filter: "blur(10px)", y: 12 }}
              whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="pt-6 pb-4 mt-auto flex flex-col items-center gap-3"
            >
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-[11.5px] font-normal text-neutral-600 dark:text-neutral-400">
                <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
                <span>{scrolledToBottom ? "Rules acknowledged" : "Scroll down to unlock chat"}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRulesAcknowledged(true);
                  setShowFullRulesManually(false);
                }}
                className="press w-full max-w-sm h-12 rounded-[18px] bg-black text-white dark:bg-white dark:text-black text-[13.5px] font-medium flex items-center justify-center cursor-pointer shadow-md transition hover:opacity-90"
              >
                I Agree & Enter Server Chat
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. LIVE CHAT ROOM
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 bg-white dark:bg-[#000000] text-black dark:text-white flex flex-col max-w-[480px] mx-auto overflow-hidden">
      {/* Header */}
      <header className="px-3 py-2.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-white dark:bg-[#000000]">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="press h-8 w-8 rounded-[12px] bg-neutral-100 dark:bg-neutral-900 grid place-items-center cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="text-[14px] font-medium truncate">{group.name}</div>
            <div className="flex items-center gap-1.5 text-[10.5px] font-normal text-neutral-400 truncate">
              <span>{group.memberCount || 1} members</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-black dark:text-white font-medium">
                <img
                  src={RUNNING_CAT_GIF}
                  alt="Hype"
                  className="h-3.5 w-3.5 object-contain inline-block shrink-0"
                />
                {hype} hype
              </span>
            </div>
          </div>
        </div>

        {/* Top Header Actions: Rules & Settings */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowFullRulesManually(true)}
            className="press px-3 h-8 rounded-[12px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-[11.5px] font-normal text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer transition"
          >
            Rules
          </button>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="press px-3.5 h-8 rounded-[12px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-[11.5px] font-normal text-black dark:text-white cursor-pointer transition"
          >
            Settings
          </button>
        </div>
      </header>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-[#000000] hide-scrollbar">
        {messages.length === 0 && (
          <div className="py-12 text-center text-[12.5px] font-normal text-neutral-400">
            No messages yet. Say hello to start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderUid === currentUser.uid;
          const isBot =
            msg.senderUsername === "bot" ||
            msg.senderUid === "system" ||
            msg.senderName === "Server Bot" ||
            msg.senderDisplayName === "Server Bot";

          if (isBot) {
            return (
              <div key={msg.id} className="flex items-start gap-2.5 my-2.5 w-full">
                <div className="h-8 w-8 rounded-[12px] shrink-0 flex items-center justify-center text-[12px] font-bold text-white overflow-hidden bg-[#5865F2] shadow-xs">
                  🤖
                </div>
                <div className="relative flex-1 min-w-0 max-w-[94%] sm:max-w-[560px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11.5px] font-bold text-[#5865F2]">
                      {msg.senderDisplayName || "Server Bot"}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">10:45 AM</span>
                  </div>
                  <AgentWorkflow
                    phases={[
                      {
                        trace: [
                          {
                            type: "reasoning",
                            sentences: [
                              "Verifying tribe and squad event triggers...",
                              "Broadcasting announcement to squad members.",
                            ],
                            durationSeconds: 1.0,
                          },
                          {
                            type: "tool",
                            primary: "Server Dispatcher",
                            secondary: "squad/channel",
                          },
                        ],
                        message: msg.text,
                      },
                    ]}
                  />
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className="h-8 w-8 rounded-[12px] shrink-0 flex items-center justify-center text-[12px] font-medium text-white overflow-hidden"
                style={{ background: msg.senderColor || "#000" }}
              >
                {msg.senderAvatarSnapshot ? (
                  <GlossyAvatar snapshot={msg.senderAvatarSnapshot} height={32} className="h-full w-full" />
                ) : (
                  msg.senderDisplayName?.slice(0, 1).toUpperCase() || "P"
                )}
              </div>
              <div className={`max-w-[75%] ${isMe ? "items-end text-right" : "items-start text-left"}`}>
                <div className="text-[10.5px] font-normal text-neutral-400 mb-0.5">
                  {msg.senderDisplayName || "Player"}
                </div>
                <div
                  className={`p-3 rounded-[16px] text-[13px] font-normal leading-relaxed ${
                    isMe
                      ? "bg-black text-white dark:bg-white dark:text-black rounded-tr-[4px]"
                      : "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white rounded-tl-[4px]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Drawer */}
      {showEmojiDrawer && (
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border-t border-black/10 dark:border-white/10 flex gap-2 overflow-x-auto hide-scrollbar">
          {CUSTOM_SERVER_EMOJIS.map((emoji) => (
            <button
              key={emoji.code}
              type="button"
              onClick={() => {
                setInputText((prev) => `${prev} ${emoji.char}`);
                setShowEmojiDrawer(false);
              }}
              className="press h-9 w-9 rounded-[12px] bg-neutral-100 dark:bg-neutral-900 grid place-items-center text-[16px] cursor-pointer"
            >
              {emoji.char}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Message Input */}
      <footer className="p-3 border-t border-black/10 dark:border-white/10 bg-white dark:bg-[#000000]">
        {!isMember ? (
          <button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="press w-full h-11 rounded-[16px] bg-black text-white dark:bg-white dark:text-black text-[13px] font-normal flex items-center justify-center cursor-pointer shadow-xs"
          >
            {joining ? "Joining..." : "Join Server to Chat"}
          </button>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmojiDrawer(!showEmojiDrawer)}
              className="press h-10 w-10 rounded-[14px] bg-neutral-100 dark:bg-neutral-900 grid place-items-center cursor-pointer text-neutral-600 dark:text-neutral-400"
            >
              <Smile className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send message..."
              className="flex-1 h-10 px-3.5 rounded-[14px] bg-neutral-100 dark:bg-neutral-900 text-[13px] font-normal outline-none text-black dark:text-white placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="press h-10 px-3.5 rounded-[14px] bg-black text-white dark:bg-white dark:text-black text-[13px] font-normal grid place-items-center cursor-pointer disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
      </footer>

      {/* Modern Slide-Up Settings: Modern Squircle, No Embeds, No Icons Yet */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 cursor-pointer"
              onClick={() => setShowSettingsModal(false)}
            />

            <motion.div
              initial={{ y: "100%", opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
              className="relative w-full max-w-[480px] h-[90dvh] flex flex-col overflow-hidden rounded-t-[32px] bg-white dark:bg-[#000000] border-t border-black/10 dark:border-white/15 shadow-2xl z-10"
            >
              {/* Modern Squircle Header (No icons, text action) */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0">
                <div>
                  <h3 className="text-[16px] font-medium">Server Settings</h3>
                  <p className="text-[11px] font-normal text-neutral-500">
                    Roles, rules and server controls
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="press px-3.5 h-8 rounded-[12px] bg-neutral-100 dark:bg-neutral-900 text-[12px] font-medium text-black dark:text-white cursor-pointer"
                >
                  Done
                </button>
              </div>

              {/* Modern Squircle Tabs (No icons) */}
              <div className="flex px-5 pt-3 gap-2 border-b border-black/5 dark:border-white/5 pb-3 shrink-0">
                {(["roles", "rules", "hype"] as SettingsTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSettingsTab(tab)}
                    className={`press px-4 h-9 rounded-[14px] text-[12.5px] font-medium capitalize cursor-pointer transition ${
                      activeSettingsTab === tab
                        ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Sheet Body - Clean Squircle Controls, No Embeds, No Icons */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4 hide-scrollbar">
                {activeSettingsTab === "roles" && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-[20px] bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15">
                      <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Owner</div>
                      <div className="text-[14px] font-medium mt-1">{group.ownerName}</div>
                    </div>

                    <div className="p-4 rounded-[20px] bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 space-y-3">
                      <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Admins</div>
                      {(!group.admins || group.admins.length === 0) ? (
                        <div className="text-[12.5px] font-normal text-neutral-500">No admins assigned</div>
                      ) : (
                        <div className="space-y-2">
                          {group.admins.map((adm) => (
                            <div key={adm} className="flex items-center justify-between text-[13px] p-2.5 rounded-[12px] bg-neutral-100 dark:bg-neutral-900">
                              <span>{adm}</span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAdmin(adm)}
                                  className="text-[11.5px] text-red-500 cursor-pointer hover:underline font-medium"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {isAdmin && (
                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            value={newAdminInput}
                            onChange={(e) => setNewAdminInput(e.target.value)}
                            placeholder="Add user ID as admin..."
                            className="flex-1 h-10 px-3.5 rounded-[14px] bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 text-[12.5px] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddAdmin}
                            className="press px-4 h-10 rounded-[14px] bg-black text-white dark:bg-white dark:text-black text-[12px] font-medium cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSettingsTab === "rules" && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsModal(false);
                        setShowFullRulesManually(true);
                      }}
                      className="press w-full h-11 px-4 rounded-[16px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-black dark:text-white text-[12.5px] font-medium flex items-center justify-center cursor-pointer transition"
                    >
                      Open Full Page Rules
                    </button>

                    <div className="space-y-2">
                      {(group.rules || []).map((r, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-[18px] bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 text-[12.5px] font-normal leading-relaxed"
                        >
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSettingsTab === "hype" && (
                  <div className="p-5 rounded-[22px] bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 space-y-4 text-center">
                    <div className="text-[24px] font-medium tracking-tight">
                      {hype} / {hypeGoal} Hype
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-black dark:bg-white transition-all rounded-full"
                        style={{ width: `${Math.min(100, (hype / hypeGoal) * 100)}%` }}
                      />
                    </div>

                    <p className="text-[12px] font-normal text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
                      Boost server hype to unlock exclusive perks, badges, and high-tier community standing.
                    </p>

                    <button
                      type="button"
                      onClick={handleBoostHype}
                      disabled={boosting}
                      className="press w-full h-12 rounded-[16px] bg-black text-white dark:bg-white dark:text-black text-[13px] font-medium cursor-pointer shadow-xs flex items-center justify-center transition"
                    >
                      {boosting ? "Boosting…" : "Boost +50 Hype"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
