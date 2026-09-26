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
      className="pointer-events-none fixed inset-x-0 top-[max(64px,calc(env(safe-area-inset-top)+56px))] z-[120] flex justify-center px-4"
    >
      <div key={msg.id} className="blockman-panel v2-anim-pop flex max-w-[min(340px,90vw)] items-center gap-2.5 p-1.5 pr-3.5">
        <span
          aria-hidden="true"
          className="blockman-slot grid h-9 w-9 shrink-0 place-items-center rounded-[4px] text-[15px] font-black"
        >
          <span
            className={cn(
              "h-3.5 w-3.5 rotate-45 rounded-[2px]",
              msg.tone === "event" ? "bg-v2-plum" : msg.tone === "reward" ? "bg-v2-sun" : "bg-white/80",
            )}
          />
        </span>
        <div className="min-w-0 text-left">
          {msg.tone && msg.tone !== "info" && (
            <p
              className={cn(
                "text-[9px] font-black uppercase tracking-[0.14em]",
                msg.tone === "event" ? "text-v2-plum" : "text-v2-sun",
              )}
            >
              {msg.tone === "event" ? "World event" : "Quest complete"}
            </p>
          )}
          <p className="truncate text-[13px] font-black leading-tight text-white">{msg.title}</p>
          {msg.detail && <p className="truncate text-[11px] font-semibold text-white/60">{msg.detail}</p>}
        </div>
      </div>
    </div>
  );
}

export function V2Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("v2-panel", className)}>{children}</div>;
}
