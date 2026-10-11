import { useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";

export const GOLDEN_COINS_ICON = "https://file.garden/alGOOylwpAfCa6qP/file_000000008f8481f49405d6c7b6fcbb5a.png";
export const PINK_GEM_ICON =
  "https://file.garden/alGOOylwpAfCa6qP/file_000000007ea881f4a21aac7088884509.png";

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
  const pkgs = tab === "gold" ? goldPackages : gemPackages;
  const isGold = tab === "gold";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center pointer-events-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 cursor-pointer"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 380, mass: 0.5 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.9 }}
        dragMomentum={false}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 60 || info.velocity.y > 220) {
            onClose();
          }
        }}
        className="relative w-full max-w-[440px] rounded-t-[28px] border-t border-x border-black/[0.08] shadow-[0_16px_40px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.98)] overflow-hidden z-10 will-change-transform"
        style={{
          maxHeight: "88dvh",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(240, 243, 247, 0.95))",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          transform: "translateZ(0)",
        }}
      >
        {/* iOS Drag Handle */}
        <div className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing touch-none">
          <div className="h-1.5 w-12 rounded-full bg-slate-300/80" />
        </div>

        <div className="px-5 pt-3 pb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2
                className="text-[20px] font-extrabold text-[#141414]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Get Currency
              </h2>
              <p className="text-[11px] font-medium text-[#8b929d]">
                Store · Purchases currently disabled
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="qb-squircle press h-9 w-9 grid place-items-center cursor-pointer text-slate-700 active:scale-95 transition-transform"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[12px] font-bold text-center">
            {isGold ? "Coins purchases are currently disabled." : "Gems purchases are currently disabled."}
          </div>

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
                disabled={true}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-black/[0.06] bg-black/[0.02] opacity-60 cursor-not-allowed transition-all duration-200"
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
              </button>
            ))}
          </div>
          <button
            disabled={true}
            className="w-full h-14 mt-4 rounded-full font-extrabold text-[15px] flex items-center justify-center gap-2 bg-slate-200 text-slate-400 cursor-not-allowed border border-black/[0.06]"
          >
            Purchases are currently disabled
          </button>
        </div>
      </motion.div>
    </div>
  );
}
