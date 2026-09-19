import React, { useEffect, useState } from "react";
import { X, Package, ArrowDownToLine, ArrowUpFromLine, Sparkles, Check } from "lucide-react";
import { GameAudio } from "@/lib/game-audio";
import { playSound } from "@/lib/sfx";
import { getBlockIcon, getShovelIcon, BLOCKS, type InvItem } from "@/routes/game.$id";

export interface ChestItem {
  id: string;
  name: string;
  count: number;
  icon: string;
  color?: number;
  blockType?: number;
  isTool?: boolean;
}

const DEFAULT_CHEST_ITEMS: (ChestItem | null)[] = [
  {
    id: "water_bucket",
    name: "Water Bucket",
    count: 2,
    icon: getBlockIcon("water", 0x2288ff),
    blockType: 6,
  },
  {
    id: "lava_bucket",
    name: "Lava Bucket",
    count: 1,
    icon: getBlockIcon("lava", 0xff4500),
    blockType: 20,
  },
  {
    id: "oak_sapling",
    name: "Oak Sapling",
    count: 6,
    icon: getBlockIcon("oak leaves", 0x3f8f3a),
    blockType: 5,
  },
  {
    id: "ice_block",
    name: "Packed Ice",
    count: 4,
    icon: getBlockIcon("ice", 0xbde4f5),
    blockType: 17,
  },
  { id: "bone_meal", name: "Bone Meal", count: 16, icon: getBlockIcon("white wool", 0xeeeeee) },
  { id: "sugar_cane", name: "Sugar Cane", count: 3, icon: getBlockIcon("slime block", 0x7bd63a) },
  {
    id: "diamond_shovel",
    name: "Diamond Shovel",
    count: 1,
    icon: getShovelIcon("#5be6e0"),
    isTool: true,
  },
  {
    id: "bread",
    name: "Fresh Bread",
    count: 12,
    icon: getBlockIcon("hay block", 0xd4b820),
    blockType: 48,
  },
  {
    id: "iron_ingot",
    name: "Iron Ingot",
    count: 8,
    icon: getBlockIcon("iron block", 0xd8dde0),
    blockType: 32,
  },
  {
    id: "cobble",
    name: "Cobblestone",
    count: 64,
    icon: getBlockIcon("cobblestone", 0x9a9aa0),
    blockType: 15,
  },
  { id: "oak_log", name: "Oak Log", count: 32, icon: getBlockIcon("wood", 0x8b5a2b), blockType: 3 },
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

export function ChestModal({
  onClose,
  onTakeItem,
}: {
  onClose: () => void;
  onTakeItem?: (item: ChestItem) => void;
}) {
  const [chestSlots, setChestSlots] = useState<(ChestItem | null)[]>(DEFAULT_CHEST_ITEMS);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    playSound("chest_open");
    return () => {
      playSound("chest_close");
    };
  }, []);

  const handleTake = (idx: number) => {
    const item = chestSlots[idx];
    if (!item) return;
    GameAudio.playPop();
    if (onTakeItem) onTakeItem(item);
    setToast(`Collected ${item.count > 1 ? `${item.count}x ` : ""}${item.name}`);
    setTimeout(() => setToast(null), 2000);
    setChestSlots((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setSelectedSlot(null);
  };

  const handleTakeAll = () => {
    GameAudio.playPop();
    const count = chestSlots.filter(Boolean).length;
    if (count === 0) return;
    chestSlots.forEach((item) => {
      if (item && onTakeItem) onTakeItem(item);
    });
    setChestSlots(new Array(27).fill(null));
    setToast("Transferred all chest items to your inventory!");
    setTimeout(() => setToast(null), 2000);
  };

  const glassStyle: React.CSSProperties = {
    background: "linear-gradient(180deg, rgba(36, 40, 50, 0.94) 0%, rgba(20, 23, 29, 0.98) 100%)",
    border: "1.5px solid rgba(255, 255, 255, 0.16)",
    boxShadow: "0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.25)",
    backdropFilter: "blur(24px) saturate(1.4)",
    WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      style={{
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          GameAudio.playChestClose();
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-[560px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl animate-scale-up"
        style={glassStyle}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-white/10"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl grid place-items-center"
              style={{
                background: "linear-gradient(135deg, #a16207 0%, #713f12 100%)",
                border: "1.5px solid rgba(251, 191, 36, 0.4)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              <Package className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide uppercase">
                  Island Storage Chest
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  27 Slots
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Store items or grab starting island equipment
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              GameAudio.playChestClose();
              onClose();
            }}
            className="press w-9 h-9 rounded-xl grid place-items-center transition-all bg-white/10 hover:bg-white/18 text-slate-200 border border-white/15"
            aria-label="Close chest"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chest Slots Grid */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
            {chestSlots.map((item, idx) => {
              const isSelected = selectedSlot === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (item) {
                      GameAudio.playPop();
                      setSelectedSlot(isSelected ? null : idx);
                    }
                  }}
                  onDoubleClick={() => handleTake(idx)}
                  className={`relative aspect-square rounded-[12px] p-1 grid place-items-center transition-all group ${
                    isSelected
                      ? "ring-2 ring-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.5)] scale-105"
                      : "hover:border-white/40"
                  }`}
                  style={{
                    background: item
                      ? "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(200,210,225,0.06) 100%)"
                      : "rgba(0, 0, 0, 0.28)",
                    border: isSelected
                      ? "1.5px solid #fbbf24"
                      : "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
                  }}
                >
                  {item ? (
                    <>
                      <img
                        src={item.icon}
                        alt={item.name}
                        className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform"
                        draggable={false}
                      />
                      {item.count > 1 && (
                        <span
                          className="absolute bottom-0.5 right-1 text-[10px] font-black text-white px-1 rounded-sm leading-tight tabular-nums"
                          style={{
                            textShadow: "0 1px 2px #000, 0 0 3px #000",
                          }}
                        >
                          {item.count}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white/5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Item Info & Quick Action Bar */}
          <div
            className="flex items-center justify-between p-3 rounded-[16px] border border-white/10"
            style={{ background: "rgba(0, 0, 0, 0.3)" }}
          >
            {selectedSlot !== null && chestSlots[selectedSlot] ? (
              <div className="flex items-center gap-3">
                <img
                  src={chestSlots[selectedSlot]!.icon}
                  alt=""
                  className="w-8 h-8 object-contain"
                />
                <div>
                  <div className="text-xs font-black text-white">
                    {chestSlots[selectedSlot]!.name}
                  </div>
                  <div className="text-[10px] text-amber-300 font-bold">
                    Count: {chestSlots[selectedSlot]!.count}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-medium">
                Select an item or click "Take All"
              </div>
            )}

            <div className="flex items-center gap-2">
              {selectedSlot !== null && chestSlots[selectedSlot] && (
                <button
                  onClick={() => handleTake(selectedSlot)}
                  className="press flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-md transition-all"
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "1px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Take Item
                </button>
              )}

              <button
                onClick={handleTakeAll}
                className="press flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-slate-200 bg-white/10 hover:bg-white/18 border border-white/15 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Take All
              </button>
            </div>
          </div>

          {toast && (
            <div className="text-center py-1 text-xs font-bold text-emerald-300 animate-fade-in flex items-center justify-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> {toast}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
