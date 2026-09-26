import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Mail, PenLine, Search, Send, UserPlus, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeIncomingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  type FriendRequest,
} from "@/lib/friends-utils";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { MetallicButton } from "@/components/ui/button-metallic";

export const Route = createFileRoute("/mail")({
  head: () => ({ meta: [{ title: "Inbox — QBLOCK" }] }),
  component: MailPage,
});

type MailItem = {
  id: string;
  type: "friend_request" | "system";
  sender: string;
  username?: string;
  subject: string;
  preview: string;
  time: string;
  unread?: boolean;
  color: string;
  request?: FriendRequest;
};

export function MailPage() {
  const nav = useNavigate();
  const { qbUser, firebaseUser } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [selected, setSelected] = useState<MailItem | null>(null);
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    const uid = qbUser?.uid ?? firebaseUser?.uid;
    if (!uid) return;
    const unsub = subscribeIncomingRequests(uid, setRequests);
    return () => unsub();
  }, [qbUser?.uid, firebaseUser?.uid]);

  const mailList: MailItem[] = useMemo(() => {
    const requestItems: MailItem[] = requests.map((req) => {
      const senderName = req.fromDisplayName?.trim() || req.fromUsername || "Player";
      return {
        id: req.id,
        type: "friend_request" as const,
        sender: senderName,
        username: req.fromUsername,
        subject: `Friend Request from @${req.fromUsername || "player"}`,
        preview: `${senderName} wants to connect and play with you on QBlock.`,
        time: "Just now",
        unread: true,
        color: req.fromColor || "#d97706",
        request: req,
      };
    });

    const systemItems: MailItem[] = [
      {
        id: "system-announcements",
        type: "system" as const,
        sender: "QBlock System",
        username: "system",
        subject: "System Notifications",
        preview: "Connect with friends, jump into the Sandbox, and build custom worlds together.",
        time: "Official",
        unread: false,
        color: "#64748b",
      },
    ];

    return [...requestItems, ...systemItems];
  }, [requests]);

  const filtered = useMemo(() => {
    if (!query.trim()) return mailList;
    const q = query.toLowerCase();
    return mailList.filter(
      (m) =>
        m.sender.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q) ||
        (m.username && m.username.toLowerCase().includes(q)),
    );
  }, [mailList, query]);

  const requestList = useMemo(
    () => filtered.filter((m) => m.type === "friend_request"),
    [filtered],
  );
  const messageList = useMemo(() => filtered.filter((m) => m.type === "system"), [filtered]);

  async function handleAccept(req: FriendRequest) {
    setProcessingId(req.id);
    try {
      await acceptFriendRequest(req.id);
      setActionFeedback(`You are now friends with @${req.fromUsername || "player"}!`);
      setTimeout(() => {
        setSelected(null);
        setActionFeedback(null);
      }, 1400);
    } catch (e) {
      console.warn("Could not accept friend request", e);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDecline(req: FriendRequest) {
    setProcessingId(req.id);
    try {
      await rejectFriendRequest(req.id);
      setActionFeedback("Friend request declined.");
      setTimeout(() => {
        setSelected(null);
        setActionFeedback(null);
      }, 1200);
    } catch (e) {
      console.warn("Could not decline friend request", e);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <MobileShell hideNav>
      <div className="min-h-full bg-[#20232a] text-slate-100 pb-10">
        <header className="mail-header px-4 pt-5 pb-4 bg-[#272a33] border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav({ to: "/" as never })}
              className="press grid h-9 w-9 place-items-center rounded-[11px] bg-white/10 text-white hover:bg-white/15"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                QBLOCK / CONNECT
              </p>
              <h1 className="mt-0.5 text-[22px] font-black tracking-tight text-white">Inbox</h1>
            </div>
            <button
              onClick={() => setComposing(true)}
              className="press grid h-9 w-9 place-items-center rounded-[11px] bg-white/10 text-white hover:bg-white/15"
              aria-label="Compose"
            >
              <PenLine className="h-4 w-4" />
            </button>
          </div>
          <label className="mt-3 flex h-11 items-center gap-2 px-3 rounded-[14px] bg-[#181a20] border border-white/10 shadow-inner">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mail and requests"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-slate-500"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </label>
        </header>

        <section className="px-4 pt-5">
          {/* Section: Requests */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2 px-1">
              <span className="text-[12px] font-black uppercase tracking-wider text-slate-300">
                Requests
              </span>
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-[10.5px] font-bold text-slate-400 bg-white/10 px-2 py-0.5 rounded-full">
                {requestList.length}
              </span>
            </div>

            <div className="overflow-hidden rounded-[18px] bg-[#292c35] border border-white/10 shadow-md">
              {requestList.length > 0 ? (
                requestList.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActionFeedback(null);
                      setSelected(item);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.04] cursor-pointer ${
                      index ? "border-t border-white/10" : ""
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#353944] border border-white/10 text-slate-200 shadow-sm">
                      <UserPlus className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-black text-white">
                          {item.sender}
                        </span>
                        {item.username && (
                          <span className="text-[11px] font-semibold text-slate-400 truncate">
                            @{item.username}
                          </span>
                        )}
                        {item.unread && (
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="mt-0.5 block truncate text-[12px] font-bold text-slate-200">
                        {item.subject}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                        {item.preview}
                      </span>
                    </div>
                    {item.request && (
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={Boolean(processingId)}
                          onClick={() => item.request && handleAccept(item.request)}
                          aria-label="Accept friend request"
                          className="press grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(processingId)}
                          onClick={() => item.request && handleDecline(item.request)}
                          aria-label="Decline friend request"
                          className="press grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-slate-400 text-[12.5px] space-y-3">
                  <p>No pending friend requests</p>
                  <div className="flex justify-center pt-1">
                    <MetallicButton
                      onClick={() => nav({ to: "/search" as never })}
                      size="sm"
                      className="rounded-xl px-4 py-2 font-black text-[12px] gap-2 tracking-wide"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Find Players</span>
                    </MetallicButton>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section: Messages */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2 px-1">
              <span className="text-[12px] font-black uppercase tracking-wider text-slate-300">
                Messages
              </span>
              <div className="flex-1 h-px bg-white/15" />
              <span className="text-[10.5px] font-bold text-slate-400 bg-white/10 px-2 py-0.5 rounded-full">
                {messageList.length}
              </span>
            </div>

            <div className="overflow-hidden rounded-[18px] bg-[#292c35] border border-white/10 shadow-md">
              {messageList.length > 0 ? (
                messageList.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActionFeedback(null);
                      setSelected(item);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.04] cursor-pointer ${
                      index ? "border-t border-white/10" : ""
                    }`}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#353944] border border-white/10 text-slate-200 shadow-sm">
                      <Mail className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-black text-white">
                          {item.sender}
                        </span>
                        {item.username && (
                          <span className="text-[11px] font-semibold text-slate-400 truncate">
                            @{item.username}
                          </span>
                        )}
                        {item.unread && (
                          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="mt-0.5 block truncate text-[12px] font-bold text-slate-200">
                        {item.subject}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">
                        {item.preview}
                      </span>
                    </div>
                    <span className="self-start text-[10.5px] font-semibold text-slate-400">
                      {item.time}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-slate-400 text-[12.5px]">
                  No messages yet
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Detail / Acceptance Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelected(null)}
        >
          <article
            className="w-full max-w-sm rounded-3xl bg-[#242730] p-6 shadow-2xl border border-white/10 text-white relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-full bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-3 text-left">
              <span className="inline-block rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-0.5 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">
                {selected.type === "friend_request" ? "Friend Request" : "System Notification"}
              </span>
              <h2 className="mt-2 text-[20px] font-black text-white leading-tight">
                {selected.sender}
              </h2>
              {selected.username && (
                <p className="text-[12px] font-bold text-slate-400">@{selected.username}</p>
              )}
            </div>

            {selected.request?.fromBio && (
              <div className="mb-4 rounded-2xl bg-white/5 p-3 text-[12px] text-slate-300 border border-white/5 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  About
                </span>
                {selected.request.fromBio}
              </div>
            )}

            <p className="text-[13px] font-medium leading-relaxed text-slate-300 text-left">
              {selected.preview}
            </p>

            {actionFeedback ? (
              <div className="mt-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 p-3 text-center text-[13px] font-extrabold text-emerald-700 dark:text-emerald-400">
                {actionFeedback}
              </div>
            ) : selected.request ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={Boolean(processingId)}
                  onClick={() => selected.request && handleDecline(selected.request)}
                  className="press flex h-11 items-center justify-center gap-2 rounded-2xl text-[13px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4 text-slate-500" /> Decline
                </button>
                <button
                  type="button"
                  disabled={Boolean(processingId)}
                  onClick={() => selected.request && handleAccept(selected.request)}
                  className="press flex h-11 items-center justify-center gap-2 rounded-2xl text-[13px] font-extrabold text-slate-900 shadow-md transition disabled:opacity-50"
                  style={{
                    background: "linear-gradient(145deg, #ffe47a, #f4c430)",
                    border: "1px solid rgba(245,158,11,0.3)",
                  }}
                >
                  <Check className="h-4 w-4 text-slate-900" /> Accept
                </button>
              </div>
            ) : null}
          </article>
        </div>
      )}

      {/* ── Compose Modal ── */}
      {composing && (
        <div
          className="fixed inset-0 z-[81] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setComposing(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-t-[28px] bg-white p-5 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-black text-slate-800">New message</h2>
              <button
                onClick={() => setComposing(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/[.06] text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              className="mt-5 h-11 w-full rounded-[13px] border border-black/[.07] bg-[#f7f7f5] px-3 text-[13px] outline-none focus:border-[#d4a900]"
              placeholder="Username or recipient"
            />
            <textarea
              className="mt-3 min-h-28 w-full resize-none rounded-[13px] border border-black/[.07] bg-[#f7f7f5] p-3 text-[13px] outline-none focus:border-[#d4a900]"
              placeholder="Write a message…"
            />
            <button
              onClick={() => setComposing(false)}
              className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[13px] text-[13px] font-extrabold text-slate-900"
              style={{
                background: "linear-gradient(145deg, #ffe47a, #f4c430)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <Send className="h-4 w-4" /> Send
            </button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
