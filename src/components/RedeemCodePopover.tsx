import { useState } from "react";
import { Check, CheckCircle2, CircleAlert, Gift, Sparkles, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import qblockPlusIcon from "@/assets/qblock-plus-icon.png";

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

export function RedeemCodePopover({ iconOnly = false }: { iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
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

    if (FEATURED_CODES.some((item) => item.code === toCheck)) {
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`redeem-code-trigger press ${iconOnly ? "h-9 w-9" : "h-9 px-2.5"} flex shrink-0 items-center justify-center gap-1.5 rounded-[11px]`}
        aria-label="Open redeem code"
      >
        <img src={qblockPlusIcon} alt="" className="h-5 w-5 object-contain" />
        {!iconOnly && <span>Redeem</span>}
      </button>

      {open && (
        <div className="redeem-code-shell fixed inset-0 z-[200] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close redeem code"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <section
            aria-label="Redeem code"
            className="relative w-full max-w-[440px] overflow-hidden rounded-t-[30px] bg-[#f4f6f8] shadow-[0_-14px_45px_rgba(20,24,32,.28)] animate-sheet-up"
          >
            <div className="flex justify-center pt-2.5">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>
            <div className="flex items-center justify-between border-b border-black/[.06] px-5 pb-3 pt-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#8b929d]">
                  QBLOCK rewards
                </p>
                <h2 className="mt-1 text-[23px] font-black tracking-[-.05em] text-[#17181b]">
                  Redeem a code
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/5"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-[#555]" />
              </button>
            </div>

            <div className="max-h-[82dvh] overflow-y-auto px-4 pb-7 pt-4">
              <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#272c36] via-[#1c2028] to-[#14171d] p-4 text-white shadow-[0_10px_25px_rgba(15,23,42,0.15)]">
                <div className="relative z-10 flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white/10 ring-1 ring-white/15">
                    <Gift className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 text-[13px] font-black">
                      Claim free perks
                      <Sparkles className="h-3.5 w-3.5 text-pink-300" />
                    </div>
                    <p className="mt-0.5 text-[10.5px] font-medium text-white/60">
                      Enter a community code to unlock drops.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-[20px] border border-black/[.07] bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-[#f1f3f5] text-[#5d636e]">
                    <Ticket className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[13px] font-black text-[#17181b]">Enter redeem code</div>
                    <div className="text-[10.5px] font-semibold text-[#9aa1ab]">
                      Codes are case-insensitive
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value);
                      setMessage("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleRedeem();
                    }}
                    placeholder="e.g. BIGNOOB20"
                    className="min-w-0 flex-1 rounded-[13px] bg-[#f1f3f5] px-3.5 text-[12px] font-mono font-bold tracking-wider text-[#17181b] outline-none ring-1 ring-inset ring-black/[.05] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#9aa1ab] focus:ring-[#ec4899]/40"
                  />
                  <button
                    type="button"
                    onClick={() => handleRedeem()}
                    disabled={!code.trim()}
                    className="h-11 shrink-0 rounded-[13px] bg-gradient-to-r from-[#f472b6] to-[#ec4899] px-4 text-[12px] font-black text-white shadow-[0_3px_9px_rgba(236,72,153,.28)] disabled:opacity-40"
                  >
                    Redeem
                  </button>
                </div>
                {message && (
                  <div className="mt-3 flex items-center gap-2 rounded-[13px] bg-[#fff5f8] p-2.5 text-[11px] font-bold text-[#be185d]">
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {message}
                  </div>
                )}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-[12px] font-black uppercase tracking-[.12em] text-[#555d68]">
                    Featured codes
                  </h3>
                  <span className="text-[10px] font-bold text-[#9aa1ab]">Tap to redeem</span>
                </div>
                <div className="space-y-2">
                  {FEATURED_CODES.map((item) => {
                    const isRedeemed = redeemedCodes.has(item.code);
                    return (
                      <button
                        key={item.code}
                        type="button"
                        disabled={isRedeemed}
                        onClick={() => handleRedeem(item.code)}
                        className={`flex w-full items-center justify-between rounded-[16px] border p-3 text-left transition-transform active:scale-[.99] ${
                          isRedeemed
                            ? "border-black/[.04] bg-[#eef0f2] opacity-70"
                            : "border-black/[.07] bg-white shadow-[0_3px_10px_rgba(18,28,38,.05)]"
                        }`}
                      >
                        <span className="min-w-0 pr-2">
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-black tracking-wider text-[#be185d]">
                              {item.code}
                            </span>
                            <span className="rounded-full bg-[#fce7f3] px-1.5 py-0.5 text-[8px] font-black text-[#9d174d]">
                              {item.tag}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-[12px] font-extrabold text-[#17181b]">
                            {item.title}
                          </span>
                          <span className="block truncate text-[10.5px] font-medium text-[#8b929d]">
                            {item.desc}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-[10px] bg-[#17181b] px-2.5 py-1.5 text-[10px] font-black text-white">
                          {isRedeemed ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Claimed
                            </span>
                          ) : (
                            "Claim"
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {successModal && (
        <div className="redeem-code-shell fixed inset-0 z-[260] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[340px] rounded-[24px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-7 w-7 stroke-[3]" />
            </div>
            <h3 className="mt-3 text-[19px] font-black text-[#17181b]">Code redeemed!</h3>
            <p className="mt-1 text-[12px] text-[#737982]">
              <span className="font-mono font-bold text-[#be185d]">{successModal}</span> has been
              added to your profile.
            </p>
            <button
              type="button"
              onClick={() => setSuccessModal(null)}
              className="mt-5 h-11 w-full rounded-[13px] bg-gradient-to-r from-[#f472b6] to-[#ec4899] text-[13px] font-black text-white"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
