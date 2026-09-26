import { useEffect } from "react";
import { cn } from "@/lib/utils";

const STORAGE_SLOTS = 27;

export function BlockmanInventory({
  hotbar,
  tileUrls,
  slot,
  onSelect,
  onClose,
}: {
  hotbar: (number | string)[];
  tileUrls: Record<number | string, string>;
  slot: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const bar = Array.from({ length: 9 }, (_, i) => hotbar[i]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Inventory"
        className="blockman-panel v2-anim-pop flex w-full max-w-[460px] flex-col gap-3 p-3 sm:p-4"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-[15px] font-black uppercase tracking-wider text-white">Inventory</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inventory"
            className="blockman-slot grid h-8 w-8 place-items-center rounded-[4px] text-[15px] font-black text-white active:scale-95"
          >
            {"×"}
          </button>
        </header>

        <div className="grid grid-cols-9 gap-0.5" aria-label="Storage (empty)">
          {Array.from({ length: STORAGE_SLOTS }, (_, i) => (
            <div key={i} className="blockman-slot aspect-square rounded-[4px]" />
          ))}
        </div>

        <p className="text-center text-[11px] font-semibold text-white/50">
          Buy items from the shopkeeper to fill your inventory.
        </p>

        <div className="grid grid-cols-9 gap-0.5 border-t-2 border-black/40 pt-3" role="toolbar" aria-label="Hotbar">
          {bar.map((id, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slot ${i + 1}`}
              aria-pressed={slot === i}
              onClick={() => onSelect(i)}
              className={cn("blockman-slot relative grid aspect-square place-items-center rounded-[4px]")}
            >
              {id !== undefined && tileUrls[id] ? (
                <img
                  src={tileUrls[id]}
                  alt=""
                  draggable={false}
                  className="h-3/5 w-3/5 object-cover [image-rendering:pixelated]"
                />
              ) : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
