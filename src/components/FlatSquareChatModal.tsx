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

export function FlatSquareChatModal({ onClose }: FlatSquareChatModalProps) {
  const { qbUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
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

  const currentUsername =
    qbUser?.displayName || qbUser?.username || "Player";
  const currentPhoto = qbUser?.profilePhoto;

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="flat-square-chat-fullscreen"
      className="fixed inset-0 z-[99999] pointer-events-auto flex flex-col bg-[#12151d]/95 backdrop-blur-2xl text-white overflow-hidden select-text font-['Inter'] font-semibold"
      style={{
        borderRadius: 0,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* ── 9:49 AM Note: React Bits Cubes 3D WebGL background ── */}
      <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
        <Cubes gridSize={8} faceColor="#1e2433" edgeColor="#38455e" rippleColor="#fa4616" />
      </div>

      {/* ── Top Header: Dark Grey Inventory Bar ── */}
      <div
        onTouchStart={onTouchStartHeader}
        onTouchEnd={onTouchEndHeader}
        className="relative z-10 h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-[#161a24] border-b-2 border-[#2b3346] shadow-lg select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-3">
          <span className="text-[16px] font-bold tracking-wider text-white uppercase font-['Inter']">
            Island Chat
          </span>
          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        </div>

        {/* Square close button */}
        <button
          id="btn-chat-modal-close"
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-md bg-[#232938] hover:bg-[#2e3748] active:bg-[#343e52] text-white text-[18px] font-bold cursor-pointer select-none transition-colors border border-[#3b465c] outline-none"
          aria-label="Close chat"
          title="Close chat"
        >
          ×
        </button>
      </div>

      {/* ── Messages List Area: Grey Inventory Slots ── */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#11141c]/50"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="w-14 h-14 rounded-xl bg-[#1c2230] border border-[#2e374a] flex items-center justify-center text-[22px] font-semibold text-white/70 mb-3 shadow-inner">
              💬
            </div>
            <p className="text-[16px] font-bold text-white">No messages yet</p>
            <p className="text-[13px] text-zinc-400 mt-1 max-w-sm font-medium">
              Type a message below to chat with players currently on this island.
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
                {/* Profile Picture Slot */}
                <div
                  className="w-9 h-9 shrink-0 rounded-md bg-[#181d29] border border-[#2c364c] shadow-inner flex items-center justify-center overflow-hidden select-none"
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
                    <span style={{ color: userCol }} className="text-[13px] font-bold">
                      {(m.from.charAt(0) || "P").toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Inventory message container */}
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} min-w-0`}>
                  <div className="flex items-center gap-1.5 mb-1 px-0.5">
                    <span style={{ color: userCol }} className="text-[12px] font-bold">
                      {m.from}
                      {isMe && " (You)"}
                    </span>
                    <span className="text-[9.5px] bg-white/10 text-zinc-300 px-1 py-0.2 rounded font-mono font-semibold">
                      [user]
                    </span>
                    {timeStr && (
                      <span className="text-[10px] font-mono text-zinc-500 font-normal ml-1">
                        {timeStr}
                      </span>
                    )}
                  </div>

                  <div
                    className={`rounded-md px-3.5 py-2 text-[13px] font-semibold leading-relaxed break-words shadow-sm font-['Inter'] ${
                      isMe
                        ? "bg-[#232b3b] border border-[#3a4760] text-white"
                        : "bg-[#181d28] border border-[#293345] text-slate-100"
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

      {/* ── Bottom Input Bar: Grey Inventory Style ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative z-10 bg-[#141722] border-t-2 border-[#2b3346] shadow-2xl p-3 sm:p-4 pb-[max(14px,calc(env(safe-area-inset-bottom)+8px))] flex items-center gap-2.5 select-none"
      >
        {/* User avatar slot */}
        <div
          className="w-10 h-10 shrink-0 rounded-md bg-[#181d29] border border-[#2c364c] hidden sm:flex items-center justify-center overflow-hidden select-none"
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
          placeholder="Type a message..."
          maxLength={240}
          autoFocus
          className="pointer-events-auto flex-1 h-10 rounded-md bg-[#0e1118] border border-[#2b3448] text-white placeholder-zinc-500 px-3.5 text-[13px] font-semibold outline-none focus:border-[#fa4616] transition-all select-text font-['Inter']"
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
          className="pointer-events-auto h-10 px-4 rounded-md bg-[#fa4616] hover:bg-[#ff5726] active:bg-[#e03a0d] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-[13px] tracking-wide cursor-pointer select-none transition-all border border-[#ff6a3c] outline-none font-['Inter'] shadow-md"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>,
    document.body
  );
}
