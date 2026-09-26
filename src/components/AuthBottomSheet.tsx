"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { qbSignIn, qbSignUp, qbResetPassword } from "@/lib/auth-utils";
import { saveAccount, type SavedAccount } from "@/lib/saved-accounts";
import { ShinyButton } from "@/components/ui/shiny-button";
import {
  UserSpeakIcon,
  MailForwardIcon,
  PasswordKeyIcon,
  SvgEyeOpen,
  SvgEyeClosed,
} from "@/components/icons/CustomAuthIcons";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

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
    return "Incorrect password or credentials.";
  }
  if (detail.includes("user-not-found")) {
    return "No account found with those credentials.";
  }
  if (detail.includes("email-already-in-use") || detail.includes("email-already")) {
    return "An account with this email already exists.";
  }
  if (detail.includes("invalid-email")) return "Please enter a valid email address.";
  if (detail.includes("too-many-requests")) return "Too many attempts. Try again later.";
  if (detail.includes("weak-password")) return "Password should be at least 6 characters.";
  if (msg.includes("Please enter your email")) return msg;
  if (msg.includes("Username is already taken")) return "That username is already taken.";
  if (msg.includes("No account found")) return msg;
  if (msg) return msg;
  return fallback;
}

export function AuthBottomSheet({
  open,
  onClose,
  defaultIdentifier = "",
  defaultMode = "login",
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  defaultIdentifier?: string;
  defaultMode?: "login" | "signup";
  onSuccess?: (account?: SavedAccount) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(defaultMode);
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setIdentifier(defaultIdentifier);
      setPassword("");
      setError("");
      setResetSent(false);
    }
  }, [open, defaultMode, defaultIdentifier]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your email or identifier.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await qbResetPassword(identifier.trim());
      setResetSent(true);
      toast.success("Password reset email sent!");
    } catch (err) {
      const msg = humanize(err, "Failed to send reset link.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please fill out all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const cred = await qbSignIn(identifier.trim(), password);
      const saved = saveAccount({
        uid: cred.user.uid,
        username: cred.user.displayName || identifier.trim(),
        email: cred.user.email,
        customId: `QB-${cred.user.uid.slice(0, 6).toUpperCase()}`,
      });
      toast.success("Signed in successfully!");
      onClose();
      if (onSuccess) {
        onSuccess(saved.find((a) => a.uid === cred.user.uid));
      } else {
        nav({ to: "/" as never });
      }
    } catch (err) {
      const msg = humanize(err, "Login failed. Please check your credentials.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill out all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const cred = await qbSignUp(email.trim(), password, username.trim());
      const saved = saveAccount({
        uid: cred.user.uid,
        username: username.trim(),
        email: cred.user.email,
        customId: `QB-${cred.user.uid.slice(0, 6).toUpperCase()}`,
      });
      toast.success("Account created successfully!");
      onClose();
      if (onSuccess) {
        onSuccess(saved.find((a) => a.uid === cred.user.uid));
      } else {
        nav({ to: "/" as never });
      }
    } catch (err) {
      const msg = humanize(err, "Signup failed. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
          />

          {/* Panel - Styled like fragments and events */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
            className="relative w-full max-w-[440px] h-[86dvh] flex flex-col overflow-hidden rounded-t-[24px] bg-white dark:bg-[#14151b] shadow-2xl z-10 border-t border-black/[0.08] dark:border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-black/[0.04] dark:border-white/5 bg-white dark:bg-[#14151b] z-20">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-extrabold tracking-tight text-[#141414] dark:text-white">
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Reset Password"}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="press grid h-9 w-9 place-items-center rounded-[12px] bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            {mode !== "forgot" && (
              <div className="px-5 pt-3 shrink-0">
                <div className="p-1 rounded-[14px] bg-slate-100 dark:bg-white/5 flex gap-1 border border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                    className={`flex-1 h-9 rounded-[10px] text-[13px] font-bold transition-all ${
                      mode === "login"
                        ? "bg-white dark:bg-[#1f222b] text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                    className={`flex-1 h-9 rounded-[10px] text-[13px] font-bold transition-all ${
                      mode === "signup"
                        ? "bg-white dark:bg-[#1f222b] text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            )}

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 ios-scroll">
              {error && (
                <div className="mb-4 p-3 rounded-[12px] bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 text-[12.5px] font-bold text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {mode === "forgot" ? (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div>
                    <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1 px-0.5">
                      Account Email
                    </label>
                    <div className="relative flex items-center rounded-[13px] border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all h-[48px] px-3.5 gap-2.5">
                      <MailForwardIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="email"
                        placeholder="Enter your registered email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full bg-transparent border-none text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {resetSent && (
                    <div className="p-3 rounded-[12px] bg-emerald-50 dark:bg-emerald-950/30 text-[12.5px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      Reset link sent! Please check your email inbox.
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    <ShinyButton
                      type="submit"
                      loading={loading}
                      variant="white"
                      className="w-full h-[48px] text-[14.5px] font-bold"
                    >
                      Send Reset Link
                    </ShinyButton>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError("");
                      }}
                      className="w-full py-2 text-center text-[12.5px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              ) : mode === "login" ? (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1 px-0.5">
                      Account Identifier
                    </label>
                    <div className="relative flex items-center rounded-[13px] border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all h-[48px] px-3.5 gap-2.5">
                      <UserSpeakIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Username, email, or QB-XXXX"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full bg-transparent border-none text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1 px-0.5">
                      Password
                    </label>
                    <div className="relative flex items-center rounded-[13px] border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all h-[48px] px-3.5 gap-2.5">
                      <PasswordKeyIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type={showPw ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent border-none text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? (
                          <SvgEyeClosed className="w-4 h-4" />
                        ) : (
                          <SvgEyeOpen className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setError("");
                      }}
                      className="text-[12px] font-bold text-[#ff7043] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="pt-2">
                    <ShinyButton
                      type="submit"
                      loading={loading}
                      variant="white"
                      className="w-full h-[48px] text-[14.5px] font-bold"
                    >
                      Log In Securely
                    </ShinyButton>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignup} className="space-y-3.5">
                  <div>
                    <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1 px-0.5">
                      Username
                    </label>
                    <div className="relative flex items-center rounded-[13px] border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all h-[48px] px-3.5 gap-2.5">
                      <UserSpeakIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Pick a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-transparent border-none text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1 px-0.5">
                      Email Address
                    </label>
                    <div className="relative flex items-center rounded-[13px] border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all h-[48px] px-3.5 gap-2.5">
                      <MailForwardIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="email"
                        placeholder="you@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent border-none text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300 block mb-1 px-0.5">
                      Create Password
                    </label>
                    <div className="relative flex items-center rounded-[13px] border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] focus-within:border-[#fa4616] focus-within:ring-2 focus-within:ring-[#fa4616]/30 transition-all h-[48px] px-3.5 gap-2.5">
                      <PasswordKeyIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type={showPw ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent border-none text-[13.5px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? (
                          <SvgEyeClosed className="w-4 h-4" />
                        ) : (
                          <SvgEyeOpen className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3">
                    <ShinyButton
                      type="submit"
                      loading={loading}
                      variant="white"
                      className="w-full h-[48px] text-[14.5px] font-bold"
                    >
                      Create QBLOCK Account
                    </ShinyButton>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
