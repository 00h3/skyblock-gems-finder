"use client";

import { useState } from "react";
import { ThemeSwitcher } from "@/components/ui/apple-liquid-glass-switcher";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import "@/index.css";

export function DemoOne() {
  return (
    <div className="relative h-[200px] w-[800px]">
      <LiquidButton className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        Liquid Glass
      </LiquidButton>
    </div>
  );
}

export default function Demo() {
  const [theme, setTheme] = useState<"light" | "dark" | "dim">("light");

  return (
    <div
      data-theme={theme}
      className="theme-provider min-h-screen w-full flex items-center justify-center p-8 transition-colors duration-500"
    >
      <div className="article max-w-md w-full p-8 rounded-3xl shadow-xl transition-all duration-500">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Liquid Glass</h1>
          <ThemeSwitcher value={theme} onValueChange={setTheme} />
        </header>

        <main className="space-y-4">
          <p className="text-sm opacity-80 leading-relaxed">
            Experience the fluid elegance of the Apple-inspired liquid glass theme switcher. Notice
            the organic transitions and dynamic filter effects.
          </p>

          <div className="flex justify-center py-4">
            <LiquidButton>Interactive Liquid Button</LiquidButton>
          </div>

          <div className="h-24 rounded-2xl bg-current opacity-5 w-full transition-opacity duration-300" />

          <p className="text-xs opacity-60">
            Current theme: <span className="font-semibold uppercase">{theme}</span>
          </p>
        </main>
      </div>
    </div>
  );
}
