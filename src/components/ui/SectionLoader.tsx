import React from "react";
import { MobileShell } from "@/components/MobileShell";
import { HtmlSpinner } from "./HtmlLoadingScreen";

export function SectionLoader() {
  return (
    <MobileShell hideNav={true} scroll={false}>
      <div className="flex flex-col items-center justify-center min-h-dvh bg-white select-none">
        <HtmlSpinner size="lg" />
      </div>
    </MobileShell>
  );
}
