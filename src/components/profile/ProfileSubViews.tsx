import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Lock,
  FileText,
  Bell,
  Shield,
  HelpCircle,
  Camera,
  Crop,
  Eye,
  EyeOff,
  Search,
  BookOpen,
  Terminal,
  Mail,
  Headphones,
  Phone,
  Globe,
  Palette,
  Share2,
  Info,
  LogIn,
  Image as ImageIcon,
  Pencil,
  Link,
  Key,
  UserPlus,
  MessageSquare,
  AtSign,
  Volume2,
  Smartphone,
  Check,
  Sun,
  Moon,
  Sparkles,
  AlertTriangle,
  LogOut,
  CheckCircle2,
  Download,
  ShieldCheck,
  AlertCircle,
  X,
  Plus,
} from "lucide-react";
import { APP_VERSION } from "@/components/LegalDocs";
import { BetaFeatures } from "@/components/BetaFeatures";
import { VerifiedTick } from "@/components/VerifiedTick";
import { isStaffUser } from "@/lib/user-style";
import { GlossyAvatar, AvatarFrameOverlay } from "@/components/GlossyAvatar";
import { BronzeCorniceAvatar, BronzeCorniceUpper } from "@/components/BronzeCornice";
import { TextureButton } from "@/components/ui/texture-button";
import { ShinyButton } from "@/components/ui/shiny-button";
import {
  GlossyUserProfileIcon,
  GlossyKeyAccessIcon,
  GlossyBellDotIcon,
  GlossyCloudMoonIcon,
  GlossyDoorLockIcon,
  GlossyPhoneKeyIcon,
} from "@/components/profile/GlossyHostedIcon";
import { toast } from "sonner";
import type { QBUser } from "@/lib/auth-context";
import {
  useEquippedFrame,
  setEquippedFrame,
  type AvatarFrameId,
  CHARACTER_1_GLTF,
  CHARACTER_2_GLTF,
} from "@/lib/avatar";
import { HtmlSpinner } from "@/components/ui/HtmlLoadingScreen";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";

// ── Reusable Orange Toggle Switch ───────────────────────────────────────────
export function OrangeToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`press relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-[#fa4616]" : "bg-[#e2e8f0] dark:bg-neutral-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Reusable SettingsCard matching Settings Menu Style ─────────────────────
export function SettingsCard({
  Icon,
  title,
  iconColor,
  right,
  content,
  status,
  statusColor = "#16a34a",
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>;
  title: string;
  iconColor?: string;
  right?: React.ReactNode;
  content?: React.ReactNode;
  status?: string;
  statusColor?: string;
  onClick?: () => void;
}) {
  return (
    <div className="qb-squircle flex flex-col p-4 transition-all">
      <div
        className={`flex items-center justify-between ${onClick ? "cursor-pointer press" : ""}`}
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

      {content && <div className="mt-3 mb-1">{content}</div>}

      {status && (
        <>
          <div className="mt-3 mb-2.5 h-px w-full bg-black/8 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
            <span className="text-[12.5px] font-semibold text-foreground">{status}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function SettingsSwitch({
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

// ── NICKNAME STYLE FULL PAGE VIEW ───────────────────────────────────────────
export function NicknameStyleView({
  user,
  name,
  selectedStyle = "default",
  onSelectStyle,
  onSave,
  saving = false,
  onBack,
}: {
  user: QBUser | null;
  name?: string;
  selectedStyle?: string;
  onSelectStyle: (style: string) => void;
  onSave?: () => void;
  saving?: boolean;
  onBack: () => void;
}) {
  const [activePreview, setActivePreview] = useState<"default" | "orange" | "rainbow">(
    selectedStyle === "orange" || selectedStyle === "rainbow"
      ? (selectedStyle as "orange" | "rainbow")
      : "default",
  );
  const [animKey, setAnimKey] = useState(0);

  const displayName = name || user?.displayName || user?.username || "Player";
  const isStaff = isStaffUser(user) || Boolean((user as any)?.staff);
  const isUserVerified = Boolean(
    (user as any)?.verified === true ||
    (user as any)?.isVerified === true ||
    isStaff
  );

  const handleChooseStyle = (style: "default" | "orange" | "rainbow") => {
    setActivePreview(style);
    setAnimKey((prev) => prev + 1);

    if (style !== "default" && !isStaff) {
      toast.error(`${style.charAt(0).toUpperCase() + style.slice(1)} nickname style is locked`, {
        description: "Only staff members can unlock and switch nickname styles.",
      });
      return;
    }

    onSelectStyle(style);
    if (user?.uid) {
      setDoc(
        doc(db, "users", user.uid),
        { nameGradient: style, nameStyle: style, useGradientName: style !== "default" },
        { merge: true },
      ).catch(() => {});
    }
    toast.success(`${style.charAt(0).toUpperCase() + style.slice(1)} nickname style active`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0d11] pb-24 text-slate-900 dark:text-white">
      <SubScreenHeader title="Nickname Style" onBack={onBack} />

      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Preview Card */}
        <div>
          <label className="text-[12px] font-extrabold text-[#17191d] dark:text-slate-300 mb-1.5 block">
            Preview
          </label>
          <div className="qb-play-card p-4 rounded-[20px] bg-white dark:bg-[#15171c] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-4">
            <BronzeCorniceAvatar size={56}>
              <GlossyAvatar
                snapshot={user?.avatarSnapshot}
                photoUrl={user?.profilePhoto}
                imageFallbackOnly={true}
                height={56}
                className="h-full w-full object-cover"
                autoRotate={false}
              />
            </BronzeCorniceAvatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {activePreview === "default" ? (
                  // Default has NO blur/fadeout effect
                  <span className="text-[#17191d] dark:text-white font-extrabold text-[16px] tracking-tight">
                    {displayName}
                  </span>
                ) : (
                  // ONLY coloured nicknames have the login and signup blur and fadeout animation
                  <motion.span
                    key={`${activePreview}-${animKey}`}
                    initial={{ opacity: 0, filter: "blur(12px)", y: 6 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className={`inline-block font-black text-[16px] tracking-tight ${
                      activePreview === "orange"
                        ? "bg-gradient-to-r from-[#fa4616] via-[#ff7a00] to-[#fa4616] bg-clip-text text-transparent"
                        : "bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 via-sky-400 to-purple-500 bg-clip-text text-transparent"
                    }`}
                  >
                    {displayName}
                  </motion.span>
                )}
                {isUserVerified && <VerifiedTick className="h-4 w-4 shrink-0 text-sky-500" />}
              </div>
              <div className="mt-1 text-[13px] font-medium text-[#697383] dark:text-slate-400 italic">
                {isStaff ? "Staff special rank preview" : "Standard player preview"}
              </div>
            </div>
          </div>
        </div>

        {/* Styles Selection List */}
        <div>
          <label className="text-[12px] font-extrabold text-[#17191d] dark:text-slate-300 mb-2 block">
            Choose Style
          </label>

          <div className="space-y-2.5">
            {/* 1. Default Style */}
            <button
              type="button"
              onClick={() => handleChooseStyle("default")}
              className={`press w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activePreview === "default"
                  ? "bg-white dark:bg-[#15171c] border-[#fa4616] ring-2 ring-[#fa4616]/20 shadow-sm"
                  : "bg-[#f8fafc] dark:bg-[#121418] border-black/[0.08] dark:border-white/[0.08] hover:bg-neutral-100 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-[#17191d] dark:text-white">
                    Default
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Unlocked
                  </span>
                </div>
                <div className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
                  {displayName}
                </div>
              </div>

              {activePreview === "default" && (
                <div className="h-6 w-6 rounded-full bg-[#fa4616] text-white flex items-center justify-center text-[12px] font-bold shadow-xs">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            {/* 2. Orange Style */}
            <button
              type="button"
              onClick={() => handleChooseStyle("orange")}
              className={`press w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activePreview === "orange"
                  ? "bg-white dark:bg-[#15171c] border-[#fa4616] ring-2 ring-[#fa4616]/20 shadow-sm"
                  : "bg-[#f8fafc] dark:bg-[#121418] border-black/[0.08] dark:border-white/[0.08] hover:bg-neutral-100 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-[#fa4616]">Orange</span>
                  {isStaff ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Staff Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-200 dark:bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" /> Locked
                    </span>
                  )}
                </div>
                <div className="text-[13px] font-black bg-gradient-to-r from-[#fa4616] to-[#ff7a00] bg-clip-text text-transparent">
                  {displayName}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activePreview === "orange" ? (
                  <div className="h-6 w-6 rounded-full bg-[#fa4616] text-white flex items-center justify-center text-[12px] font-bold shadow-xs">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                ) : !isStaff ? (
                  <Lock className="h-4 w-4 text-neutral-400" />
                ) : null}
              </div>
            </button>

            {/* 3. Rainbow Style */}
            <button
              type="button"
              onClick={() => handleChooseStyle("rainbow")}
              className={`press w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activePreview === "rainbow"
                  ? "bg-white dark:bg-[#15171c] border-purple-500 ring-2 ring-purple-500/20 shadow-sm"
                  : "bg-[#f8fafc] dark:bg-[#121418] border-black/[0.08] dark:border-white/[0.08] hover:bg-neutral-100 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-purple-600 dark:text-purple-400">
                    Rainbow
                  </span>
                  {isStaff ? (
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Staff Unlocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-200 dark:bg-white/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5" /> Locked
                    </span>
                  )}
                </div>
                <div className="text-[13px] font-black bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 via-sky-400 to-purple-500 bg-clip-text text-transparent">
                  {displayName}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activePreview === "rainbow" ? (
                  <div className="h-6 w-6 rounded-full bg-[#fa4616] text-white flex items-center justify-center text-[12px] font-bold shadow-xs">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                ) : !isStaff ? (
                  <Lock className="h-4 w-4 text-neutral-400" />
                ) : null}
              </div>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <ShinyButton
            type="button"
            onClick={async () => {
              if (onSave) {
                await onSave();
              }
              onBack();
            }}
            disabled={saving}
            loading={saving}
            variant="orange"
            className="w-full h-12 text-[14px]"
          >
            <Check className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Save Changes</span>
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}

// ── Screen Header ───────────────────────────────────────────────────────────
export function SubScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3 border-b border-black/[0.04] dark:border-white/[0.05] bg-[#f8f9fa] dark:bg-[#0c0d11]">
      <button
        type="button"
        onClick={onBack}
        className="press flex items-center gap-1 px-3 py-1.5 rounded-[12px] bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] text-foreground shadow-sm text-[13px] font-bold cursor-pointer"
        aria-label="Go Back"
      >
        <ChevronLeft className="h-4 w-4 text-foreground" />
        <span>Go Back</span>
      </button>
      <h1 className="text-[17.5px] font-extrabold text-[#17191d] dark:text-white tracking-tight">
        {title}
      </h1>
    </header>
  );
}

// ── SCREEN 2: Edit Profile ──────────────────────────────────────────────────
export function EditProfileView({
  user,
  nameDraft,
  setNameDraft,
  bioDraft,
  setBioDraft,
  nameStyleDraft = "gradient",
  setNameStyleDraft,
  characterDraft = "char1",
  setCharacterDraft,
  onSave,
  saving,
  onOpenAvatarEdit,
  onBack,
}: {
  user: QBUser | null;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  bioDraft: string;
  setBioDraft: (v: string) => void;
  nameStyleDraft?: string;
  setNameStyleDraft?: (v: string) => void;
  characterDraft?: "char1" | "char2";
  setCharacterDraft?: (v: "char1" | "char2") => void;
  onSave: () => void;
  saving: boolean;
  onOpenAvatarEdit: () => void;
  onOpenNicknameStyle?: () => void;
  onBack: () => void;
}) {
  const [usernameDraft, setUsernameDraft] = useState(user?.username || "h3");
  const [localNameStyle, setLocalNameStyle] = useState<string>(
    nameStyleDraft || (user?.useGradientName === false ? "default" : "default"),
  );
  const [nicknameStyle, setNicknameStyle] = useState<"default" | "orange" | "rainbow">(
    nameStyleDraft === "orange" || nameStyleDraft === "rainbow"
      ? (nameStyleDraft as "orange" | "rainbow")
      : "default",
  );
  const [isFullPageNickname, setIsFullPageNickname] = useState(false);

  const [showStaffModal, setShowStaffModal] = useState(false);

  const handleSelectStyle = (style: "default" | "orange" | "rainbow") => {
    if (style === "orange") {
      toast.error("Orange nickname style is locked", {
        description: "Special event reward required to unlock this style.",
      });
      return;
    }
    if (style === "rainbow") {
      toast.error("Rainbow nickname style is locked", {
        description: "Elite server rank required to unlock this style.",
      });
      return;
    }
    setNicknameStyle("default");
    setLocalNameStyle("default");
    setNameStyleDraft?.("default");
    toast.success("Default nickname style active");
  };

  if (isFullPageNickname) {
    return (
      <NicknameStyleView
        user={user}
        name={nameDraft}
        selectedStyle={nicknameStyle}
        onSelectStyle={(s) => {
          setNicknameStyle(s as "default" | "orange" | "rainbow");
          setNameStyleDraft?.(s);
        }}
        onSave={onSave}
        saving={saving}
        onBack={() => setIsFullPageNickname(false)}
      />
    );
  }

  return (
    <div className="min-h-full bg-white pb-24">
      <SubScreenHeader title="Edit Profile" onBack={onBack} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Top Identity Card */}
        <div className="qb-play-card p-3.5 flex items-center gap-4">
          <div className="relative">
            <BronzeCorniceAvatar size={54} onClick={onOpenAvatarEdit} title="Edit Avatar">
              <GlossyAvatar
                snapshot={user?.avatarSnapshot}
                photoUrl={user?.profilePhoto}
                imageFallbackOnly={true}
                height={54}
                className="h-full w-full object-cover"
                autoRotate={false}
              />
            </BronzeCorniceAvatar>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-slate-900 border border-white grid place-items-center text-white shadow-sm z-30 pointer-events-none">
              <Camera className="h-2.5 w-2.5" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-extrabold text-[15.5px] ${
                  nicknameStyle === "orange"
                    ? "bg-gradient-to-r from-[#fa4616] to-[#ff7a00] bg-clip-text text-transparent font-black"
                    : nicknameStyle === "rainbow"
                    ? "bg-gradient-to-r from-red-500 via-amber-400 via-emerald-400 via-sky-400 to-purple-500 bg-clip-text text-transparent font-black"
                    : "text-[#17191d]"
                }`}
              >
                {nameDraft || user?.displayName || "Player"}
              </span>
              {(Boolean((user as any)?.verified === true || (user as any)?.isVerified === true || isStaffUser(user) || (user as any)?.staff)) && (
                <VerifiedTick className="h-4 w-4 shrink-0 text-sky-500" />
              )}
            </div>
            <div className="mt-0.5 truncate text-[11.5px] font-medium text-[#697383]">
              {bioDraft || user?.bio || "No bio added yet"}
            </div>
          </div>
        </div>

        {/* Form Fields: Nickname, Bio, Nickname Style */}
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-extrabold text-[#17191d] mb-1.5 block">
              Nickname
            </label>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={24}
              className="w-full h-11 rounded-[14px] bg-[#f8fafc] border border-black/[0.08] px-3.5 text-[14px] font-semibold text-[#17191d] outline-none focus:border-[#fa4616] transition-colors"
              placeholder="Enter your nickname"
            />
          </div>

          <div>
            <label className="text-[12px] font-extrabold text-[#17191d] mb-1.5 block">Bio</label>
            <textarea
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              maxLength={180}
              rows={3}
              className="w-full rounded-[14px] bg-[#f8fafc] border border-black/[0.08] p-3 text-[14px] font-medium text-[#17191d] outline-none resize-none focus:border-[#fa4616] transition-colors leading-relaxed"
              placeholder="Write something about yourself..."
            />
          </div>

          {/* Nickname Style Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-extrabold text-[#17191d]">
                Nickname Style
              </label>
              <span className="text-[11px] font-bold text-[#fa4616] capitalize">
                {nicknameStyle}
              </span>
            </div>

            {/* Main Button saying "Nickname Style" */}
            <button
              type="button"
              onClick={() => {
                if (onOpenNicknameStyle) {
                  onOpenNicknameStyle();
                } else {
                  setIsFullPageNickname(true);
                }
              }}
              className="press w-full h-12 rounded-[14px] bg-[#f8fafc] border border-black/[0.08] px-3.5 flex items-center justify-between text-[14px] font-semibold text-[#17191d] hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-[#fa4616]" />
                <span className="text-[14px] font-bold text-[#17191d]">Nickname Style</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#697383] capitalize">
                  {nicknameStyle}
                </span>
                <ChevronRight className="h-4 w-4 text-[#9ca3af]" />
              </div>
            </button>
          </div>
        </div>

        {/* Glossy Save Button */}
        <div className="pt-2">
          <ShinyButton
            type="button"
            onClick={onSave}
            disabled={saving}
            loading={saving}
            variant="orange"
            className="w-full h-12 text-[14px]"
          >
            <Check className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Save Changes</span>
          </ShinyButton>
        </div>
      </div>

      {showStaffModal && (
        <div className="redeem-code-shell fixed inset-0 z-[260] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[340px] rounded-[24px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
              <Shield className="h-7 w-7 stroke-[2]" />
            </div>
            <h3 className="mt-3 text-[19px] font-black text-[#17181b]">Staff Only!</h3>
            <p className="mt-1 text-[12px] text-[#737982]">
              You need to be staff to use the{" "}
              <span className="font-mono font-bold text-red-500">gradient</span> name style.
            </p>
            <div className="mt-5">
              <ShinyButton
                type="button"
                variant="orange"
                onClick={() => setShowStaffModal(false)}
                className="w-full h-11 text-[13px]"
              >
                Okay
              </ShinyButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SCREEN 14: Edit Avatar ──────────────────────────────────────────────────
export function EditAvatarView({
  user,
  onSave,
  onOpenFrames,
  onBack,
}: {
  user: QBUser | null;
  onSave: (photoUrl: string, frameId?: AvatarFrameId) => void;
  onOpenFrames?: () => void;
  onBack: () => void;
}) {
  const DEFAULT_PFP =
    "https://cdn.discordapp.com/attachments/1555854715580063797/1566413705762316440/IMG_7887.png?ex=6ae873f2&is=6ae72272&hm=985d38e8e4464e24dc2d2d402483d031942a8bbd7a5c68678e5056996545c78a&";
  const historyKey = `qb_pfp_history_${user?.uid || "guest"}`;

  const [pfpHistory, setPfpHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
      }
    } catch {}
    const initial = user?.profilePhoto && user.profilePhoto.trim() ? [user.profilePhoto] : [DEFAULT_PFP];
    try {
      localStorage.setItem(historyKey, JSON.stringify(initial));
    } catch {}
    return initial;
  });

  const [currentPhoto, setCurrentPhoto] = useState<string>(
    user?.profilePhoto || (pfpHistory[0] ? pfpHistory[0] : DEFAULT_PFP),
  );
  const equippedFrame = useEquippedFrame();
  const [selectedFrame, setSelectedFrame] = useState<AvatarFrameId>(
    (user?.avatarSnapshot?.frameId as AvatarFrameId) || equippedFrame || "none",
  );
  const [saving, setSaving] = useState(false);

  const addPhotoToHistory = (photo: string) => {
    if (!photo) return;
    setPfpHistory((prev) => {
      const filtered = prev.filter((p) => p !== photo);
      const next = [photo, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(historyKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result;
      if (typeof res === "string") {
        setCurrentPhoto(res);
        addPhotoToHistory(res);
        toast.success("Avatar image loaded");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      setEquippedFrame(selectedFrame);
      addPhotoToHistory(currentPhoto);
      if (user?.uid) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            profilePhoto: currentPhoto,
            frameId: selectedFrame,
            equippedFrame: selectedFrame,
            avatarSnapshot: {
              ...(user.avatarSnapshot || {}),
              frameId: selectedFrame,
            },
          },
          { merge: true },
        );
      }
      onSave(currentPhoto, selectedFrame);
      toast.success("Avatar & frame saved!");
      onBack();
    } catch {
      toast.error("Could not save avatar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24 transition-colors duration-200">
      <SubScreenHeader title="Edit Avatar" onBack={onBack} />

      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Large Avatar Centerpiece with Bronze Cornice crowning PFP */}
        <div className="flex flex-col items-center pt-3">
          <div className="relative flex items-center justify-center">
            {/* Inner Avatar PFP with Bronze Cornice */}
            <BronzeCorniceAvatar size={118} onClick={onBack}>
              {currentPhoto ? (
                <img src={currentPhoto} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <GlossyAvatar
                  snapshot={user?.avatarSnapshot}
                  imageFallbackOnly={true}
                  height={118}
                  className="h-full w-full object-cover"
                  autoRotate={false}
                />
              )}
            </BronzeCorniceAvatar>

            {/* Frame overlay placed OVER the PFP */}
            <AvatarFrameOverlay frame={selectedFrame} className="scale-[1.18]" />

            {/* Camera badge */}
            <label className="absolute -bottom-1 -right-1 z-30 h-8 w-8 rounded-[11px] bg-slate-900 border border-white/80 grid place-items-center text-white shadow-md cursor-pointer press">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="mt-3 text-center">
            <div className="text-[14.5px] font-extrabold text-[#17191d] dark:text-white">
              {user?.displayName || user?.username || "Player"}
            </div>
            <div className="text-[11.5px] font-medium text-[#7d8590] dark:text-[#8e95a0]">
              Profile Picture
            </div>
          </div>
        </div>

        {/* Tab 1: Saved History PFPs & Add Button */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[12px] font-bold text-[#697383] dark:text-slate-400">
                Avatar History (First 5 Saved)
              </span>
              <label className="press text-[11.5px] font-bold text-[#fa4616] cursor-pointer flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Upload Custom
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {pfpHistory.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setCurrentPhoto(src)}
                  className={`press relative rounded-[16px] overflow-hidden aspect-square border-2 transition-all p-1 bg-white dark:bg-[#15171c] ${
                    currentPhoto === src
                      ? "border-[#fa4616] ring-2 ring-[#fa4616]/30 shadow-sm"
                      : "border-black/[0.06] dark:border-white/[0.08]"
                  }`}
                >
                  <img
                    src={src}
                    alt={`PFP ${i + 1}`}
                    className="h-full w-full object-cover rounded-[12px]"
                  />
                  {i === 0 && (
                    <span className="absolute bottom-1 inset-x-1 text-[8px] font-extrabold uppercase text-center bg-black/60 text-white rounded-md py-0.5 backdrop-blur-xs">
                      Saved
                    </span>
                  )}
                </button>
              ))}

              {pfpHistory.length < 5 && (
                <label
                  className="press relative rounded-[16px] overflow-hidden aspect-square border-2 border-dashed border-black/20 dark:border-white/20 flex flex-col items-center justify-center text-center p-2 cursor-pointer hover:border-[#fa4616] transition-colors bg-black/[0.03] dark:bg-white/[0.03]"
                  title="Add new avatar picture"
                >
                  <Plus className="h-6 w-6 text-[#fa4616] mb-0.5" />
                  <span className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-400">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <ShinyButton
            type="button"
            disabled={saving}
            loading={saving}
            variant="orange"
            onClick={handleSaveAll}
            className="w-full h-12 text-[14px]"
          >
            <Check className="h-4 w-4 text-white" />
            <span>Save Image</span>
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}

// ── FRAMES VIEW ─────────────────────────────────────────────────────────────
export const FRAME_LIST: Array<{
  id: AvatarFrameId;
  name: string;
  tag: string;
  description: string;
  color: string;
}> = [
  {
    id: "none",
    name: "Default",
    tag: "Standard",
    description: "Clean profile avatar with no border overlay",
    color: "#9ca3af",
  },
  {
    id: "qblock-beta",
    name: "QBlock Beta",
    tag: "Exclusive",
    description: "Official QBlock Beta avatar frame",
    color: "#fa4616",
  },
  {
    id: "star-program",
    name: "Star Program",
    tag: "Exclusive",
    description: "Official gold star creator frame",
    color: "#f59e0b",
  },
  {
    id: "blue-gold",
    name: "Blue Gold",
    tag: "Prestige",
    description: "Royal sapphire and gilded crown border",
    color: "#3b82f6",
  },
  {
    id: "staff",
    name: "Staff Special",
    tag: "Official",
    description: "QBlock staff member badge & crest",
    color: "#8b5cf6",
  },
  {
    id: "early-beta",
    name: "Early Beta",
    tag: "Classic",
    description: "Pioneer badge for early QBlock testers",
    color: "#06b6d4",
  },
  {
    id: "gold-treasure",
    name: "Gold Treasure",
    tag: "Legendary",
    description: "Gleaming vault treasure rim and glow",
    color: "#eab308",
  },
  {
    id: "emerald",
    name: "Emerald",
    tag: "Rare",
    description: "Radiant emerald crystal border",
    color: "#10b981",
  },
  {
    id: "ice",
    name: "Ice Glaze",
    tag: "Frost",
    description: "Frosted glacier shimmer border",
    color: "#38bdf8",
  },
  {
    id: "halloween",
    name: "Halloween Spooky",
    tag: "Holiday",
    description: "Carved jack-o'-lantern flame frame",
    color: "#f97316",
  },
  {
    id: "witch-rose",
    name: "Witch Rose",
    tag: "Mythic",
    description: "Mystic floral crimson essence",
    color: "#f43f5e",
  },
  {
    id: "neon-cyber",
    name: "Neon Cyber",
    tag: "Futuristic",
    description: "Cyberpunk neon glow border",
    color: "#00f0ff",
  },
];

export function FramesView({ user, onBack }: { user: QBUser | null; onBack: () => void }) {
  const equippedFrame = useEquippedFrame();
  const [selectedFrame, setSelectedFrame] = useState<AvatarFrameId>(
    (user?.avatarSnapshot?.frameId as AvatarFrameId) || equippedFrame || "none",
  );
  const [equipping, setEquipping] = useState(false);

  async function handleEquip(frameId: AvatarFrameId) {
    setEquipping(true);
    try {
      setEquippedFrame(frameId);
      setSelectedFrame(frameId);
      if (user?.uid) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            frameId,
            equippedFrame: frameId,
            avatarSnapshot: {
              ...(user.avatarSnapshot || {}),
              frameId,
            },
          },
          { merge: true },
        );
      }
      toast.success("Frame equipped successfully!");
    } catch {
      toast.error("Could not equip frame. Try again.");
    } finally {
      setEquipping(false);
    }
  }

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24 transition-colors duration-200">
      <SubScreenHeader title="Frames" onBack={onBack} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Active Frame Live Showcase */}
        <div className="rounded-[20px] bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] p-4 flex items-center gap-4 shadow-sm">
          <div className="relative h-[72px] w-[72px] shrink-0 flex items-center justify-center">
            <div className="h-[60px] w-[60px] rounded-[16px] overflow-hidden bg-slate-900 border border-black/10 dark:border-white/10">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <GlossyAvatar
                  snapshot={user?.avatarSnapshot}
                  height={60}
                  className="h-full w-full object-cover"
                  autoRotate={false}
                />
              )}
            </div>
            <AvatarFrameOverlay frame={selectedFrame} className="scale-[1.18]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#fa4616]">
              Active Frame
            </div>
            <div className="text-[16px] font-black text-[#17191d] dark:text-white tracking-tight truncate">
              {FRAME_LIST.find((f) => f.id === selectedFrame)?.name || "Default"}
            </div>
            <div className="text-[12px] font-medium text-[#7d8590] dark:text-[#8e95a0] truncate mt-0.5">
              {selectedFrame === "none"
                ? "No frame equipped"
                : "Currently previewed on your avatar"}
            </div>
          </div>
        </div>

        {/* Frame Selection Grid - EXACT SAME UI AS PFPS! */}
        <div className="space-y-2.5">
          <div className="px-1 text-[12.5px] font-bold text-[#7d8590] dark:text-[#8e95a0]">
            Available Frames ({FRAME_LIST.length})
          </div>

          <div className="grid grid-cols-3 gap-3">
            {FRAME_LIST.map((f) => {
              const isSelected = selectedFrame === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setSelectedFrame(f.id);
                    handleEquip(f.id);
                  }}
                  className={`press relative rounded-2xl p-2.5 aspect-square flex flex-col items-center justify-between border-2 transition-all bg-white dark:bg-[#15171c] ${
                    isSelected
                      ? "border-[#fa4616] ring-2 ring-[#fa4616]/30 shadow-sm bg-orange-500/[0.03]"
                      : "border-black/[0.06] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20"
                  }`}
                >
                  <div className="relative h-[66px] w-[66px] my-auto flex items-center justify-center">
                    <div className="h-[54px] w-[54px] rounded-[14px] overflow-hidden bg-slate-900 border border-black/10 dark:border-white/10">
                      {user?.profilePhoto ? (
                        <img
                          src={user.profilePhoto}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <GlossyAvatar
                          snapshot={user?.avatarSnapshot}
                          height={54}
                          className="h-full w-full object-cover"
                          autoRotate={false}
                        />
                      )}
                    </div>
                    <AvatarFrameOverlay frame={f.id} className="scale-[1.18]" />
                  </div>

                  <div className="w-full text-center">
                    <div className="text-[12px] font-extrabold text-[#17191d] dark:text-white truncate">
                      {f.name}
                    </div>
                    <div className="text-[10px] font-bold text-[#7d8590] dark:text-[#8e95a0] truncate">
                      {f.tag}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Avatar Frame Save Button */}
        <div className="pt-2">
          <ShinyButton
            type="button"
            variant="orange"
            loading={equipping}
            onClick={() => handleEquip(selectedFrame)}
            className="w-full h-12 text-[14px]"
          >
            <Sparkles className="h-4 w-4 text-white" />
            <span>Save Avatar Frame</span>
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 15: About Application ──────────────────────
export function AboutAppView({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24 transition-colors duration-200">
      <SubScreenHeader title="About application" onBack={onBack} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Application Details */}
        <div>
          <span className="text-[12px] font-bold text-[#7d8590] dark:text-[#8e95a0] block px-1 mb-2">
            Application Details
          </span>
          <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 px-4 text-[13.5px]">
              <span className="font-semibold text-[#7d8590] dark:text-[#8e95a0]">Version</span>
              <span className="font-bold text-[#17191d] dark:text-white font-mono text-[13px]">
                2.0
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 px-4 text-[13.5px]">
              <span className="font-semibold text-[#7d8590] dark:text-[#8e95a0]">Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                Up to date
              </span>
            </div>
          </div>
        </div>

        {/* Legal & Privacy */}
        <div>
          <span className="text-[12px] font-bold text-[#7d8590] dark:text-[#8e95a0] block px-1 mb-2">
            Legal & Privacy
          </span>
          <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
            <button
              type="button"
              onClick={() => toast.info("Terms of Service is up to date.")}
              className="press w-full flex items-center justify-between p-3.5 px-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              <span className="text-[14px] font-semibold text-[#17191d] dark:text-white">
                Terms of Service
              </span>
              <ChevronRight className="h-4 w-4 text-[#a0a5af]" />
            </button>
            <button
              type="button"
              onClick={() => toast.info("Privacy Policy is up to date.")}
              className="press w-full flex items-center justify-between p-3.5 px-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              <span className="text-[14px] font-semibold text-[#17191d] dark:text-white">
                Privacy Policy
              </span>
              <ChevronRight className="h-4 w-4 text-[#a0a5af]" />
            </button>
          </div>
        </div>

        {/* Play Bedwars style check updates button - white and smaller, flat glossy squircle */}
        <button
          type="button"
          onClick={() => toast.success("You are running the latest version.")}
          className="relative w-full h-10 px-4 rounded-[14px] bg-gradient-to-b from-white via-[#fcfcfd] to-[#f4f5f7] dark:from-[#242730] dark:via-[#1c1f26] dark:to-[#16181d] text-[#17191d] dark:text-white text-[12.5px] font-black tracking-tight select-none overflow-hidden transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[13px] before:bg-gradient-to-b before:from-white/50 dark:before:from-white/10 before:to-transparent before:pointer-events-none shadow-sm"
        >
          <span className="relative z-10">Check for updates</span>
        </button>

        <p className="text-center text-[11.5px] text-[#7d8590] dark:text-[#8e95a0] pt-4">
          © 2026. All rights reserved.
        </p>
      </div>
    </div>
  );
}

// ── SCREEN 16: Deactivate Account ──────────────────────
export function DeactivateAccountView({
  user,
  onSignOut,
  onDeactivate,
  onBack,
}: {
  user: QBUser | null;
  onSignOut: () => void;
  onDeactivate: () => void;
  onBack: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24 transition-colors duration-200">
      <SubScreenHeader title="Deactivate account" onBack={onBack} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Warning Notice Card - No icon */}
        <div className="rounded-[20px] bg-red-500/[0.06] dark:bg-red-500/[0.1] border border-red-500/20 p-4.5 space-y-3">
          <div>
            <h3 className="text-[15.5px] font-extrabold text-red-600 dark:text-red-400">
              Deactivating your account
            </h3>
            <p className="text-[11.5px] font-medium text-red-600/80 dark:text-red-400/80 mt-0.5">
              @{user?.username || user?.displayName || "player"}
            </p>
          </div>

          <p className="text-[13px] text-red-900/80 dark:text-red-200/80 leading-relaxed">
            Deactivation is temporary. Your public presence and username will be hidden, but your
            data will remain saved if you choose to return.
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2 text-[12.5px] text-red-900/80 dark:text-red-200/80">
              <span className="font-bold">•</span>
              <span>Your profile, creations, and avatar will be hidden from other players.</span>
            </div>
            <div className="flex items-start gap-2 text-[12.5px] text-red-900/80 dark:text-red-200/80">
              <span className="font-bold">•</span>
              <span>You will be immediately logged out of all active sessions.</span>
            </div>
            <div className="flex items-start gap-2 text-[12.5px] text-red-900/80 dark:text-red-200/80">
              <span className="font-bold">•</span>
              <span>Reactivate at any time simply by signing in again with your email.</span>
            </div>
          </div>
        </div>

        {/* Action Options - Matching login/signup button design language */}
        <div className="space-y-2.5 pt-2">
          {/* Safe action: Sign Out */}
          <ShinyButton
            type="button"
            variant="white"
            onClick={onSignOut}
            className="w-full h-11 text-[13.5px]"
          >
            <img src="/icons/login-3-svgrepo-com.svg" alt="" className="h-4 w-4 dark:invert mr-1.5" />
            <span>Sign Out Instead</span>
          </ShinyButton>

          {/* Danger action: Deactivate */}
          {!confirming ? (
            <ShinyButton
              type="button"
              variant="white"
              onClick={() => setConfirming(true)}
              className="w-full h-11 text-[13.5px] text-red-600 dark:text-red-400 hover:text-red-700"
            >
              <span>Continue to Deactivate</span>
            </ShinyButton>
          ) : (
            <div className="space-y-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
              <p className="text-[12px] font-bold text-center text-red-600 dark:text-red-400">
                Are you sure you want to deactivate now?
              </p>
              <ShinyButton
                type="button"
                variant="orange"
                onClick={onDeactivate}
                className="w-full h-11 text-[13.5px] bg-red-600 hover:bg-red-700"
              >
                <span>Confirm Account Deactivation</span>
              </ShinyButton>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="press w-full py-2 text-[12.5px] font-bold text-[#7d8590] dark:text-[#8e95a0] text-center cursor-pointer"
              >
                Never mind, keep account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 3: Change Password ───────────────────────────────────────────────
export function ChangePasswordView({
  userEmail,
  onSendReset,
  onBack,
}: {
  userEmail?: string;
  onSendReset: () => Promise<void>;
  onBack: () => void;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPw) {
      setErrorMsg("Please enter your current password.");
      return;
    }
    if (!newPw) {
      setErrorMsg("Please enter a new password.");
      return;
    }
    if (newPw.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setErrorMsg("Passwords do not match. Please verify.");
      return;
    }
    if (newPw === currentPw) {
      setErrorMsg("New password must be different from current password.");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    try {
      const user = auth.currentUser;
      const email = userEmail || user?.email;
      if (!user || !email) {
        throw new Error("Unable to identify current account. Please sign in again.");
      }
      const cred = EmailAuthProvider.credential(email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      toast.success("Password updated successfully!");
      onBack();
    } catch (err: unknown) {
      console.error("[ChangePassword] Error:", err);
      const code = (err as { code?: string })?.code || "";
      if (
        code.includes("wrong-password") ||
        code.includes("invalid-credential") ||
        code.includes("invalid-password")
      ) {
        setErrorMsg("Incorrect current password. Please try again.");
      } else if (code.includes("weak-password")) {
        setErrorMsg("Password is too weak. Please use at least 6 characters.");
      } else {
        setErrorMsg((err as Error).message || "Failed to update password. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetLink = async () => {
    setSendingReset(true);
    try {
      await onSendReset();
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24 transition-colors duration-200">
      <SubScreenHeader title="Change password" onBack={onBack} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm p-4 space-y-3.5">
            <div>
              <label className="text-[12px] font-bold text-[#7d8590] dark:text-[#8e95a0] mb-1.5 block">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => {
                    setCurrentPw(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter current password"
                  className="w-full h-11 rounded-[14px] bg-slate-100 dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] px-3.5 pr-10 text-[14px] font-medium text-[#17191d] dark:text-white outline-none focus:border-[#fa4616] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#7d8590] dark:text-[#8e95a0] mb-1.5 block">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => {
                    setNewPw(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="At least 6 characters"
                  className="w-full h-11 rounded-[14px] bg-slate-100 dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] px-3.5 pr-10 text-[14px] font-medium text-[#17191d] dark:text-white outline-none focus:border-[#fa4616] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground cursor-pointer"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-bold text-[#7d8590] dark:text-[#8e95a0] mb-1.5 block">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => {
                    setConfirmPw(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Re-enter new password"
                  className="w-full h-11 rounded-[14px] bg-slate-100 dark:bg-[#121316] border border-black/[0.08] dark:border-white/[0.08] px-3.5 pr-10 text-[14px] font-medium text-[#17191d] dark:text-white outline-none focus:border-[#fa4616] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[12.5px] font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <ShinyButton
            type="submit"
            onClick={handleUpdate}
            disabled={loading || !currentPw || !newPw || !confirmPw}
            className="w-full h-11 text-[13.5px]"
          >
            {loading ? "Updating..." : "Update Password"}
          </ShinyButton>
        </form>

        {/* Reset via email alternative */}
        <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[13.5px] font-bold text-[#17191d] dark:text-white block">
              Forgot current password?
            </span>
            <span className="text-[11.5px] font-medium text-[#7d8590] dark:text-[#8e95a0] block mt-0.5 truncate">
              Send reset link to {userEmail || "your email"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSendResetLink}
            disabled={sendingReset}
            className="press shrink-0 px-3.5 py-1.5 rounded-full bg-[#fa4616] text-white text-[11.5px] font-bold disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {sendingReset ? "Sending..." : "Send Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 4: Activity Log ──────────────────────────────────────────────────
export function ActivityLogView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"All" | "Logins" | "Profile" | "System">("All");

  const LOG_ITEMS = [
    {
      id: 1,
      type: "Logins",
      title: "Logged in",
      subtitle: "New York, US",
      time: "Apr 26, 2025 · 9:42 AM",
      svgIcon: "/icons/login-3-svgrepo-com.svg",
    },
    {
      id: 2,
      type: "Profile",
      title: "Changed profile picture",
      subtitle: "",
      time: "Apr 26, 2025 · 2:31 PM",
      svgIcon: "/icons/user-id-svgrepo-com.svg",
    },
    {
      id: 3,
      type: "Profile",
      title: "Updated bio",
      subtitle: "",
      time: "Apr 24, 2025 · 11:03 AM",
      icon: Pencil,
    },
    {
      id: 4,
      type: "Logins",
      title: "Logged in",
      subtitle: "London, UK",
      time: "Apr 20, 2025 · 8:46 PM",
      svgIcon: "/icons/login-3-svgrepo-com.svg",
    },
    {
      id: 5,
      type: "System",
      title: "Connected Discord",
      subtitle: "",
      time: "Apr 20, 2025 · 5:42 PM",
      icon: Link,
    },
    {
      id: 6,
      type: "System",
      title: "Changed password",
      subtitle: "",
      time: "Apr 18, 2025 · 3:12 PM",
      svgIcon: "/icons/key-square-svgrepo-com.svg",
    },
  ];

  const filtered = tab === "All" ? LOG_ITEMS : LOG_ITEMS.filter((item) => item.type === tab);

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24">
      <SubScreenHeader title="Activity Log" onBack={onBack} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {(["All", "Logins", "Profile", "System"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`press px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                tab === t
                  ? "bg-[#e0f2fe] dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 ring-1 ring-sky-300 dark:ring-sky-800"
                  : "bg-white dark:bg-[#15171c] text-[#697383] dark:text-slate-400 border border-black/[0.06] dark:border-white/[0.08]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List of items */}
        <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="press flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300 shrink-0">
                    {item.svgIcon ? (
                      <img src={item.svgIcon} alt="" className="h-4 w-4 dark:invert" />
                    ) : Icon ? (
                      <Icon className="h-4 w-4" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-[#17191d] dark:text-white leading-tight truncate">
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-[11.5px] font-medium text-[#697383] dark:text-slate-400">
                        {item.subtitle}
                      </div>
                    )}
                    <div className="text-[11px] font-medium text-[#9aa1ab] mt-0.5">{item.time}</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 5: Notifications ─────────────────────────────────────────────────
export function NotificationsView({ onBack }: { onBack: () => void }) {
  const [friendReq, setFriendReq] = useState(true);
  const [messages, setMessages] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(true);
  const [sound, setSound] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24">
      <SubScreenHeader title="Notifications" onBack={onBack} />

      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Main Notifications Card */}
        <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
          <div className="flex items-center justify-between p-3.5 px-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-[12px] bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300 shrink-0">
                <UserPlus className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[14px] font-bold text-[#17191d] dark:text-white block leading-tight">
                  Friend requests
                </span>
                <span className="text-[11.5px] font-medium text-[#697383] dark:text-slate-400 block mt-0.5">
                  Someone wants to add you
                </span>
              </div>
            </div>
            <OrangeToggle checked={friendReq} onChange={setFriendReq} />
          </div>

          <div className="flex items-center justify-between p-3.5 px-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-[12px] bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300 shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[14px] font-bold text-[#17191d] dark:text-white block leading-tight">
                  Messages
                </span>
                <span className="text-[11.5px] font-medium text-[#697383] dark:text-slate-400 block mt-0.5">
                  Direct messages and replies
                </span>
              </div>
            </div>
            <OrangeToggle checked={messages} onChange={setMessages} />
          </div>

          <div className="flex items-center justify-between p-3.5 px-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-[12px] bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300 shrink-0">
                <AtSign className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[14px] font-bold text-[#17191d] dark:text-white block leading-tight">
                  Mentions
                </span>
                <span className="text-[11.5px] font-medium text-[#697383] dark:text-slate-400 block mt-0.5">
                  When someone mentions you
                </span>
              </div>
            </div>
            <OrangeToggle checked={mentions} onChange={setMentions} />
          </div>

          <div className="flex items-center justify-between p-3.5 px-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-[12px] bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300 shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[14px] font-bold text-[#17191d] dark:text-white block leading-tight">
                  System updates
                </span>
                <span className="text-[11.5px] font-medium text-[#697383] dark:text-slate-400 block mt-0.5">
                  App updates and important news
                </span>
              </div>
            </div>
            <OrangeToggle checked={systemUpdates} onChange={setSystemUpdates} />
          </div>
        </div>

        {/* Sound & Vibration Section */}
        <div>
          <span className="text-[12px] font-bold text-[#697383] dark:text-slate-400 uppercase tracking-wider block px-1 mb-2">
            Sound & Vibration
          </span>
          <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-[12px] bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300 shrink-0">
                  <Volume2 className="h-4 w-4" />
                </div>
                <span className="text-[14px] font-bold text-[#17191d] dark:text-white block">
                  Sound
                </span>
              </div>
              <OrangeToggle checked={sound} onChange={setSound} />
            </div>

            <div className="flex items-center justify-between p-3.5 px-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-[12px] bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300 shrink-0">
                  <Smartphone className="h-4 w-4" />
                </div>
                <span className="text-[14px] font-bold text-[#17191d] dark:text-white block">
                  Push notifications
                </span>
              </div>
              <OrangeToggle checked={pushNotif} onChange={setPushNotif} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 6: Privacy ───────────────────────────────────────────────────────
export function PrivacyView({ onBack }: { onBack: () => void }) {
  const [visibility, setVisibility] = useState<"Everyone" | "Friends only" | "Only me">("Everyone");
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [recentActivity, setRecentActivity] = useState(true);
  const [directMessages, setDirectMessages] = useState(true);

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24">
      <SubScreenHeader title="Privacy" onBack={onBack} />

      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Visibility Section */}
        <div>
          <span className="text-[12px] font-bold text-[#697383] dark:text-slate-400 block px-1 mb-2">
            Who can see your profile
          </span>
          <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
            {(["Everyone", "Friends only", "Only me"] as const).map((opt) => {
              const selected = visibility === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setVisibility(opt)}
                  className="press w-full flex items-center justify-between p-3.5 px-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <span className="text-[14px] font-bold text-[#17191d] dark:text-white">
                    {opt}
                  </span>
                  <div
                    className={`h-5 w-5 rounded-full border-2 grid place-items-center transition-colors ${
                      selected ? "border-[#fa4616]" : "border-slate-300 dark:border-neutral-600"
                    }`}
                  >
                    {selected && <div className="h-2.5 w-2.5 rounded-full bg-[#fa4616]" />}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 px-1 text-[11px] font-medium text-[#868e96]">
            Your profile, activity and favorites will be visible according to your selection.
          </p>
        </div>

        {/* Activity & Presence Section */}
        <div>
          <span className="text-[12px] font-bold text-[#697383] dark:text-slate-400 block px-1 mb-2">
            Activity & Presence
          </span>
          <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 px-4">
              <span className="text-[14px] font-bold text-[#17191d] dark:text-white">
                Show online status
              </span>
              <OrangeToggle checked={onlineStatus} onChange={setOnlineStatus} />
            </div>
            <div className="flex items-center justify-between p-3.5 px-4">
              <span className="text-[14px] font-bold text-[#17191d] dark:text-white">
                Show recent activity
              </span>
              <OrangeToggle checked={recentActivity} onChange={setRecentActivity} />
            </div>
          </div>
        </div>

        {/* Messages Section */}
        <div>
          <span className="text-[12px] font-bold text-[#697383] dark:text-slate-400 block px-1 mb-2">
            Messages
          </span>
          <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-3.5 px-4">
              <span className="text-[14px] font-bold text-[#17191d] dark:text-white">
                Allow direct messages
              </span>
              <OrangeToggle checked={directMessages} onChange={setDirectMessages} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 7: Help & Support ────────────────────────────────────────────────
export function HelpSupportView({ onBack }: { onBack: () => void }) {
  const HELP_ITEMS = [
    {
      title: "FAQ",
      sub: "Get answers to common questions",
      icon: Search,
    },
    {
      title: "Getting Started",
      sub: "Learn how to use Sora",
      icon: BookOpen,
    },
    {
      title: "Account issues",
      sub: "Login, security, and recovery",
      icon: Lock,
    },
    {
      title: "Technical Support",
      sub: "Bug reports and troubleshooting",
      icon: Terminal,
    },
    {
      title: "Contact Us",
      sub: "Reach out to our team",
      icon: Mail,
    },
  ];

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24">
      <SubScreenHeader title="Help & Support" onBack={onBack} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
          {HELP_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                onClick={() => toast.info(`${item.title}: Support article opened`)}
                className="press flex items-center justify-between p-3.5 px-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-9 w-9 rounded-[12px] bg-slate-100 dark:bg-slate-800 grid place-items-center text-slate-700 dark:text-slate-300 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[14px] font-bold text-[#17191d] dark:text-white block leading-tight">
                      {item.title}
                    </span>
                    <span className="text-[11.5px] font-medium text-[#697383] dark:text-slate-400 block mt-0.5">
                      {item.sub}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#a0a5af] shrink-0" />
              </div>
            );
          })}
        </div>

        {/* Live Chat Button */}
        <div className="pt-2">
          <ShinyButton
            variant="orange"
            onClick={() => toast.info("Connecting to Live Chat agent...")}
            className="w-full h-11 text-[13.5px]"
          >
            <Headphones className="h-4 w-4 mr-2" />
            Live Chat
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 8: Settings ──────────────────────────────────────────────────────
export function SettingsView({
  onNavigate,
  onBack,
}: {
  onNavigate: (
    screen: "edit_profile" | "appearance" | "notifications" | "privacy" | "change_password",
  ) => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24">
      <SubScreenHeader title="Preferences" onBack={onBack} />

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {/* Account Info Card */}
        <div
          onClick={() => onNavigate("edit_profile")}
          className="qb-squircle flex flex-col p-4 cursor-pointer press"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white border border-black/[0.07] dark:bg-[#17191e] dark:border-white/[0.10]">
                <GlossyUserProfileIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-[14.5px] font-extrabold tracking-tight text-foreground">
                Profile Information
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#a0a5af]" />
          </div>
          <div className="mt-2.5 mb-1 text-[12.5px] text-text-secondary">
            Change display name, bio and customize avatar
          </div>
          <div className="mt-3 mb-2.5 h-px w-full bg-black/8 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[12.5px] font-semibold text-foreground">Configured</span>
          </div>
        </div>

        {/* Appearance Card */}
        <div
          onClick={() => onNavigate("appearance")}
          className="qb-squircle flex flex-col p-4 cursor-pointer press"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white border border-black/[0.07] dark:bg-[#17191e] dark:border-white/[0.10]">
                <GlossyCloudMoonIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-[14.5px] font-extrabold tracking-tight text-foreground">
                Appearance
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#a0a5af]" />
          </div>
          <div className="mt-2.5 mb-1 text-[12.5px] text-text-secondary">
            Light &amp; high-contrast dark aesthetic
          </div>
          <div className="mt-3 mb-2.5 h-px w-full bg-black/8 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-[12.5px] font-semibold text-foreground">Customizable</span>
          </div>
        </div>

        {/* Notifications Card */}
        <div
          onClick={() => onNavigate("notifications")}
          className="qb-squircle flex flex-col p-4 cursor-pointer press"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white border border-black/[0.07] dark:bg-[#17191e] dark:border-white/[0.10]">
                <GlossyBellDotIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-[14.5px] font-extrabold tracking-tight text-foreground">
                Notifications
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#a0a5af]" />
          </div>
          <div className="mt-2.5 mb-1 text-[12.5px] text-text-secondary">
            Push alerts, friends and server activity
          </div>
          <div className="mt-3 mb-2.5 h-px w-full bg-black/8 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[12.5px] font-semibold text-foreground">Active</span>
          </div>
        </div>

        {/* Privacy Card */}
        <div
          onClick={() => onNavigate("privacy")}
          className="qb-squircle flex flex-col p-4 cursor-pointer press"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white border border-black/[0.07] dark:bg-[#17191e] dark:border-white/[0.10]">
                <GlossyDoorLockIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-[14.5px] font-extrabold tracking-tight text-foreground">
                Privacy
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#a0a5af]" />
          </div>
          <div className="mt-2.5 mb-1 text-[12.5px] text-text-secondary">
            Manage who can send messages and view inventory
          </div>
          <div className="mt-3 mb-2.5 h-px w-full bg-black/8 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[12.5px] font-semibold text-foreground">Protected</span>
          </div>
        </div>

        {/* Security / Password Card */}
        <div
          onClick={() => onNavigate("change_password")}
          className="qb-squircle flex flex-col p-4 cursor-pointer press"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white border border-black/[0.07] dark:bg-[#17191e] dark:border-white/[0.10]">
                <GlossyKeyAccessIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-[14.5px] font-extrabold tracking-tight text-foreground">
                Security &amp; Password
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#a0a5af]" />
          </div>
          <div className="mt-2.5 mb-1 text-[12.5px] text-text-secondary">
            Reset password and authenticate recovery email
          </div>
          <div className="mt-3 mb-2.5 h-px w-full bg-black/8 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[12.5px] font-semibold text-foreground">Enhanced</span>
          </div>
        </div>

        {/* About App Card */}
        <div
          onClick={() => onNavigate("about" as never)}
          className="qb-squircle flex flex-col p-4 cursor-pointer press"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white border border-black/[0.07] dark:bg-[#17191e] dark:border-white/[0.10]">
                <GlossyBookLearnIcon className="h-4.5 w-4.5" />
              </div>
              <span className="text-[14.5px] font-extrabold tracking-tight text-foreground">
                About Application
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#a0a5af]" />
          </div>
          <div className="mt-2.5 mb-1 text-[12.5px] text-text-secondary">
            Release logs, version metadata and legal notices
          </div>
          <div className="mt-3 mb-2.5 h-px w-full bg-black/8 dark:bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[12.5px] font-semibold text-foreground">v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 9: Appearance ────────────────────────────────────────────────────
export function AppearanceView({
  dark,
  onSetDark,
  onBack,
}: {
  dark: boolean;
  onSetDark: (val: boolean) => void;
  onBack: () => void;
}) {
  const [colorScheme, setColorScheme] = useState<"Light" | "Dark" | "System">(
    dark ? "Dark" : "Light",
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  const handleSelectScheme = (mode: "Light" | "Dark" | "System") => {
    setColorScheme(mode);
    if (mode === "Light") onSetDark(false);
    else if (mode === "Dark") onSetDark(true);
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      onSetDark(prefersDark);
    }
  };

  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24">
      <SubScreenHeader title="Appearance" onBack={onBack} />

      <div className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Color Scheme */}
        <div>
          <span className="text-[12px] font-bold text-[#697383] dark:text-slate-400 block px-1 mb-3">
            Color scheme
          </span>

          <div className="grid grid-cols-3 gap-3">
            {/* Light Card */}
            <button
              type="button"
              onClick={() => handleSelectScheme("Light")}
              className={`press flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#15171c] border transition-all ${
                colorScheme === "Light"
                  ? "border-[#fa4616] ring-2 ring-[#fa4616]/30 shadow-md"
                  : "border-black/[0.06] dark:border-white/[0.08]"
              }`}
            >
              <div className="h-12 w-12 rounded-[14px] bg-gradient-to-tr from-orange-100 via-sky-50 to-white grid place-items-center shadow-inner mb-2 border border-black/5">
                <Sun className="h-6 w-6 text-amber-500" />
              </div>
              <span className="text-[13px] font-extrabold text-[#17191d] dark:text-white">
                Light
              </span>
            </button>

            {/* Dark Card */}
            <button
              type="button"
              onClick={() => handleSelectScheme("Dark")}
              className={`press flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#15171c] border transition-all ${
                colorScheme === "Dark"
                  ? "border-[#fa4616] ring-2 ring-[#fa4616]/30 shadow-md"
                  : "border-black/[0.06] dark:border-white/[0.08]"
              }`}
            >
              <div className="h-12 w-12 rounded-[14px] bg-slate-900 grid place-items-center shadow-inner mb-2 border border-white/10">
                <Moon className="h-6 w-6 text-sky-400" />
              </div>
              <span className="text-[13px] font-extrabold text-[#17191d] dark:text-white">
                Dark
              </span>
            </button>

            {/* System Card */}
            <button
              type="button"
              onClick={() => handleSelectScheme("System")}
              className={`press flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#15171c] border transition-all ${
                colorScheme === "System"
                  ? "border-[#fa4616] ring-2 ring-[#fa4616]/30 shadow-md"
                  : "border-black/[0.06] dark:border-white/[0.08]"
              }`}
            >
              <div className="h-12 w-12 rounded-[14px] bg-gradient-to-r from-slate-200 to-slate-800 grid place-items-center shadow-inner mb-2 border border-black/5">
                <Sun className="h-5 w-5 text-white" />
              </div>
              <span className="text-[13px] font-extrabold text-[#17191d] dark:text-white">
                System
              </span>
            </button>
          </div>
        </div>

        {/* Interface Section */}
        <div>
          <span className="text-[12px] font-bold text-[#697383] dark:text-slate-400 block px-1 mb-2">
            Interface
          </span>
          <div className="rounded-2xl bg-white dark:bg-[#15171c] border border-black/[0.06] dark:border-white/[0.08] shadow-sm divide-y divide-black/[0.04] dark:divide-white/[0.05] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 px-4">
              <span className="text-[14px] font-bold text-[#17191d] dark:text-white">
                Reduced motion
              </span>
              <OrangeToggle checked={reducedMotion} onChange={setReducedMotion} />
            </div>

            <div className="flex items-center justify-between p-3.5 px-4">
              <span className="text-[14px] font-bold text-[#17191d] dark:text-white">
                Compact mode
              </span>
              <OrangeToggle checked={compactMode} onChange={setCompactMode} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 10: Beta Features ────────────────────────────────────────────────
export function BetaFeaturesView({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <div className="min-h-full bg-[#f8f9fa] dark:bg-[#0c0d11] pb-24">
      <SubScreenHeader title="Beta Features" onBack={onBack} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <BetaFeatures />
      </div>
    </div>
  );
}
