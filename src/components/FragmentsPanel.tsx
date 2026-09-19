import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, Gift, Loader2, ShieldAlert, X } from "lucide-react";
import { ShinyButton } from "@/components/ui/shiny-button";
const fragmentIcon =
  "https://maxwell.z3ki.dev/bot/_files/qblock-puzzle-fragments-png/qblock-puzzle-fragments-transparent.png";
const chestIcon = "/icon-packs/reward-chest.png";
const scarletArt = "/studio-splash.png";
import {
  ensureFragmentSchedule,
  claimFragment,
  hydrateFragments,
  redeemFaceFragment,
  setFragmentUser,
  useFragments,
} from "@/lib/fragments";
import { FRAGMENT_TAGS, type FragmentReward, type FragmentTagId } from "@/lib/fragment-tags";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/lib/activity-log";
import { toast } from "sonner";

export { chestIcon as fragmentChestIcon, fragmentIcon as fragmentShardIcon };

export function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

/** Keeps the fragment bus in sync with the signed-in user. */
export function useFragmentAccount() {
  const { qbUser } = useAuth();

  useEffect(() => {
    setFragmentUser(qbUser?.uid ?? null);
  }, [qbUser?.uid]);

  useEffect(() => {
    if (!qbUser) return;
    hydrateFragments({
      fragments: qbUser.fragments,
      fragmentNextAt: qbUser.fragmentNextAt,
      fragmentFaceTrialUntil: qbUser.fragmentFaceTrialUntil,
    });
  }, [qbUser?.uid, qbUser?.fragments, qbUser?.fragmentNextAt, qbUser?.fragmentFaceTrialUntil]);

  useEffect(() => {
    if (!qbUser) return;
    void ensureFragmentSchedule().catch((error) => {
      console.error("Could not schedule fragments:", error);
    });
  }, [qbUser?.uid]);

  return qbUser;
}

function rewardImage(reward: FragmentReward) {
  if (reward.image) return reward.image;
  if (reward.id === "scarlet-set") return scarletArt;
  return fragmentIcon;
}

/**
 * The whole Fragments experience. Rendered full-width on /fragments and inside
 * the global popup / profile panel, so every surface stays identical.
 */
export function FragmentsPanel({
  initialTag,
  compact = false,
  showHero = true,
}: {
  initialTag?: FragmentTagId | null;
  /** compact = embedded (profile card); full = page/popup */
  compact?: boolean;
  showHero?: boolean;
}) {
  useFragmentAccount();
  const fragment = useFragments();
  const [tag, setTag] = useState<FragmentTagId>(initialTag ?? "customization");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [showCooldownModal, setShowCooldownModal] = useState(false);
  const [cooldownReason, setCooldownReason] = useState("");
  const lastActionTime = useRef(0);

  useEffect(() => {
    if (initialTag) setTag(initialTag);
  }, [initialTag]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const ready = Boolean(fragment.nextAt && now >= fragment.nextAt);
  const countdown = fragment.nextAt ? formatRemaining(fragment.nextAt - now) : "Starting…";
  const trialRemaining = Math.max(0, fragment.faceTrialUntil - now);
  const activeTag = useMemo(
    () => FRAGMENT_TAGS.find((entry) => entry.id === tag) ?? FRAGMENT_TAGS[0],
    [tag],
  );

  async function collect() {
    const timeSinceLast = Date.now() - lastActionTime.current;
    if (timeSinceLast < 2500) {
      setCooldownReason("Rapid clicking detected! Anti-abuse rate limiter active.");
      setShowCooldownModal(true);
      return;
    }
    if (!ready) {
      setCooldownReason(`Fragment collection is on cooldown for ${countdown} to prevent abuse.`);
      setShowCooldownModal(true);
      return;
    }
    lastActionTime.current = Date.now();
    setBusy(true);
    try {
      const claimed = await claimFragment();
      if (claimed) {
        toast.success("Fragment collected!");
        logActivity("fragment_claim", "Fragment Collected", "Claimed 1 fragment shard.");
      } else {
        setCooldownReason("Your next fragment is not ready yet. Cooldown active!");
        setShowCooldownModal(true);
      }
    } catch (error) {
      toast.error("Fragment could not be collected. Try again.");
      console.error("Could not claim fragment:", error);
    } finally {
      setBusy(false);
    }
  }

  async function unlockFace() {
    const timeSinceLast = Date.now() - lastActionTime.current;
    if (timeSinceLast < 2000) {
      setCooldownReason("Rapid clicking detected on reward slots.");
      setShowCooldownModal(true);
      return;
    }
    lastActionTime.current = Date.now();
    setBusy(true);
    try {
      const redeemed = await redeemFaceFragment();
      if (redeemed) {
        toast.success("$$$ Face unlocked for 1 day");
        logActivity("shop_purchase", "Face Fragment Used", "Unlocked $$$ Face for 24 hours.");
      } else {
        toast.error("You need 1 fragment first.");
      }
    } catch (error) {
      toast.error("That fragment could not be used. Try again.");
      console.error("Could not redeem face fragment:", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "" : "mx-auto w-full max-w-[620px]"}>
      {showHero && (
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#ff8a68] via-[#fa4616] to-[#9b240b] p-4 text-white shadow-[0_12px_30px_rgba(250,70,22,.25)]">
          <img
            src={fragmentIcon}
            alt=""
            className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 opacity-35"
          />
          <div className="relative z-[1] flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-white/30 bg-white/15 shadow-inner">
              <img src={chestIcon} alt="" className="h-14 w-14 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-white/75">
                Your fragments
              </p>
              <p className="text-[38px] font-black leading-none">{fragment.count}</p>
              <p className="mt-1 text-[11px] font-semibold text-white/75">
                {ready ? "A new fragment is ready" : `Next fragment in ${countdown}`}
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <div
                className={`grid h-12 w-12 place-items-center rounded-full border-2 ${ready ? "border-emerald-300 bg-emerald-400/25" : "animate-spin border-white/35 border-t-emerald-300"}`}
              >
                {ready ? (
                  <Check className="h-6 w-6 text-emerald-200" />
                ) : (
                  <Clock3 className="h-5 w-5 text-white/80" />
                )}
              </div>
            </div>
          </div>
          <ShinyButton
            onClick={collect}
            disabled={!ready || busy}
            className="relative z-[1] mt-4 w-full h-11 text-[13.5px]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
            {ready ? "Collect fragment" : "Collect when ready"}
          </ShinyButton>
        </div>
      )}

      <div className="mt-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {FRAGMENT_TAGS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTag(entry.id)}
            className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-black ${tag === entry.id ? "bg-primary text-white" : "bg-white text-[#737982]"}`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2.5">
        {activeTag.rewards.map((reward) => (
          <div
            key={reward.id}
            className="rounded-[22px] border border-black/[.06] bg-white p-4 shadow-[0_7px_18px_rgba(18,28,38,.06)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[16px] bg-[#fff1ec] p-2">
                <img
                  src={rewardImage(reward)}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-primary-hover">
                  {activeTag.eyebrow}
                </p>
                <h3 className="mt-1 text-[16px] font-black text-[#17181b]">{reward.title}</h3>
                <p className="mt-0.5 text-[11px] font-semibold text-[#858a94]">
                  {reward.description}
                </p>
                {reward.kind === "face-trial" && fragment.faceTrialActive && (
                  <p className="mt-1 text-[10px] font-black text-emerald-600">
                    {formatRemaining(trialRemaining)} remaining
                  </p>
                )}
              </div>
              {reward.kind === "face-trial" ? (
                <ShinyButton
                  onClick={unlockFace}
                  disabled={busy || fragment.count < reward.cost}
                  className="shrink-0 h-8 px-3 text-[11.5px] rounded-[10px]"
                >
                  {fragment.faceTrialActive ? "Extend" : `Use ${reward.cost}`}
                </ShinyButton>
              ) : (
                <span className="shrink-0 rounded-full bg-[#f1f2f4] px-3 py-2 text-[10px] font-black uppercase tracking-[.1em] text-[#9aa0aa]">
                  Soon
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Anti-Abuse Cooldown Warning Popup Modal */}
      {showCooldownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-slate-800 text-center relative">
            <button
              onClick={() => setShowCooldownModal(false)}
              className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <h3 className="text-[17px] font-black tracking-tight text-slate-900">
              Fragments Couldn't Be Collected!
            </h3>
            <div className="mt-1 inline-block rounded-full bg-amber-100 px-3 py-0.5 text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
              Anti-Abuse Cooldown Active
            </div>

            <p className="mt-3 text-[12px] font-medium leading-relaxed text-slate-600">
              {cooldownReason ||
                "A timer or rate limit is active on this fragment slot to prevent rapid spam & abuse. Please wait until your next fragment timer expires."}
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] font-bold text-slate-700 flex items-center justify-between border border-slate-200/60">
              <span>Slot Status</span>
              <span className="text-amber-600 font-extrabold">
                {ready ? "Cooldown active" : countdown}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowCooldownModal(false)}
              className="press mt-5 w-full rounded-2xl bg-slate-900 py-3 text-[13px] font-black text-white shadow-md active:scale-95 transition-transform"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Small circular trigger used on the home page and in the sandbox HUD. */
export function FragmentCircle({ onClick }: { onClick?: () => void }) {
  useFragmentAccount();
  const { count, nextAt } = useFragments();
  const [now, setNow] = useState(() => Date.now());
  const announcedReady = useRef(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const ready = Boolean(nextAt && now >= nextAt);
  const countdown = nextAt ? formatRemaining(nextAt - now) : "…";

  useEffect(() => {
    if (ready && !announcedReady.current) {
      toast.success("A fragment is ready to collect");
    }
    announcedReady.current = ready;
  }, [ready]);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...pos };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.hypot(dx, dy) > 5) {
      isDragging.current = true;
    }
    setPos({
      x: posStart.current.x + dx,
      y: posStart.current.y + dy,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!isDragging.current && onClick) {
      onClick();
    }
  };

  return (
    <div
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="flex flex-col items-center gap-1 touch-none cursor-grab active:cursor-grabbing"
    >
      <button
        type="button"
        aria-label="Open Fragments"
        className="group relative grid h-14 w-14 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-[#ff62bb] to-[#c81482] shadow-[0_7px_18px_rgba(200,20,130,.32)] transition-transform active:scale-90"
      >
        <img
          src={chestIcon}
          alt=""
          className="h-9 w-9 object-contain transition-transform group-hover:scale-110"
        />
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[#17181b] px-1 text-[9px] font-black text-white">
          {count}
        </span>
        <span
          className={`absolute -inset-1 rounded-full border-2 border-emerald-300/80 ${ready ? "animate-pulse" : "animate-spin"}`}
          style={{ animationDuration: ready ? "1.2s" : "3.4s" }}
        />
      </button>
      <span
        className={`rounded-full border px-2 py-0.5 text-[9px] font-black tabular-nums shadow-sm backdrop-blur ${
          ready
            ? "border-emerald-200 bg-emerald-50/90 text-emerald-700"
            : "border-white/70 bg-white/85 text-[#a51468]"
        }`}
      >
        {ready ? "Ready!" : countdown}
      </span>
    </div>
  );
}
