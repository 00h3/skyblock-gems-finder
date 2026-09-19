import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Play,
  Layers,
  Sparkles,
  Code2,
  Move3d,
  Save,
  ShieldCheck,
  Terminal,
  Sun,
  X,
  ChevronRight,
  ChevronLeft,
  User,
} from "lucide-react";
import { WowAudio } from "./wow-audio";

interface WowTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStarter?: (presetKey: string) => void;
}

export function WowTutorialModal({ isOpen, onClose, onSelectStarter }: WowTutorialModalProps) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: Play,
      color: "#ff5722",
      title: "1. Instant Spawn & Play (F5)",
      desc: "Switch between free-flight Build Mode and playable Character Mode with zero delay. In Play mode, you can run, jump, collect coins, and trigger game logic in real time.",
      tip: "Shortcut: Press F5 on desktop to instantly toggle test play!",
    },
    {
      icon: Layers,
      color: "#3b82f6",
      title: "2. Template Starter Maps",
      desc: "Choose from 3 built-in starter templates to get inspired: Flat Grass, Parkour Obby course with floating islands, or a Battle Arena.",
      tip: "Use the Starters menu in the top bar to load a template anytime.",
    },
    {
      icon: Move3d,
      color: "#10b981",
      title: "3. 3D Transform Gizmos & Drag",
      desc: "Click any block or NPC to reveal red (X), green (Y), and blue (Z) arrows. Drag along axes to reposition with 1.0 or 0.5 grid snapping.",
      tip: "Orange bounding box indicates the actively selected entity.",
    },
    {
      icon: Sparkles,
      color: "#f59e0b",
      title: "4. Trigger / Event Dropdowns",
      desc: "Select an object and choose its logic event from the Right Properties Drawer: Kill Player, Give Coins, Checkpoints, Jump Pads, or NPC Dialog.",
      tip: "Combine Kill Bricks and Jump Pads to make intense parkour obby levels!",
    },
    {
      icon: Code2,
      color: "#8b5cf6",
      title: "5. Q_Script & JSON Code Editor",
      desc: "Open the code dock ({}) to inspect the live translated Q_Script for all scene triggers or copy the raw JSON map definition.",
      tip: "Everything is real-time and updates as you place blocks.",
    },
    {
      icon: Move3d,
      color: "#06b6d4",
      title: "6. Free-Cam Flying Controls",
      desc: "In Edit Mode, fly effortlessly around your world using WASD keys, Space to ascend, Shift to descend, and right-click drag to look around.",
      tip: "On mobile, use touch swipe to orbit and pinch to zoom in/out.",
    },
    {
      icon: Save,
      color: "#ec4899",
      title: "7. Local Save & Export .json",
      desc: "1-click save saves your progress directly to local storage. Click 'Export .json' to download and share your game map file with friends.",
      tip: "No cloud publishing required—everything stays safely on your machine.",
    },
    {
      icon: ShieldCheck,
      color: "#14b8a6",
      title: "8. Collision & Gravity Toggles",
      desc: "Every block has CanCollide and Anchored properties. Turn collision off for ghost blocks, secret rooms, or floating coin pickups.",
      tip: "Items with CanCollide: false let players pass right through them.",
    },
    {
      icon: Terminal,
      color: "#64748b",
      title: "9. Live Console & Output Drawer",
      desc: "The sliding console window at the bottom catches Q_Script print statements, object placement events, and player respawns.",
      tip: "Click the console bar to minimize or expand at any time.",
    },
    {
      icon: Sun,
      color: "#eab308",
      title: "10. Skybox & Lighting Presets",
      desc: "Switch your game environment with 1 click between vibrant Day, warm Sunset, mysterious Night, and futuristic Sci-Fi Space.",
      tip: "Different skyboxes adjust both fog and shadow tone dynamically.",
    },
  ];

  if (!isOpen) return null;

  const current = steps[activeStep];
  const StepIcon = current.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 font-['Inter',sans-serif]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: "blur(12px)", y: 20 }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
          exit={{ opacity: 0, scale: 0.96, filter: "blur(8px)", y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-white/15 bg-[#14161d] text-white shadow-2xl shadow-black/80"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#181a22] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#fa4616] to-[#f59e0b] shadow-md shadow-[#fa4616]/30">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-[16px] font-black text-white flex items-center gap-2">
                  WoW Studio 1.0 Guide
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    Step {activeStep + 1} of {steps.length}
                  </span>
                </h3>
                <p className="text-[11.5px] text-zinc-400">
                  Master the 10 core features of the Voxel &amp; Q_Script engine
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="press grid h-8 w-8 place-items-center rounded-full bg-white/10 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* NPC Guide Dialog Bubble */}
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500 text-black font-black text-[14px] shadow-sm">
                Ned
              </div>
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                  NPC Guide Ned:
                </div>
                <p className="text-[13px] text-zinc-200 mt-0.5">
                  &ldquo;Welcome builder! WoW Studio 1.0 lets you construct parkour courses, arenas,
                  and adventure maps with interactive Q_Script triggers.&rdquo;
                </p>
              </div>
            </div>

            {/* Slide Content */}
            <div className="rounded-2xl border border-white/10 bg-[#0e1015] p-5">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg"
                  style={{ backgroundColor: current.color }}
                >
                  <StepIcon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-[17px] font-black text-white">{current.title}</h4>
                  <p className="text-[12px] text-zinc-400">Feature Highlight</p>
                </div>
              </div>

              <p className="mt-4 text-[13.5px] leading-relaxed text-zinc-300">{current.desc}</p>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-amber-300 font-medium">
                💡 <strong className="text-white">Pro-tip:</strong> {current.tip}
              </div>
            </div>

            {/* Step Selector Dots */}
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveStep(i);
                    WowAudio.click();
                  }}
                  className={`h-2 rounded-full transition-all ${
                    i === activeStep ? "w-6 bg-[#fa4616]" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between border-t border-white/10 bg-[#181a22] px-6 py-4">
            <button
              disabled={activeStep === 0}
              onClick={() => {
                setActiveStep((s) => Math.max(0, s - 1));
                WowAudio.click();
              }}
              className="press flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[12.5px] font-bold text-zinc-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => {
                  setActiveStep((s) => Math.min(steps.length - 1, s + 1));
                  WowAudio.click();
                }}
                className="press flex items-center gap-1 rounded-xl bg-[#fa4616] px-5 py-2 text-[12.5px] font-extrabold text-white shadow-md shadow-[#fa4616]/30 hover:brightness-110"
              >
                Next Step
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  WowAudio.playStart();
                  onClose();
                }}
                className="press flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#fa4616] to-[#f59e0b] px-5 py-2 text-[13px] font-black text-white shadow-lg shadow-[#fa4616]/30 hover:brightness-110"
              >
                Start Building Now
                <Sparkles className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
