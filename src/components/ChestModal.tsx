import React, { useEffect, useState } from "react";
import { GameAudio } from "@/lib/game-audio";
import { playSound } from "@/lib/sfx";
import { cn } from "@/lib/utils";
import { playButtonHitSound } from "@/lib/button-audio";

export interface ChestItem {
  id: string;
  name: string;
  count: number;
  icon: string;
  color?: number;
  blockType?: number;
  isTool?: boolean;
}

function getDefaultChestItems(): (ChestItem | null)[] {
  return [
    { id: "gold_ingot", name: "Gold Stacks", count: 64, icon: "https://file.garden/alGOOylwpAfCa6qP/file_000000008f8481f49405d6c7b6fcbb5a.png", blockType: 30 },
    { id: "gold_ingot_2", name: "Gold Stacks", count: 64, icon: "https://file.garden/alGOOylwpAfCa6qP/file_000000008f8481f49405d6c7b6fcbb5a.png", blockType: 30 },
    { id: "oak_log", name: "Oak Logs", count: 32, icon: "/textures/blocks/oak_log.png", blockType: 3 },
    { id: "cobblestone", name: "Cobblestone", count: 64, icon: "/textures/blocks/cobblestone.png", blockType: 15 },
    { id: "iron_sword", name: "Iron Sword", count: 1, icon: "/textures/items/iron_sword.png", isTool: true },
    null, null, null, null,
    null, null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null, null,
  ];
}

export function ChestModal({
  onClose,
  onTakeItem,
}: {
  onClose: () => void;
  onTakeItem?: (item: ChestItem) => void;
}) {
  const [chestSlots, setChestSlots] = useState<(ChestItem | null)[]>(() => getDefaultChestItems());
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
    playButtonHitSound();
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
    playButtonHitSound();
    GameAudio.playPop();
    const count = chestSlots.filter(Boolean).length;
    if (count === 0) return;
    chestSlots.forEach((item) => {
      if (item && onTakeItem) onTakeItem(item);
    });
    setChestSlots(new Array(27).fill(null));
    setToast("Transferred all Manor chest items to inventory!");
    setTimeout(() => setToast(null), 2000);
    setSelectedSlot(null);
  };

  const selectedItem = selectedSlot !== null ? chestSlots[selectedSlot] : null;
  const totalChestItems = chestSlots.filter(Boolean).length;

  return (
    <div
      className="bf-overlay is-open select-none"
      style={{ zIndex: 120 }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          GameAudio.playChestClose();
          onClose();
        }
      }}
    >
      <div
        className="bf-modal-wrap bf-modal-wrap--board"
        style={{ transform: "scale(0.85)", transformOrigin: "center center" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            GameAudio.playChestClose();
            onClose();
          }
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Manor Chest"
          className="bf-modal bf-panel bf-panel--board flex flex-col items-center select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Authentic Manor Crown Title Banner */}
          <div className="bf-panel__title" style={{ top: -72, height: 86 }}>
            <div className="bf-banner-crown" aria-hidden="true" />
          </div>

          {/* Yellow Manor X Close Button */}
          <button
            type="button"
            className="bf-close bf-panel__close"
            aria-label="Close"
            onClick={() => {
              playButtonHitSound();
              GameAudio.playChestClose();
              onClose();
            }}
          >
            ✕
          </button>

          {/* Manor Gold Title Plate */}
          <div className="bf-plate bf-plate--title mt-1 mb-2">
            <span>MANOR CHEST</span>
            <span className="text-[12px] ml-2 opacity-90">({totalChestItems}/27)</span>
          </div>

          {/* 27 Slots Grid using Manor Tan Slots */}
          <div className="p-2 w-full max-w-[500px]">
            <div className="grid grid-cols-9 gap-1.5" aria-label="Chest storage slots">
              {chestSlots.map((item, idx) => {
                const isSelected = selectedSlot === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!item}
                    aria-label={item ? `${item.name} x${item.count}` : `Empty slot ${idx + 1}`}
                    onClick={() => {
                      playButtonHitSound();
                      if (item) {
                        GameAudio.playPop();
                        setSelectedSlot(isSelected ? null : idx);
                      }
                    }}
                    onDoubleClick={() => handleTake(idx)}
                    className={cn(
                      "bf-slot relative grid aspect-square place-items-center transition-all duration-75 active:scale-95 cursor-pointer",
                      isSelected && "is-selected",
                      !item && "opacity-60",
                    )}
                    style={{
                      width: "48px",
                      height: "48px",
                    }}
                  >
                    {item && (
                      <>
                        <img
                          src={item.icon}
                          alt={item.name}
                          className="h-8 w-8 object-contain [image-rendering:pixelated] pointer-events-none drop-shadow-sm"
                          draggable={false}
                        />
                        <span className="absolute bottom-0.5 right-1 font-mono text-[11px] font-black text-amber-950 [text-shadow:0_1px_0_rgba(255,255,255,0.8)] tabular-nums leading-none pointer-events-none">
                          {item.count}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manor Inset Action Shelf */}
          <div className="bf-note mt-2 w-full max-w-[500px] flex items-center justify-between p-2">
            {selectedItem ? (
              <div className="flex items-center gap-2.5">
                <div className="bf-slot" style={{ width: "42px", height: "42px" }}>
                  <img
                    src={selectedItem.icon}
                    alt={selectedItem.name}
                    className="h-7 w-7 object-contain [image-rendering:pixelated]"
                  />
                </div>
                <div className="text-left">
                  <div className="font-bold text-[14px] text-[#42250f] leading-tight">
                    {selectedItem.name}
                  </div>
                  <div className="text-[11px] text-[#784d28] font-semibold">
                    Quantity: {selectedItem.count}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-[#784d28] italic font-semibold px-2">
                Select an item or click Take All
              </div>
            )}

            <div className="flex items-center gap-2">
              {selectedItem && (
                <button
                  type="button"
                  onClick={() => handleTake(selectedSlot!)}
                  className="bf-btn bf-btn--build !min-w-[85px] !h-[32px] !text-[12px] cursor-pointer touch-manipulation"
                >
                  <span className="bf-btn__label">Take</span>
                </button>
              )}
              {totalChestItems > 0 && (
                <button
                  type="button"
                  onClick={handleTakeAll}
                  className="bf-btn bf-btn--plain !min-w-[95px] !h-[32px] !text-[12px] cursor-pointer touch-manipulation"
                >
                  <span className="bf-btn__label">Take All</span>
                </button>
              )}
            </div>
          </div>

          {toast && (
            <div className="mt-1 text-center font-bold text-[13px] text-[#2e6818] animate-pulse">
              {toast}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
