import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBag, Sparkles, Check, Tag, User, ExternalLink } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { CurrencyPills } from "@/components/CurrencyPills";
import { BuyModal } from "@/components/CurrencyModal";
import { ShopItemModal } from "@/components/ShopItemModal";
import {
  SHOP_CATALOG,
  CURRENCY_ICON,
  CURRENCY_LABEL,
  useOwnedShopItems,
  useEquippedShop,
  toggleEquipShopItem,
  equipBundle,
  type ShopItem,
  type ShopCategory,
} from "@/lib/shop";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — QBLOCK" },
      {
        name: "description",
        content:
          "Buy skins, faces and remodels for your QBLOCK character with gold and pink cubes.",
      },
      { property: "og:title", content: "Shop — QBLOCK" },
      {
        property: "og:description",
        content: "Buy skins, faces and remodels for your QBLOCK character.",
      },
    ],
  }),
  component: ShopPage,
});

const CATEGORIES: { id: "all" | ShopCategory; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "bundles", label: "Bundles" },
  { id: "clothes", label: "Clothes" },
  { id: "faces", label: "Faces" },
  { id: "character", label: "Character" },
];

function ShopPage() {
  const navigate = useNavigate();
  const owned = useOwnedShopItems();
  const equipped = useEquippedShop();

  const [activeCategory, setActiveCategory] = useState<"all" | ShopCategory>("all");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [buyCurrency, setBuyCurrency] = useState<"gold" | "gem" | "pinkCube" | null>(null);

  const filteredItems = SHOP_CATALOG.filter((item) => {
    if (activeCategory === "all") return true;
    return item.category === activeCategory;
  });

  const isItemEquipped = (item: ShopItem) => {
    if (item.slot === "shirt") return equipped.shirt === item.id;
    if (item.slot === "pants") return equipped.pants === item.id;
    if (item.slot === "face") return equipped.face === item.id;
    if (item.slot === "bundle") {
      return item.grants?.every((grantId) => {
        return (
          equipped.shirt === grantId || equipped.pants === grantId || equipped.face === grantId
        );
      });
    }
    return false;
  };

  const handleQuickEquip = (e: React.MouseEvent, item: ShopItem) => {
    e.stopPropagation();
    if (item.slot === "bundle") {
      equipBundle(item.id);
    } else {
      toggleEquipShopItem(item.id);
    }
  };

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full bg-[#f4f5f7] pb-24">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/[0.06] bg-white/95 px-3.5 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/" as never });
                }
              }}
              className="press grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-[17px] font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-[#fa4616]" />
                Shop
              </h1>
            </div>
          </div>

          <CurrencyPills
            onOpenModal={(type) => setBuyCurrency(type)}
            className="scale-90 origin-right"
          />
        </header>

        {/* Hero Banner with link to 3D Wardrobe */}
        <div className="px-3.5 pt-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#fa4616] to-[#ff7e47] p-4 text-white shadow-sm">
            <div className="relative z-10 max-w-[240px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                <Sparkles className="h-3 w-3" />
                Avatar Studio
              </span>
              <h2 className="mt-1.5 text-[17px] font-black leading-snug">Try on in 3D Wardrobe</h2>
              <p className="mt-1 text-[11px] font-medium text-white/90">
                Switch characters, test colors & inspect full outfits.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/avatar" as never })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[12px] font-black text-[#fa4616] shadow-md active:scale-95 transition-transform"
            >
              <User className="h-3.5 w-3.5" />
              Open 3D Studio
            </button>

            {/* Decorative background circle */}
            <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-xs pointer-events-none" />
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-3.5 pt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`press shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Items Grid */}
        <div className="px-3.5 pt-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {filteredItems.map((item) => {
              const isOwned = owned.has(item.id);
              const equippedNow = isItemEquipped(item);
              const iconUrl = CURRENCY_ICON[item.currency];

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedItem(item)}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-3 shadow-xs hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
                >
                  {/* Status Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {item.slot}
                    </span>

                    {equippedNow ? (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-600">
                        <Check className="h-3 w-3" />
                        Equipped
                      </span>
                    ) : isOwned ? (
                      <span className="inline-flex items-center rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-sky-600">
                        Owned
                      </span>
                    ) : null}
                  </div>

                  {/* Thumbnail / Visual */}
                  <div className="relative aspect-square w-full rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 mb-2 overflow-hidden">
                    {item.thumb ? (
                      <img
                        src={item.thumb}
                        alt={item.name}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : item.texture ? (
                      <img
                        src={item.texture}
                        alt={item.name}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Tag className="h-8 w-8 mb-1 opacity-40" />
                        <span className="text-[10px] font-bold">Preview</span>
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13px] font-extrabold text-slate-900">
                      {item.name}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 font-medium">
                      {item.note || `${item.slot} item`}
                    </p>
                  </div>

                  {/* Price / Action Row */}
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                    {isOwned ? (
                      <button
                        type="button"
                        onClick={(e) => handleQuickEquip(e, item)}
                        className={`w-full py-1.5 rounded-lg text-[11px] font-black transition-colors ${
                          equippedNow
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-[#fa4616] text-white hover:bg-[#fa4616]/90"
                        }`}
                      >
                        {equippedNow ? "Remove" : "Equip"}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1">
                          {iconUrl && (
                            <img src={iconUrl} alt="" className="h-4 w-4 object-contain shrink-0" />
                          )}
                          <span className="text-[12px] font-black text-slate-900">
                            {item.price === 0 ? "Free" : item.price.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[#fa4616] group-hover:underline">
                          Inspect &rarr;
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Item 3D Inspector Modal */}
        {selectedItem && (
          <ShopItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}

        {/* Top-up Currency Modal */}
        {buyCurrency && <BuyModal type={buyCurrency} onClose={() => setBuyCurrency(null)} />}
      </div>
    </MobileShell>
  );
}
