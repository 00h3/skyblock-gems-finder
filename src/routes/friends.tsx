import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { Check, X, Users, UserPlus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfileSheet, type ProfileUser } from "@/components/ProfileSheet";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  subscribeFriends,
  subscribeIncomingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  areFriends,
  ensureChatMeta,
  uidColor,
  type Friend,
  type FriendRequest,
} from "@/lib/friends-utils";

export const Route = createFileRoute("/friends")({
  head: () => ({ meta: [{ title: "Requests — QBlock" }] }),
  component: FriendsPage,
});

function FriendsPage() {
  const nav = useNavigate();
  const { qbUser } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [requestModal, setRequestModal] = useState<FriendRequest | null>(null);
  const [accepting, setAccepting] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ProfileUser | null>(null);

  useEffect(() => {
    if (!qbUser) return;
    const unsub = subscribeIncomingRequests(qbUser.uid, (realRequests) => {
      if (realRequests.length === 0) {
        // Show some mock requests for preview purposes if real ones are empty
        setRequests([
          {
            id: "mock-1",
            from: "user_a",
            to: qbUser.uid,
            status: "pending",
            createdAt: Date.now(),
            fromDisplayName: "ProGamer99",
            fromUsername: "progamer99",
            fromBio: "I love playing Skyblock!",
            fromColor: "#3b82f6",
          },
          {
            id: "mock-2",
            from: "user_b",
            to: qbUser.uid,
            status: "pending",
            createdAt: Date.now(),
            fromDisplayName: "xX_Dragon_Xx",
            fromUsername: "dragon_slayer",
            fromBio: "Let's build together.",
            fromColor: "#ef4444",
          },
        ]);
      } else {
        setRequests(realRequests);
      }
    });
    return () => {
      unsub();
    };
  }, [qbUser]);

  async function handleAccept(req: FriendRequest) {
    setAccepting((s) => new Set([...s, req.id]));
    try {
      await acceptFriendRequest(req.id);
      toast.success("Friend request accepted");
    } catch (error) {
      toast.error("That friend request could not be accepted.");
      console.error("Could not accept friend request:", error);
    } finally {
      setAccepting((s) => {
        const n = new Set(s);
        n.delete(req.id);
        return n;
      });
    }
  }

  async function handleReject(req: FriendRequest) {
    setRejecting((s) => new Set([...s, req.id]));
    try {
      await rejectFriendRequest(req.id);
      toast.success("Friend request declined");
    } catch (error) {
      toast.error("That friend request could not be declined.");
      console.error("Could not reject friend request:", error);
    } finally {
      setRejecting((s) => {
        const n = new Set(s);
        n.delete(req.id);
        return n;
      });
    }
  }

  return (
    <MobileShell>
      <div className="px-5 pt-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d97706]">
              Notifications
            </p>
            <h1 className="mt-1 text-[26px] font-extrabold text-slate-900 dark:text-white">
              Requests
            </h1>
          </div>
          <span className="mb-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/40 px-3 py-1 text-[11px] font-extrabold text-amber-800 dark:text-amber-400">
            {requests.length} pending
          </span>
        </div>
      </div>

      <div className="mt-5 px-5 pb-6">
        {requests.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-center p-8 rounded-3xl bg-white dark:bg-[#17191e] border border-slate-100 dark:border-white/10 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 grid place-items-center shadow-inner">
              <UserPlus className="h-8 w-8 stroke-[2.2]" />
            </div>
            <div className="text-[17px] font-extrabold text-slate-900 dark:text-white">
              No Pending Requests
            </div>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              When other players send you a friend request, they will appear right here so you can
              accept and play together!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                onClick={() => setRequestModal(r)}
                className="p-4 flex items-center gap-3 bg-white dark:bg-[#17191e] border border-slate-100 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.99]"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="h-12 w-12 rounded-[14px]"
                    style={{ background: r.fromColor ?? "#F4C430" }}
                  >
                    <GlossyAvatar
                      snapshot={r.fromAvatar}
                      frame={r.fromAvatar?.frameId}
                      portrait={r.fromUsername?.toLowerCase() === "ira"}
                      height={48}
                      className="h-full w-full"
                      autoRotate={false}
                      focusZone="head"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-black truncate text-slate-900 dark:text-white">
                    {r.fromDisplayName ?? r.from}
                  </div>
                  <div className="text-[12px] font-semibold text-slate-400 truncate">
                    @{r.fromUsername}
                  </div>
                </div>
                <div
                  className="flex items-center gap-2 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setRequestModal(r)}
                    disabled={accepting.has(r.id) || rejecting.has(r.id)}
                    className="press-flat px-4 h-9 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[12.5px] font-black flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    Respond
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ProfileSheet
          user={selected}
          onClose={() => setSelected(null)}
          onChat={async () => {
            const uid = selected.id;
            setSelected(null);
            if (!qbUser) return;
            try {
              const friendsNow = await areFriends(qbUser.uid, uid);
              if (!friendsNow) return;
              const chatId = await ensureChatMeta(qbUser.uid, uid);
              nav({ to: "/chat/$id" as never, params: { id: chatId } as never });
            } catch (error) {
              toast.error("Friend status could not be verified yet.");
              console.error("Could not open friend chat:", error);
            }
          }}
        />
      )}
      {requestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setRequestModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#17191e] p-6 shadow-2xl border border-slate-100 dark:border-white/10 text-slate-800 dark:text-white relative animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setRequestModal(null)}
              className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-3">
              <span className="inline-block rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                Friend Request
              </span>
              <h2 className="mt-2 text-[20px] font-black text-slate-900 dark:text-white leading-tight">
                {requestModal.fromDisplayName ?? requestModal.from}
              </h2>
              {requestModal.fromUsername && (
                <p className="text-[12px] font-bold text-slate-400">@{requestModal.fromUsername}</p>
              )}
            </div>

            {requestModal.fromBio && (
              <div className="mb-4 rounded-2xl bg-slate-50 dark:bg-white/5 p-3 text-[12px] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  About
                </span>
                {requestModal.fromBio}
              </div>
            )}

            <p className="text-[13px] font-medium leading-relaxed text-slate-600 dark:text-slate-300 mb-5">
              Would you like to accept this friend request from{" "}
              {requestModal.fromDisplayName ?? requestModal.from}? Accepting allows you to send
              instant messages and join games together!
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                disabled={accepting.has(requestModal.id) || rejecting.has(requestModal.id)}
                onClick={async () => {
                  const req = requestModal;
                  setRequestModal(null);
                  await handleReject(req);
                }}
                className="press h-11 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 font-bold text-[13px] flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <X className="h-4 w-4 text-slate-500" /> Decline
              </button>

              <button
                type="button"
                disabled={accepting.has(requestModal.id) || rejecting.has(requestModal.id)}
                onClick={async () => {
                  const req = requestModal;
                  setRequestModal(null);
                  await handleAccept(req);
                }}
                className="press h-11 rounded-2xl text-[13px] font-extrabold text-slate-950 flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
                style={{
                  background: "linear-gradient(145deg, #ffe47a, #f4c430)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <Check className="h-4 w-4 text-slate-950" /> Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function FriendRow({
  color,
  title,
  sub,
  online,
  avatarSnapshot,
  frame,
  portrait,
  children,
}: {
  color: string;
  title: string;
  sub: string;
  online?: boolean;
  avatarSnapshot?: Friend["avatarSnapshot"];
  frame?: Friend["frame"];
  portrait?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="h-[72px] flex items-center gap-3 border-b border-border-soft last:border-0">
      <div className="relative shrink-0">
        <div className="h-12 w-12 rounded-[14px]" style={{ background: color }}>
          <GlossyAvatar
            snapshot={avatarSnapshot}
            frame={frame ?? avatarSnapshot?.frameId}
            portrait={portrait}
            height={48}
            className="h-full w-full"
            autoRotate={false}
            focusZone="head"
          />
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${online ? "bg-success" : "bg-gray-300"}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-bold truncate">{title}</div>
        <div className="text-[11.5px] text-text-secondary truncate flex items-center gap-1">
          {sub}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
