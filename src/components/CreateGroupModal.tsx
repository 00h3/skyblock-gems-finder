import React, { useState } from "react";
import { X, Plus, Trash2, ArrowLeft, Flame, Upload, Link2 } from "lucide-react";
import { DEFAULT_RULES_TEMPLATES, createGroupChat } from "@/lib/group-chat";
import { auth } from "@/lib/firebase";
import { ShinyButton } from "@/components/ui/shiny-button";
import { toast } from "sonner";

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

type WizardStep = "name" | "custom_pfp" | "rules" | "review";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "name", label: "Name" },
  { id: "custom_pfp", label: "Avatar" },
  { id: "rules", label: "Rules" },
  { id: "review", label: "Review" },
];

/**
 * Resizes and compresses image to safely fit Firestore size limits (~20-30KB)
 */
function compressAvatar(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function CreateGroupModal({
  isOpen,
  onClose,
  currentUser,
  onGroupCreated,
}: CreateGroupModalProps) {
  const [step, setStep] = useState<WizardStep>("name");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("Reach 1,000 Hype & level up the squad");
  const [customPfpUrl, setCustomPfpUrl] = useState<string>(
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
  );
  const [customPfpInput, setCustomPfpInput] = useState("");
  const [selectedRules, setSelectedRules] = useState<string[]>([
    DEFAULT_RULES_TEMPLATES[0],
    DEFAULT_RULES_TEMPLATES[1],
    DEFAULT_RULES_TEMPLATES[2],
  ]);
  const [customRuleInput, setCustomRuleInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  const effectiveUid =
    currentUser?.uid || auth.currentUser?.uid || "player_" + Math.random().toString(36).slice(2, 9);

  const effectiveName =
    currentUser?.displayName || currentUser?.username || auth.currentUser?.displayName || "Player";

  function toggleTemplateRule(rule: string) {
    if (selectedRules.includes(rule)) {
      setSelectedRules(selectedRules.filter((r) => r !== rule));
    } else {
      setSelectedRules([...selectedRules, rule]);
    }
  }

  function handleAddCustomRule() {
    const trimmed = customRuleInput.trim();
    if (!trimmed) return;
    const numberedRule = `${selectedRules.length + 1}. ${trimmed}`;
    setSelectedRules([...selectedRules, numberedRule]);
    setCustomRuleInput("");
  }

  function handleRemoveRule(index: number) {
    setSelectedRules(selectedRules.filter((_, i) => i !== index));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatar(file, 256);
      setCustomPfpUrl(compressed);
      toast.success("Custom avatar uploaded!");
    } catch {
      toast.error("Could not process image file.");
    }
  }

  async function handleFinishCreate() {
    if (!name.trim()) {
      toast.error("Please enter a group name.");
      setStep("name");
      return;
    }

    setLoading(true);
    try {
      const newGroupId = await createGroupChat({
        name: name.trim(),
        description: description.trim() || "Active community squad",
        goal: goal.trim(),
        customPfpUrl,
        rules: selectedRules,
        ownerUid: effectiveUid,
        ownerName: effectiveName,
        isPublic: true,
      });

      toast.success(`Group "${name.trim()}" created!`);
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
    if (step === "name") {
      if (!name.trim()) {
        toast.error("Please enter a group name!");
        return;
      }
      setStep("custom_pfp");
    } else if (step === "custom_pfp") {
      setStep("rules");
    } else if (step === "rules") {
      setStep("review");
    } else if (step === "review") {
      handleFinishCreate();
    }
  }

  function getButtonLabel() {
    if (loading) return "Creating Group...";
    if (step === "name") return "Continue to Avatar";
    if (step === "custom_pfp") return "Continue to Rules";
    if (step === "rules") return "Review Group";
    return "Create Group";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      {/* Crisp, clean, pure white container */}
      <div className="w-full h-full sm:h-auto sm:max-w-[480px] bg-white dark:bg-[#12141a] rounded-none sm:rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-black/[0.08] dark:border-white/[0.08] overflow-hidden flex flex-col sm:max-h-[90vh]">
        {/* Header: Pure white with clean typography */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] bg-white dark:bg-[#12141a]">
          <div className="flex items-center gap-2.5">
            {step !== "name" && (
              <button
                type="button"
                onClick={() => {
                  if (step === "custom_pfp") setStep("name");
                  else if (step === "rules") setStep("custom_pfp");
                  else if (step === "review") setStep("rules");
                }}
                className="press h-8 w-8 rounded-[10px] bg-slate-100 dark:bg-[#1b1e26] hover:bg-slate-200 dark:hover:bg-[#232732] grid place-items-center text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2 className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                Create Group
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                Step {currentStepIndex + 1} of 4: {STEPS[currentStepIndex].label}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press h-8 w-8 rounded-[10px] bg-slate-100 dark:bg-[#1b1e26] hover:bg-slate-200 dark:hover:bg-[#232732] grid place-items-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step-by-Step Indicator: Clean text & numbers, NO ICONS */}
        <div className="px-5 pt-3 pb-1 bg-white dark:bg-[#12141a]">
          <div className="grid grid-cols-4 gap-1 p-1 rounded-[13px] bg-slate-100 dark:bg-[#1a1d25] border border-black/[0.03] dark:border-white/[0.04]">
            {STEPS.map((s, idx) => {
              const isCurrent = step === s.id;
              const isCompleted = idx < currentStepIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={idx > currentStepIndex}
                  onClick={() => {
                    if (idx <= currentStepIndex) setStep(s.id);
                  }}
                  className={`py-1.5 px-1 rounded-[9px] text-center transition-all ${
                    isCurrent
                      ? "bg-white dark:bg-[#262b37] text-slate-900 dark:text-white shadow-xs font-bold"
                      : isCompleted
                        ? "text-slate-700 dark:text-slate-300 font-medium hover:text-slate-900 cursor-pointer"
                        : "text-slate-400 dark:text-slate-600 font-normal cursor-not-allowed"
                  }`}
                >
                  <div className="text-[9.5px] uppercase tracking-wider opacity-65">{idx + 1}</div>
                  <div className="text-[11.5px] truncate">{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body: Clean white background, no clutter */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-white dark:bg-[#12141a]">
          {/* STEP 1: NAME & SQUAD GOAL */}
          {step === "name" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block">
                  Group Name <span className="text-[#fa4616]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BedWars Elite Squad"
                  maxLength={40}
                  autoFocus
                  className="w-full h-11 px-3.5 rounded-[13px] border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#161922] text-[14px] font-semibold text-slate-900 dark:text-white outline-none focus:border-[#fa4616] transition-colors shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block">
                  Squad Goal
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Win 100 matches & reach 1,000 Hype"
                  maxLength={75}
                  className="w-full h-11 px-3.5 rounded-[13px] border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#161922] text-[13.5px] font-medium text-slate-900 dark:text-white outline-none focus:border-[#fa4616] transition-colors shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this squad focused on?"
                  rows={2}
                  maxLength={120}
                  className="w-full p-3 rounded-[13px] border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#161922] text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-[#fa4616] transition-colors resize-none shadow-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 2: CUSTOM PFP ONLY (WITH AVATAR GLOSSINESS) */}
          {step === "custom_pfp" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Clean White Card with Glossy Avatar Preview */}
              <div className="p-4 rounded-[18px] bg-white dark:bg-[#161922] border border-black/[0.08] dark:border-white/[0.08] shadow-xs flex items-center gap-4">
                {/* Square PFP with Avatar Glossiness Sheen */}
                <div className="relative h-20 w-20 rounded-[18px] overflow-hidden border border-black/10 dark:border-white/15 bg-slate-100 shadow-sm shrink-0">
                  <img
                    src={customPfpUrl}
                    alt="Custom PFP"
                    className="h-full w-full object-cover"
                    onError={() =>
                      setCustomPfpUrl(
                        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
                      )
                    }
                  />
                  {/* Signature Gloss Reflection Overlay */}
                  <div className="absolute inset-0 pointer-events-none rounded-[18px] bg-gradient-to-b from-white/45 via-transparent to-black/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),inset_0_-1px_1px_rgba(0,0,0,0.15)]" />
                </div>

                <div className="min-w-0 flex-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#fa4616]">
                    Custom Avatar
                  </span>
                  <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white truncate">
                    {name || "Squad Avatar"}
                  </h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Custom square avatar with authentic depth glossiness.
                  </p>
                </div>
              </div>

              {/* Upload Local Image Button */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block">
                  Upload Local Image
                </label>
                <label className="flex items-center justify-center gap-2 h-16 border border-dashed border-black/[0.15] dark:border-white/[0.15] rounded-[14px] bg-white dark:bg-[#161922] hover:bg-slate-50 dark:hover:bg-[#1a1e29] cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 text-[#fa4616]" />
                  <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200">
                    Choose image file (PNG, JPG, WebP)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or Direct URL Input */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block">
                  Or Paste Image URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={customPfpInput}
                      onChange={(e) => setCustomPfpInput(e.target.value)}
                      placeholder="https://.../avatar.png"
                      className="w-full h-10 px-3.5 pl-9 rounded-[12px] border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#161922] text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-[#fa4616] transition-colors"
                    />
                    <Link2 className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (customPfpInput.trim()) {
                        setCustomPfpUrl(customPfpInput.trim());
                        setCustomPfpInput("");
                        toast.success("Avatar updated!");
                      }
                    }}
                    className="press px-3.5 h-10 rounded-[12px] bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white font-bold text-[12px] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SERVER RULES (FULL PAGE) */}
          {step === "rules" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Custom Rule Input */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 block">
                  Add Rule
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customRuleInput}
                    onChange={(e) => setCustomRuleInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCustomRule()}
                    placeholder="e.g. Respect all members and play fair"
                    maxLength={90}
                    className="flex-1 h-10 px-3.5 rounded-[12px] border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#161922] text-[13px] font-medium text-slate-900 dark:text-white outline-none focus:border-[#fa4616] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomRule}
                    className="press px-3.5 h-10 rounded-[12px] bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 text-white font-bold text-[12px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Active Rules List */}
              <div className="space-y-1.5">
                <label className="text-[11.5px] font-bold text-slate-600 dark:text-slate-400 block">
                  Rules ({selectedRules.length})
                </label>
                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5">
                  {selectedRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[12px] bg-white dark:bg-[#161922] border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <span className="text-[12px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                        {rule}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(idx)}
                        className="press p-1 text-slate-400 hover:text-rose-500 rounded-md shrink-0 cursor-pointer transition-colors"
                        aria-label="Remove rule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard Templates */}
              <div className="pt-1 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  Quick Templates:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_RULES_TEMPLATES.map((tmpl, i) => {
                    const isPicked = selectedRules.includes(tmpl);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleTemplateRule(tmpl)}
                        className={`press text-[11px] px-2.5 py-1.5 rounded-[9px] font-semibold transition-colors text-left cursor-pointer ${
                          isPicked
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1f2a] dark:hover:bg-[#252834] text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Rule #{i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & LAUNCH */}
          {step === "review" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-[#161922] border border-black/[0.08] dark:border-white/[0.08] rounded-[20px] p-4 shadow-sm">
                {/* Header preview with glossy avatar */}
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="relative h-13 w-13 rounded-[14px] overflow-hidden border border-black/10 dark:border-white/15 bg-slate-100 shadow-sm shrink-0">
                    <img src={customPfpUrl} alt={name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none rounded-[14px] bg-gradient-to-b from-white/45 via-transparent to-black/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[16px] font-extrabold text-slate-900 dark:text-white truncate">
                      {name}
                    </h3>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
                      {description || "Community Squad"}
                    </p>
                  </div>
                </div>

                {/* Squad Goal Box */}
                <div className="p-3 rounded-[13px] bg-slate-50 dark:bg-[#1b1e27] border border-black/[0.04] dark:border-white/[0.05] mb-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Unique Squad Goal
                  </div>
                  <div className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {goal}
                  </div>
                </div>

                {/* Depth Glossy Hype Progress Bar starting at 0% */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex justify-between text-[11.5px] font-bold">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <img
                        src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
                        alt="Hype"
                        className="h-4 w-4 object-contain inline-block"
                      />
                      <span>Hype Progress</span>
                    </span>
                    <span className="text-[#fa4616] font-mono">0% (0 / 1,000)</span>
                  </div>

                  {/* Glossy Bar */}
                  <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-[#1a1d25] overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                    <div className="h-full w-[4%] bg-gradient-to-r from-red-500 via-[#fa4616] to-amber-400 rounded-full relative">
                      <div className="absolute inset-x-0 top-0 h-[45%] bg-white/40 rounded-t-full pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.05] flex justify-between items-center text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>{selectedRules.length} rules set</span>
                  <span>Owner: {effectiveName}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button using the Change Password button style (<ShinyButton>) */}
        <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#12141a]">
          <ShinyButton
            type="button"
            onClick={handleNext}
            disabled={loading}
            loading={loading}
            className="w-full h-11"
          >
            {getButtonLabel()}
          </ShinyButton>
        </div>
      </div>
    </div>
  );
}
