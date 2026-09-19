import { MobileShell } from "@/components/MobileShell";
import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function SubPage({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <MobileShell hideNav>
      <div className="app-page min-h-full flex flex-col">
        <header className="subpage-header compact-gloss-header sticky top-0 z-30">
          <div className="h-[56px] px-2.5 flex items-center gap-1">
            <button
              onClick={() => router.history.back()}
              className="press liquid-button liquid-button-ghost android-control h-10 w-10 grid place-items-center -ml-1 rounded-full"
              aria-label="Back"
            >
              <ChevronLeft className="h-[20px] w-[20px] text-[#626771]" strokeWidth={2.4} />
            </button>
            <div className="ml-1 flex-1 min-w-0">
              <div className="app-eyebrow">QBLOCK</div>
              <h1 className="mt-1 text-[21px] font-bold tracking-[-0.04em] truncate">{title}</h1>
            </div>
            {right}
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </MobileShell>
  );
}
