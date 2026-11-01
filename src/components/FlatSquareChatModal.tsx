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
      className="fixed inset-0 z-[99999] pointer-events-auto flex flex-col bg-black/75 backdrop-blur-2xl text-white overflow-hidden select-text font-['Inter'] font-semibold"
      style={{
        borderRadius: 0,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* ── Top Header: Welcome-page blur & Inventory grey bottom outline ── */}
      <div
        onTouchStart={onTouchStartHeader}
        onTouchEnd={onTouchEndHeader}
        className="h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-black/40 border-b-2 border-white/20 backdrop-blur-xl select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-semibold tracking-wider text-white uppercase font-['Inter']">
            Chat
          </span>
          <span className="text-[12px] font-mono font-medium text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
            LIVE
          </span>
        </div>

        {/* Square close button */}
        <button
          id="btn-chat-modal-close"
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-[20px] font-semibold cursor-pointer select-none transition-colors border border-white/15 border-b-2 border-white/25 outline-none"
          aria-label="Close chat"
          title="Close chat"
        >
          ×
        </button>
      </div>

      {/* ── Messages List Area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-black/20"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 border-b-2 border-white/30 flex items-center justify-center text-[22px] font-semibold text-white/70 mb-3 backdrop-blur-md">
              💬
            </div>
            <p className="text-[16px] font-semibold text-white/90">No messages yet</p>
            <p className="text-[13px] text-white/50 mt-1 max-w-sm font-normal">
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

            return (
              <div
                key={m.id}
                className="flex items-start gap-3 max-w-2xl"
              >
                {/* Profile Picture */}
                <div
                  className="w-10 h-10 shrink-0 rounded-xl bg-white/10 border border-white/20 border-b-2 border-white/30 flex items-center justify-center overflow-hidden select-none shadow-sm"
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
                    <span className="text-[14px] font-semibold text-white/80">
                      {(m.from.charAt(0) || "P").toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Rectangle Bubble with inventory style grey bottom outline */}
                <div
                  className={`flex-1 p-3 rounded-xl border border-white/15 border-b-2 border-white/20 backdrop-blur-md ${
                    isMe
                      ? "bg-amber-500/15 border-amber-400/25 border-b-2 border-amber-400/40"
                      : "bg-white/10"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-1 mb-1.5">
                    <span
                      className={`text-[13px] font-semibold tracking-wide ${
                        isMe ? "text-amber-300" : "text-white"
                      }`}
                    >
                      {m.from}
                      {isMe && " (You)"}
                    </span>
                    {timeStr && (
                      <span className="text-[11px] font-mono text-white/50 font-normal">
                        {timeStr}
                      </span>
                    )}
                  </div>

                  <p className="text-[14px] font-semibold text-white/95 break-words leading-relaxed whitespace-pre-wrap font-['Inter']">
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom Input Bar: Blur & Inventory grey bottom outline ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-black/50 border-t border-white/15 border-b-2 border-white/20 backdrop-blur-xl p-3 sm:p-4 pb-[max(12px,calc(env(safe-area-inset-bottom)+8px))] flex items-center gap-3 select-none"
      >
        {/* User avatar */}
        <div
          className="w-11 h-11 shrink-0 rounded-xl bg-white/10 border border-white/20 border-b-2 border-white/30 hidden sm:flex items-center justify-center overflow-hidden select-none"
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
            <span className="text-[15px] font-semibold text-white/80">
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
          className="pointer-events-auto flex-1 h-11 rounded-xl bg-white/10 border border-white/20 border-b-2 border-white/30 text-white placeholder-white/40 px-3.5 text-[14px] font-semibold outline-none focus:border-amber-400/60 transition-all select-text font-['Inter']"
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
          className="pointer-events-auto h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-black font-semibold text-[14px] tracking-wide cursor-pointer select-none transition-all border border-amber-300 border-b-2 border-amber-600 outline-none font-['Inter']"
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>,
    document.body
  );
}
