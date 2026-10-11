/**
 * CustomizePanel — inline avatar customization (frames + body/hair colors).
 * Rendered directly on the Avatar page so customization is always open,
 * without any popup or extra navigation step.
 */
import { useEffect, useState } from "react";
import { Check, LockKeyhole, Palette, Sparkles } from "lucide-react";
import { GlossyAvatar, isIraAccount, isDieAccount, type AvatarFrame } from "@/components/GlossyAvatar";
import { useAuth } from "@/lib/auth-context";
import {
  setEquippedFrame,
  useEquippedFrame,
  AVATAR_COLORS,
  HAIR_COLORS,
  setAvatarColor,
  setHairColor,
  useAvatarColor,
  useHairColor,
} from "@/lib/avatar";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

const FRAME_ITEMS: Array<{
  id: AvatarFrame;
  title: string;
  detail: string;
  restrictedFor?: (user: import("@/lib/auth-context").QBUser | null) => boolean;
  lockedReason?: string;
}> = [
  { id: "none", title: "Default avatar", detail: "Clean profile" },
  { id: "early-beta", title: "Early Beta", detail: "Exclusive beta frame" },
  {
    id: "staff",
    title: "Staff Badge",
    detail: "Staff badge frame",
    restrictedFor: (u) => !u?.staff,
    lockedReason: "Staff only",
  },
  {
    id: "star-program",
    title: "Star Program 2026",
    detail: "Star Program badge",
    restrictedFor: (u) => !u?.badgeEquipped,
    lockedReason: "Red star badge only",
  },
];

export function CustomizePanel() {
  const { qbUser } = useAuth();
  const isIra = isIraAccount(qbUser);
  const isDie = isDieAccount(qbUser);
  const isStaff = isIra || isDie || Boolean(qbUser?.staff);
  const equippedFrame = useEquippedFrame();
  const avatarColor = useAvatarColor();
  const hairColor = useHairColor();
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!qbUser) return;
    let active = true;
    void updateDoc(doc(db, "users", qbUser.uid), {
      "avatarSnapshot.frameId": equippedFrame,
    }).then(
      () => active && setSaveError(""),
      () =>
        active && setSaveError("Couldn’t save this frame. Check your connection and try again."),
    );
    return () => {
      active = false;
    };
  }, [qbUser, equippedFrame]);

  function equipFrame(frame: AvatarFrame) {
    if (frame === "staff" && !isStaff) return;
    setEquippedFrame(equippedFrame === frame && frame !== "none" ? "none" : frame);
  }

  return (
    <section className="space-y-4" aria-label="Customize avatar">
      <div className="rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0_7px_18px_rgba(18,28,38,.06)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-500" />
          <h2 className="text-[14px] font-black tracking-[-0.03em] text-[#141414]">Frames</h2>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {FRAME_ITEMS.map((item) => {
            const active = equippedFrame === item.id;
            const locked = Boolean(item.restrictedFor && item.restrictedFor(qbUser) && !isStaff);
            return (
              <button
                key={item.id}
                type="button"
                disabled={locked}
                aria-pressed={active}
                onClick={() => equipFrame(item.id)}
                className={`press rounded-[16px] border p-3 text-left transition-colors ${
                  active ? "border-slate-900/25 bg-slate-50" : "border-black/[0.07] bg-[#f7f8fa]"
                } ${locked ? "opacity-55" : ""}`}
              >
                <div className="grid h-[74px] place-items-center rounded-[12px] bg-white">
                  <GlossyAvatar
                    frame={item.id}
                    photoUrl={qbUser?.profilePhoto}
                    height={46}
                    autoRotate={false}
                    focusZone="head"
                  />
                </div>
                <p className="mt-2 truncate text-[11px] font-black text-[#141414]">{item.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-bold text-slate-500">
                  {locked ? (
                    <>
                      <LockKeyhole className="h-3 w-3" />
                      {item.lockedReason || "Locked"}
                    </>
                  ) : active ? (
                    <>
                      <Check className="h-3 w-3" />
                      Equipped · tap to remove
                    </>
                  ) : (
                    item.detail
                  )}
                </p>
              </button>
            );
          })}
        </div>
        {saveError && (
          <p role="alert" className="mt-3 text-[11px] font-bold text-rose-600">
            {saveError}
          </p>
        )}
      </div>

      <div className="rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0_7px_18px_rgba(18,28,38,.06)]">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-slate-500" />
          <h2 className="text-[14px] font-black tracking-[-0.03em] text-[#141414]">
            Body &amp; hair colors
          </h2>
        </div>

        <div className="mt-3">
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Body color
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            {AVATAR_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Body color ${hex}`}
                onClick={() => setAvatarColor(hex)}
                style={{ backgroundColor: hex }}
                className={`h-8 w-8 rounded-full border transition-all ${
                  avatarColor === hex
                    ? "scale-110 border-slate-900 ring-2 ring-slate-900/25"
                    : "border-black/10"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-black/[0.06] pt-3">
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Hair &amp; accent color
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            {HAIR_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                aria-label={`Hair color ${hex}`}
                onClick={() => setHairColor(hex)}
                style={{ backgroundColor: hex }}
                className={`h-8 w-8 rounded-full border transition-all ${
                  hairColor === hex
                    ? "scale-110 border-slate-900 ring-2 ring-slate-900/25"
                    : "border-black/10"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
