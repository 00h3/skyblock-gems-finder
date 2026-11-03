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
  showPhoenix,
}: {
  title: string;
  subtitle: string;
  progress?: number;
  isAssetsLoaded?: boolean;
  onFinished?: () => void;
  showPhoenix?: boolean;
}) {
  const isSkyblock =
    title?.toLowerCase().includes("skyblock") ||
    subtitle?.toLowerCase().includes("skyblock") ||
    subtitle?.toLowerCase().includes("island") ||
    Boolean(showPhoenix);
  const startTimeRef = useRef<number>(Date.now());
  const [actualProgress, setActualProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    finishedRef.current = false;
  }, []);

  useEffect(() => {
    // Fast, responsive loading: snappy 2.5s minimum experience so assets initialize smoothly
    const MIN_DURATION_MS = 2500;

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
        }, 300);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [progress, isAssetsLoaded, onFinished]);

  return (
    <div
      className="v2-ui fixed inset-0 z-[150] flex flex-col items-center justify-center overflow-hidden select-none bg-[#090b10]"
      style={{ touchAction: "none" }}
    >
      {/* High-Resolution Floating Islands Background Artwork */}
      <img
        src="https://maxwell.z3ki.dev/bot/_files/floating-islands/floating-islands.png"
        alt="Skyblock Floating Islands"
        className="absolute inset-0 h-full w-full object-cover pointer-events-none [image-rendering:auto]"
      />

      {/* Subtle vignette dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40 pointer-events-none" />

      {/* Title badge - small and compact */}
      <div className="relative z-20 flex flex-col items-center mb-12">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-[#fa4616] to-[#ff9800] p-0.5 shadow-[0_4px_20px_rgba(250,70,22,0.5)] flex items-center justify-center mb-1.5">
          <span className="font-lilita text-[22px] text-white [text-shadow:0_2px_4px_#000]">Q</span>
        </div>
        <h2 className="font-lilita text-[22px] tracking-wider text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {isSkyblock ? "SKYBLOCK" : "QBLOCK"}
        </h2>
        <p className="text-[11px] font-bold text-zinc-200/90 tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          {subtitle || "Building your island…"}
        </p>
      </div>

      {/* Compact Loader stuck near bottom */}
      <div className="absolute inset-x-4 bottom-[max(20px,calc(env(safe-area-inset-bottom)+12px))] z-20 mx-auto w-full max-w-[320px]">
        <div className="w-full bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
          {/* Outer rectangular pixel frame */}
          <div className="p-0.5 bg-[#0d0e12] border-2 border-black">
            {/* Inner track */}
            <div className="relative h-5 w-full bg-[#1b1d24] overflow-hidden border border-black/80">
              {/* Glossy orange rectangular fill */}
              <div
                className="relative h-full transition-[width] duration-150 ease-out bg-gradient-to-b from-[#ffa34d] via-[#fa4616] to-[#b82f05]"
                style={{ width: `${actualProgress}%` }}
              >
                <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/55 to-white/10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/90 shadow-[0_0_6px_#fff]" />
              </div>
            </div>
          </div>

          {/* Status message and percentage */}
          <div className="mt-1.5 flex items-center justify-between px-0.5 text-[11px] font-black text-white">
            <span className="tracking-wide uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {actualProgress < 30
                ? "Loading world…"
                : actualProgress < 65
                  ? "Preparing models…"
                  : actualProgress < 95
                    ? "Compiling shaders…"
                    : !isAssetsLoaded
                      ? "Finalizing…"
                      : "Ready!"}
            </span>
            <span className="tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
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
