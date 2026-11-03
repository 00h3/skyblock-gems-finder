import { useEffect, useRef, useState } from "react";
import WetPaintButton from "@/components/ui/wet-paint-button";
import { V2Button } from "./primitives";
import { PhoenixLoadingVisual } from "@/components/skyblock/PhoenixLoadingVisual";

export function V2LoadingScreen({
  title,
  subtitle,
  progress = 0,
  isAssetsLoaded = false,
  onFinished,
}: {
  title: string;
  subtitle: string;
  progress?: number;
  isAssetsLoaded?: boolean;
  onFinished?: () => void;
  showPhoenix?: boolean;
}) {
  const startTimeRef = useRef<number>(Date.now());
  const [actualProgress, setActualProgress] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    finishedRef.current = false;
  }, []);

  useEffect(() => {
    const MIN_DURATION_MS = 1400;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const timeRatio = Math.min(1, elapsed / MIN_DURATION_MS);
      const rawAssetProgress = Math.min(100, Math.max(0, progress ?? 0));
      const assetRatio = isAssetsLoaded ? 1 : rawAssetProgress / 100;

      let computed = 0;
      if (elapsed < MIN_DURATION_MS) {
        computed = Math.min(95, Math.round(timeRatio * 75 + assetRatio * 20));
      } else {
        if (isAssetsLoaded || rawAssetProgress >= 90) {
          computed = 100;
        } else {
          computed = Math.min(98, 90 + Math.round(assetRatio * 8));
        }
      }

      setActualProgress((prev) => Math.max(prev, computed));

      if (computed >= 100 && !finishedRef.current) {
        finishedRef.current = true;
        clearInterval(interval);
        setTimeout(() => {
          onFinished?.();
        }, 250);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [progress, isAssetsLoaded, onFinished]);

  return (
    <div
      className="v2-ui fixed inset-0 z-[150] flex flex-col items-center justify-center overflow-hidden select-none bg-[#0a0c10]"
      style={{ touchAction: "none" }}
    >
      {/* Subtle deep gradient backdrop with geometric block pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(250,70,22,0.18) 0%, rgba(15,18,25,0.85) 60%, #080a0e 100%)",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Center QBLOCK emblem - clean and sleek */}
      <div className="relative z-20 flex flex-col items-center mb-10">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#fa4616] via-[#ff7a00] to-[#ffa726] p-0.5 shadow-[0_4px_25px_rgba(250,70,22,0.45)] flex items-center justify-center mb-3">
          <span className="font-lilita text-[28px] text-white [text-shadow:0_2px_4px_#000]">Q</span>
        </div>
        <h2 className="font-lilita text-[24px] tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          QBLOCK
        </h2>
        <p className="mt-1 text-[12px] font-bold text-zinc-300 tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          {subtitle || "Connecting to world…"}
        </p>
      </div>

      {/* Compact Loader bar */}
      <div className="relative z-20 w-full max-w-[300px] px-4">
        <div className="w-full bg-black/70 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
          <div className="p-0.5 bg-[#0d0e12] border border-black/90 rounded-[4px]">
            <div className="relative h-4 w-full bg-[#1b1d24] overflow-hidden rounded-[2px]">
              <div
                className="relative h-full transition-[width] duration-150 ease-out bg-gradient-to-r from-[#fa4616] via-[#ff8800] to-[#ffa726]"
                style={{ width: `${actualProgress}%` }}
              >
                <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_6px_#fff]" />
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] font-bold text-white/90">
            <span className="tracking-wide uppercase text-[10.5px]">
              {actualProgress < 35
                ? "Connecting…"
                : actualProgress < 75
                  ? "Loading models…"
                  : actualProgress < 95
                    ? "Compiling shaders…"
                    : "Ready!"}
            </span>
            <span className="tabular-nums font-mono text-[11px] text-amber-400">
              {Math.round(actualProgress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fades the world in after spawns, respawns and new rounds. */
export function V2Veil({ token }: { token: number }) {
  return <div key={token} aria-hidden="true" className="v2-anim-veil pointer-events-none fixed inset-0 z-[125] bg-white" />;
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
