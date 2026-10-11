import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MobileShell } from "@/components/MobileShell";
import { qbSignIn, qbSignUp, qbResetPassword } from "@/lib/auth-utils";
import { getSavedAccounts } from "@/lib/saved-accounts";
import { useAuth } from "@/lib/auth-context";
import { BlurReveal } from "@/components/ui/blur-reveal";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import { AuthArtwork3D } from "@/components/AuthArtwork3D";
import { ShinyButton } from "@/components/ui/shiny-button";
import { HtmlSpinner } from "@/components/ui/HtmlLoadingScreen";
import {
  UserSpeakIcon,
  MailForwardIcon,
  PasswordKeyIcon,
  SvgEyeOpen,
  SvgEyeClosed,
} from "@/components/icons/CustomAuthIcons";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — QBlock" }] }),
  component: LoginPage,
});

type Screen = "welcome" | "login" | "signup" | "forgot";

// Aura gradient matching the onboarding screen
const ONBOARDING_AURA_COLORS = [
  "#FFFFFF",
  "#2979FF",
  "#FF80AB",
  "#FF6D00",
  "#FFD600",
  "#00E676",
  "#3D5AFE",
];

function LoginPage() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const nav = useNavigate();
  const { qbUser, loading } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initial = params.get("screen") || params.get("mode");
      if (initial === "signup" || initial === "login" || initial === "forgot") {
        setScreen(initial);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && qbUser) {
      nav({ to: qbUser.onboardingCompleted ? "/" : "/onboarding" } as never);
    }
  }, [qbUser, loading, nav]);

  if (loading) return <FullLoader />;

  return (
    <MobileShell hideNav scroll={false}>
      <div className="min-h-dvh flex flex-col relative overflow-hidden bg-white text-slate-900">
        {/* Dynamic Aura Gradient Background - identical to onboarding */}
        <div className="absolute inset-0 pointer-events-none opacity-80">
          <AnimatedGradientBackground
            Breathing={true}
            startingGap={120}
            breathingRange={6}
            animationSpeed={0.02}
            gradientColors={ONBOARDING_AURA_COLORS}
            gradientStops={[35, 50, 60, 70, 80, 90, 100]}
            topOffset={-10}
          />
        </div>

        {/* Subtle light vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/90 pointer-events-none" />

        <div className="flex flex-col flex-1 relative z-10">
          <AnimatePresence mode="wait">
            {screen === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col"
              >
                <WelcomeScreen
                  onLogin={() => setScreen("login")}
                  onSignup={() => setScreen("signup")}
                />
              </motion.div>
            )}
            {screen === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col"
              >
                <LoginScreen
                  onBack={() => setScreen("welcome")}
                  onForgot={() => setScreen("forgot")}
                  onSignup={() => setScreen("signup")}
                />
              </motion.div>
            )}
            {screen === "signup" && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col"
              >
                <SignupScreen
                  onBack={() => setScreen("welcome")}
                  onLogin={() => setScreen("login")}
                />
              </motion.div>
            )}
            {screen === "forgot" && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col"
              >
                <ForgotScreen onBack={() => setScreen("login")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MobileShell>
  );
}

// ── Floating Artwork Showcase ─────────────────────────────────────────────
export function FloatingMascot({ className = "" }: { size?: number; className?: string }) {
  return <AuthArtwork3D size="compact" className={className} />;
}

// ── White Shiny Squircle Button (Dismiss Style) ───────────────────────────
function OrangeSignInButton({
  onClick,
  children = "Sign In",
  loading = false,
  type = "button",
  className = "",
}: {
  onClick?: () => void;
  children?: React.ReactNode;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <ShinyButton
      type={type}
      onClick={onClick}
      loading={loading}
      variant="white"
      className={`w-full h-[50px] text-[15px] ${className}`}
    >
      {children}
    </ShinyButton>
  );
}

// ── White Gloss Squircle Button ────────────────────────────────────────────
function WhiteGlossSquircleButton({
  onClick,
  children,
  loading = false,
  type = "button",
  className = "",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <ShinyButton
      type={type}
      onClick={onClick}
      loading={loading}
      variant="white"
      className={`w-full h-[50px] text-[15px] ${className}`}
    >
      {children}
    </ShinyButton>
  );
}

// ── Screen 1: Welcome / Choose Screen ───────────────────────────────────────
function WelcomeScreen({
  onLogin,
  onSignup,
  onJoinGroup,
}: {
  onLogin: () => void;
  onSignup: () => void;
  onJoinGroup?: () => void;
}) {
  const nav = useNavigate();
  return (
    <div className="flex flex-col h-dvh px-6 justify-between pt-[max(36px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      {/* Top spacer */}
      <div className="h-2" />

      {/* 3D Moving Artwork Centerpiece */}
      <div className="flex flex-col items-center justify-center my-auto py-2 -translate-y-7">
        <AuthArtwork3D size="hero" className="mb-2 z-10" />

        <div className="text-center max-w-[320px] px-2">
          <BlurReveal
            delay={0.1}
            speedReveal={1.2}
            className="text-[30px] font-inter-bold tracking-tight leading-[36px] text-slate-900"
          >
            Play, build, explore
          </BlurReveal>

          <BlurReveal
            delay={0.25}
            speedReveal={1.3}
            className="text-[13.5px] font-inter-normal text-slate-600 mt-2 leading-relaxed"
          >
            Your voxel worlds, BedWars matches, and community — all in one place.
          </BlurReveal>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm mx-auto">
        <WhiteGlossSquircleButton onClick={onSignup}>
          Create account — it&apos;s free
        </WhiteGlossSquircleButton>

        <OrangeSignInButton onClick={onLogin}>Sign In</OrangeSignInButton>

        {typeof window !== "undefined" && getSavedAccounts().length > 0 && (
          <button
            type="button"
            onClick={() => nav({ to: "/accounts" as never })}
            className="press mt-1 text-center text-[12.5px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Switch saved account ({getSavedAccounts().length})
          </button>
        )}
      </div>
    </div>
  );
}

// ── Screen 2: Login ─────────────────────────────────────────────────────────

function LoginScreen({
  onBack,
  onForgot,
  onSignup,
}: {
  onBack: () => void;
  onForgot: () => void;
  onSignup: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please fill out all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await qbSignIn(identifier.trim(), password);
      nav({ to: "/chat" as never });
    } catch (err: unknown) {
      const message = humanize(err, "Login failed.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-dvh overflow-y-auto ios-scroll">
      {/* Top Header with Back button */}
      <div className="px-5 pt-[max(36px,env(safe-area-inset-top))] pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="press w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 pb-[max(32px,env(safe-area-inset-bottom))]">
        <AuthArtwork3D size="compact" className="-mt-6 mb-3 mx-auto" />
        <div className="mb-6">
          <BlurReveal
            delay={0.1}
            duration={0.7}
            className="text-[34px] font-inter-black text-[#17191d] leading-tight tracking-tight mb-2"
          >
            Welcome back
          </BlurReveal>
          <BlurReveal delay={0.2} duration={0.7} className="text-[15px] font-inter text-slate-500">
            Enter your credentials to access your account
          </BlurReveal>
        </div>
        {error && (
          <div className="mb-6 p-3 rounded-[12px] bg-red-50 border border-red-100 text-[13px] font-inter-bold text-red-600 animate-in fade-in zoom-in-95 duration-200">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Account Identifier
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <UserSpeakIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Username or email address"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Security Key
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <PasswordKeyIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter pr-10"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <SvgEyeClosed className="w-4 h-4" /> : <SvgEyeOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onForgot}
              className="text-[12.5px] font-inter-bold text-[#ff7043] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="pt-4">
            <OrangeSignInButton type="submit" loading={loading} onClick={() => {}}>
              Login securely
            </OrangeSignInButton>
          </div>
        </form>
        <p className="mt-6 text-center text-[13.5px] text-slate-600">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSignup}
            className="font-inter-bold text-[#ff7043] hover:underline"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}

function SignupScreen({ onBack, onLogin }: { onBack: () => void; onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function handleSignup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill out all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await qbSignUp(email.trim(), password, username.trim());
      nav({ to: "/onboarding" as never });
    } catch (err: unknown) {
      const message = humanize(err, "Signup failed.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-dvh overflow-y-auto ios-scroll">
      <div className="px-5 pt-[max(36px,env(safe-area-inset-top))] pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="press w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-6 pb-[max(32px,env(safe-area-inset-bottom))]">
        <AuthArtwork3D size="compact" className="-mt-6 mb-3 mx-auto" />
        <div className="mb-6">
          <BlurReveal
            delay={0.1}
            duration={0.7}
            className="text-[34px] font-inter-black text-[#17191d] leading-tight tracking-tight mb-2"
          >
            Join QBLOCK
          </BlurReveal>
          <BlurReveal delay={0.2} duration={0.7} className="text-[15px] font-inter text-slate-500">
            Create an account to start playing.
          </BlurReveal>
        </div>
        {error && (
          <div className="mb-6 p-3 rounded-[12px] bg-red-50 border border-red-100 text-[13px] font-inter-bold text-red-600 animate-in fade-in zoom-in-95 duration-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Username
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <UserSpeakIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter"
                autoComplete="username"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Email Address
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <MailForwardIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter"
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
              Security Key
            </label>
            <div
              className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
              }}
            >
              <PasswordKeyIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Create password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-inter pr-10"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <SvgEyeClosed className="w-4 h-4" /> : <SvgEyeOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="pt-4">
            <OrangeSignInButton type="submit" loading={loading} onClick={() => {}}>
              Create Account
            </OrangeSignInButton>
          </div>
        </form>
        <p className="mt-6 text-center text-[13.5px] text-slate-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onLogin}
            className="font-inter-bold text-[#ff7043] hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Screen 4: Forgot Password ───────────────────────────────────────────────
function ForgotScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleReset(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your account email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await qbResetPassword(email.trim());
      setSent(true);
    } catch (err: unknown) {
      const message = humanize(err, "Reset failed.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-dvh overflow-y-auto ios-scroll">
      {/* Top Header with Back button (bubble removed) */}
      <div className="px-5 pt-[max(36px,env(safe-area-inset-top))] pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="press grid h-10 w-10 place-items-center rounded-[12px] bg-black/5 hover:bg-black/10 backdrop-blur-md border border-black/5 text-slate-900 shadow-sm"
          aria-label="Back"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-6 flex flex-col justify-center max-w-sm mx-auto w-full py-4">
        {sent ? (
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-[14px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 grid place-items-center mb-4 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <BlurReveal
              delay={0.05}
              speedReveal={1.2}
              className="text-[24px] font-inter-bold text-slate-900"
            >
              Check your inbox
            </BlurReveal>
            <p className="text-[14px] text-slate-600 mt-2 leading-relaxed">
              We sent a password reset link to <strong className="text-slate-900">{email}</strong>.
            </p>
            <div className="w-full mt-6">
              <OrangeSignInButton onClick={onBack}>Back to Sign In</OrangeSignInButton>
            </div>
          </div>
        ) : (
          <>
            <AuthArtwork3D size="compact" className="mb-3" />

            <div className="text-center mb-6">
              <BlurReveal
                delay={0.08}
                speedReveal={1.2}
                className="text-[26px] font-inter-bold tracking-tight text-slate-900"
              >
                Reset password
              </BlurReveal>

              <BlurReveal
                delay={0.2}
                speedReveal={1.3}
                className="text-[13px] font-inter-normal text-slate-600 mt-1"
              >
                Enter your email and we&apos;ll send recovery instructions
              </BlurReveal>
            </div>

            <form onSubmit={handleReset} className="space-y-3.5">
              <div>
                <label className="text-[11.5px] font-inter-bold text-slate-700 block mb-1.5 px-1">
                  Email Address
                </label>
                <div
                  className="relative flex items-center rounded-[13px] border border-black/10 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(0,0,0,0.08)] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all overflow-hidden h-[50px] px-3.5 gap-3"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(233, 238, 245, 0.92))",
                  }}
                >
                  <MailForwardIcon className="h-5 w-5 shrink-0" color="#fa4616" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-transparent text-[14px] font-inter-bold text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              {error && <FormError message={error} />}

              <div className="pt-2">
                <OrangeSignInButton type="submit" loading={loading}>
                  Send reset link
                </OrangeSignInButton>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="p-3 rounded-[12px] bg-rose-500/15 border border-rose-500/30 text-[12.5px] font-semibold text-rose-300 flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
      <span>{message}</span>
    </div>
  );
}

function FullLoader() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-white">
      <HtmlSpinner size={36} />
    </div>
  );
}

function humanize(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : "";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const detail = `${code} ${msg}`.toLowerCase();

  if (
    detail.includes("wrong-password") ||
    detail.includes("invalid-credential") ||
    detail.includes("invalid-login-credentials")
  ) {
    return "Incorrect password or account credentials.";
  }
  if (detail.includes("user-not-found"))
    return "No account found with that email. Please create an account first.";
  if (detail.includes("email-already-in-use") || detail.includes("email-already")) {
    return "An account with this email already exists.";
  }
  if (detail.includes("invalid-email")) return "Please enter a valid email address.";
  if (detail.includes("too-many-requests")) return "Too many attempts. Try again later.";
  if (detail.includes("weak-password")) return "Password should be at least 6 characters.";
  if (msg.includes("Please enter your email")) return msg;
  if (msg.includes("Username is already taken")) return "That username is taken.";
  if (msg.includes("No account found")) return msg;
  if (
    detail.includes("permission") ||
    detail.includes("insufficient") ||
    detail.includes("permission-denied")
  ) {
    return "We couldn't save your account. Please try again.";
  }
  if (detail.includes("network") || detail.includes("offline") || detail.includes("unavailable")) {
    return "Check your connection and try again.";
  }
  if (msg.includes("Could not generate")) return "Server busy — please try again.";
  if (msg) return msg;
  return fallback;
}
