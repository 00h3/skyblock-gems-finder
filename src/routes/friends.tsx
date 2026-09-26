import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
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
  sendFriendRequest,
  areFriends,
  ensureChatMeta,
  type Friend,
  type FriendRequest,
} from "@/lib/friends-utils";

export const Route = createFileRoute("/friends")({
  head: () => ({ meta: [{ title: "Friends — QBlock" }] }),
  component: FriendsPage,
});

const FRIENDS_TABS = ["Requests", "All Friends", "Add Friend"] as const;

function FriendsPage() {
  const nav = useNavigate();
  const { qbUser } = useAuth();
  const [tab, setTab] = useState<number>(0);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requestModal, setRequestModal] = useState<FriendRequest | null>(null);
  const [accepting, setAccepting] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ProfileUser | null>(null);

  // Add friend state
  const [targetQuery, setTargetQuery] = useState("");
  const [sendingFriend, setSendingFriend] = useState(false);

  useEffect(() => {
    if (!qbUser) return;
    const unsubReq = subscribeIncomingRequests(qbUser.uid, (realRequests) => {
      if (realRequests.length === 0) {
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
            fromColor: "#000000",
          },
        ]);
      } else {
        setRequests(realRequests);
      }
    });

    const unsubFriends = subscribeFriends(qbUser.uid, (list) => {
      setFriends(list);
    });

    return () => {
      unsubReq();
      unsubFriends();
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

  async function handleSendRequest() {
    if (!qbUser || !targetQuery.trim() || sendingFriend) return;
    setSendingFriend(true);
    try {
      await sendFriendRequest(qbUser.uid, targetQuery.trim());
      toast.success("Friend request sent");
      setTargetQuery("");
    } catch {
      toast.error("Could not find user or send request.");
    } finally {
      setSendingFriend(false);
    }
  }

  return (
    <MobileShell>
      <div className="min-h-full bg-white dark:bg-[#000000] pb-24 text-black dark:text-white">
        <div className="px-5 pt-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10.5px] font-normal uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Community
              </p>
              <h1 className="mt-1 text-[22px] font-medium tracking-tight">
                {tab === 0 ? "Requests" : tab === 1 ? "Friends" : "Add Friend"}
              </h1>
            </div>
            {tab === 0 && (
              <span className="mb-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-black/10 dark:border-white/10 px-3 py-1 text-[11px] font-normal text-neutral-700 dark:text-neutral-300">
                {requests.length} pending
              </span>
            )}
          </div>
        </div>

        {/* Tab 0: Requests */}
        {tab === 0 && (
          <div className="mt-5 px-5 pb-6">
            {requests.length === 0 ? (
              <div className="mt-12 flex flex-col items-center gap-3 text-center p-8 rounded-[20px] bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 shadow-xs">
                <div className="text-[16px] font-medium text-black dark:text-white">
                  No Pending Requests
                </div>
                <p className="text-[12px] font-normal text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed">
                  When other players send you a friend request, they will appear right here so you can accept and play together.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setRequestModal(r)}
                    className="p-3.5 flex items-center gap-3 bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 rounded-[18px] shadow-xs cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="relative shrink-0">
                      <div
                        className="h-11 w-11 rounded-[14px]"
                        style={{ background: r.fromColor ?? "#000000" }}
                      >
                        <GlossyAvatar
                          snapshot={r.fromAvatar}
                          frame={r.fromAvatar?.frameId}
                          portrait={r.fromUsername?.toLowerCase() === "ira"}
                          height={44}
                          className="h-full w-full"
                          autoRotate={false}
                          focusZone="head"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium truncate text-black dark:text-white">
                        {r.fromDisplayName ?? r.from}
                      </div>
                      <div className="text-[11.5px] font-normal text-neutral-500 dark:text-neutral-400 truncate">
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
                        className="press px-3.5 h-8 rounded-[11px] bg-black text-white dark:bg-white dark:text-black text-[12px] font-normal flex items-center shadow-xs cursor-pointer"
                      >
                        Respond
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: All Friends */}
        {tab === 1 && (
          <div className="mt-5 px-5 pb-6">
            {friends.length === 0 ? (
              <div className="mt-12 flex flex-col items-center gap-3 text-center p-8 rounded-[20px] bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 shadow-xs">
                <div className="text-[16px] font-medium text-black dark:text-white">
                  No Friends Yet
                </div>
                <p className="text-[12px] font-normal text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed">
                  Add friends to team up in SkyBlock, message directly, and play together.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {friends.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelected({
                        id: f.id,
                        username: f.username || "player",
                        displayName: f.displayName || "Player",
                        color: f.color || "#000",
                        bio: f.bio,
                        avatarSnapshot: f.avatarSnapshot,
                        customId: f.customId,
                      });
                    }}
                    className="p-3 flex items-center gap-3 bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 rounded-[18px] cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
                  >
                    <div
                      className="h-10 w-10 rounded-[12px] shrink-0"
                      style={{ background: f.color || "#000" }}
                    >
                      <GlossyAvatar
                        snapshot={f.avatarSnapshot}
                        height={40}
                        className="h-full w-full"
                        autoRotate={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-black dark:text-white truncate">
                        {f.displayName}
                      </div>
                      <div className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400 truncate">
                        @{f.username}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Add Friend */}
        {tab === 2 && (
          <div className="mt-5 px-5 pb-6">
            <div className="rounded-[20px] p-4 bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 space-y-3">
              <div className="text-[14px] font-medium text-black dark:text-white">
                Find Player by Username or ID
              </div>
              <input
                type="text"
                value={targetQuery}
                onChange={(e) => setTargetQuery(e.target.value)}
                placeholder="Enter player username or custom ID"
                className="w-full h-10 px-3 rounded-[12px] bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 text-[13px] font-normal outline-none placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={handleSendRequest}
                disabled={!targetQuery.trim() || sendingFriend}
                className="press w-full h-10 rounded-[12px] bg-black text-white dark:bg-white dark:text-black text-[13px] font-normal flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {sendingFriend ? "Sending…" : "Add Friend"}
              </button>
            </div>
          </div>
        )}

        {/* Floating Bottom Glossy Tabs */}
        <div className="fixed bottom-[calc(56px+max(env(safe-area-inset-bottom),8px))] left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
          <div className="qb-glossy-menu pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-full px-2 py-1 shadow-md hide-scrollbar">
            {FRIENDS_TABS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(index)}
                className={`press relative z-10 h-7 shrink-0 rounded-full px-3 text-[11px] font-normal transition-colors cursor-pointer ${
                  index === tab
                    ? "bg-foreground text-background shadow-xs"
                    : "qb-glossy-chip text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setRequestModal(null)}
          >
            <div
              className="w-full max-w-sm rounded-[22px] bg-white dark:bg-neutral-950 p-5 shadow-2xl border border-black/10 dark:border-white/15 text-black dark:text-white relative animate-in zoom-in-95 duration-200 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3">
                <span className="inline-block rounded-full bg-neutral-100 dark:bg-neutral-900 px-3 py-0.5 text-[10px] font-normal text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Friend Request
                </span>
                <h2 className="mt-2 text-[18px] font-medium leading-tight">
                  {requestModal.fromDisplayName ?? requestModal.from}
                </h2>
                {requestModal.fromUsername && (
                  <p className="text-[12px] font-normal text-neutral-500">@{requestModal.fromUsername}</p>
                )}
              </div>

              {requestModal.fromBio && (
                <div className="mb-4 rounded-[14px] bg-neutral-50 dark:bg-neutral-900 p-3 text-[12px] font-normal text-neutral-600 dark:text-neutral-300 border border-black/5 dark:border-white/5">
                  {requestModal.fromBio}
                </div>
              )}

              <p className="text-[12.5px] font-normal leading-relaxed text-neutral-600 dark:text-neutral-300 mb-5">
                Would you like to accept this friend request from{" "}
                {requestModal.fromDisplayName ?? requestModal.from}?
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-black/10 dark:border-white/10">
                <button
                  type="button"
                  disabled={accepting.has(requestModal.id) || rejecting.has(requestModal.id)}
                  onClick={async () => {
                    const req = requestModal;
                    setRequestModal(null);
                    await handleReject(req);
                  }}
                  className="press h-10 rounded-[12px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-normal text-[12.5px] flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
                >
                  Decline
                </button>

                <button
                  type="button"
                  disabled={accepting.has(requestModal.id) || rejecting.has(requestModal.id)}
                  onClick={async () => {
                    const req = requestModal;
                    setRequestModal(null);
                    await handleAccept(req);
                  }}
                  className="press h-10 rounded-[12px] bg-black text-white dark:bg-white dark:text-black font-normal text-[12.5px] flex items-center justify-center transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
