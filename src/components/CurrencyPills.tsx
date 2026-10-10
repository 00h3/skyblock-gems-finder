import { Plus } from "lucide-react";
import { useCurrency, type CurrencyKey } from "@/lib/currency";

export const GOLDEN_COINS_ICON = "https://file.garden/alGOOylwpAfCa6qP/file_000000008f8481f49405d6c7b6fcbb5a.png";
export const PINK_GEM_ICON =
  "https://file.garden/alGOOylwpAfCa6qP/file_000000007ea881f4a21aac7088884509.png";

type CurrencyPillsProps = {
  onSelect?: (currency: Extract<CurrencyKey, "gold" | "gems" | "pinkCube">) => void;
  onOpenModal?: (type: "gold" | "gem" | "pinkCube") => void;
  compact?: boolean;
  maxItems?: 2;
  className?: string;
};

const currencies = [
  { key: "gems" as const, label: "Gems", src: PINK_GEM_ICON, tone: "#ec4899" },
  { key: "gold" as const, label: "Golden Coins", src: GOLDEN_COINS_ICON, tone: "#f59e0b" },
  { key: "pinkCube" as const, label: "Gems", src: PINK_GEM_ICON, tone: "#ec4899" },
];

export function CurrencyPills({ onSelect, onOpenModal, compact = false, maxItems, className = "" }: CurrencyPillsProps) {
  const gems = useCurrency("gems");
  const gold = useCurrency("gold");
  const newGen = useCurrency("pinkCube");
  const values = { gems, gold, pinkCube: newGen };

  const handleAction = (currencyKey: Extract<CurrencyKey, "gold" | "gems" | "pinkCube">) => {
    if (onOpenModal) {
      onOpenModal(currencyKey === "gems" ? "gem" : currencyKey);
    } else if (onSelect) {
      onSelect(currencyKey);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "w-full"} ${className}`} aria-label="Currencies">
      {currencies.slice(0, maxItems).map((currency) => {
        const itemContent = (
          <div
            className={`qb-squircle relative flex items-center overflow-hidden transition-all ${
              compact ? "h-9 pl-2" : "h-9 pl-2.5 flex-1"
            } rounded-[12px]`}
          >
            {/* Currency Icon & Balance */}
            <div className="flex items-center gap-1.5 pr-1.5 py-1 min-w-0">
              <img
                src={currency.src}
                alt=""
                className={`${compact ? "h-4.5 w-4.5" : "h-5 w-5"} object-contain shrink-0`}
                draggable={false}
              />
              <span
                className={`tabular-nums font-black text-[#17181b] tracking-tight ${
                  compact ? "text-[11.5px]" : "text-[12.5px]"
                }`}
                suppressHydrationWarning
              >
                {(values[currency.key] ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Attached Glossy Plus Button */}
            <div
              className="flex h-full items-center justify-center px-1.5 bg-gradient-to-b from-white/95 to-[#e8ebf0]/90 border-l border-[rgba(23,24,27,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.98)] text-[#17181b] hover:from-white hover:to-[#f0f3f7] active:bg-black/5 transition-colors"
              title={`Add ${currency.label}`}
            >
              <Plus className="h-3 w-3 stroke-[3] text-[#17181b]" />
            </div>
          </div>
        );

        return onSelect || onOpenModal ? (
          <button
            key={currency.key}
            type="button"
            onClick={() => handleAction(currency.key)}
            className="press min-w-0 flex-1 active:scale-95 transition-transform"
            aria-label={`Buy or view ${currency.label}`}
          >
            {itemContent}
          </button>
        ) : (
          <div key={currency.key} className="min-w-0 flex-1">
            {itemContent}
          </div>
        );
      })}
    </div>
  );
}
