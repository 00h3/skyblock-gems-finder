import { useEffect, useRef, useState } from "react";
import { Check, Clover, Crown, Gem, Sparkles, Swords, Target, Wind, Circle } from "lucide-react";
import { PANEL_INNER, PANEL_OUTER, SLOT_FILLED } from "@/components/AdvancedInventoryModal";
import nedAvatar from "@/assets/images/nelly_support_avatar_1787672860439.jpg";
import { MISSIONS, currentMission, type MissionDef, type MissionState, type Reward } from "@/lib/skyblock-missions";

const OUTLINE =
  "[text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000,0_2px_3px_rgba(0,0,0,0.85)]";

/* ── Red damage outline ───────────────────────────────────────────────── */

export function HurtVignette({ hp, maxHp = 20 }: { hp: number; maxHp?: number }) {
  const prev = useRef(hp);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (hp < prev.current) setFlash((n) => n + 1);
    prev.current = hp;
  }, [hp]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[118]" aria-hidden="true">
      {hp > 0 && hp <= maxHp * 0.3 && <div className="qb-hurt-low absolute inset-0" />}
      {flash > 0 && <div key={flash} className="qb-hurt-flash absolute inset-0" />}
    </div>
  );
}

/* ── Dragon boss bar ──────────────────────────────────────────────────── */

export function DragonBossBar({ hp, max }: { hp: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+108px)] z-[88] w-[min(340px,86vw)] -translate-x-1/2 font-inter-bold"
      role="progressbar"
      aria-label="Red Dragon health"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={hp}
    >
      <div className="px-3 py-2" style={{ ...PANEL_OUTER, padding: "8px 12px", backgroundColor: "rgba(22,25,31,0.94)" }}>
        <div className="mb-1 flex items-baseline justify-between">
          <span className={`text-[13px] font-black italic text-white ${OUTLINE}`}>Red Dragon</span>
          <span className={`text-[11px] font-black tabular-nums text-slate-300 ${OUTLINE}`}>
            {hp} / {max}
          </span>
        </div>
        <div className="h-3.5 overflow-hidden p-[2px]" style={PANEL_INNER}>
          <div
            className="h-full rounded-[4px] bg-gradient-to-r from-red-500 to-red-700 transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Chest reward screen ──────────────────────────────────────────────── */

const RARITY = {
  common: { label: "Common", color: "#cbd5e1" },
  rare: { label: "Rare", color: "#38bdf8" },
  epic: { label: "Epic", color: "#c084fc" },
  legend: { label: "Legendary", color: "#fbbf24" },
} as const;

const ACCESSORY_ICON: Record<string, typeof Gem> = {
  "lucky-charm": Clover,
  "ruby-ring": Gem,
  "sky-crown": Crown,
  "wind-boots": Wind,
  "ender-pendant": Sparkles,
  "gold-bracelet": Circle,
};

export function ChestRewardModal({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const rarity = RARITY[reward.rarity];
  const Icon = reward.kind === "weapon" ? Swords : (ACCESSORY_ICON[reward.id] ?? Gem);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm font-inter-bold">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="chest-win-title"
        className="relative flex w-full max-w-[340px] flex-col items-center gap-3 overflow-hidden"
        style={{ ...PANEL_OUTER, padding: "18px 16px 16px", backgroundColor: "rgba(26,29,36,0.97)" }}
      >
        <div
          className="qb-burst-spin pointer-events-none absolute left-1/2 top-[88px] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 opacity-35"
          style={{
            background: `repeating-conic-gradient(from 0deg, ${rarity.color}55 0deg 9deg, transparent 9deg 24deg)`,
            maskImage: "radial-gradient(circle, #000 18%, transparent 68%)",
            WebkitMaskImage: "radial-gradient(circle, #000 18%, transparent 68%)",
          }}
          aria-hidden="true"
        />
        <h2
          id="chest-win-title"
          className="qb-comic-pop relative text-[44px] font-black italic leading-none tracking-tight text-amber-300 [text-shadow:-3px_-3px_0_#000,3px_-3px_0_#000,-3px_3px_0_#000,3px_3px_0_#000,0_6px_0_#000,0_8px_14px_rgba(0,0,0,0.8)]"
        >
          YOU WON!
        </h2>

        <div
          className="qb-item-rise relative grid h-[104px] w-[104px] place-items-center"
          style={{ ...SLOT_FILLED, borderRadius: "12px", border: `2px solid ${rarity.color}`, boxShadow: `0 0 28px ${rarity.color}66` }}
        >
          <Icon className="h-14 w-14" style={{ color: rarity.color }} strokeWidth={1.8} aria-hidden="true" />
        </div>

        <div className="relative flex flex-col items-center gap-0.5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: rarity.color }}>
            {rarity.label} {reward.kind}
          </p>
          <p className={`text-[22px] font-black italic leading-tight text-white ${OUTLINE}`}>{reward.name}</p>
          <p className="text-[12px] font-bold text-slate-300">{reward.blurb}</p>
          {reward.kind === "weapon" && <p className="mt-1 text-[11px] font-bold text-slate-400">Added to your hotbar</p>}
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={`relative mt-1 w-full cursor-pointer px-4 py-2.5 text-[13px] font-black italic text-white transition active:scale-95 ${OUTLINE}`}
          style={{ ...SLOT_FILLED, borderRadius: "10px", border: "1px solid #5b7bb2", backgroundColor: "#2b3952" }}
        >
          Awesome!
        </button>
      </section>
    </div>
  );
}

export function ChestHint() {
  return (
    <div
      className={`pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+150px)] left-1/2 z-[84] -translate-x-1/2 px-3 py-1.5 text-[11px] font-black italic text-white font-inter-bold ${OUTLINE}`}
      style={{ ...SLOT_FILLED, backgroundColor: "rgba(34,37,44,0.92)" }}
    >
      Tap the chest to open it
    </div>
  );
}

/* ── NPC dialogue ─────────────────────────────────────────────────────── */

const WELCOME_LINES = [
  "Hello, welcome to Skyblock!",
  "This is a fresh start for everyone, well I'm Ned... a new horizon for everyone!",
  "Open golden chests, delve into the dungeon, and slay the Red Dragon. Let's grow your world together!",
];

export function NpcDialogue({ onDone }: { onDone: () => void }) {
  const [line, setLine] = useState(0);
  const [shown, setShown] = useState(0);
  const text = WELCOME_LINES[line];
  useEffect(() => {
    setShown(0);
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 26);
    return () => window.clearInterval(id);
  }, [text]);
  const finished = shown >= text.length;
  const advance = () => {
    if (!finished) {
      setShown(text.length);
      return;
    }
    if (line >= WELCOME_LINES.length - 1) onDone();
    else setLine(line + 1);
  };
  return (
    <div className="fixed inset-x-0 bottom-0 z-[125] flex justify-center px-3 pb-[max(14px,calc(env(safe-area-inset-bottom)+10px))] font-inter-bold">
      <button
        type="button"
        onClick={advance}
        aria-label="Continue dialogue"
        className="flex w-full max-w-[520px] cursor-pointer items-stretch gap-3 text-left transition active:scale-[0.99]"
        style={{ ...PANEL_OUTER, padding: "10px", backgroundColor: "rgba(26,29,36,0.96)" }}
      >
        <img
          src={nedAvatar}
          alt="Ned, the island guide"
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-[10px] object-cover"
          style={{ border: "2px solid #5b7bb2" }}
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <p className={`text-[12px] font-black italic text-sky-300 ${OUTLINE}`}>Ned</p>
            <p className={`mt-0.5 min-h-[44px] text-[13px] font-black leading-snug text-white ${OUTLINE}`} aria-live="polite">
              {text.slice(0, shown)}
            </p>
          </div>
          <p className="mt-1 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
            {finished ? (line >= WELCOME_LINES.length - 1 ? "Tap to start" : "Tap to continue") : "..."}
          </p>
        </div>
      </button>
    </div>
  );
}

/* ── Mission tracker ──────────────────────────────────────────────────── */

export function MissionTracker({ state }: { state: MissionState }) {
  const [open, setOpen] = useState(false);
  const active = currentMission(state);
  const doneCount = state.done.length;
  return (
    <div className="pointer-events-auto fixed left-3 top-[calc(env(safe-area-inset-top)+120px)] z-[85] w-[190px] font-inter-bold">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full cursor-pointer text-left transition active:scale-[0.98]"
        style={{ ...PANEL_OUTER, padding: "7px 9px", backgroundColor: "rgba(26,29,36,0.92)" }}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Target className="h-3 w-3" aria-hidden="true" /> Mission
          </span>
          <span className="text-[10px] font-black tabular-nums text-slate-400">
            {doneCount}/{MISSIONS.length}
          </span>
        </div>
        {active ? (
          <>
            <p className={`mt-0.5 text-[12px] font-black italic leading-tight text-white ${OUTLINE}`}>{active.title}</p>
            <p className="text-[10.5px] font-bold leading-snug text-slate-300">{active.detail}</p>
            <div className="mt-1 h-2 overflow-hidden p-[1.5px]" style={PANEL_INNER}>
              <div
                className="h-full rounded-[3px] bg-gradient-to-r from-sky-400 to-emerald-400"
                style={{ width: `${Math.min(100, (state.stats[active.stat] / active.goal) * 100)}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] font-black tabular-nums text-slate-400">
              {Math.min(state.stats[active.stat], active.goal)} / {active.goal}
            </p>
          </>
        ) : (
          <p className={`mt-0.5 text-[12px] font-black italic text-amber-300 ${OUTLINE}`}>All missions complete!</p>
        )}
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1" style={{ ...PANEL_OUTER, padding: "7px 9px", backgroundColor: "rgba(26,29,36,0.95)" }}>
          {MISSIONS.map((m) => {
            const done = state.done.includes(m.id);
            return (
              <li key={m.id} className="flex items-start gap-1.5">
                <span
                  className="mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px]"
                  style={{ backgroundColor: done ? "#16a34a" : "#1e2128", border: "1px solid #394152" }}
                >
                  {done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[11px] font-black leading-tight ${done ? "text-slate-500 line-through" : "text-white"}`}>{m.title}</span>
                  <span className="block text-[9.5px] font-bold leading-tight text-slate-400">Reward: {m.reward}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function MissionCompleteToast({ mission }: { mission: MissionDef }) {
  return (
    <div
      key={mission.id}
      className="qb-comic-pop pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+170px)] z-[140] w-[min(300px,88vw)] -translate-x-1/2 text-center font-inter-bold"
      role="status"
      style={{ ...PANEL_OUTER, backgroundColor: "rgba(26,29,36,0.97)", border: "1px solid #fbbf24" }}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Mission complete</p>
      <p className={`text-[17px] font-black italic text-white ${OUTLINE}`}>{mission.title}</p>
      <p className="text-[11.5px] font-bold text-slate-300">
        {mission.reward} unlocked, +{mission.xp} XP
      </p>
    </div>
  );
}

/* ── Teleport cinematic ───────────────────────────────────────────────── */

export function TeleportCinematic({ to }: { to: "mine" | "island" }) {
  const mine = to === "mine";
  return (
    <div className="pointer-events-none fixed inset-0 z-[160] overflow-hidden font-inter-bold" role="status" aria-live="polite">
      <div className="qb-tp-shake absolute inset-0">
        <div className="qb-tp-fade absolute inset-0 bg-black" />
        <div className="absolute inset-x-0 top-0 h-[12vh] bg-black" />
        <div className="absolute inset-x-0 bottom-0 h-[12vh] bg-black" />
        <div className="qb-tp-title absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
          <p className={`text-[11px] font-black uppercase tracking-[0.3em] ${mine ? "text-red-300" : "text-sky-300"} ${OUTLINE}`}>
            {mine ? "Descending into" : "Returning to"}
          </p>
          <h2 className={`text-[38px] font-black italic leading-none text-white ${OUTLINE}`}>{mine ? "The Deep Dungeon" : "Your Island"}</h2>
          <p className={`mt-1 text-[12px] font-black text-slate-300 ${OUTLINE}`}>
            {mine ? "Something ancient stirs in the east..." : "Fresh air and open sky"}
          </p>
        </div>
      </div>
    </div>
  );
}
