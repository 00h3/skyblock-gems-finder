import { useState } from "react";
import { ChevronLeft, ChevronRight, Footprints, Hammer, Blocks, Factory, Trophy, X } from "lucide-react";
import { PANEL_INNER, PANEL_OUTER, SLOT_EMPTY, SLOT_FILLED, SLOT_SEL } from "@/components/AdvancedInventoryModal";

export const TUTORIAL_DONE_KEY = "qb_skyblock_tutorial_done";

export function SkyblockCutscene({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="font-inter-bold pointer-events-none fixed inset-0 z-[150] flex flex-col justify-between select-none">
      <div className="qb-cutscene-vignette absolute inset-0" aria-hidden="true" />
      <div className="qb-letterbox-top relative h-[11vh] bg-black" />
      <div className="relative flex flex-col items-center px-4 text-center">
        <div className="qb-cutscene-title flex flex-col items-center gap-1.5 px-6 py-3" style={{ ...PANEL_OUTER, backgroundColor: "rgba(34,37,44,0.82)" }}>
          <p className="text-[10px] font-black italic tracking-wide text-slate-400">Welcome to</p>
          <h1 className="text-[34px] font-black italic leading-none tracking-wide text-white sm:text-[48px]">Skyblock</h1>
          <div className="mt-1 h-px w-full bg-[#363b46]" />
          <p className="text-[11px] font-black italic text-slate-200">Follow the phoenix to your island</p>
        </div>
      </div>
      <div className="qb-letterbox-bottom relative flex h-[11vh] items-center justify-between gap-3 bg-black px-4">
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={SLOT_EMPTY}>
          <div className="qb-cutscene-progress h-full bg-[#38bdf8]" />
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="pointer-events-auto px-3 py-1.5 text-[11px] font-black italic text-white transition active:scale-95"
          style={SLOT_FILLED}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

const STEPS = [
  { Icon: Footprints, title: "Move around", body: "Use the joystick (or WASD) to walk. Tap jump (or Space) to hop between blocks." },
  { Icon: Hammer, title: "Mine blocks", body: "Hold on a block to break it. Coal, iron and diamond ore hide inside your island's stone." },
  { Icon: Blocks, title: "Build your island", body: "Pick a block in the hotbar and tap to place it. Sand and gravel fall if nothing holds them up." },
  { Icon: Factory, title: "Generators & shop", body: "Upgrade generators to earn resources over time, then sell them in the shop for coins." },
  { Icon: Trophy, title: "Level up", body: "Finish milestones and world events to gain XP, unlock new blocks and grow your island tier." },
];

export function SkyblockTutorial({ onClose }: { onClose: () => void }) {
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
    <div className="font-inter-bold fixed inset-0 z-[140] flex items-center justify-center bg-zinc-950/85 p-2 backdrop-blur-sm select-none animate-fade-in sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sb-tutorial-title"
        className="flex w-full max-w-[400px] origin-center scale-[0.85] flex-col gap-2 sm:scale-90"
        style={PANEL_OUTER}
      >
        <header className="flex items-center justify-between px-2 py-1">
          <span className="w-8" />
          <h2 id="sb-tutorial-title" className="text-[16px] font-black italic tracking-wide text-white">
            Tutorial
          </h2>
          <button
            type="button"
            onClick={finish}
            aria-label="Close tutorial"
            className="grid h-8 w-8 place-items-center rounded-[8px] bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </header>

        <div className="flex gap-2 p-2" style={PANEL_INNER}>
          <div className="grid h-16 w-16 shrink-0 place-items-center" style={SLOT_FILLED}>
            <Icon className="h-8 w-8 text-slate-200" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13.5px] font-black italic text-white">{title}</h3>
            <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-slate-400">{body}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-black italic text-white transition active:scale-95 disabled:opacity-40"
            style={SLOT_FILLED}
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} /> Back
          </button>
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === step ? "step" : undefined}
                className="grid h-6 w-6 place-items-center text-[10px] font-black text-slate-200 tabular-nums"
                style={i === step ? SLOT_SEL : SLOT_EMPTY}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-black italic text-white transition active:scale-95"
            style={last ? SLOT_SEL : SLOT_FILLED}
          >
            {last ? "Play" : "Next"} {!last && <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />}
          </button>
        </div>
      </section>
    </div>
  );
}
