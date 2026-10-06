/**
 * ShopItemModal — the popup shown when tapping an item, in the shop or in
 * the avatar wardrobe. Shows a live 3D preview of the item on your
 * character plus a single action button: Buy / Wear / Remove.
 */
import { useState } from "react";
import { X, Check, Loader2, Lock } from "lucide-react";
import { Avatar3D } from "@/components/Avatar3D";
import { QBLOCK_AVATAR } from "@/components/QblockCharacter";
import { useAvatarColor, useHairColor, useFaceId, useEquippedSkin } from "@/lib/avatar";
import { spendCurrency } from "@/lib/currency";
import { toast } from "sonner";
import {
  CURRENCY_ICON,
  CURRENCY_LABEL,
  QB_MAROON_SLEEVES,
  equipBundle,
  getShopItem,
  grantItem,
  ownsItem,
  resolveTextures,
  toggleEquipShopItem,
  useEquippedShop,
  useOwnedShopItems,
  type ShopItem,
} from "@/lib/shop";
import { setHairColor } from "@/lib/avatar";
import { redeemFaceFragment, useFragments } from "@/lib/fragments";
import { PINK_GEM_ICON } from "@/components/CurrencyModal";
const fragmentIcon = PINK_GEM_ICON;

export function ShopItemModal({ item, onClose }: { item: ShopItem; onClose: () => void }) {
  const owned = useOwnedShopItems();
  const equipped = useEquippedShop();
  const tint = useAvatarColor();
  const hairColor = useHairColor();
  const faceId = useFaceId();
  const skinId = useEquippedSkin();
  const fragment = useFragments();
  const [busy, setBusy] = useState(false);

  const isFragmentTrial = item.id === "face-money" && fragment.faceTrialActive;
  const isOwned = owned.has(item.id) || isFragmentTrial || item.price === 0;
  const isEquipped =
    (item.slot === "shirt" || item.slot === "pants" || item.slot === "face") &&
    equipped[item.slot] === item.id;

  // Preview = current outfit with this item layered on top.
  const base = resolveTextures(equipped);
  const preview = { ...base };
  if (item.slot === "shirt") {
    preview.shirtTexture = item.texture ?? null;
    preview.sleevesTexture = item.id === "qb-maroon-shirt" ? QB_MAROON_SLEEVES : null;
  }
  if (item.slot === "pants") preview.pantsTexture = item.texture ?? null;
  if (item.slot === "face") preview.faceTexture = item.texture ?? null;
  if (item.slot === "bundle") {
    item.grants?.forEach((g) => {
      const sub = getShopItem(g);
      if (sub?.slot === "shirt") {
        preview.shirtTexture = sub.texture ?? null;
        preview.sleevesTexture = sub.id === "qb-maroon-shirt" ? QB_MAROON_SLEEVES : null;
      }
      if (sub?.slot === "pants") preview.pantsTexture = sub.texture ?? null;
      if (sub?.slot === "face") preview.faceTexture = sub.texture ?? null;
    });
  }

  const applyItem = () => {
    if (item.slot === "bundle") {
      equipBundle(item.id);
      toast.success(`${item.name} equipped`);
    } else if (item.slot === "hair") {
      setHairColor(item.hairColor ?? "#141414");
      toast.success("Hair recolored");
    } else {
      toggleEquipShopItem(item.id);
    }
  };

  const handleAction = async () => {
    if (item.offSale) return;
    if (item.fragmentCost) {
      if (owned.has(item.id) || fragment.faceTrialActive) {
        applyItem();
        onClose();
        return;
      }
      setBusy(true);
      try {
        const redeemed = await redeemFaceFragment();
        if (!redeemed) {
          toast.error(`You need ${item.fragmentCost} fragment`);
          return;
        }
        applyItem();
        toast.success(`${item.name} unlocked for ${item.trialDays ?? 1} day`);
        onClose();
      } catch (error) {
        toast.error("That fragment could not be used. Try again.");
        console.error("Could not redeem shop fragment:", error);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (isOwned) {
      applyItem();
      onClose();
      return;
    }
    setBusy(true);
    const paid = item.price === 0 ? true : await spendCurrency(item.currency, item.price);
    setBusy(false);
    if (!paid) {
      toast.error(`Not enough ${CURRENCY_LABEL[item.currency]}`);
      return;
    }
    grantItem(item.id);
    applyItem();
    toast.success(`${item.name} purchased`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-[520px] overflow-y-auto rounded-[26px] bg-white pb-[max(18px,env(safe-area-inset-bottom))] shadow-[0_14px_40px_rgba(20,24,32,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-black tracking-[-0.03em] text-[#141414]">
              {item.name}
            </h2>
            {item.note ? (
              <p className="truncate text-[11px] font-semibold text-slate-500">{item.note}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div
          className="relative mx-4 overflow-hidden rounded-[20px] border border-slate-200"
          style={{
            height: 300,
            background: `#e8edf3 url("${QBLOCK_AVATAR.background}") center / cover no-repeat`,
          }}
        >
          <Avatar3D
            className="absolute inset-0 h-full w-full"
            height="100%"
            autoRotate
            interactive
            tint={tint}
            hairColor={item.slot === "hair" ? (item.hairColor ?? hairColor) : hairColor}
            faceId={faceId}
            skinId={skinId}
            shirtTexture={preview.shirtTexture}
            pantsTexture={preview.pantsTexture}
            sleevesTexture={preview.sleevesTexture}
            faceTexture={preview.faceTexture}
          />
        </div>

        <div className="mt-4 flex items-center gap-3 px-4">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
            <img
              src={item.fragmentCost ? fragmentIcon : CURRENCY_ICON[item.currency]}
              alt=""
              className="h-5 w-5 object-contain"
            />
            <span className="text-[13px] font-black tabular-nums text-[#141414]">
              {item.fragmentCost
                ? `${item.fragmentCost} Fragment${item.fragmentCost === 1 ? "" : "s"}`
                : item.price === 0
                  ? "Free"
                  : item.price.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            disabled={busy || item.offSale}
            onClick={handleAction}
            className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#141414] text-[14px] font-black text-white disabled:opacity-45"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : item.offSale ? (
              <>
                <Lock className="h-4 w-4" /> Offsale
              </>
            ) : isOwned ? (
              <>
                <Check className="h-4 w-4" /> {isEquipped ? "Remove" : "Wear"}
              </>
            ) : (
              <>
                <img
                  src={item.fragmentCost ? fragmentIcon : CURRENCY_ICON[item.currency]}
                  alt=""
                  className="h-4.5 w-4.5 object-contain"
                />
                {item.fragmentCost ? `Use ${item.fragmentCost} Fragment` : "Buy"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShopItemCard({ item, onOpen }: { item: ShopItem; onOpen: () => void }) {
  const owned = useOwnedShopItems();
  const equipped = useEquippedShop();
  const fragment = useFragments();
  const isOwned =
    owned.has(item.id) ||
    (item.id === "face-money" && fragment.faceTrialActive) ||
    item.price === 0;
  const isEquipped =
    (item.slot === "shirt" || item.slot === "pants" || item.slot === "face") &&
    equipped[item.slot] === item.id;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="press relative flex flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white text-left"
    >
      <div className="relative grid aspect-square place-items-center bg-[#f2f3f5]">
        {item.thumb ? (
          <img
            src={item.thumb}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <span
            className="h-10 w-10 rounded-full border-2 border-white shadow"
            style={{ background: item.hairColor ?? "#141414" }}
          />
        )}
        {item.offSale ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#141414] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
            Offsale
          </span>
        ) : null}
        {isEquipped ? (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2">
        <div className="truncate text-[12px] font-black text-[#141414]">{item.name}</div>
        <div className="mt-1 flex items-center gap-1.5">
          {isOwned && item.price !== 0 ? (
            <span className="text-[11px] font-bold text-emerald-600">Owned</span>
          ) : (
            <>
              <img
                src={item.fragmentCost ? fragmentIcon : CURRENCY_ICON[item.currency]}
                alt=""
                className="h-4 w-4 object-contain"
              />
              <span className="text-[11px] font-black tabular-nums text-slate-600">
                {item.fragmentCost
                  ? `${item.fragmentCost} Fragment${item.fragmentCost === 1 ? "" : "s"}`
                  : item.price === 0
                    ? "Free"
                    : item.price.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

export function EmptyState({ label = "No data for now" }: { label?: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor">
          <path strokeWidth="1.8" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h10" opacity=".7" />
        </svg>
      </div>
      <p className="text-[12px] font-bold text-slate-400">{label}</p>
    </div>
  );
}
