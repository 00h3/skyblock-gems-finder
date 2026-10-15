import { SPECIES, type SeedCounts, type Species } from "@/engine-sandbox/skyblock/nature";
import { cn } from "@/lib/utils";

/** Compact seed pouch: shows each species you carry; tap one to pick what "Plant" sows. */
export function SeedPouch({
  seeds,
  selected,
  onSelect,
}: {
  seeds: SeedCounts;
  selected: Species;
  onSelect: (s: Species) => void;
}) {
  const owned = (Object.keys(SPECIES) as Species[]).filter((s) => seeds[s] > 0);
  return (
    <div
      role="radiogroup"
      aria-label="Seed pouch"
      className="pointer-events-auto absolute right-[max(12px,env(safe-area-inset-right))] top-[calc(max(10px,env(safe-area-inset-top))+56px)] flex flex-col gap-1.5 sm:right-6"
    >
      {owned.map((s) => {
        const active = s === selected || (seeds[selected] === 0 && s === owned[0]);
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(s)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] font-extrabold text-white backdrop-blur-md transition-transform active:scale-95",
              active ? "border-white/70 bg-black/55" : "border-white/15 bg-black/35",
            )}
          >
            <span aria-hidden className="h-3.5 w-3.5 rounded-[3px]" style={{ background: SPECIES[s].tint }} />
            {SPECIES[s].label} seed
            <span className="tabular-nums text-white/80">x{seeds[s]}</span>
          </button>
        );
      })}
    </div>
  );
}
