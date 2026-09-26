import WetPaintButton from "@/components/ui/wet-paint-button";
import { V2Button } from "./primitives";

export function V2LoadingScreen({ title, subtitle, progress }: { title: string; subtitle: string; progress: number }) {
  return (
    <div className="v2-ui fixed inset-0 z-[150] grid place-items-center bg-[radial-gradient(120%_80%_at_50%_0%,#1e2140_0%,#0b0b12_70%)] px-6">
      <div className="w-full max-w-[320px] text-center text-white">
        <p className="v2-eyebrow">{subtitle}</p>
        <p className="mt-1 text-[34px] font-bold leading-tight tracking-tight">{title}</p>
        <div
          className="mt-6 h-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Loading world"
        >
          <div className="h-full rounded-full bg-v2-plum transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2.5 text-[12px] font-medium tabular-nums text-white/50">{progress}%</p>
      </div>
    </div>
  );
}

/** Fades the world in after spawns, respawns and new rounds. */
export function V2Veil({ token }: { token: number }) {
  return <div key={token} aria-hidden="true" className="v2-anim-veil pointer-events-none fixed inset-0 z-[125] bg-[#0b0b12]" />;
}

const CONTROLS: [string, string][] = [
  ["WASD", "Move"],
  ["Space", "Jump"],
  ["R", "Run"],
  ["Shift", "Crouch"],
  ["Left click", "Mine"],
  ["Right click", "Build"],
  ["V", "Camera"],
  ["Esc", "Pause"],
];

export function V2ClickToPlay({ title, hint, onPlay }: { title: string; hint: string; onPlay: () => void }) {
  return (
    <div className="v2-ui fixed inset-0 z-[95] grid place-items-center bg-[#0b0b12]/40 px-4 backdrop-blur-[3px]">
      <div className="v2-panel v2-anim-pop w-full max-w-[380px] p-6">
        <p className="v2-eyebrow">Ready</p>
        <p className="mt-1 text-[30px] font-bold leading-tight tracking-tight">{title}</p>
        <p className="mt-1 text-[13px] font-medium text-white/60">{hint}</p>
        <WetPaintButton className="mb-7 mt-6 h-12 w-full rounded-[12px] text-[15px]" onClick={onPlay} autoFocus>
          Play
        </WetPaintButton>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-[12px]">
          {CONTROLS.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <dt className="rounded-md border border-white/12 bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-white/85">{k}</dt>
              <dd className="font-medium text-white/55">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function V2ConfirmDialog({
  title,
  onCancel,
  onConfirm,
  confirmLabel = "Leave",
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  return (
    <div
      className="v2-ui fixed inset-0 z-[160] grid place-items-center bg-[#0b0b12]/55 p-4 backdrop-blur-[3px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-label={title} className="v2-panel v2-anim-pop w-full max-w-[320px] p-5 text-center">
        <p className="text-[18px] font-bold leading-snug tracking-tight">{title}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <V2Button variant="ghost" className="h-11 text-[14px]" onClick={onCancel} autoFocus>
            Stay
          </V2Button>
          <V2Button className="h-11 border-v2-coral/40 text-[14px] [background:#e11d48] hover:[background:#be123c]" onClick={onConfirm}>
            {confirmLabel}
          </V2Button>
        </div>
      </div>
    </div>
  );
}
