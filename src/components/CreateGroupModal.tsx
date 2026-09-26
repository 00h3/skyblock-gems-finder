import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  DEFAULT_RULES_TEMPLATES,
  SERVER_ICON_PACK,
  createGroupChat,
} from "@/lib/group-chat";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

const RUNNING_CAT_GIF = "https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    uid: string;
    displayName: string;
    username?: string;
  } | null;
  onGroupCreated: (groupId: string) => void;
}

type WizardStep = "identity" | "icon" | "rules" | "review";

const HYPE_PRESETS = [
  { label: "500 Hype", value: "Reach 500 Hype & assemble our starter squad" },
  { label: "1,000 Hype", value: "Reach 1,000 Hype & level up the squad" },
  { label: "2,500 Hype", value: "Reach 2,500 Hype & unlock squad tournaments" },
  { label: "5,000 Hype", value: "Reach 5,000 Hype & establish elite server status" },
];

export function CreateGroupModal({
  isOpen,
  onClose,
  currentUser,
  onGroupCreated,
}: CreateGroupModalProps) {
  const [step, setStep] = useState<WizardStep>("identity");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIconId, setSelectedIconId] = useState<string>(SERVER_ICON_PACK[0].id);
  const [customPfpUrl, setCustomPfpUrl] = useState<string>(
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
  );
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [goal, setGoal] = useState("Reach 1,000 Hype & level up the squad");
  const [selectedRules, setSelectedRules] = useState<string[]>([
    DEFAULT_RULES_TEMPLATES[0],
    DEFAULT_RULES_TEMPLATES[1],
  ]);
  const [newRuleInput, setNewRuleInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const effectiveUid = currentUser?.uid || "guest-owner";
  const effectiveName = currentUser?.displayName || currentUser?.username || "Player";
  const activeIcon = SERVER_ICON_PACK.find((i) => i.id === selectedIconId) || SERVER_ICON_PACK[0];

  function toggleRule(rule: string) {
    if (selectedRules.includes(rule)) {
      setSelectedRules(selectedRules.filter((r) => r !== rule));
    } else {
      setSelectedRules([...selectedRules, rule]);
    }
  }

  function handleAddCustomRule() {
    if (!newRuleInput.trim()) return;
    if (!selectedRules.includes(newRuleInput.trim())) {
      setSelectedRules([...selectedRules, newRuleInput.trim()]);
    }
    setNewRuleInput("");
  }

  async function handleFinishCreate() {
    if (!name.trim()) {
      toast.error("Please enter a group name.");
      setStep("identity");
      return;
    }

    setLoading(true);
    try {
      const newGroupId = await createGroupChat({
        name: name.trim(),
        description: description.trim() || "Active squad hangout",
        goal: goal.trim() || "Reach 1,000 Hype & level up the squad",
        customPfpUrl: useCustomUrl ? customPfpUrl : "",
        iconId: selectedIconId,
        rules: selectedRules,
        ownerUid: effectiveUid,
        ownerName: effectiveName,
        isPublic: true,
      });

      toast.success(`Server "${name.trim()}" created!`);
      onGroupCreated(newGroupId);
      onClose();
    } catch (err) {
      console.error("Failed to create group:", err);
      toast.error("Could not create group. Please check connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (step === "identity") {
      if (!name.trim()) {
        toast.error("Please enter a server name");
        return;
      }
      setStep("icon");
    } else if (step === "icon") {
      setStep("rules");
    } else if (step === "rules") {
      setStep("review");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FULL PAGE 4-STEP SERVER CREATOR: FRAGMENTS & EVENTS STYLE (NO POPUP, ZERO FLUFF)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[999] w-screen h-screen bg-[#060709] text-white flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* Full Screen Header */}
      <header className="w-full px-5 sm:px-8 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-md">
        {step !== "identity" ? (
          <button
            type="button"
            onClick={() => {
              if (step === "icon") setStep("identity");
              else if (step === "rules") setStep("icon");
              else if (step === "review") setStep("rules");
            }}
            className="press h-9 px-4 rounded-[14px] bg-white/10 hover:bg-white/15 flex items-center gap-2 text-[12.5px] font-medium text-white cursor-pointer transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        <div className="flex items-center gap-2 text-[12.5px] font-semibold tracking-wider text-neutral-300 uppercase">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Server Setup</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="press h-9 px-4 rounded-[14px] bg-white/10 hover:bg-white/15 text-[12.5px] font-medium text-neutral-300 hover:text-white cursor-pointer transition"
        >
          Close
        </button>
      </header>

      {/* Full Screen Fragment Canvas */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {/* STEP 1: NAME & TOPIC (FRAGMENTS) */}
          {step === "identity" && (
            <motion.div
              key="step-identity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-5 my-auto"
            >
              <motion.div
                initial={{ opacity: 0, x: -60, y: -20, rotate: -3, scale: 0.92, filter: "blur(18px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 150, damping: 18, delay: 0.05 }}
                className="md:col-span-7 p-6 sm:p-8 rounded-[28px] bg-white/[0.04] border border-white/10 space-y-4 hover:border-white/20 transition shadow-xl"
              >
                <div className="space-y-1">
                  <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-white">
                    Name Your Server
                  </h1>
                  <p className="text-[13px] text-neutral-400">
                    Give your community a name and description
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Server Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Phoenix Builders"
                    maxLength={40}
                    autoFocus
                    className="w-full h-12 px-4 rounded-[16px] bg-white/5 border border-white/10 text-[14px] text-white outline-none placeholder:text-neutral-500 focus:border-white/30 transition"
                  />
                  <div className="text-right text-[11px] text-neutral-500 mt-1">
                    {name.length}/40
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                    Topic / About
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is your squad about? Base building, sky wars, tournaments..."
                    rows={3}
                    className="w-full p-4 rounded-[16px] bg-white/5 border border-white/10 text-[13.5px] text-white outline-none placeholder:text-neutral-500 resize-none focus:border-white/30 transition"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 60, y: 30, rotate: 4, scale: 0.92, filter: "blur(18px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 150, damping: 18, delay: 0.12 }}
                className="md:col-span-5 p-6 sm:p-8 rounded-[28px] bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-6 hover:border-white/20 transition shadow-xl"
              >
                <div>
                  <div className="text-[12px] font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                    Live Crest Preview
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-[20px] overflow-hidden border border-white/15 bg-white/5 shrink-0 flex items-center justify-center shadow-md">
                      <div className={`h-full w-full bg-gradient-to-br ${activeIcon.gradient} flex items-center justify-center text-white text-[20px] font-bold`}>
                        {name ? name.slice(0, 2).toUpperCase() : "SV"}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[17px] font-bold text-white truncate">
                        {name || "Untitled Server"}
                      </div>
                      <div className="text-[12.5px] text-neutral-400 line-clamp-2 mt-0.5">
                        {description || "Community squad hangout"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-[12px] text-neutral-300">
                    <span>Founder</span>
                    <span className="font-semibold text-white">{effectiveName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-neutral-300">
                    <span>Access</span>
                    <span className="text-emerald-400 font-semibold">Public Server</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: ICON & STYLE (FRAGMENTS) */}
          {step === "icon" && (
            <motion.div
              key="step-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-5 my-auto"
            >
              <motion.div
                initial={{ opacity: 0, x: -60, y: -20, rotate: -4, scale: 0.92, filter: "blur(18px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 150, damping: 18, delay: 0.05 }}
                className="md:col-span-5 p-6 sm:p-8 rounded-[28px] bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center text-center gap-4 hover:border-white/20 transition shadow-xl"
              >
                <div className="h-24 w-24 rounded-[26px] overflow-hidden border border-white/20 bg-white/5 shadow-2xl flex items-center justify-center">
                  {useCustomUrl && customPfpUrl ? (
                    <img src={customPfpUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-br ${activeIcon.gradient} flex items-center justify-center text-white text-[28px] font-bold`}
                    >
                      {name ? name.slice(0, 2).toUpperCase() : activeIcon.name.slice(0, 2)}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-[18px] font-bold text-white truncate max-w-[220px]">
                    {name || "Your Server"}
                  </h2>
                  <p className="text-[12.5px] text-neutral-400 mt-0.5">
                    {useCustomUrl ? "Custom Image Link" : activeIcon.name}
                  </p>
                </div>

                <div className="flex gap-2 w-full pt-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomUrl(false)}
                    className={`press flex-1 h-9 rounded-[14px] text-[12px] font-semibold cursor-pointer transition ${
                      !useCustomUrl ? "bg-white text-black" : "bg-white/10 text-neutral-300 hover:bg-white/15"
                    }`}
                  >
                    Themes
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomUrl(true)}
                    className={`press flex-1 h-9 rounded-[14px] text-[12px] font-semibold cursor-pointer transition ${
                      useCustomUrl ? "bg-white text-black" : "bg-white/10 text-neutral-300 hover:bg-white/15"
                    }`}
                  >
                    Image URL
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 60, y: 30, rotate: 4, scale: 0.92, filter: "blur(18px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 150, damping: 18, delay: 0.12 }}
                className="md:col-span-7 p-6 sm:p-8 rounded-[28px] bg-white/[0.04] border border-white/10 flex flex-col justify-between hover:border-white/20 transition shadow-xl"
              >
                {!useCustomUrl ? (
                  <div className="space-y-3">
                    <div className="text-[13px] font-bold tracking-wide uppercase text-white">
                      Choose Theme Crest
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                      {SERVER_ICON_PACK.map((icon) => {
                        const isSelected = selectedIconId === icon.id;
                        return (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => setSelectedIconId(icon.id)}
                            className={`press p-3 rounded-[18px] border flex flex-col items-center gap-2 cursor-pointer transition ${
                              isSelected
                                ? "border-white bg-white/15 shadow-md"
                                : "border-white/5 bg-white/5 hover:border-white/20"
                            }`}
                          >
                            <div
                              className={`h-11 w-11 rounded-[14px] bg-gradient-to-br ${icon.gradient} flex items-center justify-center text-white text-[14px] font-bold shadow-sm`}
                            >
                              {icon.name.slice(0, 1)}
                            </div>
                            <span className="text-[11px] font-medium truncate w-full text-center text-neutral-200">
                              {icon.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 my-auto">
                    <div className="text-[13px] font-bold tracking-wide uppercase text-white">
                      Custom Image Link
                    </div>
                    <input
                      type="text"
                      value={customPfpUrl}
                      onChange={(e) => setCustomPfpUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full h-12 px-4 rounded-[16px] bg-white/5 border border-white/10 text-[13.5px] text-white outline-none focus:border-white/30"
                    />
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* STEP 3: RULES / PACT (FRAGMENTS) */}
          {step === "rules" && (
            <motion.div
              key="step-rules"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-5 my-auto"
            >
              <motion.div
                initial={{ opacity: 0, x: -60, y: -20, rotate: -3, scale: 0.92, filter: "blur(18px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 150, damping: 18, delay: 0.05 }}
                className="md:col-span-7 p-6 sm:p-8 rounded-[28px] bg-white/[0.04] border border-white/10 space-y-4 hover:border-white/20 transition shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-white">
                    Community Pact
                  </h1>
                  <span className="text-[11.5px] font-semibold px-2.5 py-0.5 rounded-[8px] bg-white/10 text-neutral-300">
                    {selectedRules.length} Active
                  </span>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto hide-scrollbar pr-1">
                  {DEFAULT_RULES_TEMPLATES.map((rule, idx) => {
                    const active = selectedRules.includes(rule);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleRule(rule)}
                        className={`p-3.5 rounded-[16px] border text-[13px] font-normal cursor-pointer transition flex items-center justify-between gap-3 ${
                          active
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/15"
                        }`}
                      >
                        <span className="leading-snug">{rule}</span>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-[10px] shrink-0 ${
                            active
                              ? "bg-white text-black"
                              : "bg-white/10 text-neutral-400"
                          }`}
                        >
                          {active ? "Active" : "Off"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 60, y: 30, rotate: 3, scale: 0.92, filter: "blur(18px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 150, damping: 18, delay: 0.12 }}
                className="md:col-span-5 p-6 sm:p-8 rounded-[28px] bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-4 hover:border-white/20 transition shadow-xl"
              >
                <div>
                  <div className="text-[13px] font-bold tracking-wide uppercase text-white mb-2">
                    Add Custom Rule
                  </div>
                  <p className="text-[12.5px] text-neutral-400 mb-4">
                    Create rules tailored specifically to your squad's expectations.
                  </p>

                  <textarea
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    placeholder="e.g. Always share loot in dungeons..."
                    rows={3}
                    className="w-full p-3.5 rounded-[16px] bg-white/5 border border-white/10 text-[13px] text-white outline-none resize-none focus:border-white/30"
                  />

                  <button
                    type="button"
                    onClick={handleAddCustomRule}
                    className="press mt-3 w-full h-11 rounded-[16px] bg-white/10 hover:bg-white/15 text-white text-[12.5px] font-semibold cursor-pointer transition"
                  >
                    Add Rule
                  </button>
                </div>

                <div className="p-3.5 rounded-[16px] bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-300">
                  Members must scroll and agree to active rules before chatting.
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 4: LAUNCH REVIEW & LIVE EVENTS (FRAGMENTS) */}
          {step === "review" && (
            <motion.div
              key="step-review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-4 my-auto"
            >
              {/* FRAGMENT 1: SERVER CREST */}
              <motion.div
                initial={{ opacity: 0, x: -80, y: -40, rotate: -5, scale: 0.88, filter: "blur(20px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.05 }}
                className="md:col-span-7 p-6 rounded-[24px] bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-4 hover:border-white/20 transition shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-[22px] overflow-hidden border border-white/15 bg-white/5 shrink-0 flex items-center justify-center shadow-md">
                    {useCustomUrl && customPfpUrl ? (
                      <img src={customPfpUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div
                        className={`h-full w-full bg-gradient-to-br ${activeIcon.gradient} flex items-center justify-center text-white text-[24px] font-bold`}
                      >
                        {name ? name.slice(0, 2).toUpperCase() : "SV"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight truncate text-white">
                      {name || "Untitled Server"}
                    </h1>
                    <p className="text-[13px] text-neutral-400 line-clamp-2 mt-0.5">
                      {description || "Squad hangout"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <span className="text-[11.5px] font-medium px-3 py-1 rounded-[10px] bg-white/10 text-neutral-200">
                    {effectiveName}
                  </span>
                  <span className="text-[11.5px] font-medium px-3 py-1 rounded-[10px] bg-emerald-500/20 text-emerald-300">
                    Public
                  </span>
                </div>
              </motion.div>

              {/* FRAGMENT 2: HYPE RUSH EVENT */}
              <motion.div
                initial={{ opacity: 0, x: 80, y: -30, rotate: 5, scale: 0.88, filter: "blur(20px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.1 }}
                className="md:col-span-5 p-6 rounded-[24px] bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-3 hover:border-white/20 transition shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <img src={RUNNING_CAT_GIF} alt="" className="h-4 w-4 object-contain" />
                    <span className="text-[13px] font-bold tracking-wide uppercase text-white">Hype Rush</span>
                  </div>

                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Hype goal..."
                    className="w-full h-11 px-3.5 rounded-[14px] bg-white/5 border border-white/10 text-[13px] text-white outline-none focus:border-white/30"
                  />

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {HYPE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setGoal(preset.value)}
                        className={`press text-[11px] px-2.5 py-1 rounded-[10px] cursor-pointer transition ${
                          goal === preset.value
                            ? "bg-white text-black font-semibold"
                            : "bg-white/10 hover:bg-white/15 text-neutral-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* FRAGMENT 3: COMMUNITY PACT */}
              <motion.div
                initial={{ opacity: 0, x: -70, y: 50, rotate: 4, scale: 0.88, filter: "blur(20px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.15 }}
                className="md:col-span-6 p-6 rounded-[24px] bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-3 hover:border-white/20 transition shadow-lg"
              >
                <div className="text-[13px] font-bold tracking-wide uppercase text-white">
                  Community Pact
                </div>
                <div className="space-y-2 max-h-[160px] overflow-y-auto hide-scrollbar">
                  {selectedRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[14px] bg-white/5 border border-white/5 text-[12.5px] text-neutral-200"
                    >
                      {rule}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* FRAGMENT 4: LIVE EVENTS */}
              <motion.div
                initial={{ opacity: 0, x: 70, y: 50, rotate: -4, scale: 0.88, filter: "blur(20px)" }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.2 }}
                className="md:col-span-6 p-6 rounded-[24px] bg-white/[0.04] border border-white/10 flex flex-col justify-between gap-3 hover:border-white/20 transition shadow-lg"
              >
                <div className="text-[13px] font-bold tracking-wide uppercase text-white">
                  Live Events
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-[16px] bg-white/5 border border-white/5">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Genesis Launch
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1">Instant squad chat</div>
                  </div>
                  <div className="p-3.5 rounded-[16px] bg-white/5 border border-white/5">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      Squad Arena
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-1">Arcade & hype boosts</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full Screen Footer */}
      <footer className="w-full px-5 sm:px-8 py-4 border-t border-white/10 flex items-center justify-between shrink-0 bg-black/50 backdrop-blur-md">
        {step !== "identity" ? (
          <button
            type="button"
            onClick={() => {
              if (step === "icon") setStep("identity");
              else if (step === "rules") setStep("icon");
              else if (step === "review") setStep("rules");
            }}
            className="press h-12 px-6 rounded-[16px] bg-white/10 hover:bg-white/15 text-[13px] font-medium text-white cursor-pointer transition"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          disabled={loading}
          onClick={step === "review" ? handleFinishCreate : handleNext}
          className="press h-12 px-8 rounded-[16px] bg-white text-black text-[13.5px] font-bold cursor-pointer transition hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? "Launching..."
            : step === "review"
              ? "Launch Server"
              : "Continue"}
        </button>
      </footer>
    </div>
  );
}
