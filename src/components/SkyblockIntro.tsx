import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export const TUTORIAL_DONE_KEY = "qb_skyblock_tutorial_done";

const PANEL = "rounded-[14px] border border-[#363b46] bg-[#22252c] shadow-[0_18px_48px_rgba(0,0,0,0.65)]";
const INNER = "rounded-[8px] border border-zinc-700/60 bg-[#1a1d24]";
const BTN =
  "rounded-[6px] border border-zinc-400/50 bg-[#4b5563] font-black text-white shadow-sm transition hover:bg-[#52525b] active:scale-95";

export function SkyblockCutscene({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[150] flex flex-col justify-between select-none">
      <div className="qb-letterbox-top h-[12vh] bg-black" />
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="qb-cutscene-sub text-[11px] font-black uppercase tracking-[0.35em] text-zinc-300">QBlock presents</p>
        <h1 className="qb-cutscene-title text-5xl font-black italic tracking-wide text-white [text-shadow:0_4px_0_#000,0_0_24px_rgba(255,140,40,0.7)] sm:text-7xl">
          SKYBLOCK
        </h1>
        <p className="qb-cutscene-sub text-xs font-bold text-amber-200 [text-shadow:0_1px_2px_#000]">Follow the phoenix to your island</p>
      </div>
      <div className="qb-letterbox-bottom relative flex h-[12vh] items-center justify-end bg-black px-4">
        <button type="button" onClick={onSkip} className={`${BTN} pointer-events-auto px-3 py-1.5 text-[11px]`}>
          Skip
        </button>
      </div>
    </div>
  );
}

const STEPS = [
  { title: "Move around", body: "Use the joystick (or WASD) to walk. Tap the jump button (or Space) to hop between blocks." },
  { title: "Mine blocks", body: "Hold on a block to break it. Ores like coal, iron and diamond hide inside your island's stone." },
  { title: "Build your island", body: "Pick a block in the hotbar and tap to place it. Careful: sand and gravel fall if nothing supports them." },
  { title: "Generators & shop", body: "Upgrade generators to earn resources over time, then sell them in the shop for coins." },
  { title: "Level up", body: "Complete milestones and world events to gain XP, unlock new blocks and grow your island tier." },
];

export function SkyblockTutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const finish = () => {
    try {
      localStorage.setItem(TUTORIAL_DONE_KEY, "1");
    } catch {}
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[140] grid place-items-center bg-zinc-950/70 p-3 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="sb-tutorial-title" className={`${PANEL} w-full max-w-[360px] p-3`}>
        <header className="mb-2 flex items-center justify-between">
          <span className="text-[10.5px] font-black uppercase tracking-wider text-zinc-400">
            {`Tutorial ${step + 1}/${STEPS.length}`}
          </span>
          <button
            type="button"
            onClick={finish}
            aria-label="Close tutorial"
            className="grid h-7 w-7 place-items-center rounded-[8px] bg-white/10 text-white hover:bg-white/20 active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </header>
        <div className={`${INNER} p-3`}>
          <h2 id="sb-tutorial-title" className="text-[16px] font-black italic text-white">
            {STEPS[step].title}
          </h2>
          <p className="mt-1 text-[12px] font-semibold leading-relaxed text-zinc-300">{STEPS[step].body}</p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className={`${BTN} flex items-center gap-1 px-2.5 py-1.5 text-[11px] disabled:opacity-40`}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="flex gap-1" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-white" : "bg-zinc-600"}`} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
            className={`${BTN} flex items-center gap-1 px-2.5 py-1.5 text-[11px]`}
          >
            {last ? "Play" : "Next"} {!last && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </section>
    </div>
  );
}
