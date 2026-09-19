import React from "react";
import { GroupChatData } from "@/lib/group-chat";
import { EllipsisIcon } from "@/components/ui/course-design-cards";
import { Flame, ShieldCheck } from "lucide-react";
import { ShinyButton } from "@/components/ui/shiny-button";

interface GroupCardProps {
  group: GroupChatData;
  isMember: boolean;
  onJoin: (group: GroupChatData) => void;
  onOpen: (group: GroupChatData) => void;
  onViewRules?: (group: GroupChatData) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isMember,
  onJoin,
  onOpen,
  onViewRules,
}) => {
  const hype = group.hype || 0;
  const hypeGoal = group.hypeGoal || 1000;
  const hypePercent = Math.min(100, Math.round((hype / hypeGoal) * 100));

  const memberAvatars =
    group.memberAvatars && group.memberAvatars.length > 0
      ? group.memberAvatars
      : [
          group.customPfpUrl ||
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
        ];

  return (
    <div className="bg-white dark:bg-[#151720] text-slate-900 dark:text-white border border-black/[0.08] dark:border-white/[0.08] rounded-[22px] p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)] transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {group.memberCount} {group.memberCount === 1 ? "Member" : "Members"}
            </span>
            {group.rules && group.rules.length > 0 && (
              <button
                type="button"
                onClick={() => onViewRules && onViewRules(group)}
                className="inline-flex items-center gap-1 text-[10.5px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#1f232e] dark:hover:bg-[#282d3b] text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
              >
                <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                <span>{group.rules.length} Rules</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onViewRules && onViewRules(group)}
            className="press p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Server Details & Rules"
            aria-label="Server Details"
          >
            <EllipsisIcon />
          </button>
        </div>

        {/* Card Body */}
        <div className="flex items-start gap-3 mb-2">
          {/* Square PFP with Avatar Glossiness */}
          <div className="relative h-12 w-12 rounded-[14px] overflow-hidden border border-black/10 dark:border-white/12 bg-slate-100 shadow-xs shrink-0">
            {group.customPfpUrl ? (
              <img
                src={group.customPfpUrl}
                alt={group.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={`h-full w-full bg-gradient-to-br ${group.gradient || "from-orange-500 to-amber-500"} grid place-items-center text-white font-black text-[14px]`}
              >
                {group.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            {/* Gloss reflection sheen */}
            <span className="absolute inset-0 pointer-events-none rounded-[14px] bg-gradient-to-b from-white/45 via-transparent to-black/15 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),inset_0_-1px_1px_rgba(0,0,0,0.12)]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-black text-slate-900 dark:text-white leading-snug truncate">
              {group.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                <img
                  src="https://maxwell.z3ki.dev/bot/_files/qblock-red-owner-png/qblock-red-owner-transparent.png"
                  alt="Owner"
                  className="h-2.5 w-2.5 object-contain"
                />
                <span className="truncate max-w-[80px]">{group.ownerName}</span>
              </span>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {group.goal || group.description || "Active community squad"}
              </p>
            </div>
          </div>
        </div>

        {/* Depth Glossy Loader Bar - "Hype" */}
        <div className="my-3 p-2.5 rounded-[14px] bg-slate-50 dark:bg-[#1a1d26] border border-black/[0.04] dark:border-white/[0.04]">
          <div className="flex items-center justify-between text-[11.5px] font-extrabold mb-1.5">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <img
                src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
                alt="Hype"
                className="h-4 w-4 object-contain inline-block"
              />
              <span>Hype Level</span>
            </span>
            <span className="text-[#fa4616] font-mono">
              {hype} / {hypeGoal} ({hypePercent}%)
            </span>
          </div>

          {/* Depth Glossy Progress Track */}
          <div className="relative h-3 w-full rounded-full bg-slate-200/70 dark:bg-[#232733] overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 via-[#fa4616] to-amber-400 transition-all duration-500 relative"
              style={{ width: `${Math.max(hypePercent, 4)}%` }}
            >
              {/* Glossy top sheen highlight */}
              <div className="absolute inset-x-0 top-0 h-[45%] bg-white/45 rounded-t-full pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Square Member PFPs with Orange + Add Button & Join/Chat Button */}
      <div className="flex items-center justify-between pt-3 border-t border-black/[0.05] dark:border-white/[0.05] mt-auto">
        <ul className="flex items-center -space-x-1.5 p-0 m-0 list-none">
          {memberAvatars.slice(0, 3).map((avatar, idx) => (
            <li key={idx} className="relative">
              <div className="relative h-8 w-8 rounded-[10px] overflow-hidden border-2 border-white dark:border-[#151720] shadow-xs bg-slate-200">
                <img
                  src={avatar}
                  alt={`Member ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 pointer-events-none rounded-[10px] bg-gradient-to-b from-white/40 via-transparent to-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]" />
              </div>
            </li>
          ))}
          {/* Orange + button for inviting/joining */}
          <li>
            <div
              className="h-8 w-8 rounded-[10px] bg-[#fa4616] text-white font-black text-[13px] grid place-items-center border-2 border-white dark:border-[#151720] shadow-xs"
              title="Add Member"
            >
              +
            </div>
          </li>
        </ul>

        {/* Action Button with the Change Password Button Style (<ShinyButton>) */}
        {isMember ? (
          <ShinyButton
            variant="white"
            onClick={() => onOpen(group)}
            className="h-8.5 px-4 text-[12px] rounded-[11px]"
          >
            Chat
          </ShinyButton>
        ) : (
          <ShinyButton
            variant="orange"
            onClick={() => onJoin(group)}
            className="h-8.5 px-4 text-[12px] rounded-[11px]"
          >
            Join
          </ShinyButton>
        )}
      </div>
    </div>
  );
};
