import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Globe2, Users } from "lucide-react";
import { GlobeIcon } from "@/components/icons";

type Experience = { id: string; label: string; img: string; desc?: string };

const EXPERIENCES: Experience[] = [
  { id: "skyblock", label: "Skyblock", img: "/banners/skyblock.png", desc: "Build & explore" },
  { id: "bedwars", label: "Bedwars", img: "/banners/bedwars.png", desc: "Protect your bed" },
  { id: "spleef", label: "Spleef", img: "/banners/spleef-key-art.png", desc: "Dig beneath foes" },
];

type Privacy = "global" | "friends";

// ─── Floating Globe Button ─────────────────────────────────────────────────

export function PrivateServerFab({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Host a private server"
      className="press fixed right-5 z-30 h-14 w-14 rounded-full bg-primary grid place-items-center animate-float-soft"
      style={{
        bottom: "calc(var(--nav-clearance, 128px))",
        boxShadow:
          "0 1px 0 rgb(255 255 255 / 0.6) inset, 0 14px 28px rgb(244 196 48 / 0.45), 0 4px 10px rgb(0 0 0 / 0.15)",
      }}
    >
      <GlobeIcon className="h-6 w-6 text-primary-foreground" />
    </button>
  );
}

// ─── Bottom Sheet ───────────────────────────────────────────────────────────

export function PrivateServerSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Experience["id"] | null>(null);
  const [privacy, setPrivacy] = useState<Privacy>("global");

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current == null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    setDragY(Math.max(0, dy));
  }
  function onTouchEnd() {
    setDragging(false);
    if (dragY > 90) {
      onClose();
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  }

  const selectedExp = EXPERIENCES.find((e) => e.id === selected) ?? null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-center">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="relative w-full max-w-[440px] mt-auto bg-background rounded-t-[32px] overflow-hidden flex flex-col"
        style={{
          height: "min(82dvh, 640px)",
          animation: dragging ? "none" : "sheet-up 0.4s cubic-bezier(0.22,1,0.36,1)",
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Drag handle */}
        <div
          className="pt-3 pb-2 flex justify-center shrink-0 touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1.5 w-10 rounded-full bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto ios-scroll hide-scrollbar px-5 pb-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="h-11 w-11 rounded-2xl bg-primary/15 grid place-items-center shrink-0">
              <GlobeIcon className="h-5 w-5 text-primary-hover" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[19px] font-extrabold leading-tight">Private Server</h2>
              <p className="text-[12px] text-text-secondary leading-snug">
                Choose an experience to host privately.
              </p>
            </div>
          </div>

          {/* Experience selection */}
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-[0.12em] font-extrabold text-text-secondary mb-2">
              Experience
            </div>
            <div className="grid grid-cols-2 gap-3">
              {EXPERIENCES.map((exp) => {
                const active = selected === exp.id;
                return (
                  <button
                    key={exp.id}
                    onClick={() => setSelected(exp.id)}
                    className="press relative aspect-square rounded-[18px] overflow-hidden text-left"
                    style={{
                      background: exp.img ? undefined : "linear-gradient(135deg,#1a1a2e,#16213e)",
                      boxShadow: active
                        ? "0 0 0 3px var(--primary), 0 10px 22px rgb(244 196 48 / 0.3)"
                        : "0 1px 0 rgb(255 255 255 / 0.6) inset, 0 8px 18px rgb(0 0 0 / 0.10)",
                    }}
                  >
                    {exp.img ? (
                      <img
                        src={exp.img}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[28px]">{exp.id === "junky" ? "🌿" : "🎮"}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                      <div className="text-[12.5px] font-extrabold text-white drop-shadow-sm">
                        {exp.label}
                      </div>
                      {exp.desc && (
                        <div className="text-[9px] text-white/70 font-semibold leading-tight">
                          {exp.desc}
                        </div>
                      )}
                    </div>
                    {active && (
                      <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary grid place-items-center animate-micro-pop">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy segmented selector */}
          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-[0.12em] font-extrabold text-text-secondary mb-2">
              Privacy
            </div>
            <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-surface-2">
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-background shadow-level1 transition-transform duration-300 ease-out"
                style={{
                  transform:
                    privacy === "friends" ? "translateX(calc(100% + 8px))" : "translateX(0)",
                }}
              />
              <button
                onClick={() => setPrivacy("global")}
                className="relative z-10 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[12.5px] font-extrabold"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Global
              </button>
              <button
                onClick={() => setPrivacy("friends")}
                className="relative z-10 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[12.5px] font-extrabold"
              >
                <Users className="h-3.5 w-3.5" />
                Friends Only
              </button>
            </div>
            <p className="mt-2.5 px-1 text-[11.5px] text-text-secondary leading-relaxed">
              {privacy === "global"
                ? "Anyone can join your private server using the invite."
                : "Only your friends can join."}
            </p>
          </div>
        </div>

        {/* Create button */}
        <div className="shrink-0 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] bg-background border-t border-border-soft">
          <button
            onClick={() =>
              selectedExp &&
              navigate({
                to: "/game/$id" as never,
                params: { id: selectedExp.id } as never,
                search: { private: "1", privacy } as never,
              })
            }
            disabled={!selectedExp}
            className={`press w-full h-14 rounded-full font-extrabold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 ${
              selectedExp
                ? "bg-slate-200 text-slate-800 border border-slate-300 shadow-level2"
                : "bg-surface-2 text-text-muted"
            }`}
          >
            Create Private Server
            {selectedExp && <ChevronRight className="h-5 w-5" strokeWidth={3} />}
          </button>
        </div>
      </div>
    </div>
  );
}
