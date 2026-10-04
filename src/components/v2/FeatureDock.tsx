import { useRef, useState, type ReactNode } from "react";
import { Crosshair, Heart, Hand, LayoutGrid, ShoppingBag, ArrowLeftRight, X, Pickaxe, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_BUY_PRESETS, type ItemId } from "@/engine/features";

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

function DockButton({
  label,
  active,
  onPress,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onPointerDown={stop}
      onTouchStart={stop}
      onClick={onPress}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl border-2 border-black/40 bg-[#3a2a1a]/85 text-white shadow-[0_3px_0_rgba(0,0,0,.35)] backdrop-blur-sm transition active:translate-y-0.5 active:shadow-none select-none",
        active && "border-amber-300 bg-amber-500/90 shadow-[0_0_10px_rgba(245,158,11,0.6)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function HoldDockButton({
  label,
  active,
  onHold,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  onHold: (down: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const [down, setDown] = useState(false);

  const start = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setDown(true);
    onHold(true);
  };

  const end = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!down) return;
    setDown(false);
    onHold(false);
  };

  const isHeld = active || down;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isHeld}
      title={label}
      onPointerDown={start}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-xl border-2 border-black/40 bg-[#3a2a1a]/85 text-white shadow-[0_3px_0_rgba(0,0,0,.35)] backdrop-blur-sm transition select-none touch-none",
        isHeld
          ? "scale-105 border-orange-400 bg-orange-600/95 shadow-[0_0_14px_rgba(249,115,22,0.9)] translate-y-0.5"
          : "hover:bg-[#4a3622]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FeatureDock({
  hp,
  bridgeAssist,
  offhandIcon,
  canQuickBuy,
  onToggleBridge,
  onSwapOffhand,
  onUseOffhand,
  onOpenWheel,
  onOpenQuickBuy,
  onMine,
  onBuild,
  isMining = false,
}: {
  hp: number;
  bridgeAssist: boolean;
  offhandIcon: string;
  canQuickBuy: boolean;
  onToggleBridge: () => void;
  onSwapOffhand: () => void;
  onUseOffhand: () => void;
  onOpenWheel: () => void;
  onOpenQuickBuy: () => void;
  onMine?: (down: boolean) => void;
  onBuild?: () => void;
  isMining?: boolean;
}) {
  const [showExtras, setShowExtras] = useState(false);

  return (
    <div
      className="pointer-events-auto absolute left-2 top-1/2 z-[60] flex -translate-y-1/2 flex-col items-center gap-1.5"
      onPointerDown={stop}
    >
      {/* Health Badge */}
      <div className="flex items-center gap-1 rounded-full border-2 border-black/40 bg-[#3a2a1a]/85 px-2 py-0.5 text-[12px] font-black text-white shadow-md">
        <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" aria-hidden="true" />
        {Math.ceil(hp)}
      </div>

      {/* Primary Action 1: MINE / BREAK BLOCK (Hold) */}
      {onMine && (
        <HoldDockButton
          label="Mine block (Hold)"
          active={isMining}
          onHold={onMine}
          className="border-amber-400/80 bg-[#3a2818] hover:border-amber-300"
        >
          <Pickaxe className={cn("h-5 w-5 text-amber-200 transition-transform", isMining && "animate-pulse")} aria-hidden="true" />
        </HoldDockButton>
      )}

      {/* Primary Action 2: BUILD / PLACE BLOCK (Tap) */}
      {onBuild && (
        <DockButton
          label="Build / Place block"
          onPress={onBuild}
          className="h-10 w-10 border-blue-400/80 bg-[#1e2e3e]/90 hover:border-blue-300 active:scale-95"
        >
          <Hammer className="h-5 w-5 text-blue-200" aria-hidden="true" />
        </DockButton>
      )}

      {/* Bridge assist toggle */}
      <DockButton label="Bridge assist" active={bridgeAssist} onPress={onToggleBridge}>
        <Crosshair className="h-5 w-5" aria-hidden="true" />
      </DockButton>

      {/* Item Wheel */}
      <DockButton label="Item wheel" onPress={onOpenWheel}>
        <LayoutGrid className="h-5 w-5" aria-hidden="true" />
      </DockButton>

      {/* Use off-hand */}
      <DockButton label="Use off-hand" onPress={onUseOffhand}>
        {offhandIcon ? (
          <img src={offhandIcon} alt="" draggable={false} className="h-6 w-6 [image-rendering:pixelated]" />
        ) : (
          <Hand className="h-5 w-5" aria-hidden="true" />
        )}
      </DockButton>

      {/* Swap off-hand & Quick Buy (secondary access) */}
      <div className="flex items-center gap-1">
        <DockButton
          label="Swap off-hand"
          onPress={onSwapOffhand}
          className="h-8 w-8 text-white/80"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
        </DockButton>

        {canQuickBuy && (
          <DockButton
            label="Quick buy"
            onPress={onOpenQuickBuy}
            className="h-8 w-8 text-amber-300"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          </DockButton>
        )}
      </div>
    </div>
  );
}

export function RadialWheel({
  items,
  iconOf,
  selected,
  onPick,
  onClose,
}: {
  items: ItemId[];
  iconOf: (id: ItemId) => string;
  selected: number;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const center = useRef<HTMLDivElement>(null);
  const slots = items.map((id, index) => ({ id, index })).filter((s) => s.id !== 0);
  const radius = 92;

  const sectorAt = (clientX: number, clientY: number) => {
    const box = center.current?.getBoundingClientRect();
    if (!box || slots.length === 0) return null;
    const dx = clientX - (box.left + box.width / 2);
    const dy = clientY - (box.top + box.height / 2);
    if (Math.hypot(dx, dy) < 28) return null;
    const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
    const step = (Math.PI * 2) / slots.length;
    return slots[Math.round(angle / step) % slots.length].index;
  };

  const pick = (index: number) => {
    onPick(index);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center bg-black/45"
      onPointerMove={(e) => setHover(sectorAt(e.clientX, e.clientY))}
      onPointerUp={(e) => {
        const index = sectorAt(e.clientX, e.clientY);
        if (index !== null) pick(index);
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={center} className="relative h-[250px] w-[250px]" role="dialog" aria-label="Item wheel">
        <button
          type="button"
          aria-label="Close item wheel"
          onClick={onClose}
          className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-black/50 bg-[#3a2a1a] text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        {slots.map((slot, i) => {
          const angle = (i / slots.length) * Math.PI * 2;
          const x = Math.sin(angle) * radius;
          const y = -Math.cos(angle) * radius;
          const active = hover === slot.index || (hover === null && selected === slot.index);
          return (
            <button
              key={slot.index}
              type="button"
              aria-label={`Slot ${slot.index + 1}`}
              onClick={() => pick(slot.index)}
              style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
              className={cn(
                "absolute grid h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border-2 bg-[#3a2a1a]/90 transition-transform",
                active ? "scale-110 border-amber-300 bg-amber-500/80" : "border-black/50",
              )}
            >
              {iconOf(slot.id) ? (
                <img src={iconOf(slot.id)} alt="" draggable={false} className="h-8 w-8 object-contain [image-rendering:pixelated]" />
              ) : (
                <span className="text-[10px] font-black text-white">{String(slot.id).slice(0, 4)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function QuickBuyPanel({ onApply, onClose }: { onApply: (items: ItemId[], name: string) => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 p-3"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Quick buy presets"
        className="wood-panel v2-anim-pop w-full max-w-[360px] overflow-hidden"
      >
        <header className="wood-header relative flex h-10 items-center justify-center">
          <h2 className="font-lilita text-[20px] text-white [text-shadow:0_2px_0_rgba(0,0,0,.6)]">Quick Buy</h2>
          <button type="button" onClick={onClose} aria-label="Close quick buy" className="absolute right-2 text-white/90 active:scale-90">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <ul className="flex flex-col gap-2 p-2.5">
          {QUICK_BUY_PRESETS.map((preset) => (
            <li key={preset.name}>
              <button
                type="button"
                onClick={() => {
                  onApply(preset.items, preset.name);
                  onClose();
                }}
                className="wood-slot flex w-full flex-col items-start rounded-[4px] px-3 py-2 text-left active:scale-[0.98]"
              >
                <span className="font-lilita text-[16px] text-amber-300">{preset.name}</span>
                <span className="text-[12px] font-bold text-white/80">{preset.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
