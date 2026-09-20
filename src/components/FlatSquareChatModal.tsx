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
      className="fixed inset-0 z-[99999] pointer-events-auto flex flex-col bg-[#747474] text-white overflow-hidden select-text"
      style={{
        borderRadius: 0,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* ── Top Header: Flat, Square, Grey ── */}
      <div
        className="h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between bg-[#636363] border-b-2 border-[#505050] select-none"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-bold tracking-wider text-white uppercase">
            Chat
          </span>
          <span className="text-[12px] font-mono text-white/60 bg-[#525252] px-2 py-0.5 border border-[#424242]">
            LIVE
          </span>
        </div>

        {/* Flat square close button */}
        <button
          id="btn-chat-modal-close"
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-[#7c7c7c] hover:bg-[#686868] active:bg-[#4f4f4f] text-white text-[22px] font-bold cursor-pointer select-none transition-colors border-[1.5px] border-[#505050] outline-none"
          style={{ borderRadius: 0 }}
          aria-label="Close chat"
          title="Close chat"
        >
          ×
        </button>
      </div>

      {/* ── Messages List Area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#6c6c6c]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
            <div
              className="w-14 h-14 bg-[#585858] border-[1.5px] border-[#484848] flex items-center justify-center text-[20px] font-bold text-white/50 mb-3"
              style={{ borderRadius: 0 }}
            >
              💬
            </div>
            <p className="text-[15px] font-bold text-white/80">No messages yet</p>
            <p className="text-[13px] text-white/50 mt-1 max-w-sm">
              Type a message below to chat with players currently in this game.
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
                {/* Square Profile Picture (ofo / pfp) */}
                <div
                  className="w-10 h-10 shrink-0 bg-[#555555] border-[1.5px] border-[#484848] flex items-center justify-center overflow-hidden select-none"
                  style={{ borderRadius: 0 }}
                  title={m.from}
                >
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.from}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      style={{ borderRadius: 0 }}
                    />
                  ) : (
                    <span className="text-[14px] font-bold text-white/80">
                      {(m.from.charAt(0) || "P").toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Rectangle Bubble: fetches actual username, time, and text */}
                <div
                  className={`flex-1 p-3 border-[1.5px] ${
                    isMe
                      ? "bg-[#545454] border-[#444444]"
                      : "bg-[#5e5e5e] border-[#4e4e4e]"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-baseline justify-between gap-2 border-b border-white/10 pb-1 mb-1.5">
                    <span
                      className={`text-[13px] font-bold tracking-wide ${
                        isMe ? "text-[#facc15]" : "text-white"
                      }`}
                    >
                      {m.from}
                      {isMe && " (You)"}
                    </span>
                    {timeStr && (
                      <span className="text-[11px] font-mono text-white/50">
                        {timeStr}
                      </span>
                    )}
                  </div>

                  <p className="text-[14px] text-white/95 break-words leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom Input Bar: Flat, Square, Grey ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-[#636363] border-t-2 border-[#505050] p-3 sm:p-4 pb-[max(12px,calc(env(safe-area-inset-bottom)+8px))] flex items-center gap-3 select-none"
        style={{ borderRadius: 0 }}
      >
        {/* User square avatar */}
        <div
          className="w-11 h-11 shrink-0 bg-[#505050] border-[1.5px] border-[#404040] hidden sm:flex items-center justify-center overflow-hidden select-none"
          style={{ borderRadius: 0 }}
          title={currentUsername}
        >
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt={currentUsername}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              style={{ borderRadius: 0 }}
            />
          ) : (
            <span className="text-[15px] font-bold text-white/80">
              {(currentUsername.charAt(0) || "P").toUpperCase()}
            </span>
          )}
        </div>

        {/* Flat square input field with full pointer and typing support */}
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
          className="pointer-events-auto flex-1 h-11 bg-[#505050] border-[1.5px] border-[#404040] text-white placeholder-white/40 px-3.5 text-[14px] outline-none focus:border-[#a0a0a0] transition-colors select-text"
          style={{
            borderRadius: 0,
            userSelect: "text",
            WebkitUserSelect: "text",
          }}
        />

        {/* Flat square Send button */}
        <button
          id="btn-chat-modal-send"
          type="submit"
          disabled={!inputText.trim() || sending}
          className="pointer-events-auto h-11 px-5 bg-[#7c7c7c] hover:bg-[#686868] active:bg-[#4f4f4f] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-[14px] tracking-wide cursor-pointer select-none transition-colors border-[1.5px] border-[#505050] outline-none"
          style={{ borderRadius: 0 }}
        >
          {sending ? "..." : "Send"}
        </button>
      </form>
    </div>,
    document.body
  );
}
