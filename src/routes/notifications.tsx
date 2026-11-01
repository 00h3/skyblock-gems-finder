import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ChevronLeft, Check, X, RefreshCw, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { MetallicButton } from "@/components/ui/button-metallic";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  subscribeIncomingRequests,
  type FriendRequest,
} from "@/lib/friends-utils";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Inbox — QBlock" }] }),
  component: NotificationsPage,
});

interface RealNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  unread?: boolean;
}

function NotificationsPage() {
  const navigate = useNavigate();
  const { qbUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"email" | "requests">("email");
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [emails, setEmails] = useState<RealNotification[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<RealNotification | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Subscribe to real incoming friend requests
  useEffect(() => {
    if (!qbUser) return;
    const unsub = subscribeIncomingRequests(qbUser.uid, (incoming) => {
      setRequests(incoming);
    });
    return () => unsub();
  }, [qbUser]);

  // Subscribe to real system / user notifications if any exist
  useEffect(() => {
    if (!qbUser) return;
    try {
      const q = query(
        collection(db, "users", qbUser.uid, "notifications"),
        orderBy("createdAt", "desc"),
        limit(20),
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const items: RealNotification[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || "Notification",
              body: data.body || "",
              date: data.createdAt?.toDate
                ? data.createdAt.toDate().toLocaleDateString()
                : "Recent",
              unread: data.read !== true,
            };
          });
          setEmails(items);
        },
        () => {
          // Fallback if collection doesn't exist yet
          setEmails([]);
        },
      );
      return () => unsub();
    } catch {
      setEmails([]);
    }
  }, [qbUser]);

  async function updateRequest(requestId: string, action: "accept" | "reject") {
    setBusyId(requestId);
    try {
      if (action === "accept") {
        await acceptFriendRequest(requestId);
        toast.success("Friend request accepted!");
      } else {
        await rejectFriendRequest(requestId);
        toast.success("Friend request declined");
      }
    } catch (error) {
      toast.error("Could not update friend request. Please try again.");
      console.error("Could not update friend request:", error);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <MobileShell>
      {/* Header */}
      <header className="h-[56px] px-4 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] bg-white/90 dark:bg-[#121316]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <Link
            to={"/" as never}
            className="press h-8 w-8 rounded-[10px] bg-black/5 dark:bg-white/10 text-slate-800 dark:text-white grid place-items-center"
            aria-label="Back to home"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-[17px] font-black tracking-tight text-slate-900 dark:text-white">
            Inbox
          </h1>
        </div>

        {requests.length > 0 && (
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-[#fa4616] text-white">
            {requests.length} new
          </span>
        )}
      </header>

      {/* Soft Glossy Squircle Divider Bar (No Icons as requested) */}
      <div className="px-4 pt-3 pb-1.5">
        <div
          className="p-1 rounded-[16px] flex items-center gap-1 border border-black/[0.08] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
          style={{
            background:
              "linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(238, 242, 248, 0.88))",
          }}
        >
          {/* Email Tab - NO ICON */}
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`press flex-1 h-[36px] rounded-[13px] flex items-center justify-center gap-1.5 text-[12.5px] font-black transition-all ${
              activeTab === "email"
                ? "bg-white dark:bg-[#1f222b] text-slate-900 dark:text-white shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(0,0,0,0.06)] border border-black/5"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Email</span>
            {emails.some((e) => e.unread) && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#fa4616]" />
            )}
          </button>

          {/* Requests Tab - NO ICON */}
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`press flex-1 h-[36px] rounded-[13px] flex items-center justify-center gap-1.5 text-[12.5px] font-black transition-all ${
              activeTab === "requests"
                ? "bg-white dark:bg-[#1f222b] text-slate-900 dark:text-white shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_6px_rgba(0,0,0,0.06)] border border-black/5"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Requests</span>
            {requests.length > 0 && (
              <span className="h-4 min-w-[16px] px-1 rounded-full bg-[#fa4616] text-white text-[10px] font-black grid place-items-center">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area - Compact & Reduced Size */}
      <main className="px-4 py-2 space-y-2.5 pb-20">
        {activeTab === "email" ? (
          /* Email Section - No Placeholder Images, Real Data Only */
          emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedEmail(item)}
                  className="press p-3 rounded-[15px] border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#16181f] cursor-pointer shadow-xs active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[13px] font-black text-slate-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <span className="text-[10.5px] font-medium text-slate-400 shrink-0">
                      {item.date}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 px-4 rounded-[18px] border border-dashed border-black/[0.08] dark:border-white/[0.08] text-center space-y-1 bg-slate-50/50 dark:bg-white/[0.02]">
              <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                No new messages
              </p>
              <p className="text-[11.5px] text-slate-400">
                Your notifications and updates will show up here.
              </p>
            </div>
          )
        ) : (
          /* Requests Section - Real Requests Only */
          <div className="space-y-2">
            {requests.length > 0 ? (
              <>
                <div className="flex items-center justify-between pb-1 px-0.5">
                  <span className="text-[12px] font-bold text-slate-500">
                    Incoming Requests ({requests.length})
                  </span>
                  <MetallicButton
                    onClick={() => navigate({ to: "/search" as never })}
                    size="sm"
                    className="rounded-xl px-3 py-1.5 text-[11.5px] font-bold gap-1.5 h-8.5 shadow-sm"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Find Players</span>
                  </MetallicButton>
                </div>
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-3 rounded-[16px] border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#16181f] flex items-center justify-between gap-3 shadow-xs"
                  >
                    {/* Squircle PFP */}
                    <div
                      className="relative h-11 w-11 shrink-0 rounded-[12px] overflow-hidden border border-black/10 dark:border-white/10 shadow-xs flex items-center justify-center bg-slate-100"
                      style={{ background: request.fromColor ?? "#fa4616" }}
                    >
                      <GlossyAvatar
                        snapshot={request.fromAvatar}
                        frame={request.fromAvatar?.frameId}
                        portrait={request.fromUsername?.toLowerCase() === "ira"}
                        height={44}
                        className="h-full w-full"
                        autoRotate={false}
                        focusZone="head"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-black text-slate-900 dark:text-white truncate">
                        {request.fromDisplayName || request.fromUsername || "Player"}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 truncate">
                        @{request.fromUsername || "user"} • Friend request
                      </div>
                    </div>

                    {/* Action buttons with same glossiness as Free */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateRequest(request.id, "accept")}
                        disabled={busyId === request.id}
                        className="qb-squircle press relative h-8 px-3 shrink-0 flex items-center gap-1 font-extrabold text-[12px] text-[#17191d] dark:text-white active:scale-95 transition-transform select-none cursor-pointer disabled:opacity-50"
                      >
                        {busyId === request.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRequest(request.id, "reject")}
                        disabled={busyId === request.id}
                        className="qb-squircle press relative h-8 w-8 shrink-0 grid place-items-center text-[#5f646d] dark:text-[#9ea7b3] active:scale-95 transition-transform select-none cursor-pointer disabled:opacity-50"
                        aria-label="Decline request"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="py-10 px-4 rounded-[18px] border border-dashed border-black/[0.08] dark:border-white/[0.08] text-center space-y-3 bg-slate-50/50 dark:bg-white/[0.02]">
                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">
                  No Pending Requests
                </p>
                <p className="text-[11.5px] text-slate-400 max-w-[240px] mx-auto">
                  When players add you by ID or username, their requests will appear here.
                </p>
                <div className="pt-2 flex justify-center">
                  <MetallicButton
                    onClick={() => navigate({ to: "/search" as never })}
                    size="sm"
                    className="rounded-xl px-4 py-2 font-bold text-[12px] gap-2 shadow-sm text-foreground"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Find Players</span>
                  </MetallicButton>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Real Email / Notification Reader Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-[420px] bg-white dark:bg-[#16181f] rounded-[20px] shadow-xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08]">
              <span className="text-[13px] font-black text-slate-900 dark:text-white truncate">
                {selectedEmail.title}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="press h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 grid place-items-center text-slate-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                {selectedEmail.body}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-white/[0.03] border-t border-black/[0.06] dark:border-white/[0.06] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="press px-4 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-[10px] font-bold text-[12px]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
