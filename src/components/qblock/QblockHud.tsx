import type { CSSProperties, ReactNode } from "react";

const PURPLE = { size: "459% 244%" };
const GRAY = { size: "329% 196%" };
const BLANK = { size: "206% 124%" };

export const LILITA: CSSProperties = { fontFamily: '"Lilita One", sans-serif' };

type SpriteProps = {
  src: string;
  label: string;
  kind?: "purple" | "gray" | "blank";
  rotate?: number;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  onHold?: (down: boolean) => void;
};

export function SpriteButton({ src, label, kind = "purple", rotate = 0, className = "", children, onClick, onHold }: SpriteProps) {
  const cfg = kind === "purple" ? PURPLE : kind === "blank" ? BLANK : GRAY;
  const hold = onHold
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onHold(true);
        },
        onPointerUp: () => onHold(false),
        onPointerCancel: () => onHold(false),
        onLostPointerCapture: () => onHold(false),
      }
    : {};
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative touch-none select-none transition-transform active:scale-90 ${className}`}
      {...hold}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: cfg.size,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transform: rotate ? `rotate(${rotate}deg)` : undefined,
        }}
      />
      {children && (
        <span className="relative flex h-full w-full items-center justify-center text-white" style={{ ...LILITA, textShadow: "0 2px 0 rgba(0,0,0,.45)" }}>
          {children}
        </span>
      )}
    </button>
  );
}

type Dir = "f" | "b" | "l" | "r";

export function DPad({ onDir }: { onDir: (d: Dir, down: boolean) => void }) {
  const size = "h-[clamp(44px,12vmin,76px)] w-[clamp(50px,13.8vmin,88px)]";
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-[2px]" aria-label="Movement controls">
      <span />
      <SpriteButton src="/qblock/ui/arrow.png" kind="gray" rotate={-90} label="Move forward" className={size} onHold={(d) => onDir("f", d)} />
      <span />
      <SpriteButton src="/qblock/ui/arrow.png" kind="gray" rotate={180} label="Move left" className={size} onHold={(d) => onDir("l", d)} />
      <SpriteButton src="/qblock/ui/button.png" kind="blank" label="Center" className={`${size} pointer-events-none opacity-80`} />
      <SpriteButton src="/qblock/ui/arrow.png" kind="gray" label="Move right" className={size} onHold={(d) => onDir("r", d)} />
      <span />
      <SpriteButton src="/qblock/ui/arrow.png" kind="gray" rotate={90} label="Move back" className={size} onHold={(d) => onDir("b", d)} />
      <span />
    </div>
  );
}

export function Pill({ children, color = "#3d2f86" }: { children: ReactNode; color?: string }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-xl border-2 border-black/40 px-2.5 py-1 text-[clamp(12px,3.4vmin,18px)] text-white shadow-[0_3px_0_rgba(0,0,0,.35)]"
      style={{ ...LILITA, background: color, textShadow: "0 2px 0 rgba(0,0,0,.4)" }}
    >
      {children}
    </div>
  );
}

export function GemIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 3h12l4 6-10 12L2 9z" fill="#35e0a1" stroke="#0b5e43" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 9h20M9 3l3 18 3-18" fill="none" stroke="#0b5e43" strokeWidth="1" opacity=".6" />
    </svg>
  );
}
