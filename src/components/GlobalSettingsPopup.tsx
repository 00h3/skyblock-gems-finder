"use client";

import { X, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettingsUi } from "@/lib/settings-ui";
import { useAuth } from "@/lib/auth-context";
import { useDark, setDark } from "@/lib/ui-bus";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "@tanstack/react-router";

export function GlobalSettingsPopup() {
  const { open, closeSettings } = useSettingsUi();
  const { qbUser, signOut } = useAuth();
  const dark = useDark();
  const nav = useNavigate();

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
            className="absolute inset-0 bg-black/60 cursor-pointer"
            onClick={closeSettings}
          />

          {/* Sheet Panel */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
            className="relative w-full max-w-[440px] h-[85dvh] flex flex-col overflow-hidden rounded-t-[24px] bg-white dark:bg-[#000000] border-t border-black/10 dark:border-white/15 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-black/[0.06] dark:border-white/10 bg-white dark:bg-[#000000] z-20">
              <div>
                <h2 className="text-[17px] font-medium tracking-tight text-black dark:text-white">
                  Settings
                </h2>
                <p className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                  Preferences & account controls
                </p>
              </div>
              <button
                type="button"
                onClick={closeSettings}
                className="press grid h-8 w-8 place-items-center rounded-[10px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-black dark:text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modern, sleek settings body without search box */}
            <div className="flex-1 w-full overflow-y-auto px-4 py-4 space-y-4 hide-scrollbar">
              {/* Profile Card */}
              {qbUser && (
                <div className="rounded-[18px] p-4 bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 flex items-center gap-3.5">
                  <div
                    className="h-11 w-11 rounded-[14px] flex items-center justify-center text-[15px] font-medium text-white shadow-xs"
                    style={{ background: qbUser.color || "#000" }}
                  >
                    {qbUser.displayName?.slice(0, 2).toUpperCase() || "QB"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-black dark:text-white truncate">
                      {qbUser.displayName || "Player"}
                    </div>
                    <div className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400 truncate">
                      @{qbUser.username || "player"} · ID: {qbUser.customId || "QB-001"}
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Group */}
              <div className="rounded-[18px] bg-neutral-50 dark:bg-neutral-950 border border-black/10 dark:border-white/15 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-black dark:text-white">
                      Dark Appearance
                    </div>
                    <div className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                      High-contrast black & white aesthetic
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDark(!dark)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      dark ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
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

                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-black dark:text-white">
                      Sound Effects
                    </div>
                    <div className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                      Block breaking, placement & UI chimes
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSound(!sound)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      sound ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
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

                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-black dark:text-white">
                      Haptic Feedback
                    </div>
                    <div className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                      Vibrations during jumps and interactions
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHaptics(!haptics)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      haptics ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
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

                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium text-black dark:text-white">
                      Push Notifications
                    </div>
                    <div className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                      Friend requests & group invites
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPush(!push)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      push ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
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
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-black dark:text-white">
                        Special Badge Display
                      </div>
                      <div className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                        Display verified symbol in leaderboards & chat
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={badgeSaving}
                      onClick={() => handleToggleBadge(!qbUser.badgeEquipped)}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                        qbUser.badgeEquipped ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"
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
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="press w-full py-3 rounded-[14px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-black/10 dark:border-white/10 text-red-600 dark:text-red-400 text-[13px] font-medium text-center transition cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
