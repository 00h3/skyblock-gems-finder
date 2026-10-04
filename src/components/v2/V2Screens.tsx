import { useEffect, useRef, useState } from "react";
import WetPaintButton from "@/components/ui/wet-paint-button";
import { V2Button } from "./primitives";

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
}) {
  const startTimeRef = useRef<number>(Date.now());
  const [actualProgress, setActualProgress] = useState(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    startTimeRef.current = Date.now();
    finishedRef.current = false;
  }, []);

  useEffect(() => {
    const MIN_DURATION_MS = 20000; // 20 seconds minimum duration

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const timeRatio = Math.min(1, elapsed / MIN_DURATION_MS);
      const rawAssetProgress = Math.min(100, Math.max(0, progress ?? 0));
      const assetRatio = isAssetsLoaded ? 1 : rawAssetProgress / 100;

      // The progress must reflect real asset loading while also staying active for 20s.
      // If assets are still loading after 20s, wait for them.
      let computed = 0;
      if (elapsed < MIN_DURATION_MS) {
        // Still in minimum 20s window: progress advances up to 99% proportionally
        computed = Math.min(99, Math.round(timeRatio * 90 + assetRatio * 9));
      } else {
        // 20 seconds have elapsed. Check if all assets & models are fully loaded.
        if (isAssetsLoaded || rawAssetProgress >= 100) {
          computed = 100;
        } else {
          // Keep at 95% until assets are actually loaded
          computed = Math.min(98, 90 + Math.round(assetRatio * 8));
        }
      }

      setActualProgress((prev) => Math.max(prev, computed));

      if (computed >= 100 && !finishedRef.current) {
        finishedRef.current = true;
        clearInterval(interval);
        setTimeout(() => {
          onFinished?.();
        }, 400);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [progress, isAssetsLoaded, onFinished]);

  return (
    <div
      className="v2-ui fixed inset-0 z-[150] flex flex-col items-center justify-center overflow-hidden select-none bg-black"
      style={{ touchAction: "none" }}
    >
      {/* Background MP4 Animation */}
      <video
        src="https://maxwell.z3ki.dev/bot/_files/qblock-animation/qblock_animation.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      />

      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px] pointer-events-none" />

      {/* Loader stuck on the bottom — shows only the loader and what is loading */}
      <div className="absolute inset-x-4 sm:inset-x-8 bottom-[max(20px,calc(env(safe-area-inset-bottom)+12px))] z-20 mx-auto w-full max-w-[480px]">
        {/* Pixelated, glossy orange rectangular progress bar */}
        <div className="w-full">
          {/* Outer rectangular pixel frame */}
          <div className="p-1 bg-[#0d0e12] border-4 border-black shadow-[0_6px_0_#000,0_12px_28px_rgba(0,0,0,0.85)]">
            {/* Inner track */}
            <div className="relative h-7 sm:h-8 w-full bg-[#1b1d24] overflow-hidden border-2 border-black/80">
              {/* Subtle pixel grid pattern */}
              <div
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
                  backgroundSize: "16px 100%",
                }}
              />

              {/* Glossy orange rectangular fill */}
              <div
                className="relative h-full transition-[width] duration-150 ease-out bg-gradient-to-b from-[#ffa34d] via-[#fa4616] to-[#b82f05]"
                style={{ width: `${actualProgress}%` }}
              >
                {/* Upper-half gloss reflection highlight */}
                <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/55 to-white/10 pointer-events-none" />

                {/* Pixelated segment notches */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-35"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent, transparent 12px, #000 12px, #000 14px)",
                  }}
                />

                {/* Specular front edge */}
                <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-white/80 shadow-[0_0_8px_#fff]" />
              </div>
            </div>
          </div>

          {/* What is loading & percentage */}
          <div className="mt-2.5 flex items-center justify-between px-1">
            <span className="text-[12px] sm:text-[13px] font-black tracking-wide uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {actualProgress < 30
                ? "Loading world & textures…"
                : actualProgress < 65
                  ? "Preparing 3D voxel models…"
                  : actualProgress < 95
                    ? "Compiling shaders & entities…"
                    : !isAssetsLoaded
                      ? "Finalizing assets…"
                      : "Ready!"}
            </span>
            <span className="text-[13px] sm:text-[14px] font-black tabular-nums text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
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
