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

/* ── Grey inventory-style stat bars ───────────────────────────────────── */

function GreyStatBar({
  label,
  value,
  max,
  fill,
  labelClass = "text-slate-400",
  className,
}: {
  label: string;
  value: number;
  max: number;
  fill: string;
  labelClass?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={`font-inter-bold ${className ?? ""}`}
      role="progressbar"
      aria-label={`${label} ${value} of ${max}`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div style={{ ...PANEL_OUTER, padding: "7px 9px", backgroundColor: "rgba(26,29,36,0.92)" }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-[10px] font-black uppercase tracking-widest ${labelClass}`}>{label}</span>
          <span className="text-[10px] font-black tabular-nums text-slate-400">
            {value} / {max}
          </span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden p-[1.5px]" style={PANEL_INNER}>
          <div className={`h-full rounded-[3px] transition-[width] duration-200 ${fill}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export function PlayerHpBar({ hp, max = 20 }: { hp?: number; max?: number }) {
  // HP bar removed per user request: "Remove hp"
  return null;
}

export function DragonBossBar({ hp, max }: { hp: number; max: number }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+108px)] z-[88] w-[min(340px,86vw)] -translate-x-1/2">
      <GreyStatBar
        label="Red Dragon"
        value={hp}
        max={max}
        fill="bg-gradient-to-r from-red-500 to-red-700"
        labelClass="text-red-300"
      />
    </div>
  );
}

/* ── Chest reward screen (Minecraft Inventory Grey Bottom Popup) ──────────────────────────────────────────────── */

const REWARD_TEXTURE_MAP: Record<string, string> = {
  "lucky-charm": "/textures/blocks/emerald_block.png",
  "ruby-ring": "/textures/blocks/redstone_ore.png",
  "sky-crown": "/textures/blocks/gold_block.png",
  "wind-boots": "/textures/blocks/iron_block.png",
  "ender-pendant": "/textures/blocks/amethyst_block.png",
  "gold-bracelet": "/textures/blocks/gold_block.png",
};

export function ChestRewardModal({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const rarity = RARITY[reward.rarity];
  const itemTexture =
    reward.kind === "weapon"
      ? "/items/diamond_axe.png"
      : REWARD_TEXTURE_MAP[reward.id] || "/textures/blocks/diamond_block.png";
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/60 p-3 sm:p-5 pointer-events-auto select-none">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="chest-win-title"
        className="v2-anim-pop relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[4px] p-3 sm:p-4 shadow-[0_16px_40px_rgba(0,0,0,0.65)]"
        style={{
          backgroundColor: "#c6c6c6",
          borderTop: "3px solid #ffffff",
          borderLeft: "3px solid #ffffff",
          borderBottom: "3px solid #555555",
          borderRight: "3px solid #555555",
        }}
      >
        {/* Header: YOU WON ITEM: */}
        <header className="flex items-center justify-between pb-2 mb-2 border-b border-[#a0a0a0]">
          <h2
            id="chest-win-title"
            className="font-lilita text-[16px] sm:text-[17px] tracking-wide text-[#2b2b2b] uppercase"
          >
            YOU WON ITEM:
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-lilita text-[15px] text-[#444444] hover:text-black px-1.5 py-0.5 active:scale-95 transition"
          >
            ✕
          </button>
        </header>

        {/* Inventory Grey Inset Box with Pixelated Item */}
        <div
          className="flex items-center gap-3 p-2.5 rounded-[2px]"
          style={{
            backgroundColor: "#8b8b8b",
            borderTop: "2px solid #373737",
            borderLeft: "2px solid #373737",
            borderBottom: "2px solid #ffffff",
            borderRight: "2px solid #ffffff",
          }}
        >
          {/* Authentic Inventory Slot */}
          <div
            className="relative grid h-14 w-14 shrink-0 place-items-center rounded-[2px]"
            style={{
              backgroundColor: "#8b8b8b",
              borderTop: "2px solid #373737",
              borderLeft: "2px solid #373737",
              borderBottom: "2px solid #ffffff",
              borderRight: "2px solid #ffffff",
            }}
          >
            <img
              src={itemTexture}
              alt={reward.name}
              className="h-9 w-9 object-contain [image-rendering:pixelated]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/textures/blocks/diamond_block.png";
              }}
            />
          </div>

          {/* Item details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="font-lilita text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] text-white"
                style={{ backgroundColor: rarity.color, textShadow: "0 1px 2px #000" }}
              >
                {rarity.label}
              </span>
              <span className="text-[11px] font-bold text-white/90 [text-shadow:0_1px_1px_#000]">
                {reward.kind === "weapon" ? "Weapon" : "Accessory"}
              </span>
            </div>
            <p className="font-lilita text-[17px] text-white truncate [text-shadow:0_1px_2px_#000] mt-0.5">
              {reward.name}
            </p>
            <p className="text-[11.5px] font-semibold text-slate-200 truncate [text-shadow:0_1px_1px_#000]">
              {reward.blurb}
            </p>
          </div>
        </div>

        {/* Action button in Minecraft inventory grey */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="font-lilita text-[14px] text-[#222222] px-5 py-2 rounded-[2px] transition active:scale-95 cursor-pointer"
            style={{
              backgroundColor: "#c6c6c6",
              borderTop: "2px solid #ffffff",
              borderLeft: "2px solid #ffffff",
              borderBottom: "2px solid #555555",
              borderRight: "2px solid #555555",
            }}
          >
            Collect Item
          </button>
        </div>
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
    <div className="fixed inset-x-0 bottom-0 z-[125] flex justify-center px-3 pb-[max(52px,calc(env(safe-area-inset-bottom)+48px))] font-inter-bold">
      <button
        type="button"
        onClick={advance}
        aria-label="Continue dialogue"
        className="w-full max-w-[520px] cursor-pointer text-left transition active:scale-[0.99]"
        style={{ ...PANEL_OUTER, backgroundColor: "rgba(26,29,36,0.96)" }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={nedAvatar}
            alt="Ned, the island guide"
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-[6px] object-cover"
            style={{ border: "1px solid #394152" }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Island Guide</p>
            <p className={`text-[15px] font-black italic leading-tight text-white ${OUTLINE}`}>Ned</p>
          </div>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {finished ? (line >= WELCOME_LINES.length - 1 ? "Tap to start" : "Tap to continue") : "..."}
          </span>
        </div>
        <div className="mt-2 p-2.5" style={PANEL_INNER}>
          <p className={`min-h-[42px] text-[13px] font-black leading-snug text-white ${OUTLINE}`} aria-live="polite">
            {text.slice(0, shown)}
          </p>
        </div>
      </button>
    </div>
  );
}

/* ── Mission tracker ──────────────────────────────────────────────────── */

/** Left HUD column: removed per user request: "Remove hp" */
export function SkyblockHudColumn({ hp, maxHp = 20 }: { hp?: number; maxHp?: number; state?: MissionState }) {
  return null;
}

export function MissionTracker({ state }: { state?: MissionState }) {
  // Old missions removed per user request
  return null;
}


function MissionLogModal({ state, onClose }: { state: MissionState; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[132] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm font-inter-bold">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-log-title"
        className="flex w-full max-w-[360px] flex-col gap-2"
        style={{ ...PANEL_OUTER, backgroundColor: "rgba(26,29,36,0.97)" }}
      >
        <div className="flex items-center justify-between">
          <h2 id="mission-log-title" className={`flex items-center gap-1.5 text-[13px] font-black italic text-white ${OUTLINE}`}>
            <Target className="h-3.5 w-3.5" aria-hidden="true" /> Missions
          </h2>
          <span className="text-[10px] font-black tabular-nums text-slate-400">
            {state.done.length}/{MISSIONS.length}
          </span>
        </div>
        <ul className="flex max-h-[52vh] flex-col gap-1.5 overflow-y-auto p-2" style={PANEL_INNER}>
          {MISSIONS.map((m) => {
            const done = state.done.includes(m.id);
            return (
              <li key={m.id} className="flex items-start gap-2">
                <span
                  className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[3px]"
                  style={{ backgroundColor: done ? "#16a34a" : "#1e2128", border: "1px solid #394152" }}
                >
                  {done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[12px] font-black leading-tight ${done ? "text-slate-500 line-through" : "text-white"}`}>
                    {m.title}
                  </span>
                  <span className="block text-[10px] font-bold leading-tight text-slate-400">
                    {m.detail} · Reward: {m.reward}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={`w-full cursor-pointer px-4 py-2 text-[12px] font-black italic text-white transition active:scale-95 ${OUTLINE}`}
          style={{ ...SLOT_FILLED, borderRadius: "10px", border: "1px solid #5b7bb2", backgroundColor: "#2b3952" }}
        >
          Close
        </button>
      </section>
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
