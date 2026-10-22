"use client";

import { X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettingsUi } from "@/lib/settings-ui";
import { useAuth } from "@/lib/auth-context";
import { useDark, setDark } from "@/lib/ui-bus";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "@tanstack/react-router";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { useCurrency } from "@/lib/currency";
import { PINK_GEM_ICON, GOLDEN_COINS_ICON } from "@/components/CurrencyPills";

export function GlobalSettingsPopup() {
  const { open, closeSettings } = useSettingsUi();
  const { qbUser, signOut } = useAuth();
  const dark = useDark();
  const nav = useNavigate();
  const gems = useCurrency("gems");
  const gold = useCurrency("gold");

  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [push, setPush] = useState(true);
  const [badgeSaving, setBadgeSaving] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("bm-settings") || "{}");
      if (typeof s.push === "boolean") setPush(s.push);
      if (typeof s.sound === "boolean") setSound(s.sound);
      if (typeof s.haptics === "boolean") setHaptics(s.haptics);
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    localStorage.setItem("bm-settings", JSON.stringify({ push, sound, haptics }));
  }, [push, sound, haptics]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSettings();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeSettings]);

  async function handleToggleBadge(val: boolean) {
    if (!qbUser || badgeSaving) return;
    setBadgeSaving(true);
    try {
      await updateDoc(doc(db, "users", qbUser.uid), { badgeEquipped: val });
    } catch (e) {
      console.warn("Could not update badge", e);
    } finally {
      setBadgeSaving(false);
    }
  }

  async function handleSignOut() {
    closeSettings();
    await signOut();
    nav({ to: "/login" as never });
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 cursor-pointer"
            onClick={closeSettings}
          />

          {/* Sheet Panel with mail-style restrained glossiness */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
            className="relative w-full max-w-[440px] max-h-[88dvh] flex flex-col overflow-hidden rounded-t-[28px] bg-[#f8f9fa] dark:bg-[#121316] border-t border-black/[0.08] dark:border-white/10 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3.5 shrink-0 border-b border-black/[0.06] dark:border-white/10 bg-[#f8f9fa] dark:bg-[#121316] z-20">
              <div>
                <h2 className="text-[18px] font-black tracking-tight text-[#141414] dark:text-white">
                  Settings
                </h2>
                <p className="text-[11px] font-semibold text-[#8b929d] dark:text-[#8e95a0]">
                  Preferences & account controls
                </p>
              </div>
              <button
                type="button"
                onClick={closeSettings}
                className="qb-squircle press grid h-8 w-8 place-items-center text-[#141414] dark:text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Settings body */}
            <div className="flex-1 w-full overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar">
              {/* Profile area — NOT embedded, clean squircle pfp like chat, Nickname, grey smaller Username: & ID:, and currency */}
              {qbUser && (
                <div className="flex items-center gap-3.5 px-1 py-1">
                  {/* Squircle PFP like chat */}
                  <div className="qb-squircle relative h-[62px] w-[62px] shrink-0 overflow-hidden rounded-[18px] bg-[#e2e6ec] dark:bg-[#1a1c22]">
                    <GlossyAvatar
                      snapshot={qbUser.avatarSnapshot}
                      photoUrl={qbUser.profilePhoto}
                      frame={qbUser.avatarSnapshot?.frameId}
                      height={62}
                      className="h-full w-full object-cover"
                      autoRotate={false}
                      focusZone="head"
                    />
                  </div>

                  {/* Nickname, grey smaller Username: & ID:, and currency count */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[17px] font-black text-[#141414] dark:text-white tracking-tight leading-tight truncate">
                      {qbUser.displayName || "Player"}
                    </h3>
                    <div className="text-[11.5px] font-semibold text-[#8b929d] dark:text-[#8e95a0] mt-0.5 truncate leading-tight">
                      Username:{" "}
                      <span className="font-bold text-[#555d68] dark:text-[#bcc3cd]">
                        @{qbUser.username || "player"}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#8b929d] dark:text-[#8e95a0] leading-tight">
                      ID:{" "}
                      <span className="font-bold text-[#555d68] dark:text-[#bcc3cd]">
                        {qbUser.customId || "QB-001"}
                      </span>
                    </div>

                    {/* Gem icon & count | Coin icon & count */}
                    <div className="flex items-center gap-2 mt-1.5 text-[12px] font-black text-[#17181b] dark:text-white">
                      <div className="flex items-center gap-1">
                        <img
                          src={PINK_GEM_ICON}
                          alt="Gems"
                          className="h-4 w-4 object-contain shrink-0"
                          draggable={false}
                        />
                        <span className="tabular-nums">{(gems ?? 0).toLocaleString()}</span>
                      </div>
                      <span className="text-black/25 dark:text-white/20 font-normal select-none">
                        |
                      </span>
                      <div className="flex items-center gap-1">
                        <img
                          src={GOLDEN_COINS_ICON}
                          alt="Coins"
                          className="h-4 w-4 object-contain shrink-0"
                          draggable={false}
                        />
                        <span className="tabular-nums">{(gold ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Group with mail-glossiness (qb-squircle) */}
              <div className="qb-squircle overflow-hidden divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-bold text-[#141414] dark:text-white">
                      Dark Appearance
                    </div>
                    <div className="text-[11px] font-medium text-[#8b929d] dark:text-[#8e95a0]">
                      High-contrast dark mode aesthetic
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDark(!dark)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      dark ? "bg-[#141414] dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                        dark
                          ? "translate-x-5 bg-white dark:bg-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-bold text-[#141414] dark:text-white">
                      Sound Effects
                    </div>
                    <div className="text-[11px] font-medium text-[#8b929d] dark:text-[#8e95a0]">
                      Block breaking, placement & UI chimes
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSound(!sound)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      sound ? "bg-[#141414] dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                        sound
                          ? "translate-x-5 bg-white dark:bg-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-bold text-[#141414] dark:text-white">
                      Haptic Feedback
                    </div>
                    <div className="text-[11px] font-medium text-[#8b929d] dark:text-[#8e95a0]">
                      Vibrations during jumps and interactions
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHaptics(!haptics)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      haptics ? "bg-[#141414] dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                        haptics
                          ? "translate-x-5 bg-white dark:bg-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-bold text-[#141414] dark:text-white">
                      Push Notifications
                    </div>
                    <div className="text-[11px] font-medium text-[#8b929d] dark:text-[#8e95a0]">
                      Friend requests & group invites
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPush(!push)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      push ? "bg-[#141414] dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                        push
                          ? "translate-x-5 bg-white dark:bg-black"
                          : "translate-x-0 bg-white"
                      }`}
                    />
                  </button>
                </div>

                {qbUser && (
                  <div className="px-4 py-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-[13.5px] font-bold text-[#141414] dark:text-white">
                        Special Badge Display
                      </div>
                      <div className="text-[11px] font-medium text-[#8b929d] dark:text-[#8e95a0]">
                        Display verified symbol in leaderboards & chat
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={badgeSaving}
                      onClick={() => handleToggleBadge(!qbUser.badgeEquipped)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        qbUser.badgeEquipped ? "bg-[#141414] dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                          qbUser.badgeEquipped
                            ? "translate-x-5 bg-white dark:bg-black"
                            : "translate-x-0 bg-white"
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Actions Section */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="qb-squircle press w-full h-12 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-[13.5px] font-bold transition cursor-pointer active:scale-98"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
