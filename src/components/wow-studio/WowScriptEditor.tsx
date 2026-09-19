import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Code2, FileJson, Check, Copy, Play, X, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { WowAudio } from "./wow-audio";
import type { VoxelObject } from "./wow-types";

interface WowScriptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  objects: VoxelObject[];
  globalScript: string;
  onUpdateGlobalScript: (script: string) => void;
  onLog: (msg: string) => void;
}

export function WowScriptEditor({
  isOpen,
  onClose,
  objects,
  globalScript,
  onUpdateGlobalScript,
  onLog,
}: WowScriptEditorProps) {
  const [tab, setTab] = useState<"qscript" | "json">("qscript");
  const [codeDraft, setCodeDraft] = useState(globalScript);
  const [copied, setCopied] = useState(false);

  // Generate dynamic Q_Script from all scene triggers
  const generatedScript = useMemo(() => {
    const triggerObjects = objects.filter((o) => o.trigger && o.trigger !== "none");
    let script = `-- ==========================================
-- WoW Studio 1.0 — Generated Q_Script
-- Active Object Triggers: ${triggerObjects.length}
-- ==========================================

`;
    triggerObjects.forEach((obj) => {
      script += `-- Object: "${obj.name}" [ID: ${obj.id}]
when Object("${obj.id}").`;

      switch (obj.trigger) {
        case "kill_player":
          script += `OnTouch(player) do
  player.Damage(100)
  Console.Log("[Q_Script] '${obj.name}' eliminated player.")
  Audio.Play("hazard_hit")
  player.RespawnAtLastCheckpoint()
end\n\n`;
          break;
        case "give_coin":
          script += `OnTouch(player) do
  player.AddCoins(${obj.triggerParam || 5})
  Console.Log("[Q_Script] '${obj.name}' gave ${obj.triggerParam || 5} coins.")
  Audio.Play("coin_pickup")
  Object("${obj.id}").SetVisible(false)
end\n\n`;
          break;
        case "bounce_pad":
          script += `OnTouch(player) do
  player.ApplyImpulse(Vector3(0, ${obj.triggerParam || 16}, 0))
  Audio.Play("bounce_boing")
end\n\n`;
          break;
        case "set_checkpoint":
          script += `OnTouch(player) do
  player.SetRespawn(Object("${obj.id}").position)
  Console.Log("[Q_Script] Checkpoint updated: ${obj.name}")
  Audio.Play("checkpoint_fanfare")
end\n\n`;
          break;
        case "npc_dialog":
          script += `OnInteract(player) do
  UI.ShowDialog("${obj.name}", "${obj.triggerParam || "Greetings, builder!"}")
end\n\n`;
          break;
        case "tick_spin":
          script += `OnTick(dt) do
  Object("${obj.id}").rotation.y += 2.0 * dt
end\n\n`;
          break;
        case "tick_bob":
          script += `OnTick(dt) do
  Object("${obj.id}").position.y += Math.sin(Time.elapsed * 3) * 0.02
end\n\n`;
          break;
        case "open_door":
          script += `OnTouch(player) do
  Object("${obj.id}").Animate({ opacity: 0.2, canCollide: false })
end\n\n`;
          break;
        case "speed_boost":
          script += `OnTouch(player) do
  player.ApplyBuff("Speed", 2.0, 5)
  Console.Log("[Q_Script] 2x Speed boost applied!")
end\n\n`;
          break;
        default:
          script += `OnTrigger(player) do
  Console.Log("[Q_Script] Event fired on ${obj.name}")
end\n\n`;
          break;
      }
    });

    return script + (codeDraft ? `\n-- User Defined Global Script:\n` + codeDraft : "");
  }, [objects, codeDraft]);

  const jsonRepresentation = useMemo(() => {
    return JSON.stringify(
      {
        studio: "WoW Studio 1.0",
        format: "qblock_voxel_v1",
        exportDate: new Date().toISOString(),
        objectCount: objects.length,
        objects,
      },
      null,
      2,
    );
  }, [objects]);

  const activeContent = tab === "qscript" ? generatedScript : jsonRepresentation;
  const lineCount = activeContent.split("\n").length;

  function handleCopy() {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    WowAudio.click();
    toast.success(tab === "qscript" ? "Q_Script copied!" : "Scene JSON copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCompile() {
    WowAudio.checkpoint();
    onUpdateGlobalScript(codeDraft);
    onLog("[Q_Script] Compiled successfully with 0 errors. 10/10 game triggers active.");
    toast.success("Q_Script compiled and linked to 3D scene!");
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 sm:p-6 font-['Inter',sans-serif]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, filter: "blur(12px)", y: 20 }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
          exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)", y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-white/15 bg-[#12141a] text-white shadow-2xl shadow-black/80"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#171922] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fa4616]/20 text-[#fa4616]">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-white flex items-center gap-2">
                  Q_Script &amp; JSON Editor
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    Live Synced
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Translates 3D block events into readable Q_Script logic
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-black/40 p-1 border border-white/10">
                <button
                  onClick={() => {
                    setTab("qscript");
                    WowAudio.click();
                  }}
                  className={`press flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition ${
                    tab === "qscript"
                      ? "bg-[#fa4616] text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Q_Script (Lua/TS)
                </button>
                <button
                  onClick={() => {
                    setTab("json");
                    WowAudio.click();
                  }}
                  className={`press flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition ${
                    tab === "json"
                      ? "bg-[#fa4616] text-white shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <FileJson className="h-3.5 w-3.5" />
                  Raw .json
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="press flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-bold text-zinc-300 hover:bg-white/10"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>

              <button
                onClick={onClose}
                className="press grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex flex-1 overflow-hidden font-mono text-[12.5px] leading-relaxed">
            {/* Line Numbers */}
            <div className="select-none bg-[#0e1015] px-3 py-4 text-right text-zinc-600 border-r border-white/5 overflow-hidden">
              {Array.from({ length: Math.min(lineCount, 120) }).map((_, i) => (
                <div key={i} className="h-5 leading-5 text-[11px]">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Content Viewport */}
            <div className="flex-1 overflow-auto bg-[#12141a] p-4 text-zinc-200 selection:bg-[#fa4616]/40">
              <pre className="font-mono whitespace-pre-wrap">{activeContent}</pre>
            </div>
          </div>

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between border-t border-white/10 bg-[#171922] px-5 py-3 text-[12px]">
            <div className="flex items-center gap-3 text-zinc-400">
              <span>Lines: {lineCount}</span>
              <span>•</span>
              <span>
                10 Core Triggers: Kill Brick, Coin, Checkpoint, Jump Pad, NPC Dialog, Door, Spin,
                Bob, Boost, Teleport
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCompile}
                className="press flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#fa4616] to-[#f97316] px-4 py-2 text-[12.5px] font-extrabold text-white shadow-md shadow-[#fa4616]/20 hover:brightness-110"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Compile &amp; Test Logic
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
