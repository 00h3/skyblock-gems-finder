import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { GameAudio } from "@/lib/game-audio";
import { playSound } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { getBlockIcon, getShovelIcon } from "@/routes/game.$id";

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        GameAudio.playChestClose();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    setToast("Transferred all chest items to inventory!");
    setTimeout(() => setToast(null), 2000);
    setSelectedSlot(null);
  };

  const selectedItem = selectedSlot !== null ? chestSlots[selectedSlot] : null;
  const totalChestItems = chestSlots.filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-2 sm:p-3"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          GameAudio.playChestClose();
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Chest"
        className="wood-panel v2-anim-pop flex max-h-[86dvh] w-full max-w-[580px] flex-col overflow-hidden select-none"
      >
        {/* Authentic Wood Header */}
        <header className="wood-header relative flex h-10 shrink-0 items-center justify-center">
          <div className="flex items-center gap-2">
            <h2 className="font-lilita text-[20px] tracking-wide text-white [text-shadow:0_2px_0_rgba(0,0,0,.6)]">
              Chest
            </h2>
            <span className="font-lilita text-[13px] text-amber-200/80">
              ({totalChestItems}/27)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              GameAudio.playChestClose();
              onClose();
            }}
            aria-label="Close chest"
            className="absolute right-2 grid h-7 w-7 place-items-center text-white/90 active:scale-90"
          >
            <X className="h-5 w-5 stroke-[3.5]" aria-hidden="true" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 sm:p-2.5">
          {/* 27 Chest Slots Grid inside wood-inset (3 rows x 9 columns) */}
          <div className="wood-inset p-2">
            <div className="grid grid-cols-9 gap-1" aria-label="Chest storage slots">
              {chestSlots.map((item, idx) => {
                const isSelected = selectedSlot === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!item}
                    aria-label={item ? `${item.name} x${item.count}` : `Empty slot ${idx + 1}`}
                    onClick={() => {
                      if (item) {
                        GameAudio.playPop();
                        setSelectedSlot(isSelected ? null : idx);
                      }
                    }}
                    onDoubleClick={() => handleTake(idx)}
                    className={cn(
                      "wood-slot relative grid aspect-square place-items-center rounded-[4px] transition-transform duration-75 active:scale-95",
                      isSelected && "wood-slot-picked",
                    )}
                  >
                    {item && (
                      <>
                        <img
                          src={item.icon}
                          alt={item.name}
                          className="h-7 w-7 object-contain [image-rendering:pixelated]"
                          draggable={false}
                        />
                        <span className="absolute bottom-0.5 right-1 font-lilita text-[12px] text-white [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none">
                          {item.count}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item details & Action row in wood-inset */}
          <div className="wood-inset flex flex-wrap items-center justify-between gap-2 p-2">
            {selectedItem ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="wood-slot grid h-11 w-11 shrink-0 place-items-center rounded-[4px]">
                  <img
                    src={selectedItem.icon}
                    alt={selectedItem.name}
                    className="h-8 w-8 object-contain [image-rendering:pixelated]"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-lilita text-[15px] text-white">
                    {selectedItem.name}
                  </p>
                  <p className="truncate text-[11px] font-bold text-amber-200">
                    Quantity: {selectedItem.count}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-2 font-lilita text-[15px] text-white/60">
                — Select Item or Take All —
              </p>
            )}

            <div className="flex items-center gap-2">
              {selectedItem && (
                <button
                  type="button"
                  onClick={() => handleTake(selectedSlot!)}
                  className="wood-btn wood-btn-blue h-9 px-4 font-lilita text-[15px]"
                >
                  Take
                </button>
              )}
              {totalChestItems > 0 && (
                <button
                  type="button"
                  onClick={handleTakeAll}
                  className="wood-btn h-9 px-4 font-lilita text-[15px]"
                >
                  Take All
                </button>
              )}
            </div>
          </div>

          {toast && (
            <div className="text-center font-lilita text-[14px] text-emerald-300 [text-shadow:0_1px_2px_#000]">
              {toast}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
