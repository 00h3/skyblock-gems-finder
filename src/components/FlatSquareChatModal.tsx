"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  orderBy,
  limitToLast,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

import { triggerHaptic } from "@/lib/haptics";
import Cubes from "@/components/ui/Cubes";
import { getUserColor } from "@/components/SandboxChat";
import { Zap, ChevronUp, ChevronDown } from "lucide-react";

interface FlatSquareChatModalProps {
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  from: string;
  uid?: string;
  text: string;
  photo?: string;
  at?: number;
}

const FAST_CHAT_PRESETS = [
  "👋 Hello!",
  "⚔️ Follow me!",
  "🛡️ Need help!",
  "✨ GG!",
  "🧱 Nice build!",
  "💎 Want to trade?",
  "🔥 Let's go!",
  "👍 Yes!",
  "👎 No",
  "🏃 Run!",
  "🎉 Victory!",
  "⛏️ Mining cavern!",
  "🏝️ Heading back to island!",
];

export function FlatSquareChatModal({ onClose }: FlatSquareChatModalProps) {
  const { qbUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showFastChat, setShowFastChat] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStartHeader = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEndHeader = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const diff = e.changedTouches[0].clientY - touchStartY.current;
      if (diff > 55) {
        triggerHaptic("light");
        onClose();
      }
    }
    touchStartY.current = null;
  };

  useEffect(() => {
    setMounted(true);
    // Exit pointer lock so mouse/touch works freely
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {}
    }

    // Auto-focus input
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    focusInput();
    const t1 = setTimeout(focusInput, 50);
    const t2 = setTimeout(focusInput, 200);

    // Close on Escape key
    const onKeyDownGlobal = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDownGlobal);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("keydown", onKeyDownGlobal);
    };
  }, [onClose]);

  // Listen to Firestore sandboxChat
  useEffect(() => {
    try {
      const q = query(
        collection(db, "sandboxChat"),
        orderBy("at", "asc"),
        limitToLast(60)
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: ChatMessage[] = snap.docs.map((d) => {
            const data = d.data() as {
              from?: string;
              uid?: string;
              text?: string;
              photo?: string;
              at?: { toMillis?: () => number } | number;
            };
            const atMs =
              typeof data.at === "number"
                ? data.at
                : data.at?.toMillis?.() ?? Date.now();

            return {
              id: d.id,
              from: data.from || "Player",
              uid: data.uid,
              text: data.text || "",
              photo: data.photo,
              at: atMs,
            };
          });
          setMessages(list);
        },
        (err) => {
          console.warn("FlatSquareChat: Firestore listener warning:", err);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn("Could not attach chat listener:", e);
    }
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInputText("");

    const myUid =
      qbUser?.uid ||
      localStorage.getItem("qb_guest_id") ||
      "guest_" + Math.random().toString(36).slice(2, 7);

    const myName =
      qbUser?.displayName ||
      qbUser?.username ||
      "Player " + myUid.slice(-4);

    const myPhoto = qbUser?.profilePhoto || "";

    // Optimistic message
    const optimisticMsg: ChatMessage = {
      id: "opt_" + Date.now(),
      from: myName,
      uid: myUid,
      text: trimmed.slice(0, 240),
      photo: myPhoto,
      at: Date.now(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await addDoc(collection(db, "sandboxChat"), {
        text: trimmed.slice(0, 240),
        from: myName,
        uid: myUid,
        photo: myPhoto,
        at: serverTimestamp(),
      });
      window.dispatchEvent(
        new CustomEvent("qb-self-say", { detail: trimmed.slice(0, 240) })
      );
    } catch (err) {
      console.warn("Error sending chat message to Firestore:", err);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleFastChat = async (phrase: string) => {
    if (sending) return;
    triggerHaptic("medium");
    setSending(true);

    const myUid =
      qbUser?.uid ||
      localStorage.getItem("qb_guest_id") ||
      "guest_" + Math.random().toString(36).slice(2, 7);

    const myName =
      qbUser?.displayName ||
      qbUser?.username ||
      "Player " + myUid.slice(-4);

    const myPhoto = qbUser?.profilePhoto || "";

    const optimisticMsg: ChatMessage = {
      id: "opt_" + Date.now(),
      from: myName,
      uid: myUid,
      text: phrase,
      photo: myPhoto,
      at: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await addDoc(collection(db, "sandboxChat"), {
        text: phrase,
        from: myName,
        uid: myUid,
        photo: myPhoto,
        at: serverTimestamp(),
      });
      window.dispatchEvent(
        new CustomEvent("qb-self-say", { detail: phrase })
      );
    } catch (err) {
      console.warn("Error sending fast chat to Firestore:", err);
    } finally {
      setSending(false);
      setShowFastChat(false);
    }
  };

  const currentUsername =
    qbUser?.displayName || qbUser?.username || "Player";
  const currentPhoto = qbUser?.profilePhoto;

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="flat-square-chat-fullscreen"
      className="fixed inset-0 z-[99999] pointer-events-auto flex flex-col bg-[#0e1117] text-white overflow-hidden select-text font-['Inter'] font-semibold rounded-none"
      style={{
        borderRadius: 0,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* ── Top Header: Sharp Rectangular Dark Grey Inventory Bar ── */}
      <div
        onTouchStart={onTouchStartHeader}
        onTouchEnd={onTouchEndHeader}
        className="relative z-10 h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-[#161a24] border-b-2 border-[#2b3346] shadow-xl select-none rounded-none"
      >
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-bold tracking-wider text-white uppercase font-['Inter']">
            Main Server Chat
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-none border border-emerald-500/40 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-none bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Fast Chat Toggle Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setShowFastChat((v) => !v);
            }}
            className={`h-9 px-3 flex items-center gap-1.5 text-[12px] font-bold tracking-wide cursor-pointer transition-colors border rounded-none ${
              showFastChat
                ? "bg-[#fa4616] border-[#ff6a3c] text-white"
                : "bg-[#232938] hover:bg-[#2e3748] border-[#3b465c] text-zinc-200"
            }`}
            title="Fast Chat Presets"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Fast Chat</span>
            {showFastChat ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          {/* Sharp rectangle close button */}
          <button
            id="btn-chat-modal-close"
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-none bg-[#232938] hover:bg-[#2e3748] active:bg-[#343e52] text-white text-[18px] font-bold cursor-pointer select-none transition-colors border border-[#3b465c] outline-none"
            aria-label="Close chat"
            title="Close chat"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Fast Chat Drawer (Expandable) ── */}
      {showFastChat && (
        <div className="relative z-20 bg-[#141822] border-b-2 border-[#2b3346] p-3 shadow-2xl shrink-0 rounded-none animate-fadeIn">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Quick Responses (Fast Chat)
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Tap any to send instantly</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
            {FAST_CHAT_PRESETS.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleFastChat(phrase)}
                className="px-2.5 py-1.5 text-left text-[12px] font-bold bg-[#1e2433] hover:bg-[#2b3449] active:bg-[#fa4616] text-zinc-200 hover:text-white border border-[#313c52] rounded-none transition-all truncate shadow-sm cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages List Area: Sharp Grey Inventory Slots ── */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 bg-[#0e1117]/80 rounded-none"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="w-14 h-14 rounded-none bg-[#1c2230] border-2 border-[#2e374a] flex items-center justify-center text-[22px] font-semibold text-white/70 mb-3 shadow-inner">
              💬
            </div>
            <p className="text-[15px] font-bold text-white uppercase tracking-wider">No server messages yet</p>
            <p className="text-[12px] text-zinc-400 mt-1 max-w-sm font-medium">
              Send a message or select a fast chat preset to talk with players across all servers.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe =
              (qbUser?.uid && m.uid === qbUser.uid) ||
              m.from === currentUsername;

            const timeStr = m.at
              ? new Date(m.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            const userCol = getUserColor(m.from);

            return (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 max-w-2xl ${isMe ? "ml-auto flex-row-reverse" : ""}`}
              >
                {/* Profile Picture Slot: Sharp 90-degree rectangle */}
                <div
                  className="w-8 h-8 shrink-0 rounded-none bg-[#161a24] border-2 border-[#2b3346] shadow-inner flex items-center justify-center overflow-hidden select-none"
                  title={m.from}
                >
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.from}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span style={{ color: userCol }} className="text-[12px] font-bold">
                      {(m.from.charAt(0) || "P").toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Inventory message container: Sharp rectangle */}
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} min-w-0`}>
                  <div className="flex items-center gap-1.5 mb-1 px-0.5">
                    <span style={{ color: userCol }} className="text-[12px] font-bold">
                      {m.from}
                      {isMe && " (You)"}
                    </span>
                    <span className="text-[9px] bg-white/10 text-zinc-300 px-1 py-0.2 rounded-none font-mono font-semibold border border-white/10">
                      [user]
                    </span>
                    {timeStr && (
                      <span className="text-[10px] font-mono text-zinc-500 font-normal ml-1">
                        {timeStr}
                      </span>
                    )}
                  </div>

                  <div
                    className={`rounded-none px-3.5 py-2 text-[13px] font-semibold leading-relaxed break-words shadow-sm font-['Inter'] border-2 ${
                      isMe
                        ? "bg-[#1f2635] border-[#3a4760] text-white"
                        : "bg-[#161a24] border-[#293345] text-slate-100"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Fast Chat Quick Strip (Always accessible 1-tap strip) ── */}
      <div className="relative z-10 bg-[#12151e] border-t border-[#232938] px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 select-none">
        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold shrink-0 flex items-center gap-1 mr-1">
          <Zap className="w-3 h-3 text-amber-400" /> Quick:
        </span>
        {FAST_CHAT_PRESETS.slice(0, 7).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handleFastChat(p)}
            className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-[#1a202c] hover:bg-[#252e3f] active:bg-[#fa4616] text-zinc-200 hover:text-white border border-[#2e3748] rounded-none transition-colors cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Bottom Input Bar: Sharp Grey Inventory Style ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative z-10 bg-[#161a24] border-t-2 border-[#2b3346] shadow-2xl p-3 sm:p-4 pb-[max(14px,calc(env(safe-area-inset-bottom)+8px))] flex items-center gap-2.5 select-none rounded-none"
      >
        {/* User avatar slot */}
        <div
          className="w-10 h-10 shrink-0 rounded-none bg-[#11141c] border-2 border-[#2c364c] hidden sm:flex items-center justify-center overflow-hidden select-none"
          title={currentUsername}
        >
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={currentUsername}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[14px] font-bold text-white">
              {(currentUsername.charAt(0) || "P").toUpperCase()}
            </span>
          )}
        </div>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            (e.nativeEvent as Event).stopImmediatePropagation?.();
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onKeyUp={(e) => {
            e.stopPropagation();
            (e.nativeEvent as Event).stopImmediatePropagation?.();
          }}
          onKeyPress={(e) => {
            e.stopPropagation();
            (e.nativeEvent as Event).stopImmediatePropagation?.();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          placeholder="Type a message to all players..."
          maxLength={240}
          autoFocus
          className="pointer-events-auto flex-1 h-10 rounded-none bg-[#0e1118] border-2 border-[#2b3448] text-white placeholder-zinc-500 px-3.5 text-[13px] font-semibold outline-none focus:border-[#fa4616] transition-all select-text font-['Inter']"
          style={{
            userSelect: "text",
            WebkitUserSelect: "text",
          }}
        />

        {/* Send button */}
        <button
          id="btn-chat-modal-send"
          type="submit"
          disabled={!inputText.trim() || sending}
          className="pointer-events-auto h-10 px-5 rounded-none bg-[#fa4616] hover:bg-[#ff5726] active:bg-[#e03a0d] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-[13px] tracking-wide cursor-pointer select-none transition-all border-2 border-[#ff6a3c] outline-none font-['Inter'] shadow-md"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>,
    document.body
  );
}
