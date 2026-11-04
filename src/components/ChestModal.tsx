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

function getDefaultChestItems(): (ChestItem | null)[] {
  return Array(27).fill(null);
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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-2 sm:p-4 pointer-events-auto select-none"
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
        className="v2-anim-pop flex max-h-[82dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-[4px] p-2.5 sm:p-3.5 select-none shadow-[0_16px_40px_rgba(0,0,0,0.65)]"
        style={{
          backgroundColor: "#c6c6c6",
          borderTop: "3px solid #ffffff",
          borderLeft: "3px solid #ffffff",
          borderBottom: "3px solid #555555",
          borderRight: "3px solid #555555",
        }}
      >
        {/* Authentic Inventory Grey Header */}
        <header className="relative flex h-8 shrink-0 items-center justify-between pb-1.5 border-b border-[#a0a0a0]">
          <div className="flex items-center gap-1.5">
            <h2 className="font-lilita text-[16px] tracking-wide text-[#2b2b2b] uppercase">
              Chest
            </h2>
            <span className="font-lilita text-[12px] text-[#555555]">
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
            className="font-lilita text-[15px] text-[#444444] hover:text-black px-1.5 py-0.5 active:scale-95 transition"
          >
            ✕
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-2">
          {/* 27 Chest Slots Grid inside grey-inset (3 rows x 9 columns) */}
          <div
            className="p-1.5 rounded-[2px]"
            style={{
              backgroundColor: "#8b8b8b",
              borderTop: "2px solid #373737",
              borderLeft: "2px solid #373737",
              borderBottom: "2px solid #ffffff",
              borderRight: "2px solid #ffffff",
            }}
          >
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
                    style={{
                      backgroundColor: isSelected ? "#a0a0a0" : "#8b8b8b",
                      borderTop: "2px solid #373737",
                      borderLeft: "2px solid #373737",
                      borderBottom: "2px solid #ffffff",
                      borderRight: "2px solid #ffffff",
                    }}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-[2px] transition-transform duration-75 active:scale-95",
                      isSelected && "ring-2 ring-white",
                    )}
                  >
                    {item && (
                      <>
                        <img
                          src={item.icon}
                          alt={item.name}
                          className="h-6 w-6 object-contain [image-rendering:pixelated]"
                          draggable={false}
                        />
                        <span className="absolute bottom-0.5 right-0.5 font-lilita text-[10.5px] text-white [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none">
                          {item.count}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item details & Action row in grey-inset */}
          <div
            className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-[2px]"
            style={{
              backgroundColor: "#8b8b8b",
              borderTop: "2px solid #373737",
              borderLeft: "2px solid #373737",
              borderBottom: "2px solid #ffffff",
              borderRight: "2px solid #ffffff",
            }}
          >
            {selectedItem ? (
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[2px]"
                  style={{
                    backgroundColor: "#8b8b8b",
                    borderTop: "2px solid #373737",
                    borderLeft: "2px solid #373737",
                    borderBottom: "2px solid #ffffff",
                    borderRight: "2px solid #ffffff",
                  }}
                >
                  <img
                    src={selectedItem.icon}
                    alt={selectedItem.name}
                    className="h-6.5 w-6.5 object-contain [image-rendering:pixelated]"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-lilita text-[14px] text-white [text-shadow:0_1px_2px_#000]">
                    {selectedItem.name}
                  </p>
                  <p className="truncate text-[11px] font-bold text-slate-200 [text-shadow:0_1px_1px_#000]">
                    Quantity: {selectedItem.count}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-1 font-lilita text-[13px] text-slate-200 [text-shadow:0_1px_2px_#000]">
                — Select Item or Take All —
              </p>
            )}

            <div className="flex items-center gap-1.5">
              {selectedItem && (
                <button
                  type="button"
                  onClick={() => handleTake(selectedSlot!)}
                  className="font-lilita text-[13px] text-[#222222] h-8 px-3 rounded-[2px] transition active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: "#c6c6c6",
                    borderTop: "2px solid #ffffff",
                    borderLeft: "2px solid #ffffff",
                    borderBottom: "2px solid #555555",
                    borderRight: "2px solid #555555",
                  }}
                >
                  Take
                </button>
              )}
              {totalChestItems > 0 && (
                <button
                  type="button"
                  onClick={handleTakeAll}
                  className="font-lilita text-[13px] text-[#222222] h-8 px-3 rounded-[2px] transition active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: "#c6c6c6",
                    borderTop: "2px solid #ffffff",
                    borderLeft: "2px solid #ffffff",
                    borderBottom: "2px solid #555555",
                    borderRight: "2px solid #555555",
                  }}
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
