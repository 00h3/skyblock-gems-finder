import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { announcer } from "@/engine/v2/announcer";
import { useStore } from "@/engine/v2/store";

type Variant = "plum" | "sun" | "ghost";

export function V2Button({
  variant = "plum",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={cn(
        "v2-btn v2-text-stroke cursor-pointer",
        variant === "sun" && "v2-btn-sun [text-shadow:none]",
        variant === "ghost" && "v2-btn-ghost",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Re-renders on an interval so countdowns/timers read the live clock. */
export function useNow(intervalMs = 250) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (ts - last >= intervalMs) {
        last = ts;
        setT(Date.now());
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [intervalMs]);
  return t;
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** White centre message, styled after the "Welcome to ..." reference card. */
export function V2Announcer() {
  const msg = useStore(announcer);
  const [visibleId, setVisibleId] = useState<number | null>(null);

  useEffect(() => {
    if (!msg) return;
    setVisibleId(msg.id);
    const t = window.setTimeout(() => setVisibleId((id) => (id === msg.id ? null : id)), 2800);
    return () => window.clearTimeout(t);
  }, [msg]);

  if (!msg || visibleId !== msg.id) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[26%] z-[120] flex justify-center px-4"
    >
      <div key={msg.id} className="v2-paper v2-anim-pop max-w-[min(560px,92vw)] px-6 py-3 text-center sm:px-10 sm:py-4">
        {msg.tone && msg.tone !== "info" && (
          <p
            className={cn(
              "text-[11px] uppercase tracking-[0.2em]",
              msg.tone === "event" ? "text-v2-plum" : "text-[#b8860b]",
            )}
          >
            {msg.tone === "event" ? "World event" : "Reward"}
          </p>
        )}
        <p className="text-balance text-[22px] leading-tight sm:text-[30px]">{msg.title}</p>
        {msg.detail && (
          <p className="mt-1 text-pretty font-sans text-[13px] font-semibold text-v2-ink/60 sm:text-[14px]">
            {msg.detail}
          </p>
        )}
      </div>
    </div>
  );
}

export function V2Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("v2-panel", className)}>{children}</div>;
}
