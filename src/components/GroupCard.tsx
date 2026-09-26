import React from "react";
import { GroupChatData } from "@/lib/group-chat";

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
  return (
    <div className="bg-white dark:bg-[#000000] text-black dark:text-white border border-black/10 dark:border-white/15 rounded-[20px] p-4 shadow-xs transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Discord-like Server Header */}
        <div className="flex items-center gap-3">
          {/* Server Squircle Icon */}
          <div className="relative h-12 w-12 rounded-[16px] overflow-hidden border border-black/10 dark:border-white/15 bg-neutral-100 dark:bg-neutral-900 shrink-0 flex items-center justify-center">
            {group.customPfpUrl ? (
              <img
                src={group.customPfpUrl}
                alt={group.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="h-full w-full flex items-center justify-center text-white text-[14px] font-medium"
                style={{ background: group.gradient ? undefined : "#000" }}
              >
                {group.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-[15px] font-medium text-black dark:text-white truncate">
                {group.name}
              </h3>
              {group.rules && group.rules.length > 0 && (
                <button
                  type="button"
                  onClick={() => onViewRules && onViewRules(group)}
                  className="press text-[11px] font-normal px-2 py-0.5 rounded-[8px] bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                >
                  {group.rules.length} Rules
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {group.memberCount || 1} {group.memberCount === 1 ? "member" : "members"}
              </span>
              {group.ownerName && (
                <span className="text-[11px] font-normal text-neutral-400 truncate">
                  · by {group.ownerName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Server Description / Topic */}
        <p className="mt-3 text-[12.5px] font-normal text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
          {group.goal || group.description || "Community hangout and squad server."}
        </p>
      </div>

      {/* Footer Controls: Minimal & Squircle */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center gap-1.5 text-[11px] font-normal text-neutral-600 dark:text-neutral-400">
          <img
            src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
            alt="Hype"
            className="h-3.5 w-3.5 object-contain inline-block shrink-0"
          />
          <span>{group.hype || 0} Hype</span>
        </div>

        {isMember ? (
          <button
            type="button"
            onClick={() => onOpen(group)}
            className="press h-8 px-4 rounded-[12px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-black dark:text-white text-[12px] font-normal cursor-pointer transition"
          >
            Open Chat
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onJoin(group)}
            className="press h-8 px-4 rounded-[12px] bg-black text-white dark:bg-white dark:text-black text-[12px] font-normal cursor-pointer transition shadow-xs"
          >
            Join Server
          </button>
        )}
      </div>
    </div>
  );
};
