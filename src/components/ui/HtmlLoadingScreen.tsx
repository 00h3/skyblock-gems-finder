import { useEffect, useState } from "react";
import { MorphingSquare } from "@/components/ui/morphing-square";

export function HtmlLoadingScreen({
  onDone,
  speedMs = 20,
  fadeOutOnDone = true,
  className = "",
}: {
  onDone?: () => void;
  speedMs?: number;
  fadeOutOnDone?: boolean;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 40;
    const id = setInterval(() => {
      frame++;
      const pct = Math.min(100, Math.round((frame / totalFrames) * 100));
      setProgress(pct);
      if (frame >= totalFrames) {
        clearInterval(id);
        if (fadeOutOnDone) {
          setFadeOut(true);
          setTimeout(() => {
            onDone?.();
          }, 350);
        } else {
          onDone?.();
        }
      }
    }, speedMs);
    return () => clearInterval(id);
  }, [onDone, speedMs, fadeOutOnDone]);

  return (
    <div
      suppressHydrationWarning
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center select-none bg-white transition-opacity duration-300 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
      } ${className}`}
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <MorphingSquare message={`${progress}%`} messagePlacement="bottom" className="text-xl font-bold bg-[#14161a]" />
      </div>
    </div>
  );
}

export function HtmlSpinner({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-7 h-7",
    lg: "w-10 h-10",
  };
  return (
    <div className={`shrink-0 ${className}`}>
       <MorphingSquare className={`${sizeMap[size]} bg-primary`} />
    </div>
  );
}

export function HtmlElementLoader({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-center ${compact ? "p-2" : "p-4"} ${className}`}>
      <div className="flex items-center justify-center p-4 rounded-xl bg-white shadow-sm border border-black/[0.06]">
        <MorphingSquare className="bg-primary" />
      </div>
    </div>
  );
}
