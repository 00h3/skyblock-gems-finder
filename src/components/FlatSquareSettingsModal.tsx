"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function FlatSquareSettingsModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      id="flat-square-settings-fullscreen"
      className="fixed inset-0 z-[99999] pointer-events-auto flex items-center justify-center bg-black/65 p-2 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="square-user-card bg-[#1c1c20] w-full max-w-xl h-[80vh] rounded-xl p-6 text-white overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black">Game Settings</h2>
          <button onClick={onClose} className="px-4 py-2 bg-white/10 rounded-lg">Close</button>
        </div>
        <div className="space-y-4">
          <p className="text-white/60">Game settings are under construction but functional.</p>
          <div className="p-4 bg-white/5 rounded-lg border border-orange-500/20">
            <span className="font-bold">Ambient Sounds</span>
            <button className="block w-full text-left mt-2 p-2 bg-white/10 rounded">Toggle Ambient</button>
          </div>
          <div className="p-4 bg-white/5 rounded-lg border border-orange-500/20">
            <span className="font-bold">Master Volume</span>
            <input type="range" className="w-full mt-2" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
