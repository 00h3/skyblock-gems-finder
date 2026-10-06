import { useCurrency, type CurrencyKey } from "@/lib/currency";
export const GOLDEN_COINS_ICON = "https://file.garden/alGOOylwpAfCa6qP/IMG_7215.png";
export const PINK_GEM_ICON =
  "https://file.garden/alGOOylwpAfCa6qP/70907A5A-2AD0-4E56-A5A3-6F1E0548E44A.png";

type CurrencyPillsProps = {
  onSelect?: (currency: Extract<CurrencyKey, "gold" | "gems" | "pinkCube">) => void;
  compact?: boolean;
  maxItems?: 2;
};

const currencies = [
  { key: "gems" as const, label: "Gems", src: PINK_GEM_ICON, tone: "#ec4899" },
  { key: "gold" as const, label: "Golden Coins", src: GOLDEN_COINS_ICON, tone: "#f59e0b" },
  { key: "pinkCube" as const, label: "Gems", src: PINK_GEM_ICON, tone: "#ec4899" },
];

export function CurrencyPills({ onSelect, compact = false, maxItems }: CurrencyPillsProps) {
  const gems = useCurrency("gems");
  const gold = useCurrency("gold");
  const newGen = useCurrency("pinkCube");
  const values = { gems, gold, pinkCube: newGen };

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "w-full"}`} aria-label="Currencies">
      {currencies.slice(0, maxItems).map((currency) => {
        const pill = (
          <span
            className={`currency-pill icon-gloss ${compact ? "h-7 px-2" : "h-8.5 flex-1 px-2.5"} flex items-center gap-1.5 rounded-full`}
            style={{ color: currency.tone }}
          >
            <img
              src={currency.src}
              alt=""
              className={`${compact ? "h-4 w-4" : "h-5 w-5"} object-contain shrink-0`}
              draggable={false}
            />
            <span
              className={`tabular-nums font-black text-[#17181b] ${compact ? "text-[11px]" : "text-[12px]"}`}
              suppressHydrationWarning
            >
              {(values[currency.key] ?? 0).toLocaleString()}
            </span>
          </span>
        );

        return onSelect ? (
          <button
            key={currency.key}
            type="button"
            onClick={() => onSelect(currency.key)}
            className="press min-w-0 flex-1"
            aria-label={currency.label}
          >
            {pill}
          </button>
        ) : (
          <div key={currency.key} className="min-w-0 flex-1">
            {pill}
          </div>
        );
      })}
    </div>
  );
}
