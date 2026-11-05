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
  // Populate starter manor chest items if empty
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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-2 sm:p-4 pointer-events-auto select-none backdrop-blur-sm"
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
        aria-label="Manor Chest"
        className="v2-anim-pop relative flex max-h-[86dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-[14px] p-3 sm:p-4 select-none shadow-[0_20px_50px_rgba(0,0,0,0.85)] border-2 border-[#d4af37]/80"
        style={{
          background: "linear-gradient(145deg, #2b170d 0%, #170a04 100%)",
          boxShadow: "0 0 25px rgba(212, 175, 55, 0.25), inset 0 0 15px rgba(0,0,0,0.8)",
        }}
      >
        {/* Brass corner rivet accents */}
        <span className="absolute top-1.5 left-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f5d77f] to-[#b8860b] shadow-[0_1px_2px_rgba(0,0,0,0.8)] border border-[#4a320d]" />
        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f5d77f] to-[#b8860b] shadow-[0_1px_2px_rgba(0,0,0,0.8)] border border-[#4a320d]" />
        <span className="absolute bottom-1.5 left-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f5d77f] to-[#b8860b] shadow-[0_1px_2px_rgba(0,0,0,0.8)] border border-[#4a320d]" />
        <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f5d77f] to-[#b8860b] shadow-[0_1px_2px_rgba(0,0,0,0.8)] border border-[#4a320d]" />

        {/* Manor Header */}
        <header className="relative flex h-10 shrink-0 items-center justify-between pb-2 border-b border-[#d4af37]/40 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏰</span>
            <div>
              <h2 className="font-lilita text-[17px] tracking-wider text-amber-200 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                MANOR CHEST
              </h2>
            </div>
            <span className="font-mono text-[11px] font-bold text-amber-300/80 bg-[#160a04] px-2 py-0.5 rounded-full border border-[#d4af37]/30">
              {totalChestItems}/27 Slots
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playButtonHitSound();
              GameAudio.playChestClose();
              onClose();
            }}
            aria-label="Close chest"
            className="h-7 w-7 rounded-full bg-[#1e0e07] border border-[#d4af37]/50 text-amber-200 hover:text-white hover:bg-amber-600/30 flex items-center justify-center font-bold text-sm active:scale-95 transition cursor-pointer"
          >
            ✕
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-3">
          {/* 27 Chest Slots Grid inside Manor Velvet/Leather Inset */}
          <div
            className="p-2.5 rounded-[10px] border border-[#d4af37]/30 shadow-[inset_0_4px_12px_rgba(0,0,0,0.85)]"
            style={{
              background: "linear-gradient(180deg, #180c06 0%, #241209 100%)",
            }}
          >
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
                      "relative grid aspect-square place-items-center rounded-[6px] transition-all duration-100 active:scale-95 cursor-pointer border",
                      isSelected
                        ? "bg-amber-500/30 border-amber-300 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        : item
                          ? "bg-[#2d170d]/90 hover:bg-[#3d2013] border-[#7a481c]/70 hover:border-[#d4af37]/60"
                          : "bg-[#140a05]/80 border-[#3d2112]/40",
                    )}
                  >
                    {item && (
                      <>
                        <img
                          src={item.icon}
                          alt={item.name}
                          className="h-7 w-7 object-contain [image-rendering:pixelated] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                          draggable={false}
                        />
                        <span className="absolute bottom-0.5 right-1 font-mono text-[10px] font-black text-amber-200 [text-shadow:0_1px_2px_#000,0_0_3px_#000] tabular-nums leading-none">
                          {item.count}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Details & Manor Action Row */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[10px] border border-[#d4af37]/40 shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            style={{
              background: "linear-gradient(180deg, #2a160c 0%, #1b0d06 100%)",
            }}
          >
            {selectedItem ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#140a05] border border-[#d4af37]/50 shadow-inner">
                  <img
                    src={selectedItem.icon}
                    alt={selectedItem.name}
                    className="h-7 w-7 object-contain [image-rendering:pixelated]"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-lilita text-[15px] text-amber-100 drop-shadow-[0_1px_2px_#000]">
                    {selectedItem.name}
                  </p>
                  <p className="truncate text-[11px] font-mono font-bold text-amber-300/80">
                    Stack Quantity: {selectedItem.count}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-1 font-lilita text-[13px] text-amber-200/60 tracking-wide">
                — Select item to transfer —
              </p>
            )}

            <div className="flex items-center gap-2">
              {selectedItem && (
                <button
                  type="button"
                  onClick={() => handleTake(selectedSlot!)}
                  className="font-lilita text-[13px] text-[#281504] h-8 px-3.5 rounded-[6px] transition active:scale-95 cursor-pointer bg-gradient-to-t from-[#d4af37] to-[#fce895] hover:brightness-110 border border-[#fff5cc] shadow-[0_2px_8px_rgba(212,175,55,0.4)]"
                >
                  Take Item
                </button>
              )}
              {totalChestItems > 0 && (
                <button
                  type="button"
                  onClick={handleTakeAll}
                  className="font-lilita text-[13px] text-amber-100 h-8 px-3.5 rounded-[6px] transition active:scale-95 cursor-pointer bg-gradient-to-t from-[#6b3512] to-[#964c1c] hover:brightness-110 border border-[#d4af37]/60 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                >
                  Take All
                </button>
              )}
            </div>
          </div>

          {toast && (
            <div className="text-center font-lilita text-[13.5px] text-amber-300 drop-shadow-[0_1px_2px_#000] animate-pulse">
              {toast}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
