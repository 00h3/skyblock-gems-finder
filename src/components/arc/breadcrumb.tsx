import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  active?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  ariaLabel?: string;
  className?: string;
}

export function Breadcrumb({ items, ariaLabel = "Breadcrumb", className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label={ariaLabel} className={`flex items-center gap-1.5 text-xs text-zinc-300 font-medium ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <motion.li
                key={`${item.label}-${index}`}
                initial={{ opacity: 0, x: -8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="inline-flex items-center gap-1.5"
              >
                {item.onClick || item.href ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      isLast || item.active
                        ? "bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm"
                        : "hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span
                    className={`px-2 py-1 rounded-md ${
                      isLast || item.active
                        ? "bg-zinc-800 text-amber-300 font-bold border border-zinc-700/80 shadow-sm"
                        : "text-zinc-400"
                    }`}
                  >
                    {item.label}
                  </span>
                )}

                {!isLast && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </nav>
  );
}
