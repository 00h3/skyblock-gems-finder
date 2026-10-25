import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Footprints,
  Hammer,
  Blocks,
  Factory,
  Trophy,
  X,
  Flame,
} from "lucide-react";
import {
  PANEL_INNER,
  PANEL_OUTER,
  SLOT_EMPTY,
  SLOT_FILLED,
  SLOT_SEL,
} from "@/components/AdvancedInventoryModal";
import { V2Hotbar } from "@/components/v2/SkyblockV2";

export const TUTORIAL_DONE_KEY = "qb_skyblock_tutorial_done";

export function SkyblockCutscene({
  onSkip,
}: {
  onSkip: () => void;
  hotbar?: (number | string)[];
  tileUrls?: Record<number | string, string>;
  slot?: number;
  onSelectSlot?: (i: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[150] flex flex-col justify-between select-none">
      <div className="qb-cutscene-vignette absolute inset-0 pointer-events-none" aria-hidden="true" />

      {/* Top letterbox bar */}
      <div className="relative h-[12vh] bg-black/95 backdrop-blur-md flex items-center justify-center border-b border-white/10" />

      {/* Welcome Title Panel in sleek grey outlined style */}
      <div className="relative flex flex-col items-center px-4 text-center mt-2 pointer-events-none">
        <div
          className="flex flex-col items-center gap-1.5 px-6 py-3.5 max-w-[360px] animate-scale-in"
          style={{
            ...PANEL_OUTER,
            backgroundColor: "rgba(22, 25, 31, 0.94)",
            border: "1px solid #363b46",
            boxShadow: "0 18px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <p className="text-[10px] font-sans font-black uppercase tracking-widest text-slate-400 [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
            Welcome to
          </p>
          <h1 className="text-[32px] sm:text-[40px] font-sans font-black italic leading-none tracking-tight text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000,0_2px_4px_rgba(0,0,0,0.9)]">
            Skyblock
          </h1>
          <div className="mt-1 h-px w-full bg-[#363b46]" />
          <p className="text-[11.5px] font-sans font-black text-slate-200 [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
            Follow the phoenix & wield your staff
          </p>
        </div>
      </div>

      {/* Bottom Area: Cinematic letterbox with progress + Skip button */}
      <div className="relative flex flex-col items-center pb-[max(12px,calc(env(safe-area-inset-bottom)+8px))] pt-4 bg-gradient-to-t from-black/95 to-transparent gap-2">
        {/* Progress + Skip Button */}
        <div className="flex w-full max-w-[500px] items-center justify-between gap-3 px-6">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full p-0.5 bg-[#191b20] border border-[#2e3442] shadow-inner"
          >
            <div className="qb-cutscene-progress h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-sky-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="pointer-events-auto px-4 py-1.5 rounded-[10px] bg-[#282c36] hover:bg-[#343a46] border border-[#394152] text-[11px] font-sans font-black text-white shadow-md transition active:scale-95 cursor-pointer [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    Icon: Footprints,
    title: "Move around",
    body: "Use the joystick (or WASD) to walk. Tap jump (or Space) to hop between blocks.",
  },
  {
    Icon: Flame,
    title: "Dark Magic Staff & BOSS_001",
    body: "Select your Dark Magic Sickle Staff from the bottom inventory to fire glowing pixellated fireballs! Defeat the 3 BOSS_001 enemies.",
  },
  {
    Icon: Hammer,
    title: "Mine blocks",
    body: "Hold on a block to break it. Coal, iron and diamond ore hide inside your island's stone.",
  },
  {
    Icon: Blocks,
    title: "Build your island",
    body: "Pick a block in the hotbar and tap to place it. Sand and gravel fall if nothing holds them up.",
  },
  {
    Icon: Factory,
    title: "Generators & shop",
    body: "Upgrade generators to earn resources over time, then sell them in the shop for coins.",
  },
  {
    Icon: Trophy,
    title: "Level up",
    body: "Finish milestones and world events to gain XP, unlock new blocks and grow your island tier.",
  },
];

export function SkyblockTutorial({
  onClose,
  hotbar = [],
  tileUrls = {},
  slot = 0,
  onSelectSlot,
}: {
  onClose: () => void;
  hotbar?: (number | string)[];
  tileUrls?: Record<number | string, string>;
  slot?: number;
  onSelectSlot?: (i: number) => void;
}) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const { Icon, title, body } = STEPS[step];

  const finish = () => {
    try {
      localStorage.setItem(TUTORIAL_DONE_KEY, "1");
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] flex flex-col justify-between items-center bg-black/60 p-2 backdrop-blur-sm select-none animate-fade-in sm:p-4">
      {/* Spacer to keep card vertically centered */}
      <div className="flex-1 flex items-center justify-center w-full">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="sb-tutorial-title"
          className="flex w-full max-w-[420px] origin-center scale-[0.88] sm:scale-95 flex-col gap-2.5 p-4 rounded-[16px] bg-[#22252c]/95 border border-[#363b46] shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]"
        >
          <header className="flex items-center justify-between px-1">
            <span className="w-8" />
            <h2
              id="sb-tutorial-title"
              className="text-[17px] font-sans font-black italic tracking-wide text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000,0_1px_2px_rgba(0,0,0,0.9)]"
            >
              Skyblock Tutorial
            </h2>
            <button
              type="button"
              onClick={finish}
              aria-label="Close tutorial"
              className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#282c36] border border-[#394152] text-white transition hover:bg-[#343a46] active:scale-95 cursor-pointer shadow-sm"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </header>

          <div
            className="flex gap-3 p-3 rounded-[12px] bg-[#191b20] border border-[#282d38] shadow-inner"
          >
            <div
              className="grid h-16 w-16 shrink-0 place-items-center rounded-[10px] bg-[#282c36] border border-[#394152] shadow-sm"
            >
              <Icon className="h-8 w-8 text-amber-400 drop-shadow" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <h3 className="text-[14px] font-sans font-black text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]">
                {title}
              </h3>
              <p className="mt-1 text-[11.5px] font-sans font-semibold leading-relaxed text-slate-300">
                {body}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[11px] font-sans font-black text-white transition active:scale-95 disabled:opacity-40 bg-[#282c36] border border-[#394152] cursor-pointer shadow-sm [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Back
            </button>
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={i === step ? "step" : undefined}
                  className={`grid h-6 w-6 place-items-center rounded-[6px] text-[10px] font-sans font-black tabular-nums transition-all cursor-pointer ${
                    i === step
                      ? "bg-[#2b3952] border-2 border-[#5b7bb2] text-white shadow-[0_0_8px_rgba(91,123,178,0.5)] scale-110"
                      : "bg-[#1e2128] border border-[#2e3442] text-slate-400 hover:text-white"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => (last ? finish() : setStep((s) => s + 1))}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-[10px] text-[11px] font-sans font-black text-white transition active:scale-95 cursor-pointer shadow-sm [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000] ${
                last
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 border border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.45)]"
                  : "bg-[#282c36] border border-[#394152] hover:bg-[#343a46]"
              }`}
            >
              {last ? "Play Now" : "Next"}{" "}
              {!last && <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />}
            </button>
          </div>
        </section>
      </div>

      {/* The Exact Inventory Bottom Menu with Grey Outlined Style and Same Font */}
      {hotbar.length > 0 && (
        <div className="w-full flex justify-center pb-[max(6px,calc(env(safe-area-inset-bottom)+4px))]">
          <V2Hotbar
            hotbar={hotbar}
            tileUrls={tileUrls}
            slot={slot}
            onSelect={onSelectSlot || (() => {})}
            isTouch={false}
          />
        </div>
      )}
    </div>
  );
}
