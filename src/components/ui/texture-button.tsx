"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariantsOuter = cva(
  "relative inline-flex items-center justify-center font-black select-none transition-all duration-150 active:scale-[0.97] active:translate-y-[0.5px] disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer overflow-hidden",
  {
    variants: {
      variant: {
        accent:
          "w-full bg-[#fa4616] bg-gradient-to-b from-[#ff6230] via-[#fa4616] to-[#e03a0d] text-white border border-[#fa4616]/70 shadow-[0_6px_18px_rgba(250,70,22,0.38),inset_0_1px_1px_rgba(255,255,255,0.6)] rounded-[16px] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[15px] before:bg-gradient-to-b before:from-white/35 before:to-transparent before:pointer-events-none",
        primary:
          "w-full border border-black/10 dark:border-white/15 bg-gradient-to-b from-[#181a1f] to-[#0d0e11] dark:from-white dark:to-neutral-200 text-white dark:text-black shadow-[0_6px_18px_rgba(0,0,0,0.18)] rounded-[16px] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[15px] before:bg-gradient-to-b before:from-white/20 dark:before:from-white/60 before:to-transparent before:pointer-events-none",
        destructive:
          "w-full border border-red-500/50 bg-gradient-to-b from-red-500 via-red-600 to-red-700 text-white shadow-[0_6px_18px_rgba(239,68,68,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] rounded-[16px] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[15px] before:bg-gradient-to-b before:from-white/25 before:to-transparent before:pointer-events-none",
        secondary:
          "w-full border border-black/[0.12] dark:border-white/[0.12] bg-gradient-to-b from-[rgba(243,245,248,0.96)] to-[rgba(228,232,238,0.94)] dark:from-[rgba(33,35,41,0.96)] dark:to-[rgba(24,26,31,0.94)] text-[#17191d] dark:text-white shadow-[0_10px_24px_rgba(23,24,27,0.12),inset_1px_1px_0_rgba(255,255,255,0.98)] dark:shadow-[0_10px_24px_rgba(0,0,0,0.35),inset_1px_1px_0_rgba(255,255,255,0.1)] backdrop-blur-[20px] saturate-125 rounded-[16px] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[15px] before:bg-gradient-to-b before:from-white/40 before:to-transparent dark:before:from-white/10 dark:before:to-transparent before:pointer-events-none",
        "nav-gloss":
          "w-full border border-black/[0.12] dark:border-white/[0.12] bg-gradient-to-b from-[rgba(243,245,248,0.96)] to-[rgba(228,232,238,0.94)] dark:from-[rgba(33,35,41,0.96)] dark:to-[rgba(24,26,31,0.94)] text-[#17191d] dark:text-white shadow-[0_10px_24px_rgba(23,24,27,0.12),inset_1px_1px_0_rgba(255,255,255,0.98)] dark:shadow-[0_10px_24px_rgba(0,0,0,0.35),inset_1px_1px_0_rgba(255,255,255,0.1)] backdrop-blur-[20px] saturate-125 rounded-[16px] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:rounded-t-[15px] before:bg-gradient-to-b before:from-white/40 before:to-transparent dark:before:from-white/10 dark:before:to-transparent before:pointer-events-none",
        minimal:
          "w-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-800/60 text-foreground rounded-[16px] backdrop-blur-md",
        icon: "rounded-[14px] border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-800/80 shadow-sm p-[1px] backdrop-blur-md",
      },
      size: {
        sm: "h-8.5 px-3 text-[12px] rounded-[13px]",
        default: "h-11 px-4 text-[13.5px] rounded-[16px]",
        lg: "h-12.5 px-5 text-[14.5px] rounded-[18px]",
        icon: "h-9.5 w-9.5 rounded-[14px] p-1",
      },
    },
    defaultVariants: {
      variant: "accent",
      size: "default",
    },
  },
);

export interface UnifiedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "destructive" | "minimal" | "icon" | "nav-gloss";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  loading?: boolean;
}

const TextureButton = React.forwardRef<HTMLButtonElement, UnifiedButtonProps>(
  (
    {
      children,
      variant = "accent",
      size = "default",
      asChild = false,
      loading = false,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariantsOuter({ variant, size }), className)}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariantsOuter({ variant, size }), className)}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0 text-white" />}
          {children}
        </span>
      </button>
    );
  },
);

TextureButton.displayName = "TextureButton";

export { TextureButton, TextureButton as QbButton };
