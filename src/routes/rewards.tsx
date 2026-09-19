import { createFileRoute } from "@tanstack/react-router";
import { SubPage } from "@/components/SubPage";
import { Check, Gift, Sparkles, ArrowRight, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/rewards")({
  head: () => ({ meta: [{ title: "Redeem Codes — QBLOCK" }] }),
  component: RewardsPage,
});

const FEATURED_CODES = [
  {
    code: "BIGNOOB20",
    title: "New Player Perk",
    desc: "20 Free Q-Coins + Starter Badge",
    tag: "POPULAR",
  },
  { code: "LADYBUG2026", title: "Ladybug Event", desc: "Special Creator World Pass", tag: "NEW" },
  {
    code: "QBLOCKPRO",
    title: "Pro Builder Pack",
    desc: "Exclusive Building Materials",
    tag: "SPECIAL",
  },
];

function RewardsPage() {
  const [code, setCode] = useState("");
  const [redeemedCodes, setRedeemedCodes] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [successModal, setSuccessModal] = useState<string | null>(null);

  function handleRedeem(targetCode?: string) {
    const toCheck = (targetCode || code).trim().toUpperCase();
    if (!toCheck) return;

    if (redeemedCodes.has(toCheck)) {
      setMessage(`You have already redeemed ${toCheck}!`);
      return;
    }

    if (toCheck === "BIGNOOB20" || toCheck === "LADYBUG2026" || toCheck === "QBLOCKPRO") {
      setRedeemedCodes((prev) => new Set([...prev, toCheck]));
      setSuccessModal(toCheck);
      setMessage("");
      setCode("");
      toast.success(`Successfully redeemed ${toCheck}!`);
    } else {
      setMessage("Invalid reward code. Try one of the featured codes below!");
    }
  }

  return (
    <SubPage title="Redeem Code">
      <div className="min-h-full bg-slate-50 dark:bg-[#0e0f12] px-4 pb-12 pt-4">
        {/* Banner Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-6 text-white shadow-lg shadow-amber-500/20">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-black/20 backdrop-blur-md px-3 py-1 text-[10px] font-black tracking-wider uppercase text-amber-100">
                <Sparkles className="h-3 w-3 fill-amber-300 text-amber-300" />
                QBLOCK Rewards
              </div>
              <h2 className="mt-2.5 text-[22px] font-black tracking-tight leading-tight">
                Claim Free Perks & Drops
              </h2>
              <p className="mt-1 text-[12px] text-amber-100/90 max-w-[240px] leading-relaxed font-medium">
                Enter secret promotional codes to unlock coins, cosmetics, and passes.
              </p>
            </div>
            <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 grid place-items-center shadow-inner">
              <Gift className="h-9 w-9 text-white fill-white/20 stroke-[1.8]" />
            </div>
          </div>
        </div>

        {/* Featured Codes */}
        <div className="mt-6">
          <div className="px-1 mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Featured Community Codes
            </h3>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              Tap to redeem
            </span>
          </div>

          <div className="space-y-2.5">
            {FEATURED_CODES.map((item) => {
              const isRedeemed = redeemedCodes.has(item.code);
              return (
                <div
                  key={item.code}
                  onClick={() => {
                    if (!isRedeemed) handleRedeem(item.code);
                  }}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    isRedeemed
                      ? "bg-slate-100/80 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-75"
                      : "bg-white dark:bg-[#17191e] border-slate-200/80 dark:border-white/10 hover:border-amber-400/60 shadow-sm active:scale-[0.99]"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[13px] text-amber-600 dark:text-amber-400 tracking-wider">
                        {item.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-black">
                        {item.tag}
                      </span>
                    </div>
                    <div className="mt-1 text-[13px] font-extrabold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    <div className="text-[11.5px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {item.desc}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isRedeemed}
                    className={`px-3.5 py-2 rounded-xl text-[12px] font-extrabold shrink-0 flex items-center gap-1 transition-all ${
                      isRedeemed
                        ? "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow"
                    }`}
                  >
                    {isRedeemed ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Claimed
                      </>
                    ) : (
                      "Claim"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Success Modal */}
        {successModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#181a20] p-6 text-center border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto grid place-items-center shadow-inner">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-[20px] font-black text-slate-900 dark:text-white">
                  Code Redeemed!
                </h3>
                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                  You successfully claimed{" "}
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {successModal}
                  </span>
                  ! Your items have been added to your profile.
                </p>
              </div>
              <button
                onClick={() => setSuccessModal(null)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[14px] shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
              >
                Awesome!
              </button>
            </div>
          </div>
        )}
      </div>
    </SubPage>
  );
}
