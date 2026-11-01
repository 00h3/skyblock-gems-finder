"use client";

import {
  X,
  Moon,
  Volume2,
  Smartphone,
  Bell,
  Star,
  User,
  HelpCircle,
  Info,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSettingsUi } from "@/lib/settings-ui";
import { useAuth } from "@/lib/auth-context";
import { useDark, setDark } from "@/lib/ui-bus";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "@tanstack/react-router";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { BronzeCorniceAvatar } from "@/components/BronzeCornice";
import { useCurrency } from "@/lib/currency";
import { CurrencyPills, PINK_GEM_ICON, GOLDEN_COINS_ICON } from "@/components/CurrencyPills";
import { APP_VERSION } from "@/components/LegalDocs";
import { saveAccount } from "@/lib/saved-accounts";

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
    if (qbUser) {
      saveAccount({
        uid: qbUser.uid,
        username: qbUser.username,
        displayName: qbUser.displayName,
        email: qbUser.email,
        customId: qbUser.customId,
        profilePhoto: qbUser.profilePhoto,
        avatarSnapshot: qbUser.avatarSnapshot,
        color: qbUser.color,
      });
    }
    await signOut();
    nav({ to: "/accounts" as never });
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

          {/* Sheet Panel with settings menu card styling */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
            className="relative w-full max-w-[440px] max-h-[88dvh] flex flex-col overflow-hidden rounded-t-[28px] bg-[#f8f9fa] dark:bg-[#121316] border-t border-black/[0.08] dark:border-white/10 shadow-2xl z-10"
          >
            {/* Header: Clean with no "Settings" text on top */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 border-b border-black/[0.06] dark:border-white/10 bg-[#f8f9fa] dark:bg-[#121316] z-20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#fa4616]" />
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#8b929d] dark:text-[#8e95a0]">
                  Preferences
                </span>
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

            {/* Settings body with exact style of the Settings Menu */}
            <div
              className="flex-1 w-full overflow-y-auto px-4 py-4 space-y-3 hide-scrollbar touch-pan-y"
              style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
            >
              {/* Profile area with Bronze Cornice crowning PFP */}
              {qbUser && (
                <div className="flex items-center gap-4 px-1 py-1 mb-2">
                  <BronzeCorniceAvatar
                    size={62}
                    onClick={() => {
                      closeSettings();
                      nav({ to: "/avatar" as never });
                    }}
                    title="Edit Avatar"
                  >
                    <GlossyAvatar
                      snapshot={qbUser.avatarSnapshot}
                      photoUrl={qbUser.profilePhoto}
                      frame={qbUser.avatarSnapshot?.frameId}
                      height={62}
                      className="h-full w-full object-cover"
                      autoRotate={false}
                      focusZone="head"
                    />
                  </BronzeCorniceAvatar>

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

              {/* Wallet Card */}
              <PopupSubscriptionCard
                Icon={Star}
                iconColor="#f59e0b"
                title="Wallet"
                right={<ChevronRight className="h-4 w-4 text-text-muted" />}
                content={<CurrencyPills maxItems={2} />}
                status="Active"
                statusColor="#64748b"
                onClick={() => {
                  closeSettings();
                  nav({ to: "/shop" as never });
                }}
              />

              {/* Account Info */}
              <PopupSubscriptionCard
                Icon={User}
                iconColor="#64748b"
                title="Account Info"
                right={<ChevronRight className="h-4 w-4 text-text-muted" />}
                content={
                  <div className="text-[12.5px] text-text-secondary leading-relaxed">
                    Signed in as <strong className="text-foreground">@{qbUser?.username || "player"}</strong>
                  </div>
                }
                status="Verified"
                statusColor="#22c55e"
                onClick={() => {
                  closeSettings();
                  nav({ to: "/profile" as never });
                }}
              />

              {/* Dark Appearance Card */}
              <PopupSubscriptionCard
                Icon={Moon}
                iconColor="#6366f1"
                title="Dark Appearance"
                content={
                  <div className="text-[12.5px] text-text-secondary flex items-center gap-2">
                    <Moon className="h-3.5 w-3.5" /> High-contrast aesthetic
                  </div>
                }
                status={dark ? "On" : "Off"}
                statusColor={dark ? "#16a34a" : "#9ca3af"}
                right={<PopupSwitch value={dark} onChange={setDark} />}
              />

              {/* Sound Effects Card */}
              <PopupSubscriptionCard
                Icon={Volume2}
                iconColor="#10b981"
                title="Sound Effects"
                content={
                  <div className="text-[12.5px] text-text-secondary flex items-center gap-2">
                    <Volume2 className="h-3.5 w-3.5" /> In-game &amp; UI sounds
                  </div>
                }
                status={sound ? "Active" : "Disabled"}
                statusColor={sound ? "#16a34a" : "#9ca3af"}
                right={<PopupSwitch value={sound} onChange={setSound} />}
              />

              {/* Haptic Feedback Card */}
              <PopupSubscriptionCard
                Icon={Smartphone}
                iconColor="#0284c7"
                title="Haptic Feedback"
                content={
                  <div className="text-[12.5px] text-text-secondary flex items-center gap-2">
                    <Smartphone className="h-3.5 w-3.5" /> Vibrations during interactions
                  </div>
                }
                status={haptics ? "Active" : "Disabled"}
                statusColor={haptics ? "#16a34a" : "#9ca3af"}
                right={<PopupSwitch value={haptics} onChange={setHaptics} />}
              />

              {/* Push Notifications Card */}
              <PopupSubscriptionCard
                Icon={Bell}
                iconColor="#3b82f6"
                title="Push Notifications"
                content={
                  <div className="text-[12.5px] text-text-secondary flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5" /> Friend requests &amp; updates
                  </div>
                }
                status={push ? "Active" : "Disabled"}
                statusColor={push ? "#16a34a" : "#9ca3af"}
                right={<PopupSwitch value={push} onChange={setPush} />}
              />

              {/* Level 10 / Special Badge */}
              {qbUser && (
                <PopupSubscriptionCard
                  Icon={Star}
                  iconColor="#f59e0b"
                  title="Special Badge Display"
                  content={
                    <div className="text-[12.5px] text-text-secondary flex items-center gap-2">
                      <User className="h-3.5 w-3.5" /> Display verified symbol in chat
                    </div>
                  }
                  status={qbUser.badgeEquipped ? "Equipped" : "Hidden"}
                  statusColor={qbUser.badgeEquipped ? "#16a34a" : "#9ca3af"}
                  right={
                    <PopupSwitch
                      value={!!qbUser.badgeEquipped}
                      onChange={handleToggleBadge}
                      disabled={badgeSaving}
                    />
                  }
                />
              )}

              {/* Help & Support Card */}
              <PopupSubscriptionCard
                Icon={HelpCircle}
                iconColor="#8b5cf6"
                title="Help & Support"
                right={<ChevronRight className="h-4 w-4 text-text-muted" />}
                content={
                  <div className="text-[12.5px] text-text-secondary">
                    Official guides, community discord &amp; FAQ
                  </div>
                }
                status="Online"
                statusColor="#22c55e"
                onClick={() => {
                  closeSettings();
                  nav({ to: "/profile" as never });
                }}
              />

              {/* App Version Card */}
              <PopupSubscriptionCard
                Icon={Info}
                iconColor="#22c55e"
                title="App Version"
                content={
                  <div className="text-[12.5px] text-text-secondary">
                    QBLOCK {APP_VERSION} — Stable build
                  </div>
                }
                status={`v${APP_VERSION}`}
                statusColor="#22c55e"
              />

              {/* Sign out button matching settings menu */}
              <button
                type="button"
                onClick={handleSignOut}
                className="press qb-squircle mt-2 inline-flex h-[52px] w-full items-center justify-center gap-2 text-[14.5px] font-bold text-danger cursor-pointer"
              >
                <img
                  src="/icons/login-3-svgrepo-com.svg"
                  alt=""
                  className="h-[18px] w-[18px] dark:invert"
                />{" "}
                Sign out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Subscription Card Component for Popup ───────────────────────────────────
function PopupSubscriptionCard({
  Icon,
  title,
  iconColor,
  right,
  content,
  status,
  statusColor,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  iconColor?: string;
  right?: React.ReactNode;
  content?: React.ReactNode;
  status: string;
  statusColor: string;
  onClick?: () => void;
}) {
  return (
    <div className="qb-squircle flex flex-col p-4 transition-all">
      <div
        className={`flex items-center justify-between ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white border border-black/[0.07] dark:bg-[#17191e] dark:border-white/[0.10] shadow-none">
            <Icon
              className="h-4.5 w-4.5"
              style={{ color: iconColor || "#59616d" }}
              strokeWidth={2.2}
            />
          </div>
          <span className="text-[14.5px] font-extrabold tracking-tight text-foreground">
            {title}
          </span>
        </div>
        {right && <div>{right}</div>}
      </div>

      {content && <div className="mt-2.5 mb-1">{content}</div>}

      <div className="mt-3 mb-2.5 h-px w-full bg-black/8 dark:bg-white/10" />
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
        <span className="text-[12.5px] font-semibold text-foreground">{status}</span>
      </div>
    </div>
  );
}

function PopupSwitch({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!value);
      }}
      disabled={disabled}
      className={`relative h-[26px] w-[44px] rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 ${
        value ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-neutral-700"
      }`}
      aria-pressed={value}
    >
      <span
        className={`absolute top-[2px] h-[22px] w-[22px] rounded-full shadow-sm transition-all duration-200 ${
          value
            ? "left-[20px] bg-white dark:bg-black"
            : "left-[2px] bg-white dark:bg-neutral-300"
        }`}
      />
    </button>
  );
}
