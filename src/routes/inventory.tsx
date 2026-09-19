import { createFileRoute } from "@tanstack/react-router";
import { QBLOCK_AVATAR } from "@/components/QblockCharacter";
import { GlbAvatar } from "@/components/GlbAvatar";
import {
  ChevronLeft,
  RotateCcw,
  Check,
  Palette,
  Brush,
  SmilePlus,
  Shirt,
  Footprints,
  Crown,
} from "lucide-react";
import { useEffect, useState } from "react";
import React from "react";
import {
  AVATAR_COLORS,
  setAvatarColor,
  useAvatarColor,
  setFaceId,
  useFaceId,
  setEquippedPants,
  useEquippedPants,
  useEquippedItems,
  toggleEquippedItem,
  useOwnedItems,
  useBandana,
  useGender,
  setEquippedSkin,
  useEquippedSkin,
  useEquippedFrame,
  setHairColor,
  useHairColor,
} from "@/lib/avatar";
import { useCurrency } from "@/lib/currency";
import { GoldCoin } from "@/components/CurrencyModal";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { GLOBAL_DEFAULT_PFP } from "@/components/GlossyAvatar";
import { BottomNav } from "@/components/MobileShell";
import { getEquippedShop, getOwnedShopItemIds } from "@/lib/shop";

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Avatar — QBLOCK" }] }),
  component: InventoryPage,
});

export type Item = {
  id: string;
  name: string;
  category: string;
  price: number;
  free?: boolean;
  color1: string;
  color2: string;
  shape?: string;
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
};

export function TextureItemArt({ item }: { item: Item }) {
  return (
    <div
      className="flex items-center justify-center h-10 w-10 rounded-[10px] text-white shadow-sm"
      style={{ background: `linear-gradient(135deg, ${item.color1}, ${item.color2})` }}
    >
      <Shirt className="h-5 w-5" />
    </div>
  );
}

const GLOSS_PANEL = {
  border: "1px solid rgba(20,28,38,.075)",
  background:
    "radial-gradient(circle at 15% 0%, rgba(255,255,255,.98), transparent 38%), linear-gradient(180deg, rgba(255,255,255,.96), rgba(239,242,245,.92))",
  boxShadow: "0 7px 16px rgba(18,28,38,.065), inset 0 1px 0 rgba(255,255,255,.98)",
  backdropFilter: "blur(16px) saturate(120%)",
  WebkitBackdropFilter: "blur(16px) saturate(120%)",
};

// 3 Gradient Hair Options
const HAIR_GRADIENTS = [
  {
    id: "black",
    label: "Black Gradient",
    bg: "linear-gradient(135deg, #4b5563, #1f2937, #111827)",
  },
  { id: "blue", label: "Blue Gradient", bg: "linear-gradient(135deg, #60a5fa, #2563eb, #1e3a8a)" },
  { id: "red", label: "Red Gradient", bg: "linear-gradient(135deg, #f87171, #dc2626, #7f1d1d)" },
];

type MainCat = "hair" | "mine" | "clothing" | "face" | "pants" | "ears" | "skin";
const MAIN_CATS: Array<{ k: MainCat; label: string; Icon: React.FC<{ className?: string }> }> = [
  { k: "hair", label: "Hair", Icon: Brush },
  { k: "mine", label: "Skin Tone", Icon: Palette },
  { k: "clothing", label: "Shirts", Icon: Shirt },
  { k: "face", label: "Faces", Icon: SmilePlus },
  { k: "pants", label: "Pants", Icon: Footprints },
  { k: "ears", label: "Hats", Icon: Crown },
  { k: "skin", label: "Characters", Icon: Crown },
];

const SHIRT_ITEMS: Item[] = [
  {
    id: "shirt-classic-mesh",
    name: "Classic Mesh Tee",
    category: "clothing",
    price: 0,
    free: true,
    color1: "#38bdf8",
    color2: "#0284c7",
    rarity: "common",
  },
];

const HAT_ITEMS: Item[] = [
  {
    id: "acc-cat-ears",
    name: "Cat Ears",
    category: "ears",
    price: 0,
    free: true,
    color1: "#fb7185",
    color2: "#be185d",
    shape: "ears",
    rarity: "common",
  },
  {
    id: "acc-bunny",
    name: "Bunny Ears",
    category: "ears",
    price: 0,
    free: true,
    color1: "#f5f5f5",
    color2: "#cbd5e1",
    shape: "ears",
    rarity: "common",
  },
  {
    id: "acc-wolf",
    name: "Wolf Ears",
    category: "ears",
    price: 0,
    free: true,
    color1: "#94a3b8",
    color2: "#475569",
    shape: "ears",
    rarity: "uncommon",
  },
  {
    id: "acc-bear",
    name: "Bear Ears",
    category: "ears",
    price: 0,
    free: true,
    color1: "#d97706",
    color2: "#78350f",
    shape: "ears",
    rarity: "uncommon",
  },
];

function InventoryPage() {
  const nav = useNavigate();
  const avatarColor = useAvatarColor();
  const equippedFace = useFaceId();
  const equippedPants = useEquippedPants();
  const equippedSkin = useEquippedSkin();
  const equippedFrame = useEquippedFrame();
  const hairColor = useHairColor();
  const equippedItems = useEquippedItems();
  const goldAmt = useCurrency("gold");
  const { qbUser } = useAuth();

  const hasBandana = useBandana();
  const currentGender = useGender();

  const [mainCat, setMainCat] = useState<MainCat>("hair");
  const [activeGradient, setActiveGradient] = useState<"black" | "blue" | "red">(
    hairColor === "#3b82f6" ? "blue" : hairColor === "#ef4444" ? "red" : "black",
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!qbUser) return;
    const timer = window.setTimeout(() => {
      setDoc(
        doc(db, "users", qbUser.uid),
        {
          avatarSnapshot: {
            color: avatarColor,
            hairColor:
              activeGradient === "blue"
                ? "#3b82f6"
                : activeGradient === "red"
                  ? "#ef4444"
                  : "#17181b",
            skinId: equippedSkin,
            faceId: equippedFace,
            gender: currentGender,
            showBandana: hasBandana,
            equippedItemIds: [...equippedItems],
            equippedPants,
            frameId: equippedFrame,
            shopEquipped: getEquippedShop(),
            shopOwned: getOwnedShopItemIds(),
          },
        },
        { merge: true },
      ).catch(() => {});
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    qbUser?.uid,
    avatarColor,
    activeGradient,
    equippedFace,
    currentGender,
    hasBandana,
    equippedItems,
    equippedPants,
    equippedSkin,
    equippedFrame,
  ]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleSelectGradient = (id: "black" | "blue" | "red") => {
    setActiveGradient(id);
    setHairColor(id === "blue" ? "#3b82f6" : id === "red" ? "#ef4444" : "#17181b");
    showToast(`${id.charAt(0).toUpperCase() + id.slice(1)} hair equipped`);
  };

  const pid =
    qbUser?.customId || (qbUser?.uid ? "#" + qbUser.uid.slice(-6).toUpperCase() : "No Data");

  return (
    <div
      className="fixed inset-0 flex flex-col app-page bg-[#f4f5f7]"
      style={{ maxWidth: 440, margin: "0 auto" }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-[10px] text-[12px] font-black text-slate-800 animate-fade-in shadow-lg"
          style={GLOSS_PANEL}
        >
          {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <header
        className="ios-chat-header shrink-0 flex items-center justify-between gap-2 px-3"
        style={{
          paddingTop: "max(8px,env(safe-area-inset-top))",
          paddingBottom: 8,
          background: "rgba(255,255,255,0.95)",
          borderBottom: "1px solid rgba(20,28,38,0.07)",
        }}
      >
        <button
          type="button"
          onClick={() => nav({ to: "/" as never })}
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-slate-700 shadow-sm transition"
          style={GLOSS_PANEL}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 px-1">
          <div className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
            QB ID: {pid}
          </div>
        </div>

        <div
          className="h-8 shrink-0 rounded-[10px] px-2.5 flex items-center gap-1.5 text-[11px] font-black tabular-nums text-slate-800"
          style={GLOSS_PANEL}
        >
          <GoldCoin size={13} /> {goldAmt.toLocaleString()}
        </div>

        <button
          type="button"
          onClick={() => showToast("Avatar saved")}
          className="press h-8 shrink-0 rounded-[10px] px-3 flex items-center gap-1.5 text-[11px] font-black bg-white border border-black/15 text-[#141414]"
        >
          <Check className="h-3.5 w-3.5" /> Save
        </button>
      </header>

      {/* ── 3D AVATAR STAGE (LOWERED + FULL HEAD VISIBLE) ── */}
      <div className="shrink-0 flex relative overflow-hidden" style={{ height: 340 }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `#e8edf3 url("${QBLOCK_AVATAR.background}") center / cover no-repeat`,
          }}
        />

        <GlbAvatar
          className="absolute inset-0 w-full h-full z-[2]"
          height="100%"
          autoRotate
          interactive
        />

        {/* Floating Reset Control */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveGradient("black");
              setHairColor("#17181b");
              setAvatarColor(AVATAR_COLORS[2]);
              setFaceId(0);
              showToast("Avatar reset to default");
            }}
            className="press flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-black text-slate-800 transition"
            style={GLOSS_PANEL}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Rotate hint badge */}
        <div
          className="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-1 rounded-[10px] px-2.5 py-1 text-[10px] font-bold text-slate-700"
          style={GLOSS_PANEL}
        >
          <span>Drag to rotate</span>
        </div>
      </div>

      {/* ── CATEGORY TABS (SQUARE GLOSS EVENT STYLE) ── */}
      <div
        className="shrink-0 px-2.5 py-2 flex gap-1.5 overflow-x-auto hide-scrollbar"
        style={{
          borderBottom: "1px solid rgba(20,28,38,0.08)",
          background: "rgba(255,255,255,0.92)",
        }}
      >
        {MAIN_CATS.map(({ k, label, Icon }) => {
          const active = mainCat === k;
          return (
            <button
              type="button"
              key={k}
              onClick={() => setMainCat(k)}
              className="press shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[11.5px] font-black transition"
              style={
                active
                  ? {
                      border: "1px solid rgba(20,28,38,0.14)",
                      background: "#141414",
                      color: "#ffffff",
                    }
                  : GLOSS_PANEL
              }
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── CUSTOMIZATION CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-3.5 pb-[calc(92px+env(safe-area-inset-bottom))]">
        {mainCat === "ears" ? (
          <div className="space-y-3">
            <div className="rounded-[14px] p-4" style={GLOSS_PANEL}>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-rose-500" />
                <div>
                  <div className="text-[14px] font-black text-slate-700">Hats</div>
                  <div className="text-[11px] font-semibold text-slate-400">
                    Tap a hat to put it on your avatar.
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {HAT_ITEMS.map((item) => {
                const equipped = equippedItems.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      toggleEquippedItem(item.id);
                      showToast(equipped ? `${item.name} removed` : `${item.name} equipped`);
                    }}
                    aria-pressed={equipped}
                    className="press rounded-[16px] p-3 text-left transition"
                    style={{
                      ...GLOSS_PANEL,
                      border: equipped
                        ? "1px solid rgba(244,63,94,.48)"
                        : "1px solid rgba(20,28,38,.075)",
                    }}
                  >
                    <div
                      className="grid h-20 place-items-center rounded-[12px]"
                      style={{
                        background: `linear-gradient(135deg, ${item.color1}22, ${item.color2}44)`,
                      }}
                    >
                      <Crown className="h-10 w-10" style={{ color: item.color1 }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-black text-slate-700">
                        {item.name}
                      </span>
                      {equipped && <Check className="h-4 w-4 shrink-0 text-rose-500" />}
                    </div>
                    <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                      {equipped ? "Equipped · tap to remove" : "Free"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className="rounded-[14px] p-8 text-center flex flex-col items-center justify-center gap-3"
            style={GLOSS_PANEL}
          >
            <div className="h-16 w-16 rounded-[16px] overflow-hidden bg-slate-200/80 shadow-inner flex items-center justify-center">
              <img
                src={GLOBAL_DEFAULT_PFP}
                alt="Avatar"
                className="h-full w-full object-cover grayscale opacity-60"
                draggable={false}
              />
            </div>
            <div>
              <div className="text-[14px] font-black text-slate-700">No data available for now</div>
              <div className="text-[11.5px] font-semibold text-slate-400 mt-0.5">
                Nothing is available in this section yet.
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav pathname="/inventory" />
    </div>
  );
}
