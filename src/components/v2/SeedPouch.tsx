import { useState } from "react";
import { SPECIES, type SeedCounts, type Species } from "@/engine-sandbox/skyblock/nature";
import { cn } from "@/lib/utils";

/**
 * Plant menu: Small square with seed emoji in the exact grey inventory button style.
 */
export function SeedPouch({
  seeds,
  selected,
  onSelect,
}: {
  seeds: SeedCounts;
  selected: Species;
  onSelect: (s: Species) => void;
}) {
  const [open, setOpen] = useState(false);
  const owned = (Object.keys(SPECIES) as Species[]).filter((s) => seeds[s] > 0);
  const currentCount = seeds[selected] || (owned[0] ? seeds[owned[0]] : 0);

  if (owned.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute right-[max(12px,env(safe-area-inset-right))] top-[calc(max(10px,env(safe-area-inset-top))+56px)] z-30 flex flex-col items-end sm:right-6">
      {/* Small square with seed emoji, styled exactly like the grey inventory button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "blockman-slot relative grid h-10 w-10 place-items-center rounded-[4px] transition-all cursor-pointer active:scale-95 select-none",
          open && "bg-[#46464c] border-white",
        )}
        aria-label="Seed plant menu"
        title="Plant seeds"
      >
        <span className="text-[17px] leading-none select-none drop-shadow-sm">🌱</span>
        {currentCount > 0 && (
          <span className="absolute -bottom-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-black text-white shadow ring-1 ring-black/40">
            {currentCount}
          </span>
        )}
      </button>

      {/* Popup seed selector in the exact grey inventory style */}
      {open && (
        <div className="mt-1.5 flex flex-col gap-1 rounded-[10px] border border-[#363b46] bg-[#22252c]/95 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.65)] backdrop-blur-md min-w-[130px] animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Seeds
          </div>
          {owned.map((s) => {
            const active = s === selected;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-[6px] px-2.5 py-1.5 text-[12px] font-bold text-white transition-all cursor-pointer",
                  active
                    ? "bg-[#2b3952] text-emerald-300 ring-1 ring-[#38bdf8]"
                    : "hover:bg-[#34373e] text-slate-200",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: SPECIES[s].tint }}
                  />
                  <span>{SPECIES[s].label}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">x{seeds[s]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

