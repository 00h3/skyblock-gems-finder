import { V2Button } from "./primitives";

export function V2LoadingScreen({ title, subtitle, progress }: { title: string; subtitle: string; progress: number }) {
  return (
    <div className="v2-ui fixed inset-0 z-[150] grid place-items-center bg-gradient-to-b from-[#6fb1ee] to-[#cfe6fb] px-6">
      <div className="v2-panel w-full max-w-[360px] p-6 text-center">
        <p className="text-[12px] uppercase tracking-[0.24em] text-white/70">{subtitle}</p>
        <p className="v2-text-stroke text-[36px] leading-tight">{title}</p>
        <div
          className="mt-5 h-4 overflow-hidden rounded-full border-2 border-v2-plum-deep bg-v2-ink/40"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Loading world"
        >
          <div className="h-full rounded-full bg-v2-sun transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-[14px] tabular-nums text-white/80">{progress}%</p>
      </div>
    </div>
  );
}

/** Fades the world in after spawns, respawns and new rounds. */
export function V2Veil({ token }: { token: number }) {
  return <div key={token} aria-hidden="true" className="v2-anim-veil pointer-events-none fixed inset-0 z-[125] bg-white" />;
}

export function V2ClickToPlay({ title, hint, onPlay }: { title: string; hint: string; onPlay: () => void }) {
  return (
    <div className="v2-ui fixed inset-0 z-[95] grid place-items-center bg-v2-ink/35 px-4">
      <div className="v2-panel v2-anim-pop w-full max-w-[380px] p-6 text-center">
        <p className="v2-text-stroke text-[32px] leading-tight">{title}</p>
        <p className="mt-1 font-sans text-[13px] font-semibold text-white/70">{hint}</p>
        <V2Button variant="sun" className="mt-5 h-12 w-full text-[18px]" onClick={onPlay} autoFocus>
          Play
        </V2Button>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1 text-left text-[13px]">
          {[
            ["WASD", "Move"],
            ["Space", "Jump"],
            ["R", "Run"],
            ["Shift", "Crouch"],
            ["Left click", "Mine"],
            ["Right click", "Build"],
            ["V", "Camera view"],
            ["Esc", "Pause"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-v2-sun">{k}</dt>
              <dd className="font-sans font-semibold text-white/80">{v}</dd>
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
      className="v2-ui fixed inset-0 z-[160] grid place-items-center bg-v2-ink/55 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-label={title} className="v2-panel v2-anim-pop w-full max-w-[320px] p-5 text-center">
        <p className="v2-text-stroke text-[22px] leading-snug">{title}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <V2Button variant="ghost" className="h-11 text-[15px]" onClick={onCancel} autoFocus>
            Stay
          </V2Button>
          <V2Button className="h-11 bg-none text-[15px] [background:#e0484d]" onClick={onConfirm}>
            {confirmLabel}
          </V2Button>
        </div>
      </div>
    </div>
  );
}
