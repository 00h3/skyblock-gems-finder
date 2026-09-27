import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Dices, RefreshCw } from "lucide-react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import { saveOnboardingAnswers } from "@/lib/auth-utils";
import { BlurReveal } from "@/components/ui/blur-reveal";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import { ShinyButton } from "@/components/ui/shiny-button";
import { UserSpeakIcon } from "@/components/icons/CustomAuthIcons";
import { GlbAvatar } from "@/components/GlbAvatar";
import { setGender, setAvatarColor, setHairColor, setBaseCharacter } from "@/lib/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — QBlock" }] }),
  component: OnboardingPage,
});

const TOTAL_STEPS = 3;

// ── Screen 1: Community Sources with exact specified Iconify icons ──────────
const SOURCES = [
  {
    id: "friends",
    label: "Invited by Friends",
    sub: "Word of mouth & squad invites",
    iconName: "mdi:account-multiple",
  },
  {
    id: "discord",
    label: "Discord Community",
    sub: "Server events & community chats",
    iconName: "simple-icons:discord",
  },
  {
    id: "youtube",
    label: "YouTube Creators",
    sub: "Gameplay clips, reviews & tutorials",
    iconName: "mdi:youtube",
  },
  {
    id: "search",
    label: "Search & Discovery",
    sub: "Found while exploring online",
    iconName: "ic:baseline-search",
  },
  {
    id: "social",
    label: "Creator & Social Media",
    sub: "Online channels & player posts",
    iconName: "ph:user-plus-fill",
  },
  {
    id: "referral",
    label: "Player Referral Code",
    sub: "Joined via friend link or invite",
    iconName: "mdi:account-plus",
  },
];

// ── Screen 2: Game categories with supplied PNG image assets ────────────────
const GAME_PREFERENCES = [
  {
    id: "bedwars_pvp",
    title: "BedWars PvP",
    desc: "Tactical team battles, island defense & arena combat",
    img: "/categories/bedwars.png",
    cdnImg:
      "https://cdn.discordapp.com/attachments/1543864533813039178/1547562425534914582/file_00000000eb9881fd9040470464e57e5d.png?ex=6aa3df52&is=6aa28dd2&hm=2813e1e76ad66399c87020c1789de418c0897ed620eef895a48dbe66956da8b6&",
    badge: "Hot",
  },
  {
    id: "parkour_obby",
    title: "Parkour & Obby",
    desc: "Challenging obstacle courses & speed runs",
    img: "/categories/parkour.png",
    cdnImg:
      "https://cdn.discordapp.com/attachments/1543864533813039178/1547562440852508722/file_00000000bca081f493680a11267d4cc4.png?ex=6aa3df56&is=6aa28dd6&hm=cbf7572da2211fb386a9e96ff30a175151705ca7062b7e098dcc15ab41cd3f5d&",
    badge: "Popular",
  },
  {
    id: "sandbox_building",
    title: "Sandbox Building",
    desc: "Infinite worlds, block crafting & architect tools",
    img: "/categories/sandbox.png",
    cdnImg:
      "https://cdn.discordapp.com/attachments/1543864533813039178/1547562434750062673/file_0000000013fc81f88844b104c418c898.png?ex=6aa3df54&is=6aa28dd4&hm=4785e389bc2254f6d72f521b1a33794219b366fb6fefbb67afc2b2e08ceb8e07&",
    badge: "Creative",
  },
  {
    id: "hangout_roleplay",
    title: "Hangout & Roleplay",
    desc: "Chill lounges, custom mini-cities & social trading",
    img: "/categories/hangout.png",
    cdnImg:
      "https://cdn.discordapp.com/attachments/1543864533813039178/1547562267246338138/file_0000000055c882308c52aaed14b1565b.png?ex=6aa3df2c&is=6aa28dac&hm=00aac93237df9297931e71d95e4abb45a67c196e4fc3a24518dd2cd315b351f3&",
    badge: "Community",
  },
];

// ── Screen 3: Character presets ─────────────────────────────────────────────
const CHARACTER_PRESETS = [
  {
    id: "ned",
    name: "Boy",
    alias: "Ned",
    previewUrl: "https://maxwell.z3ki.dev/bot/avatar-3d-preview/",
    gender: "male" as const,
    tagline: "Classic Adventurer",
    skin: "#f5cfa0",
    hair: "#17181b",
  },
  {
    id: "nelly",
    name: "Nelly",
    alias: "ID 2",
    previewUrl: "https://maxwell.z3ki.dev/bot/avatar-boy-preview/",
    gender: "female" as const,
    tagline: "Modern Pioneer",
    skin: "#ffe8df",
    hair: "#7c3aed",
  },
];

const RANDOM_NAMES = [
  "PixelKnight",
  "VoxelHero",
  "NovaCraft",
  "SwiftBlade",
  "ShadowQ",
  "BlockBuster",
  "CyberFox",
  "AuraSpark",
  "NeonStriker",
  "FrostByte",
  "EchoRider",
  "SkyWalker",
  "CosmoBlock",
  "HyperPulse",
  "BlazeCraft",
];

// ── White Gloss Squircle Button ────────────────────────────────────────────
export function WhiteGlossSquircleButton({
  onClick,
  children,
  loading = false,
  disabled = false,
  className = "",
  type = "button",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <ShinyButton
      type={type}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      variant="white"
      className={`w-full h-[50px] text-[15px] ${className}`}
    >
      {children}
    </ShinyButton>
  );
}

// ── Orange Sign In Button ──────────────────────────────────────────────────
export function OrangeSignInButton({
  onClick,
  children = "Sign In",
  loading = false,
  disabled = false,
  className = "",
  type = "button",
}: {
  onClick?: () => void;
  children?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <ShinyButton
      type={type}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      variant="orange"
      className={`h-[36px] px-4 text-[13px] rounded-[11px] ${className}`}
    >
      {children}
    </ShinyButton>
  );
}

function OnboardingPage() {
  const nav = useNavigate();
  const { qbUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [source, setSource] = useState<string>("friends");
  const [playFirst, setPlayFirst] = useState<string>("bedwars_pvp");
  const [character, setCharacter] = useState<string>("ned");
  const [nickname, setNickname] = useState<string>(
    qbUser?.displayName || qbUser?.username || "PixelHero",
  );

  function generateRandomName() {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setNickname(`${random}${num}`);
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const isFemale = character === "nelly";
      setGender(isFemale ? "female" : "male");
      setBaseCharacter(isFemale ? "char2" : "char1");
      setAvatarColor(isFemale ? "#ffe8df" : "#f5cfa0");
      setHairColor(isFemale ? "#7c3aed" : "#17181b");
      try {
        localStorage.setItem("bm-character-preset", character);
        localStorage.setItem("bm-avatar-name", isFemale ? "Nelly" : "Ned");
        localStorage.setItem("qb_base_character", isFemale ? "char2" : "char1");
      } catch {
        // Storage might be unavailable
      }

      if (qbUser?.uid) {
        await saveOnboardingAnswers(qbUser.uid, {
          source: source || "skipped",
          playFirst,
          character,
          gender: isFemale ? "female" : "male",
          displayName: nickname.trim() || qbUser.username || "Player",
          starterGiftClaimed: true,
        });
      }
      toast.success("Welcome to QBlock! Starter gift claimed 🎁");
      nav({ to: "/" } as never);
    } catch (err) {
      console.warn("Error finalizing onboarding:", err);
      nav({ to: "/" } as never);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden bg-white text-slate-900">
      {/* Original Multicolor Breathing Aura Gradient */}
      <div className="absolute inset-0 pointer-events-none opacity-80">
        <AnimatedGradientBackground
          Breathing={true}
          startingGap={120}
          breathingRange={6}
          animationSpeed={0.02}
          gradientColors={[
            "#FFFFFF",
            "#2979FF",
            "#FF80AB",
            "#FF6D00",
            "#FFD600",
            "#00E676",
            "#3D5AFE",
          ]}
          gradientStops={[35, 50, 60, 70, 80, 90, 100]}
          topOffset={-10}
        />
      </div>

      {/* Dark Vignette Overlay for Crisp Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/90 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 px-5 pt-[max(20px,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="press grid h-9 w-9 place-items-center rounded-[12px] bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/10 text-slate-900 shadow-sm cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-9" />
        )}

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                i + 1 === step
                  ? "w-7 bg-[#fa4616]"
                  : i + 1 < step
                    ? "w-3 bg-white/40"
                    : "w-2 bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* Top Right Action: Skip or Sign In Button */}
        <div className="flex items-center gap-2">
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="press px-3 py-1.5 rounded-[10px] bg-white/10 hover:bg-white/15 border border-white/10 text-[12.5px] font-inter-bold text-slate-700 cursor-pointer"
            >
              Skip
            </button>
          ) : (
            <OrangeSignInButton onClick={() => nav({ to: "/login" as never })}>
              Sign In
            </OrangeSignInButton>
          )}
        </div>
      </div>

      {/* Main Form Content Container */}
      <div className="relative z-10 flex-1 flex flex-col justify-between max-w-sm mx-auto w-full px-5 py-3 overflow-y-auto ios-scroll">
        <AnimatePresence mode="wait">
          {/* ── Screen 1: Discovery Question (Exact Iconify Icons & White Buttons) ── */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="text-center mb-5">
                  <BlurReveal
                    delay={0.06}
                    speedReveal={1.2}
                    className="text-[25px] font-inter-bold tracking-tight text-slate-900 leading-tight"
                  >
                    How did you hear about us?
                  </BlurReveal>

                  <BlurReveal
                    delay={0.16}
                    speedReveal={1.3}
                    className="text-[13px] font-inter-normal text-slate-600 mt-1.5"
                  >
                    Help us understand and grow the QBlock community
                  </BlurReveal>
                </div>

                {/* Source Selection List using Discovery Bottom-Menu Glossy Gradient */}
                <div className="space-y-2.5">
                  {SOURCES.map((item) => {
                    const isSelected = source === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSource(item.id)}
                        className={`press w-full flex items-center gap-3.5 p-3 rounded-[13px] transition-all text-left relative overflow-hidden cursor-pointer select-none ${
                          isSelected
                            ? "border-2 border-[#fa4616] shadow-[0_6px_20px_rgba(250,70,22,0.3)]"
                            : "border border-black/[0.12] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                        }`}
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
                          boxShadow: isSelected
                            ? "inset 0 1px 0 rgba(255, 255, 255, 1), 0 6px 18px rgba(250, 70, 22, 0.28)"
                            : "inset 0 1px 0 rgba(255, 255, 255, 1), 0 3px 8px rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        {/* Top gloss highlight reflection */}
                        <div
                          className="absolute inset-x-0 top-0 h-[48%] rounded-t-[12px] pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%)",
                          }}
                        />

                        {/* Exact Iconify Icon in Orange #FA4616 */}
                        <div className="h-10 w-10 rounded-[11px] bg-[#fa4616]/10 border border-[#fa4616]/20 flex items-center justify-center shrink-0 relative z-10">
                          <Icon
                            icon={item.iconName}
                            className="h-5 w-5 shrink-0"
                            style={{ color: "#FA4616" }}
                          />
                        </div>

                        <div className="flex-1 min-w-0 relative z-10">
                          <div className="text-[14px] font-inter-bold text-slate-900 tracking-tight">
                            {item.label}
                          </div>
                          <div className="text-[11.5px] font-inter-normal text-slate-600 truncate">
                            {item.sub}
                          </div>
                        </div>

                        {/* Selection checkmark */}
                        <div
                          className={`h-5 w-5 rounded-[7px] grid place-items-center shrink-0 relative z-10 transition-colors ${
                            isSelected
                              ? "bg-[#fa4616] text-slate-900 shadow-sm"
                              : "border border-slate-300 bg-white/70"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* White Squircle Onboarding Action Button */}
              <div className="pt-5 pb-2">
                <WhiteGlossSquircleButton onClick={() => setStep(2)}>Next</WhiteGlossSquircleButton>
              </div>
            </motion.div>
          )}

          {/* ── Screen 2: Game Category Selection with Supplied Images & LiquidMetal Claim Gift ── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="text-center mb-5">
                  <BlurReveal
                    delay={0.06}
                    speedReveal={1.2}
                    className="text-[25px] font-inter-bold tracking-tight text-slate-900 leading-tight"
                  >
                    What do you want to play first?
                  </BlurReveal>

                  <BlurReveal
                    delay={0.16}
                    speedReveal={1.3}
                    className="text-[13px] font-inter-normal text-slate-600 mt-1.5"
                  >
                    We&apos;ll use this to customize your home feed
                  </BlurReveal>
                </div>

                {/* Game Options with supplied image assets */}
                <div className="space-y-2.5">
                  {GAME_PREFERENCES.map((opt) => {
                    const isSelected = playFirst === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPlayFirst(opt.id)}
                        className={`press w-full flex items-center gap-3.5 p-2.5 rounded-[13px] transition-all text-left relative overflow-hidden cursor-pointer select-none ${
                          isSelected
                            ? "border-2 border-[#fa4616] shadow-[0_6px_20px_rgba(250,70,22,0.3)]"
                            : "border border-black/[0.12] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                        }`}
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
                          boxShadow: isSelected
                            ? "inset 0 1px 0 rgba(255, 255, 255, 1), 0 6px 18px rgba(250, 70, 22, 0.28)"
                            : "inset 0 1px 0 rgba(255, 255, 255, 1), 0 3px 8px rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        {/* Top gloss highlight reflection */}
                        <div
                          className="absolute inset-x-0 top-0 h-[48%] rounded-t-[12px] pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%)",
                          }}
                        />

                        {/* Supplied Image Asset (Unstretched, crisp aspect ratio) */}
                        <div className="h-[54px] w-[54px] rounded-[10px] overflow-hidden bg-slate-900/10 border border-black/10 shrink-0 relative z-10">
                          <img
                            src={opt.img}
                            onError={(e) => {
                              // Fallback to direct Discord CDN url if needed
                              const target = e.currentTarget;
                              if (target.src !== opt.cdnImg) {
                                target.src = opt.cdnImg;
                              }
                            }}
                            alt={opt.title}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex-1 min-w-0 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-inter-bold text-slate-900 tracking-tight">
                              {opt.title}
                            </span>
                            {opt.badge && (
                              <span className="text-[10px] uppercase font-inter-bold px-1.5 py-0.5 rounded-[6px] bg-[#fa4616]/15 text-[#fa4616] border border-[#fa4616]/30">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] font-inter-normal text-slate-600 leading-snug mt-0.5 line-clamp-2">
                            {opt.desc}
                          </p>
                        </div>

                        {/* Checkbox indicator */}
                        <div
                          className={`h-5 w-5 rounded-[7px] grid place-items-center shrink-0 relative z-10 transition-colors ${
                            isSelected
                              ? "bg-[#fa4616] text-slate-900 shadow-sm"
                              : "border border-slate-300 bg-white/70"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Glossy Shiny Button for Claim Starter Gift & Next with supplied Puzzle icon */}
              <div className="pt-5 pb-2">
                <ShinyButton
                  variant="orange"
                  onClick={() => setStep(3)}
                  className="w-full h-[50px] text-[15px]"
                >
                  <img
                    src="/categories/puzzle_transparent.png"
                    alt=""
                    className="h-5 w-5 object-contain shrink-0"
                  />
                  <span>Claim Starter Gift &amp; Next</span>
                </ShinyButton>
              </div>
            </motion.div>
          )}

          {/* ── Screen 3: Identity, Character Presets & White Onboarding Buttons ── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="text-center mb-5">
                  <BlurReveal
                    delay={0.06}
                    speedReveal={1.2}
                    className="text-[25px] font-inter-bold tracking-tight text-slate-900 leading-tight"
                  >
                    Create Your Identity
                  </BlurReveal>

                  <BlurReveal
                    delay={0.16}
                    speedReveal={1.3}
                    className="text-[13px] font-inter-normal text-slate-600 mt-1.5"
                  >
                    Choose your starter look. You can customize anytime.
                  </BlurReveal>
                </div>

                {/* Character Presets with White Squircle Surface & Discovery Genre Gradient */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {CHARACTER_PRESETS.map((p) => {
                    const isSelected = character === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCharacter(p.id)}
                        className={`press flex flex-col rounded-[13px] p-2.5 text-left transition-all cursor-pointer relative overflow-hidden select-none ${
                          isSelected
                            ? "border-2 border-[#fa4616] shadow-[0_6px_20px_rgba(250,70,22,0.3)]"
                            : "border border-black/[0.12] shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                        }`}
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
                          boxShadow: isSelected
                            ? "inset 0 1px 0 rgba(255, 255, 255, 1), 0 6px 18px rgba(250, 70, 22, 0.28)"
                            : "inset 0 1px 0 rgba(255, 255, 255, 1), 0 3px 8px rgba(0, 0, 0, 0.08)",
                        }}
                      >
                        {/* Top gloss highlight */}
                        <div
                          className="absolute inset-x-0 top-0 h-[48%] rounded-t-[12px] pointer-events-none"
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 100%)",
                          }}
                        />

                        {/* Live 3D Preview Space */}
                        <div className="w-full h-32 rounded-[10px] bg-slate-900/5 border border-black/10 flex flex-col items-center justify-center relative overflow-hidden z-10">
                          <iframe
                            src={p.previewUrl}
                            className="w-full h-full border-0 absolute inset-0 bg-transparent pointer-events-none"
                            style={{ border: "none" }}
                            loading="lazy"
                            allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope"
                          />

                          {isSelected && (
                            <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#fa4616] text-white grid place-items-center shadow-md z-20">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Name label */}
                        <div className="mt-2.5 px-1 relative z-10">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-inter-bold text-slate-900">
                              {p.name === "Boy" ? "Boy (Ned)" : "Nelly (ID 2)"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide bg-slate-200/80 px-1.5 py-0.5 rounded-[5px]">
                              {p.alias}
                            </span>
                          </div>
                          <div className="text-[11px] font-inter-normal text-slate-600">
                            {p.id === "ned" ? "Boy as Ned" : "Nelly as ID 2"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Nickname Field with White Squircle Discovery Genre Gradient & User Icon */}
                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-inter-bold text-slate-700 block px-1">
                    Choose Nickname
                  </label>
                  <div
                    className="relative flex items-center rounded-[13px] border border-black/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] transition-all overflow-hidden h-[50px] px-3.5 gap-2.5"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
                    }}
                  >
                    {/* User Speak Icon in #FA4616 */}
                    <div className="text-[#fa4616] shrink-0">
                      <UserSpeakIcon className="h-5 w-5" color="#fa4616" />
                    </div>

                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter nickname..."
                      maxLength={20}
                      className="w-full bg-transparent text-[14px] font-inter-bold text-slate-900 placeholder:text-slate-400 outline-none"
                    />

                    {/* Dice Button Accessory */}
                    <button
                      type="button"
                      onClick={generateRandomName}
                      title="Roll random nickname"
                      className="press h-8 w-8 rounded-[9px] bg-slate-900/10 hover:bg-slate-900/15 text-slate-700 grid place-items-center transition-colors shrink-0 cursor-pointer"
                    >
                      <Dices className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Glossy Shiny Button for Enter QBLOCK */}
              <div className="pt-5 pb-2">
                <ShinyButton
                  variant="orange"
                  onClick={handleFinish}
                  loading={saving}
                  disabled={!nickname.trim()}
                  className="w-full h-[50px] text-[15.5px]"
                >
                  Enter QBLOCK
                </ShinyButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
