import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

/**
 * Sandbox in-game settings — same card / row / toggle language as the Skyblock
 * game settings modal, persisting to the exact same `settings.*` fields on the
 * signed-in QBlock user so preferences carry between games.
 */
export function SandboxSettings({
  onClose,
  camMode,
  onCamMode,
}: {
  onClose: () => void;
  camMode: "first" | "third";
  onCamMode: (m: "first" | "third") => void;
}) {
  const { qbUser } = useAuth();
  const saved = qbUser?.settings ?? {};

  const [sens, setSens] = useState(Number(saved.sensitivity ?? 50));
  const [fog, setFog] = useState(Boolean(saved.fog ?? true));
  const [haptics, setHaptics] = useState(Boolean(saved.haptics ?? true));
  const [hud, setHud] = useState(Boolean(saved.hud ?? true));
  const [renderDist, setRenderDist] = useState(Number(saved.renderDistance ?? 70));

  const persist = async (key: string, value: unknown) => {
    if (!qbUser) return;
    try {
      await updateDoc(doc(db, "users", qbUser.uid), { [`settings.${key}`]: value });
    } catch (error) {
      console.warn("Could not save game setting", error);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_24px_70px_rgb(0_0_0_/_0.35)]">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <p className="text-[15px] font-extrabold tracking-tight text-[#16181d]">Game Settings</p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg bg-black/5 text-[14px] font-bold text-black/50"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="max-h-[68vh] space-y-3 overflow-y-auto p-4">
          <Card title="Camera">
            <div className="flex gap-2">
              {(["first", "third"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onCamMode(m);
                    persist("camMode", m);
                  }}
                  className={`flex-1 rounded-xl border px-3 py-2 text-[12px] font-bold transition ${
                    camMode === m
                      ? "border-[#f4b400] bg-[#f4b400]/15 text-[#16181d]"
                      : "border-black/10 bg-white text-black/50"
                  }`}
                >
                  {m === "first" ? "1st person" : "3rd person"}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Controls">
            <Slider
              label="Look sensitivity"
              value={sens}
              min={10}
              max={100}
              onChange={(v) => {
                setSens(v);
                persist("sensitivity", v);
                window.dispatchEvent(new CustomEvent("bm-sensitivity", { detail: v }));
              }}
            />
            <Toggle
              label="Haptics"
              value={haptics}
              onChange={(v) => {
                setHaptics(v);
                persist("haptics", v);
              }}
            />
          </Card>

          <Card title="Graphics">
            <Slider
              label="Render distance"
              value={renderDist}
              min={30}
              max={140}
              onChange={(v) => {
                setRenderDist(v);
                persist("renderDistance", v);
                window.dispatchEvent(new CustomEvent("bm-render-distance", { detail: v }));
              }}
            />
            <Toggle
              label="Fog"
              value={fog}
              onChange={(v) => {
                setFog(v);
                persist("fog", v);
                window.dispatchEvent(new CustomEvent("bm-fog", { detail: v }));
              }}
            />
            <Toggle
              label="Show HUD"
              value={hud}
              onChange={(v) => {
                setHud(v);
                persist("hud", v);
                window.dispatchEvent(new CustomEvent("bm-hud", { detail: v }));
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-black/8 bg-white/70 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/35">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-xl px-1 py-1.5 text-left"
    >
      <span className="text-[12px] font-semibold text-[#16181d]">{label}</span>
      <span
        className={`relative h-[22px] w-[40px] rounded-full transition ${value ? "bg-[#f4b400]" : "bg-black/15"}`}
      >
        <span
          className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ left: value ? 21 : 3 }}
        />
      </span>
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="px-1 py-1">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#16181d]">{label}</span>
        <span className="text-[11px] font-bold text-black/40">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#f4b400]"
      />
    </div>
  );
}
