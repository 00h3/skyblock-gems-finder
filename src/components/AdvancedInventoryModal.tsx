import React, { useState } from "react";
import {
  X,
  Shield,
  Sparkles,
  Check,
  Package,
  Layers,
  Sword,
  HardHat,
  Footprints,
  Gem,
  Pickaxe,
  Lock,
  Unlock,
  Apple,
} from "lucide-react";
import { QblockCharacter } from "./QblockCharacter";
import { GameAudio } from "@/lib/game-audio";
import {
  BLOCKS,
  SHOVEL_TIERS,
  getBlockIcon,
  getShovelIcon,
  getSwordIcon,
  getPickaxeIcon,
  type InvItem,
} from "@/routes/game.$id";
import { useCurrency, spendCurrency } from "@/lib/currency";

export interface AdvancedInventoryModalProps {
  onClose: () => void;
  onEquip: (item: InvItem, targetSlot?: number) => void;
  skyblock?: boolean;
  coins?: number;
  onUpdateCoins?: (delta: number) => void;
}

type TabType = "all" | "food" | "blocks" | "tools" | "items";

const STARTER_UNLOCKED_BLOCK_INDICES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 17, 22]);

/** Grey, compact inventory surface. */
export const PANEL_OUTER = {
  backgroundColor: "#22252c",
  border: "1px solid #363b46",
  borderRadius: "14px",
  boxShadow: "0 18px 48px rgba(0,0,0,0.65)",
  padding: "12px 14px 12px",
  boxSizing: "border-box" as const,
};
export const PANEL_INNER = {
  backgroundColor: "#191b20",
  border: "1px solid #282d38",
  borderRadius: "10px",
};
export const SLOT_EMPTY = {
  backgroundColor: "#1e2128",
  border: "1px solid #2e3442",
  borderRadius: "6px",
};
export const SLOT_FILLED = {
  backgroundColor: "#282c36",
  border: "1px solid #394152",
  borderRadius: "6px",
};
export const SLOT_SEL = {
  backgroundColor: "#2b3952",
  border: "2px solid #38bdf8",
  borderRadius: "6px",
};
const INK = "#e2e8f0";

/** A still 3-D cube built from three CSS-transformed faces of a real texture. */
function TextureBlock3D({ src, size = 84 }: { src: string; size?: number }) {
  const half = size / 2;
  const face: React.CSSProperties = {
    position: "absolute",
    width: size,
    height: size,
    backgroundImage: `url(${src})`,
    backgroundSize: "100% 100%",
    imageRendering: "pixelated",
  };
  return (
    <div
      className="grid place-items-center"
      style={{ perspective: 600, width: size * 1.6, height: size * 1.6 }}
    >
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          transform: "rotateX(-24deg) rotateY(-38deg)",
        }}
      >
        <div style={{ ...face, transform: `translateZ(${half}px)` }} />
        <div
          style={{
            ...face,
            transform: `rotateY(90deg) translateZ(${half}px)`,
            filter: "brightness(.82)",
          }}
        />
        <div
          style={{
            ...face,
            transform: `rotateX(90deg) translateZ(${half}px)`,
            filter: "brightness(1.12)",
          }}
        />
      </div>
    </div>
  );
}

export function AdvancedInventoryModal({
  onClose,
  onEquip,
  skyblock = false,
  coins = 350,
}: AdvancedInventoryModalProps) {
  const starCoins = useCurrency("starCoins") || 999999;

  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedItem, setSelectedItem] = useState<InvItem | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  const [unlockedBlocks, setUnlockedBlocks] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return STARTER_UNLOCKED_BLOCK_INDICES;
    try {
      const stored = window.localStorage.getItem("qb_unlocked_blocks");
      if (stored) {
        const arr = JSON.parse(stored);
        return new Set([...STARTER_UNLOCKED_BLOCK_INDICES, ...arr]);
      }
    } catch {
      // fall through to starter set
    }
    return STARTER_UNLOCKED_BLOCK_INDICES;
  });

  const [armorEquipped, setArmorEquipped] = useState({
    helmet: true,
    chestplate: true,
    leggings: true,
    boots: true,
  });

  const blockPreviewTexture =
    selectedItem && typeof selectedItem.blockType === "number"
      ? selectedItem.icon
      : "/textures/blocks/grass_block_side.png";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const blockItems: InvItem[] = BLOCKS.map((b, i) => {
    return {
      key: `block-${b.name}`,
      name: b.name.charAt(0).toUpperCase() + b.name.slice(1),
      icon: i === 0 ? "" : getBlockIcon(b.name, b.color),
      qty: 64,
      blockType: i,
    };
  }).filter((b) => b.blockType !== 0);

  const swordItems: (InvItem & { locked?: boolean })[] = [
    {
      key: "short-sword",
      name: "Short Sword",
      icon: "",
      qty: 1,
      blockType: "short_sword" as never,
    },
    {
      key: "axe-diamond",
      name: "Diamond Axe",
      icon: "/items/diamond_axe.png",
      qty: 1,
      blockType: "diamond_axe" as never,
    },
    {
      key: "axe-netherite",
      name: "Netherite Axe",
      icon: "/items/netherite_axe.png",
      qty: 1,
      blockType: "netherite_axe" as never,
    },
    { key: "bow", name: "Bow", icon: "/items/bow.png", qty: 1, blockType: "bow" as never },
  ];

  const foodItems: InvItem[] = [
    {
      key: "food-bread",
      name: "Bread",
      icon: "/items/bread.png",
      qty: 16,
      blockType: "bread" as never,
    },
    {
      key: "food-apple",
      name: "Apple",
      icon: getBlockIcon("apple", 0xef4444),
      qty: 16,
      blockType: "apple" as never,
    },
  ];

  const miscItems: InvItem[] = [
    {
      key: "item-chest",
      name: "Chest",
      icon: getBlockIcon("chest", 0xb45309),
      qty: 4,
      blockType: "chest" as never,
    },
    {
      key: "item-torch",
      name: "Torch",
      icon: getBlockIcon("torch", 0xf59e0b),
      qty: 32,
      blockType: "torch" as never,
    },
  ];

  const shovelItems: (InvItem & { locked?: boolean })[] = SHOVEL_TIERS.map((t) => ({
    key: `shovel-${t.name}`,
    name: t.name,
    icon: `/items/${t.name.split(" ")[0].toLowerCase()}_shovel.png`,
    qty: 1,
    blockType: `${t.name.split(" ")[0].toLowerCase()}_shovel` as never,
  }));

  const allItems = [...foodItems, ...swordItems, ...shovelItems, ...blockItems, ...miscItems];

  const filteredItems = allItems.filter((it) => {
    if (activeTab === "food") return it.key.startsWith("food-");
    if (activeTab === "blocks") return it.key.startsWith("block-");
    if (activeTab === "tools")
      return (
        it.key.startsWith("shovel-") ||
        it.key === "short-sword" ||
        it.key.startsWith("axe-") ||
        it.key.startsWith("bow")
      );
    if (activeTab === "items") return it.key.startsWith("item-") || it.key.startsWith("food-");
    return true;
  });

  const handleEquipToSlot = (item: InvItem, targetSlot: number) => {
    GameAudio.playPlace();
    onEquip(item, targetSlot);
    setSelectedSlotIndex(targetSlot);
    showToast(`${item.name} → slot ${targetSlot + 1}`);
  };

  const handleUnlockBlock = async (item: InvItem & { locked?: boolean; unlockCost?: number }) => {
    if (typeof item.blockType !== "number") return;
    const ok = await spendCurrency("starCoins", item.unlockCost || 100);
    if (!ok) {
      showToast("Not enough Star Coins");
      return;
    }
    const next = new Set(unlockedBlocks);
    next.add(item.blockType);
    setUnlockedBlocks(next);
    try {
      window.localStorage.setItem("qb_unlocked_blocks", JSON.stringify(Array.from(next)));
    } catch {
      // storage unavailable — unlock stays for this session
    }
    GameAudio.playLevelUp();
    showToast(`Unlocked ${item.name}`);
    setSelectedItem({ ...item, locked: false, qty: 64 });
  };

  const armorSlots = [
    { key: "helmet", label: "Helmet", Icon: HardHat, asset: undefined },
    { key: "chestplate", label: "Chestplate", Icon: Shield, asset: undefined },
    { key: "leggings", label: "Leggings", Icon: Layers, asset: undefined },
  ] as const;
  const gearSlots = [
    { key: "weapon", label: "Weapon", Icon: Sword, asset: null as string | null },
    { key: "boots", label: "Boots", Icon: Footprints, asset: null as string | null },
    { key: "charm", label: "Charm", Icon: Gem, asset: null as string | null },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[120] bg-zinc-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          GameAudio.playPop();
          onClose();
        }
      }}
    >
      {toast && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[140] px-4 py-2 rounded-md text-[12px] font-black text-[#1d2430] flex items-center gap-2"
          style={PANEL_OUTER}
        >
          <Sparkles fill="currentColor" strokeWidth={1.25} className="w-4 h-4" />
          {toast}
        </div>
      )}

      <div
        className="w-full max-w-[580px] max-h-[80dvh] min-h-0 overflow-hidden flex flex-col scale-[0.85] origin-center sm:scale-90"
        style={PANEL_OUTER}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-2 py-1"
          style={{
            background: "transparent",
            borderBottom: "0",
          }}
        >
          <span className="w-8" />
          <h2 className="text-[16px] font-black italic tracking-wide text-white">
            {skyblock ? "Island Inventory" : "Inventory"}
          </h2>
          <button
            onClick={() => {
              GameAudio.playPop();
              onClose();
            }}
            className="w-8 h-8 rounded-[8px] grid place-items-center text-white bg-white/10 hover:bg-white/20 active:scale-95 transition cursor-pointer"
            aria-label="Close inventory"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body: two clean panels, no overlap */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,270px)_minmax(0,1fr)] gap-2.5 p-2">
          {/* LEFT — character + equipment */}
          <div className="rounded-md p-2.5 flex flex-col gap-2.5 min-h-0" style={PANEL_INNER}>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[13px] font-black text-white">
                {skyblock ? "Explorer" : "Player"}
              </span>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-black text-slate-200"
                style={SLOT_FILLED}
              >
                LV 12
              </span>
            </div>

            <div className="flex items-stretch gap-2 min-h-0">
              <div className="flex flex-col justify-center gap-1.5">
                {armorSlots.map(({ key, label, Icon, asset }) => {
                  const on = armorEquipped[key as keyof typeof armorEquipped];
                  return (
                    <button
                      key={key}
                      title={label}
                      onClick={() => {
                        GameAudio.playPop();
                        setArmorEquipped((p) => ({ ...p, [key]: !p[key as keyof typeof p] }));
                      }}
                      className="w-10 h-10 rounded-[6px] grid place-items-center active:scale-95 transition cursor-pointer"
                      style={on ? SLOT_FILLED : SLOT_EMPTY}
                    >
                      {asset ? (
                        <img src={asset} alt="" className="h-8 w-8 object-contain" />
                      ) : (
                        <Icon
                          fill="currentColor"
                          strokeWidth={1.25}
                          className="w-4 h-4 text-amber-300"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 min-w-0 rounded-[6px] overflow-hidden" style={SLOT_EMPTY}>
                <QblockCharacter
                  className="h-full w-full min-h-[160px]"
                  autoRotate
                  interactive={false}
                />
              </div>

              <div className="flex flex-col justify-center gap-1.5">
                {gearSlots.map(({ key, label, Icon, asset }) => (
                  <button
                    key={key}
                    title={label}
                    onClick={() => GameAudio.playPop()}
                    className="w-10 h-10 rounded-[6px] grid place-items-center active:scale-95 transition cursor-pointer"
                    style={SLOT_FILLED}
                  >
                    {asset ? (
                      <img src={asset} alt="" className="h-8 w-8 object-contain" />
                    ) : (
                      <Icon
                        fill="currentColor"
                        strokeWidth={1.25}
                        className="w-4 h-4 text-amber-300"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Still 3-D block with a real texture on it */}
            <div className="rounded-[6px] p-2 flex items-center gap-2.5" style={SLOT_EMPTY}>
              <TextureBlock3D src={blockPreviewTexture} size={44} />
              <div className="min-w-0">
                <div className="text-[11px] font-black text-white">
                  {selectedItem?.name ?? "Grass Block"}
                </div>
                <div className="text-[10px] font-bold text-slate-400">3D preview</div>
              </div>
            </div>
          </div>

          {/* RIGHT — inventory grid */}
          <div className="rounded-md p-2.5 flex flex-col gap-2 min-h-0" style={PANEL_INNER}>
            <h3 className="text-center text-[13.5px] font-black italic text-white">Items</h3>

            <div
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-[6px] p-2"
              style={SLOT_EMPTY}
            >
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-7 gap-1.5">
                {filteredItems.map((item) => {
                  const isSel = selectedItem?.key === item.key;
                  const isLocked = (item as { locked?: boolean }).locked;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        GameAudio.playPop();
                        setSelectedItem(item);
                      }}
                      onDoubleClick={() => !isLocked && handleEquipToSlot(item, selectedSlotIndex)}
                      className="aspect-square rounded-[6px] grid place-items-center relative overflow-hidden active:scale-95 transition cursor-pointer"
                      style={isSel ? SLOT_SEL : SLOT_FILLED}
                      title={item.name}
                    >
                      {item.icon ? (
                        <img
                          src={item.icon}
                          alt=""
                          className={`w-7 h-7 object-contain pointer-events-none ${isLocked ? "grayscale opacity-50" : ""}`}
                        />
                      ) : (
                        <Sword className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
                      )}
                      {isLocked && (
                        <span className="absolute inset-0 bg-black/60 grid place-items-center">
                          <Lock className="w-3 h-3 text-amber-300" />
                        </span>
                      )}
                      {!isLocked && !!item.qty && item.qty > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-slate-200 tabular-nums">
                          {item.qty}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected item action row */}
            <div className="rounded-[8px] p-2 flex items-center gap-2 flex-wrap bg-[#1e2229] border border-zinc-700/50">
              {selectedItem ? (
                <>
                  {selectedItem.icon ? (
                    <img src={selectedItem.icon} alt="" className="w-6 h-6 object-contain" />
                  ) : (
                    <Sword className="w-6 h-6 text-zinc-300" strokeWidth={1.5} />
                  )}
                  <span className="text-[11.5px] font-black text-zinc-100 mr-auto truncate max-w-[40%]">
                    {selectedItem.name}
                  </span>
                  {(selectedItem as { locked?: boolean }).locked ? (
                    <button
                      onClick={() => handleUnlockBlock(selectedItem as never)}
                      className="px-2.5 py-1 rounded-[6px] text-[10.5px] font-black text-white flex items-center gap-1.5 active:scale-95 cursor-pointer bg-[#4b5563] hover:bg-[#52525b] border border-zinc-400/50 shadow-sm"
                    >
                      <Unlock className="w-3 h-3" />
                      Unlock {(selectedItem as { unlockCost?: number }).unlockCost || 100}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 flex-wrap">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleEquipToSlot(selectedItem, s)}
                          className={`w-6 h-6 rounded-[5px] text-[10px] font-black active:scale-95 transition cursor-pointer ${
                            selectedSlotIndex === s
                              ? "bg-[#52525b] border-2 border-zinc-200 text-white shadow-sm"
                              : "bg-[#2d323c] border border-zinc-600/60 text-zinc-300 hover:bg-[#383e4b]"
                          }`}
                        >
                          {s + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[11px] font-bold text-zinc-400 mx-auto flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-zinc-400" /> Tap an item, then pick a hotbar slot
                  (1-9)
                </span>
              )}
            </div>

            {/* Category Tabs — Grey grey themed */}
            {!skyblock && (
              <div className="flex items-center gap-1.5 justify-center flex-wrap pt-1 px-1 py-1.5 rounded-[8px] bg-[#1a1d24] border border-zinc-700/60">
                {(
                  [
                    { id: "all", label: "All", Icon: Layers },
                    { id: "food", label: "Food", Icon: Apple },
                    { id: "blocks", label: "Blocks", Icon: Package },
                    { id: "tools", label: "Tools", Icon: Pickaxe },
                    { id: "items", label: "Items", Icon: Sparkles },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      GameAudio.playPop();
                      setActiveTab(id);
                    }}
                    className={`px-3 py-1.5 rounded-[6px] text-[11px] font-black tracking-tight flex items-center gap-1.5 active:scale-95 transition cursor-pointer border ${
                      activeTab === id
                        ? "bg-[#4b5563] text-white border-zinc-400/80 shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                        : "bg-[#272b34] text-zinc-400 border-zinc-700/40 hover:bg-[#323742] hover:text-zinc-200"
                    }`}
                  >
                    <Icon strokeWidth={1.75} className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
