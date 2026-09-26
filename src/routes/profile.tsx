import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ProfileSheet } from "@/components/ProfileSheet";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Moon } from "lucide-react";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { setDark, useDark } from "@/lib/ui-bus";
import { useAuth } from "@/lib/auth-context";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { qbResetPassword } from "@/lib/auth-utils";
import {
  getAvatarSnapshot,
  setBaseCharacter,
  setGender,
  CHARACTER_1_GLTF,
  CHARACTER_2_GLTF,
} from "@/lib/avatar";
import { getEquippedShop, getOwnedShopItemIds } from "@/lib/shop";
import { saveAccount } from "@/lib/saved-accounts";
import { APP_VERSION } from "@/components/LegalDocs";
import { toast } from "sonner";
import {
  EditProfileView,
  EditAvatarView,
  NicknameStyleView,
  FramesView,
  ChangePasswordView,
  ActivityLogView,
  NotificationsView,
  PrivacyView,
  HelpSupportView,
  SettingsView,
  AppearanceView,
  AboutAppView,
  DeactivateAccountView,
  BetaFeaturesView,
} from "@/components/profile/ProfileSubViews";

export type ActiveScreen =
  | "edit_profile"
  | "edit_avatar"
  | "nickname_style"
  | "frames"
  | "change_password"
  | "activity_log"
  | "notifications"
  | "privacy"
  | "help_support"
  | "settings"
  | "appearance"
  | "about"
  | "deactivate"
  | "beta_features"
  | null;

import { FirstTimeSectionLoader } from "@/components/ui/FirstTimeSectionLoader";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Settings — QBlock" }] }),
  component: () => (
    <FirstTimeSectionLoader id="profile">
      <ProfilePage />
    </FirstTimeSectionLoader>
  ),
});

function ProfilePage() {
  const { qbUser, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const dark = useDark();

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>(null);
  const [previousScreen, setPreviousScreen] = useState<ActiveScreen>(null);
  const [showSelfProfileSheet, setShowSelfProfileSheet] = useState(false);
  const [showWowDownload, setShowWowDownload] = useState(false);

  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [photoDraft, setPhotoDraft] = useState("");
  const [characterDraft, setCharacterDraft] = useState<"char1" | "char2">("char1");
  const [nameStyleDraft, setNameStyleDraft] = useState<string>("default");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !qbUser) {
      nav({ to: "/login" as never });
      return;
    }
    if (!qbUser) return;
    setNameDraft(qbUser.displayName || qbUser.username || "Alfred Daniel");
    setBioDraft(qbUser.bio || "Wow Put description!");
    setPhotoDraft(qbUser.profilePhoto || "");
    const baseChar = qbUser.avatarSnapshot?.baseCharacter === "char2" ? "char2" : "char1";
    setCharacterDraft(baseChar);
    setNameStyleDraft(
      qbUser.nameStyle || (qbUser.useGradientName === false ? "default" : "default"),
    );
  }, [authLoading, qbUser, nav]);

  async function handleSignOut() {
    try {
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
      await signOut(auth);
      toast.success("Signed out");
      nav({ to: "/accounts" as never });
    } catch {
      toast.error("Failed to sign out");
    }
  }

  async function handleDeactivate() {
    try {
      if (qbUser) {
        await setDoc(
          doc(db, "users", qbUser.uid),
          { deactivated: true, deactivatedAt: new Date().toISOString() },
          { merge: true },
        );
      }
      await signOut(auth);
      toast.success("Account deactivated");
      nav({ to: "/login" as never });
    } catch {
      toast.error("Could not deactivate account");
    }
  }

  async function saveProfile() {
    if (!qbUser) return;
    setSaving(true);
    try {
      const isFemale = characterDraft === "char2";
      setBaseCharacter(characterDraft);
      setGender(isFemale ? "female" : "male");
      const patch = {
        displayName: nameDraft.trim() || qbUser.displayName,
        bio: bioDraft.trim(),
        profilePhoto: photoDraft.trim() || qbUser.profilePhoto || "",
        nameStyle: nameStyleDraft,
        useGradientName: nameStyleDraft === "orange" || nameStyleDraft === "rainbow" || nameStyleDraft === "gradient",
        avatarSnapshot: {
          ...getAvatarSnapshot(),
          baseCharacter: characterDraft,
          selectedCharacter: characterDraft,
          gender: isFemale ? "female" : "male",
          modelUrl: characterDraft === "char2" ? CHARACTER_2_GLTF : CHARACTER_1_GLTF,
          shopEquipped: getEquippedShop(),
          shopOwned: getOwnedShopItemIds(),
        },
      };
      await setDoc(doc(db, "users", qbUser.uid), patch, { merge: true });
      window.dispatchEvent(
        new CustomEvent("qb-profile-updated", {
          detail: { uid: qbUser.uid, patch },
        }),
      );
      toast.success("Profile saved successfully");
      setActiveScreen(null);
    } catch {
      toast.error("Could not save profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAvatar(newPhotoUrl: string) {
    setPhotoDraft(newPhotoUrl);
    if (!qbUser) return;
    try {
      const patch = { profilePhoto: newPhotoUrl };
      await setDoc(doc(db, "users", qbUser.uid), patch, { merge: true });
      window.dispatchEvent(
        new CustomEvent("qb-profile-updated", {
          detail: { uid: qbUser.uid, patch },
        }),
      );
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to update avatar");
    }
  }

  async function sendPasswordReset() {
    if (!qbUser?.email) {
      toast.error("No email associated with account");
      return;
    }
    try {
      await qbResetPassword(qbUser.email);
      toast.success("Password reset email sent to " + qbUser.email);
    } catch {
      toast.error("Could not send password reset link. Try again.");
    }
  }

  // iOS-style morphing transition for settings subviews (smooth spring scale & bottom-to-top)
  const iosMorphTransition = {
    type: "spring" as const,
    damping: 30,
    stiffness: 320,
    mass: 0.8,
  };

  const subviewMotion = {
    initial: { opacity: 0, y: "10%", scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: "8%", scale: 0.96 },
    transition: iosMorphTransition,
  };

  return (
    <MobileShell hideNav>
      <AnimatePresence mode="wait" initial={false}>
        {/* 1. EDIT PROFILE VIEW */}
        {activeScreen === "edit_profile" && (
          <motion.div key="edit_profile" {...subviewMotion} className="min-h-full">
            <EditProfileView
              user={qbUser}
              nameDraft={nameDraft}
              setNameDraft={setNameDraft}
              bioDraft={bioDraft}
              setBioDraft={setBioDraft}
              nameStyleDraft={nameStyleDraft}
              setNameStyleDraft={setNameStyleDraft}
              characterDraft={characterDraft}
              setCharacterDraft={setCharacterDraft}
              onSave={saveProfile}
              saving={saving}
              onOpenAvatarEdit={() => {
                setPreviousScreen("edit_profile");
                setActiveScreen("edit_avatar");
              }}
              onOpenNicknameStyle={() => setActiveScreen("nickname_style")}
              onBack={() => setActiveScreen(null)}
            />
          </motion.div>
        )}

        {/* 1.5. NICKNAME STYLE FULL PAGE VIEW */}
        {activeScreen === "nickname_style" && (
          <motion.div key="nickname_style" {...subviewMotion} className="min-h-full">
            <NicknameStyleView
              user={qbUser}
              name={nameDraft}
              selectedStyle={nameStyleDraft}
              onSelectStyle={(s) => {
                setNameStyleDraft(s);
              }}
              onSave={saveProfile}
              saving={saving}
              onBack={() => setActiveScreen("edit_profile")}
            />
          </motion.div>
        )}

        {/* 2. EDIT AVATAR VIEW */}
        {activeScreen === "edit_avatar" && (
          <motion.div key="edit_avatar" {...subviewMotion} className="min-h-full">
            <EditAvatarView
              user={qbUser}
              onSave={saveAvatar}
              onBack={() => setActiveScreen(previousScreen ?? null)}
            />
          </motion.div>
        )}

        {/* 2.5. FRAMES VIEW (Accessible through PFP) */}
        {activeScreen === "frames" && (
          <motion.div key="frames" {...subviewMotion} className="min-h-full">
            <FramesView user={qbUser} onBack={() => setActiveScreen("edit_avatar")} />
          </motion.div>
        )}

        {/* 3. CHANGE PASSWORD VIEW */}
        {activeScreen === "change_password" && (
          <motion.div key="change_password" {...subviewMotion} className="min-h-full">
            <ChangePasswordView
              userEmail={qbUser?.email || undefined}
              onSendReset={sendPasswordReset}
              onBack={() => setActiveScreen(null)}
            />
          </motion.div>
        )}

        {/* 4. ACTIVITY LOG VIEW */}
        {activeScreen === "activity_log" && (
          <motion.div key="activity_log" {...subviewMotion} className="min-h-full">
            <ActivityLogView onBack={() => setActiveScreen(null)} />
          </motion.div>
        )}

        {/* 5. NOTIFICATIONS VIEW */}
        {activeScreen === "notifications" && (
          <motion.div key="notifications" {...subviewMotion} className="min-h-full">
            <NotificationsView onBack={() => setActiveScreen(null)} />
          </motion.div>
        )}

        {/* 6. PRIVACY VIEW */}
        {activeScreen === "privacy" && (
          <motion.div key="privacy" {...subviewMotion} className="min-h-full">
            <PrivacyView onBack={() => setActiveScreen(null)} />
          </motion.div>
        )}

        {/* 7. HELP & SUPPORT VIEW */}
        {activeScreen === "help_support" && (
          <motion.div key="help_support" {...subviewMotion} className="min-h-full">
            <HelpSupportView onBack={() => setActiveScreen(null)} />
          </motion.div>
        )}

        {/* 8. SETTINGS VIEW */}
        {activeScreen === "settings" && (
          <motion.div key="settings" {...subviewMotion} className="min-h-full">
            <SettingsView
              onNavigate={(screen) => setActiveScreen(screen)}
              onBack={() => setActiveScreen(null)}
            />
          </motion.div>
        )}

        {/* 9. APPEARANCE VIEW */}
        {activeScreen === "appearance" && (
          <motion.div key="appearance" {...subviewMotion} className="min-h-full">
            <AppearanceView
              dark={dark}
              onSetDark={(val) => setDark(val)}
              onBack={() => setActiveScreen("settings")}
            />
          </motion.div>
        )}

        {/* 10. ABOUT APPLICATION FULL-PAGE VIEW (Flat Android Style) */}
        {activeScreen === "about" && (
          <motion.div key="about" {...subviewMotion} className="min-h-full">
            <AboutAppView onBack={() => setActiveScreen(null)} />
          </motion.div>
        )}

        {/* 11. DEACTIVATE ACCOUNT FULL-PAGE VIEW (Flat Android Style) */}
        {activeScreen === "deactivate" && (
          <motion.div key="deactivate" {...subviewMotion} className="min-h-full">
            <DeactivateAccountView
              user={qbUser}
              onSignOut={handleSignOut}
              onDeactivate={handleDeactivate}
              onBack={() => setActiveScreen(null)}
            />
          </motion.div>
        )}

        {/* 12. BETA FEATURES VIEW (Flat Android Style) */}
        {activeScreen === "beta_features" && (
          <motion.div key="beta_features" {...subviewMotion} className="min-h-full">
            <BetaFeaturesView
              onLaunchWow={() => setShowWowDownload(true)}
              onBack={() => setActiveScreen(null)}
            />
          </motion.div>
        )}

        {/* ROOT SETTINGS / PROFILE SCREEN */}
        {activeScreen === null && (
          <motion.div
            key="root"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={iosMorphTransition}
            className="min-h-full bg-[#f4f5f7] dark:bg-[#101216] px-4 pb-24 transition-colors duration-200"
          >
            {/* Top Bar: Glossy Squircle Back Button & Centered "Settings" Title */}
            <header className="relative flex items-center justify-between pt-[max(env(safe-area-inset-top),14px)] pb-4">
              <button
                type="button"
                onClick={() => nav({ to: "/" as never })}
                className="press flex items-center gap-1.5 px-3 py-2 rounded-[14px] bg-gradient-to-b from-[rgba(243,245,248,0.96)] to-[rgba(228,232,238,0.94)] dark:from-[rgba(33,35,41,0.96)] dark:to-[rgba(24,26,31,0.94)] border border-black/[0.12] dark:border-white/[0.12] text-[#17191d] dark:text-white shadow-[0_4px_12px_rgba(23,24,27,0.08),inset_1px_1px_0_rgba(255,255,255,0.98)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_1px_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[20px] transition-all font-bold text-[13px] cursor-pointer"
                aria-label="Go Back"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Go Back</span>
              </button>

              <h1 className="text-[17.5px] font-black text-[#17191d] dark:text-white tracking-tight">
                Settings
              </h1>

              {/* Spacer for centered alignment */}
              <div className="w-16" />
            </header>

            {/* Identity Card: Tapping avatar opens Edit Avatar (Frames), tapping row opens Profile */}
            <div className="mt-1">
              <div
                onClick={() => setActiveScreen("edit_profile")}
                className="press flex w-full items-center gap-3.5 p-4 text-left cursor-pointer rounded-[20px] bg-white dark:bg-[#1a1c22] border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-none transition-all"
              >
                {/* Square PFP with rounded corners; tapping directly goes to Edit Avatar & Frames */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviousScreen(null);
                    setActiveScreen("edit_avatar");
                  }}
                  className="relative h-12 w-12 shrink-0 rounded-[14px] overflow-hidden bg-slate-200 dark:bg-slate-700 cursor-pointer press"
                  title="Edit Avatar"
                >
                  {qbUser?.profilePhoto ? (
                    <img
                      src={qbUser.profilePhoto}
                      alt={qbUser.displayName || "Avatar"}
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  ) : (
                    <GlossyAvatar
                      snapshot={qbUser?.avatarSnapshot}
                      photoUrl={qbUser?.profilePhoto}
                      imageFallbackOnly={true}
                      height={48}
                      className="h-full w-full object-cover pointer-events-none"
                      autoRotate={false}
                    />
                  )}
                </div>

                {/* Name & Subtitle / Role */}
                <div className="min-w-0 flex-1">
                  <div className="text-[15.5px] font-extrabold text-[#17191d] dark:text-white tracking-tight truncate">
                    {qbUser?.displayName || qbUser?.username || "Alfred Daniel"}
                  </div>
                  <div className="mt-0.5 text-[12.5px] font-medium text-[#7d8590] dark:text-[#8e95a0] truncate">
                    {qbUser?.bio?.trim() || "Wow Put description!"}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </div>
            </div>

            {/* Other settings Section Title */}
            <div className="mt-6 mb-2.5 px-1">
              <span className="text-[13px] font-bold text-[#7d8590] dark:text-[#888e98] tracking-tight">
                Other settings
              </span>
            </div>

            {/* Group 1 Card: Discovery Genre Button Glossy Styling */}
            <div className="rounded-[22px] qb-glossy-menu border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden transition-colors duration-200">
              {/* 1. Profile details (exact user ID SVG, enlarged) */}
              <button
                type="button"
                onClick={() => setActiveScreen("edit_profile")}
                className="press w-full flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-[28px] w-[28px] shrink-0 grid place-items-center">
                    <img
                      src="/icons/user-id-svgrepo-com.svg"
                      alt="Profile"
                      className="h-[25px] w-[25px] object-contain dark:invert shrink-0"
                    />
                  </div>
                  <span className="text-[14.5px] font-semibold text-[#17191d] dark:text-white">
                    Profile details
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </button>

              {/* 2. Password (exact key square SVG) */}
              <button
                type="button"
                onClick={() => setActiveScreen("change_password")}
                className="press w-full flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-[28px] w-[28px] shrink-0 grid place-items-center">
                    <img
                      src="/icons/key-square-svgrepo-com.svg"
                      alt="Password"
                      className="h-[22px] w-[22px] object-contain dark:invert shrink-0"
                    />
                  </div>
                  <span className="text-[14.5px] font-semibold text-[#17191d] dark:text-white">
                    Password
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </button>

              {/* 3. Notifications (exact bell SVG) */}
              <button
                type="button"
                onClick={() => setActiveScreen("notifications")}
                className="press w-full flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-[28px] w-[28px] shrink-0 grid place-items-center">
                    <img
                      src="/icons/bell-svgrepo-com.svg"
                      alt="Notifications"
                      className="h-[22px] w-[22px] object-contain dark:invert shrink-0"
                    />
                  </div>
                  <span className="text-[14.5px] font-semibold text-[#17191d] dark:text-white">
                    Notifications
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </button>

              {/* 4. Dark mode with exact pill toggle switch */}
              <div className="flex items-center justify-between p-3.5 px-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-[28px] w-[28px] shrink-0 grid place-items-center">
                    <Moon className="h-[20px] w-[20px] fill-current text-[#17191d] dark:text-white shrink-0" />
                  </div>
                  <span className="text-[14.5px] font-semibold text-[#17191d] dark:text-white">
                    Dark mode
                  </span>
                </div>

                {/* Pill Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={dark}
                  onClick={() => setDark(!dark)}
                  className={`press relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                    dark
                      ? "border-2 border-[#fa4616] bg-[#fa4616]/30"
                      : "border-2 border-black/30 bg-black/10"
                  }`}
                  aria-label="Toggle dark mode"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-sm transition duration-200 ease-in-out ${
                      dark ? "translate-x-5 bg-[#fa4616]" : "translate-x-0 bg-[#17191d]"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Beta Features Section */}
            <div className="mt-6 mb-2.5 px-1 flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#7d8590] dark:text-[#888e98] tracking-tight">
                Beta Features
              </span>
            </div>

            {/* Beta Features Group Card */}
            <div className="rounded-[20px] bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden transition-colors duration-200">
              {/* Beta Features Entry */}
              <button
                type="button"
                onClick={() => setActiveScreen("beta_features")}
                className="press w-full flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-[28px] w-[28px] shrink-0 grid place-items-center">
                    <img
                      src="/icons/arrow-right-1-svgrepo-com.svg"
                      alt="Beta Features"
                      className="h-[24px] w-[24px] object-contain dark:invert shrink-0"
                    />
                  </div>
                  <span className="text-[14.5px] font-semibold text-[#17191d] dark:text-white">
                    Beta Features
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </button>
            </div>

            {/* Application Section Title */}
            <div className="mt-6 mb-2.5 px-1">
              <span className="text-[13px] font-bold text-[#7d8590] dark:text-[#888e98] tracking-tight">
                Application & account
              </span>
            </div>

            {/* Group 2 Card: Flat Android style for About application & Deactivate my account */}
            <div className="rounded-[20px] bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden transition-colors duration-200">
              {/* 1. About application - bookmark square SVG */}
              <button
                type="button"
                onClick={() => setActiveScreen("about")}
                className="press w-full flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-[28px] w-[28px] shrink-0 grid place-items-center">
                    <img
                      src="/icons/bookmark-square-svgrepo-com.svg"
                      alt="About"
                      className="h-[24px] w-[24px] object-contain dark:invert"
                    />
                  </div>
                  <div>
                    <span className="text-[14.5px] font-semibold text-[#17191d] dark:text-white block">
                      About application
                    </span>
                    <span className="text-[11.5px] font-medium text-[#7d8590] dark:text-[#8e95a0]">
                      Version {APP_VERSION}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </button>

              {/* 2. Sign out - login-3 SVG */}
              <button
                type="button"
                onClick={handleSignOut}
                className="press w-full flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-[28px] w-[28px] shrink-0 grid place-items-center">
                    <img
                      src="/icons/login-3-svgrepo-com.svg"
                      alt="Sign out"
                      className="h-[22px] w-[22px] object-contain dark:invert"
                    />
                  </div>
                  <div>
                    <span className="text-[14.5px] font-semibold text-[#17191d] dark:text-white block">
                      Sign out
                    </span>
                    <span className="text-[11.5px] font-medium text-[#7d8590] dark:text-[#8e95a0]">
                      End your active session
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </button>

              {/* 3. Deactivate my account */}
              <button
                type="button"
                onClick={() => setActiveScreen("deactivate")}
                className="press w-full flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-red-500/[0.04] dark:hover:bg-red-500/[0.08] transition-colors text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-[28px]" />
                  <div>
                    <span className="text-[14.5px] font-semibold text-[#e03131] dark:text-[#ff6b6b] block">
                      Deactivate my account
                    </span>
                    <span className="text-[11.5px] font-medium text-red-500/70 dark:text-red-400/70">
                      Temporary account suspension
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#e03131]/60 dark:text-[#ff6b6b]/60 shrink-0" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Self Profile Detail Sheet on Avatar click */}
      {showSelfProfileSheet && qbUser && (
        <ProfileSheet
          user={{
            id: qbUser.uid,
            n: qbUser.displayName || qbUser.username || "Player",
            color: "#fa4616",
            online: true,
            staff: qbUser.staff,
            bio: qbUser.bio,
            isOwn: true,
            username: qbUser.username,
            customId: qbUser.customId,
            avatarSnapshot: qbUser.avatarSnapshot,
            profilePhoto: qbUser.profilePhoto,
            gamesPlayed: qbUser.gamesPlayed,
          }}
          onClose={() => setShowSelfProfileSheet(false)}
        />
      )}
    </MobileShell>
  );
}
