import { useState } from "react";
import { X, Check } from "lucide-react";
import { addCurrency } from "@/lib/currency";

export const GOLDEN_COINS_ICON = "https://file.garden/alGOOylwpAfCa6qP/IMG_7215.png";
export const PINK_GEM_ICON =
  "https://file.garden/alGOOylwpAfCa6qP/70907A5A-2AD0-4E56-A5A3-6F1E0548E44A.png";

export function GoldCoin({ size = 22 }: { size?: number }) {
  return (
    <img
      src={GOLDEN_COINS_ICON}
      alt="Golden Coins"
      style={{ height: size, width: size }}
      className="object-contain select-none"
      draggable={false}
      suppressHydrationWarning
    />
  );
}

export function GemCoin({ size = 22 }: { size?: number }) {
  return (
    <img
      src={PINK_GEM_ICON}
      alt="Gems"
      style={{ height: size, width: size }}
      className="object-contain select-none drop-shadow-[0_2px_4px_rgba(236,72,153,0.35)]"
      draggable={false}
      suppressHydrationWarning
    />
  );
}

export function PinkCube({ size = 22 }: { size?: number }) {
  return (
    <img
      src={PINK_GEM_ICON}
      alt="Gems"
      style={{ height: size, width: size }}
      className="object-contain select-none drop-shadow-[0_2px_4px_rgba(219,39,119,0.35)]"
      draggable={false}
      suppressHydrationWarning
    />
  );
}

export const goldPackages = [
  { id: 1, amount: "1,000", bonus: null, price: "$0.99", popular: false },
  { id: 2, amount: "5,500", bonus: "+500 bonus", price: "$4.99", popular: false },
  { id: 3, amount: "12,000", bonus: "+2,000 bonus", price: "$9.99", popular: true },
  { id: 4, amount: "28,000", bonus: "+8,000 bonus", price: "$19.99", popular: false },
];

export const gemPackages = [
  { id: 101, amount: "100", bonus: null, price: "$0.99", popular: false },
  { id: 102, amount: "550", bonus: "+50 bonus", price: "$4.99", popular: false },
  { id: 103, amount: "1,200", bonus: "+200 bonus", price: "$9.99", popular: true },
  { id: 104, amount: "2,800", bonus: "+800 bonus", price: "$19.99", popular: false },
];

// ─── Buy Modal ────────────────────────────────────────────────────────────────
export function BuyModal({ type, onClose }: { type: "gold" | "gem"; onClose: () => void }) {
  const [tab, setTab] = useState<"gold" | "gem">(type);
  const [selected, setSelected] = useState<number | null>(null);
  const [boughtNotice, setBoughtNotice] = useState<string | null>(null);
  const pkgs = tab === "gold" ? goldPackages : gemPackages;
  const isGold = tab === "gold";

  const executePurchase = (pkgId: number) => {
    const pkg = pkgs.find((p) => p.id === pkgId);
    if (!pkg) return;
    const baseAmt = parseInt(pkg.amount.replace(/,/g, ""), 10) || 0;
    const bonusAmt = pkg.bonus ? parseInt(pkg.bonus.replace(/[^0-9]/g, ""), 10) || 0 : 0;
    const total = baseAmt + bonusAmt;
    addCurrency(isGold ? "gold" : "gems", total);
    setBoughtNotice(`+${total.toLocaleString()} ${isGold ? "Gold" : "Gems"} added!`);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-[440px] bg-background rounded-t-[34px] shadow-level3 animate-sheet-up overflow-hidden"
        style={{ maxHeight: "88dvh" }}
      >
        <div className="pt-2.5 flex justify-center">
          <div className="h-1.5 w-10 rounded-full bg-border" />
        </div>
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-[20px] font-extrabold"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Get Currency
              </h2>
              <p className="text-[11px] font-medium text-text-muted">
                Instant delivery · Fast & Secure
              </p>
            </div>
            <button
              onClick={onClose}
              className="press close-button h-10 w-10 bg-surface-2 grid place-items-center"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
          {boughtNotice && (
            <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[13px] font-extrabold text-center flex items-center justify-center gap-2 animate-scale-in">
              <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} />
              {boughtNotice}
            </div>
          )}
          <div className="flex gap-2 p-1 bg-surface-2 rounded-2xl mb-4">
            {(["gold", "gem"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setSelected(null);
                }}
                className={`press flex-1 h-10 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all duration-200 ${tab === t ? "bg-background shadow-level1" : ""}`}
              >
                <img
                  src={t === "gold" ? GOLDEN_COINS_ICON : PINK_GEM_ICON}
                  alt=""
                  className="h-5 w-5 object-contain"
                  draggable={false}
                />
                {t === "gold" ? "Gold" : "Gems"}
              </button>
            ))}
          </div>
          <div className="space-y-2.5 overflow-y-auto hide-scrollbar" style={{ maxHeight: "44vh" }}>
            {pkgs.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelected(p.id);
                  executePurchase(p.id);
                }}
                className={`press w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${selected === p.id ? "border-primary bg-primary/8 shadow-[0_0_0_2px_var(--primary)]" : "border-border bg-surface-2 hover:border-primary/40"}`}
              >
                <div
                  className={`h-11 w-11 rounded-xl grid place-items-center shadow-level1 shrink-0 ${isGold ? "bg-gradient-to-br from-amber-400 to-yellow-600" : "bg-gradient-to-br from-pink-400 to-rose-600"}`}
                >
                  <img
                    src={isGold ? GOLDEN_COINS_ICON : PINK_GEM_ICON}
                    alt=""
                    className="h-7 w-7 object-contain drop-shadow-md"
                    draggable={false}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[15px] font-extrabold">{p.amount}</div>
                  {p.bonus && <div className="text-[11px] text-success font-bold">{p.bonus}</div>}
                </div>
                {p.popular && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold">
                    BEST
                  </span>
                )}
                <div className="text-[14px] font-extrabold">{p.price}</div>
                {selected === p.id && (
                  <div className="h-5 w-5 rounded-full bg-primary grid place-items-center animate-micro-pop">
                    <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => (selected ? executePurchase(selected) : null)}
            disabled={!selected && !pkgs[0]}
            className={`press w-full h-14 mt-4 rounded-full font-extrabold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 ${selected || pkgs[0] ? "bg-primary text-primary-foreground shadow-level2" : "bg-surface-2 text-text-muted"}`}
          >
            {selected
              ? `Instant Buy — ${pkgs.find((p) => p.id === selected)?.price}`
              : "Tap any package for instant purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}
