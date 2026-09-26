import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Trash2, CheckCircle2, UserCheck, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from "@/lib/saved-accounts";
import { useAuth } from "@/lib/auth-context";
import { GlossyAvatar } from "@/components/GlossyAvatar";
import { ShinyButton } from "@/components/ui/shiny-button";
import { AuthBottomSheet } from "@/components/AuthBottomSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/accounts")({
  head: () => ({ meta: [{ title: "Accounts — QBlock" }] }),
  component: AccountsPage,
});

function AccountsPage() {
  const router = useRouter();
  const nav = useNavigate();
  const { qbUser, signOut } = useAuth();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [selectedIdentifier, setSelectedIdentifier] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    setAccounts(getSavedAccounts());
  }, []);

  function handleGoBack() {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      nav({ to: "/" as never });
    }
  }

  function handleRemove(uid: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = removeSavedAccount(uid);
    setAccounts(updated);
    toast.success("Account removed from device");
  }

  function handleAccountAction(acc: SavedAccount) {
    // If it's already the active account
    if (qbUser?.uid === acc.uid) {
      nav({ to: "/" as never });
      return;
    }
    // Open auth sheet prefilled with this account
    setSelectedIdentifier(acc.username || acc.email || acc.customId);
    setAuthMode("login");
    setAuthSheetOpen(true);
  }

  function handleOpenOther() {
    setSelectedIdentifier("");
    setAuthMode("login");
    setAuthSheetOpen(true);
  }

  return (
    <MobileShell hideNav>
      <div className="app-page min-h-dvh flex flex-col bg-[#fafafc] dark:bg-[#0e0f13] text-slate-900 dark:text-white">
        {/* Settings-style Header with Go Back */}
        <header className="subpage-header compact-gloss-header sticky top-0 z-30 bg-white/80 dark:bg-[#14151b]/80 backdrop-blur-md border-b border-black/[0.04] dark:border-white/5">
          <div className="h-[56px] px-2.5 flex items-center gap-1">
            <button
              onClick={handleGoBack}
              className="press liquid-button liquid-button-ghost android-control h-10 w-10 grid place-items-center -ml-1 rounded-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Go back"
            >
              <ChevronLeft className="h-[20px] w-[20px] text-[#626771] dark:text-[#a0a5af]" strokeWidth={2.4} />
            </button>
            <div className="ml-1 flex-1 min-w-0">
              <div className="app-eyebrow text-[10.5px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500">
                SETTINGS
              </div>
              <h1 className="mt-0.5 text-[20px] font-extrabold tracking-[-0.03em] truncate text-slate-900 dark:text-white">
                Accounts
              </h1>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 flex flex-col justify-between px-4 py-5 max-w-[480px] w-full mx-auto">
          <div className="space-y-4">
            {/* Header info card */}
            <div className="px-1">
              <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                Manage all accounts saved on this device. Select an account to log in or switch.
              </p>
            </div>

            {/* List of Saved Accounts */}
            <div className="space-y-3">
              {accounts.length === 0 ? (
                <div className="p-8 text-center rounded-[20px] border border-dashed border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.02]">
                  <p className="text-[13.5px] font-medium text-slate-500 dark:text-slate-400">
                    No saved accounts yet. Click <span className="font-bold text-slate-800 dark:text-white">&ldquo;OTHER&rdquo;</span> below to sign in or create an account.
                  </p>
                </div>
              ) : (
                accounts.map((acc) => {
                  const isActive = qbUser?.uid === acc.uid;
                  return (
                    <div
                      key={acc.uid}
                      className="group relative rounded-[20px] border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#161820] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] p-4 flex flex-col gap-3.5 transition-all hover:border-[#fa4616]/40"
                    >
                      {/* Top Row: PFP, Name, QB ID, and Remove button */}
                      <div className="flex items-center gap-3.5">
                        {/* PFP - Rectangle squircle rounded */}
                        <div className="relative shrink-0 h-[52px] w-[52px] rounded-[16px] overflow-hidden bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center shadow-xs">
                          {acc.profilePhoto ? (
                            <img
                              src={acc.profilePhoto}
                              alt={acc.displayName || acc.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <GlossyAvatar
                              snapshot={acc.avatarSnapshot}
                              portrait
                              height={52}
                              className="w-full h-full pointer-events-none"
                            />
                          )}
                          {isActive && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161820] flex items-center justify-center">
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Name and QB ID */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-[16px] font-extrabold text-slate-900 dark:text-white truncate tracking-tight">
                              {acc.displayName || acc.username}
                            </h3>
                            {isActive && (
                              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400 truncate">
                            @{acc.username}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-[7px] bg-slate-100 dark:bg-white/[0.06] text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5">
                              {acc.customId || `QB-${acc.uid.slice(0, 6).toUpperCase()}`}
                            </span>
                          </div>
                        </div>

                        {/* Remove account option */}
                        <button
                          type="button"
                          onClick={(e) => handleRemove(acc.uid, e)}
                          className="press h-8 w-8 rounded-[10px] grid place-items-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Remove from saved accounts"
                          aria-label="Remove account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Button in Login and Signup style */}
                      <div className="pt-0.5">
                        <ShinyButton
                          type="button"
                          variant="white"
                          onClick={() => handleAccountAction(acc)}
                          className="w-full h-[42px] text-[13.5px] font-bold shadow-xs hover:border-[#fa4616]/30"
                        >
                          {isActive ? "Continue as Active" : "Log In"}
                        </ShinyButton>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Area: The "OTHER" Button */}
          <div className="pt-6 pb-2">
            <button
              type="button"
              onClick={handleOpenOther}
              className="press w-full h-[52px] rounded-[18px] bg-gradient-to-r from-[#ff6b35] via-[#fa4616] to-[#ff521a] hover:opacity-95 active:scale-[0.99] text-white font-extrabold text-[15px] tracking-wider flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(250,70,22,0.32)] transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              OTHER
            </button>
            <p className="mt-2.5 text-center text-[11.5px] font-medium text-slate-400 dark:text-slate-500">
              Sign in with another account or create a brand new one
            </p>
          </div>
        </div>

        {/* Auth Bottom Sheet (opens like fragments and events) */}
        <AuthBottomSheet
          open={authSheetOpen}
          onClose={() => setAuthSheetOpen(false)}
          defaultIdentifier={selectedIdentifier}
          defaultMode={authMode}
          onSuccess={() => {
            setAccounts(getSavedAccounts());
            nav({ to: "/" as never });
          }}
        />
      </div>
    </MobileShell>
  );
}
