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
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 30;
    const id = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        clearInterval(id);
        if (fadeOutOnDone) {
          setFadeOut(true);
          setTimeout(() => {
            onDone?.();
          }, 250);
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
      className={`fixed inset-0 z-[99999] bg-white select-none transition-opacity duration-300 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
      } ${className}`}
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Loading Spinner placed strictly in bottom right corner */}
      <div className="fixed right-6 bottom-[max(24px,calc(env(safe-area-inset-bottom)+16px))] z-[100000] flex items-center gap-2 select-none pointer-events-none">
        <div className="w-8 h-8 rounded-full border-3 border-[#fa4616]/25 border-t-[#fa4616] animate-spin shadow-sm" />
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
