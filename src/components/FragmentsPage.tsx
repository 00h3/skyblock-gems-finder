import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";

/**
 * Fragments Page - Blank view as requested
 */
export function FragmentsPage() {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="app-page min-h-screen bg-[#f5f6f7] dark:bg-[#0d0e14] flex flex-col select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#111218]">
          <button
            type="button"
            onClick={() => navigate({ to: "/" as never })}
            className="press flex items-center gap-1.5 h-8 px-2.5 rounded-[10px] text-[13px] font-bold text-[#475569] dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-[15px] font-extrabold text-[#1e293b] dark:text-white">
            Fragments
          </span>
          <div className="w-12" />
        </div>

        {/* Under construction */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <p className="text-[17px] font-black text-[#17191d] dark:text-white font-lilita tracking-wide">
            Under construction
          </p>
        </div>
      </div>
    </MobileShell>
  );
}
