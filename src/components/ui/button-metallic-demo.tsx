"use client";

import MetallicButton from "@/components/ui/button-metallic";
import { ArrowUpRight, Sparkles } from "lucide-react";

export default function ButtonMetallicDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 px-6 py-10">
      <MetallicButton>
        Continue
        <ArrowUpRight className="size-4" />
      </MetallicButton>
      <MetallicButton size="sm">
        <Sparkles className="size-3.5" />
        Generate
      </MetallicButton>
      <MetallicButton size="icon" aria-label="Magic tools">
        <Sparkles className="size-4" />
      </MetallicButton>
    </div>
  );
}
