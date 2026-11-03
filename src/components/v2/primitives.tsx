import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { announcer } from "@/engine-sandbox/shared/announcer";
import { useStore } from "@/engine-sandbox/shared/store";

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

/** Wooden quest and event message, styled after the square island progress panel. */
export function V2Announcer() {
  const msg = useStore(announcer);
  const [visibleId, setVisibleId] = useState<number | null>(null);

  useEffect(() => {
    if (!msg) return;
    setVisibleId(msg.id);
    const t = window.setTimeout(() => setVisibleId((id) => (id === msg.id ? null : id)), 3200);
    return () => window.clearTimeout(t);
  }, [msg]);

  if (!msg || visibleId !== msg.id) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-[120] flex justify-center px-4"
    >
      <div
        key={msg.id}
        className="v2-anim-pop relative flex max-w-[min(380px,94vw)] items-center gap-3 rounded-[6px] px-3.5 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.7)]"
        style={{
          background: "rgba(28, 28, 32, 0.92)",
          border: "2px solid rgba(12, 12, 14, 0.95)",
          fontFamily:
            '"InterDisplay", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-white/10 bg-[#16161a] text-[15px] text-amber-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"
        >
          {msg.tone === "event" ? "⚡" : msg.tone === "reward" ? "📜" : "🧱"}
        </span>
        <div className="min-w-0 text-left">
          {msg.tone && msg.tone !== "info" && (
            <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
              {msg.tone === "event" ? "World event" : "Reward"}
            </p>
          )}
          <p
            className="truncate text-[13px] font-bold text-white leading-tight"
            style={{
              textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            }}
          >
            {msg.title}
          </p>
          {msg.detail && (
            <p
              className="truncate text-[11px] font-semibold text-zinc-300"
              style={{
                textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
              }}
            >
              {msg.detail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function V2Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("v2-panel", className)}>{children}</div>;
}
