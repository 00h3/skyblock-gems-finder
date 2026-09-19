"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

export interface ShinyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  loading?: boolean;
  variant?: "orange" | "white" | "dark";
}

export function ShinyButton({
  children,
  onClick,
  className = "",
  disabled,
  loading = false,
  variant = "orange",
  type = "button",
  ...props
}: ShinyButtonProps) {
  const isWhite = variant === "white";

  return (
    <>
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,500;600;700;800&display=swap");

        @property --gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @property --gradient-angle-offset {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @property --gradient-percent {
          syntax: "<percentage>";
          initial-value: 6%;
          inherits: false;
        }

        @property --gradient-shine {
          syntax: "<color>";
          initial-value: white;
          inherits: false;
        }

        .shiny-cta {
          --shiny-cta-bg: #13151b;
          --shiny-cta-bg-subtle: #242938;
          --shiny-cta-fg: #ffffff;
          --shiny-cta-highlight: #fa4616;
          --shiny-cta-highlight-subtle: #ff8560;
          --animation: gradient-angle linear infinite;
          --duration: 2.8s;
          --shadow-size: 2px;
          --transition: 600ms cubic-bezier(0.25, 1, 0.5, 1);
          
          isolation: isolate;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          outline-offset: 4px;
          padding: 0.85rem 1.75rem;
          font-family: "Inter", sans-serif;
          font-size: 0.95rem;
          line-height: 1.2;
          font-weight: 700;
          border: 1px solid transparent;
          border-radius: 14px;
          color: var(--shiny-cta-fg);
          background: linear-gradient(var(--shiny-cta-bg), var(--shiny-cta-bg)) padding-box,
            conic-gradient(
              from calc(var(--gradient-angle) - var(--gradient-angle-offset)),
              transparent,
              var(--shiny-cta-highlight) var(--gradient-percent),
              var(--gradient-shine) calc(var(--gradient-percent) * 2),
              var(--shiny-cta-highlight) calc(var(--gradient-percent) * 3),
              transparent calc(var(--gradient-percent) * 4)
            ) border-box;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.35),
                      inset 0 -1px 1px rgba(0, 0, 0, 0.4),
                      0 4px 18px -2px rgba(250, 70, 22, 0.35),
                      0 1px 3px rgba(0, 0, 0, 0.2);
          transition: var(--transition);
          transition-property: --gradient-angle-offset, --gradient-percent, --gradient-shine, transform, box-shadow;
        }

        .shiny-cta.shiny-cta-white {
          --shiny-cta-bg: #ffffff;
          --shiny-cta-bg-subtle: #e2e8f0;
          --shiny-cta-fg: #0f172a;
          --shiny-cta-highlight: #fa4616;
          --shiny-cta-highlight-subtle: #fdba74;
          background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%) padding-box,
            conic-gradient(
              from calc(var(--gradient-angle) - var(--gradient-angle-offset)),
              transparent,
              rgba(250, 70, 22, 0.8) var(--gradient-percent),
              #ffffff calc(var(--gradient-percent) * 2),
              rgba(250, 70, 22, 0.8) calc(var(--gradient-percent) * 3),
              transparent calc(var(--gradient-percent) * 4)
            ) border-box;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 1),
                      inset 0 -1px 2px rgba(0, 0, 0, 0.08),
                      0 6px 20px -3px rgba(0, 0, 0, 0.12),
                      0 2px 6px -1px rgba(250, 70, 22, 0.15);
        }

        .shiny-cta:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          pointer-events: none;
        }

        .shiny-cta::before,
        .shiny-cta::after,
        .shiny-cta .shiny-glow-center {
          content: "";
          pointer-events: none;
          position: absolute;
          inset-inline-start: 50%;
          inset-block-start: 50%;
          translate: -50% -50%;
          z-index: 1;
        }

        .shiny-cta:active:not(:disabled) {
          transform: translateY(1px) scale(0.99);
        }

        /* Ambient subtle pattern */
        .shiny-cta::before {
          --size: calc(100% - var(--shadow-size) * 3);
          --position: 2px;
          --space: calc(var(--position) * 2);
          width: var(--size);
          height: var(--size);
          background: radial-gradient(
            circle at var(--position) var(--position),
            white calc(var(--position) / 4),
            transparent 0
          ) padding-box;
          background-size: var(--space) var(--space);
          background-repeat: space;
          mask-image: conic-gradient(
            from calc(var(--gradient-angle) + 45deg),
            black,
            transparent 10% 90%,
            black
          );
          border-radius: inherit;
          opacity: 0.28;
          z-index: 1;
        }

        /* Inner shimmer wave */
        .shiny-cta::after {
          --animation: shimmer linear infinite;
          width: 100%;
          aspect-ratio: 1;
          background: linear-gradient(
            -50deg,
            transparent,
            var(--shiny-cta-highlight),
            transparent
          );
          mask-image: radial-gradient(circle at bottom, transparent 35%, black);
          opacity: 0.55;
          z-index: 1;
        }

        /* Top Curved Glass Reflection Sheen (Ultra-gloss) */
        .shiny-glass-curve {
          position: absolute;
          inset: 0 0 52% 0;
          pointer-events: none;
          border-radius: 13px 13px 120% 120% / 13px 13px 18px 18px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.42) 0%,
            rgba(255, 255, 255, 0.12) 65%,
            rgba(255, 255, 255, 0) 100%
          );
          z-index: 2;
        }

        .shiny-cta-white .shiny-glass-curve {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.4) 60%,
            rgba(255, 255, 255, 0) 100%
          );
        }

        /* Sweeping Diagonal Gloss Gleam */
        .shiny-gloss-gleam {
          position: absolute;
          top: -20%;
          bottom: -20%;
          width: 38%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.15) 30%,
            rgba(255, 255, 255, 0.48) 50%,
            rgba(255, 255, 255, 0.15) 70%,
            transparent 100%
          );
          transform: translateX(-180%) skewX(-24deg);
          animation: gloss-sweep 3.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          pointer-events: none;
          z-index: 3;
        }

        .shiny-cta-white .shiny-gloss-gleam {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 30%,
            rgba(255, 255, 255, 0.8) 50%,
            rgba(255, 255, 255, 0.3) 70%,
            transparent 100%
          );
        }

        .shiny-cta span.shiny-content {
          position: relative;
          z-index: 4;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }

        .shiny-cta-white span.shiny-content {
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .shiny-glow-center {
          --size: calc(100% + 1rem);
          width: var(--size);
          height: var(--size);
          box-shadow: inset 0 -1ex 2.4rem 4px var(--shiny-cta-highlight);
          opacity: 0.25;
          transition: opacity var(--transition);
          animation: calc(var(--duration) * 1.5) breathe linear infinite;
        }

        /* Animate */
        .shiny-cta:not(:disabled),
        .shiny-cta:not(:disabled)::before,
        .shiny-cta:not(:disabled)::after {
          animation: var(--animation) var(--duration),
            var(--animation) calc(var(--duration) / 0.4) reverse paused;
          animation-composition: add;
        }

        .shiny-cta:is(:hover, :focus-visible):not(:disabled) {
          --gradient-percent: 22%;
          --gradient-angle-offset: 95deg;
          --gradient-shine: var(--shiny-cta-highlight-subtle);
          box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, 0.55),
                      0 8px 26px -3px rgba(250, 70, 22, 0.55),
                      0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .shiny-cta.shiny-cta-white:is(:hover, :focus-visible):not(:disabled) {
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 1),
                      0 8px 24px -2px rgba(250, 70, 22, 0.3),
                      0 2px 8px rgba(0, 0, 0, 0.12);
        }

        .shiny-cta:is(:hover, :focus-visible):not(:disabled),
        .shiny-cta:is(:hover, :focus-visible):not(:disabled)::before,
        .shiny-cta:is(:hover, :focus-visible):not(:disabled)::after {
          animation-play-state: running;
        }

        .shiny-cta:is(:hover, :focus-visible):not(:disabled) .shiny-glow-center {
          opacity: 0.85;
        }

        @keyframes gradient-angle {
          to {
            --gradient-angle: 360deg;
          }
        }

        @keyframes shimmer {
          to {
            rotate: 360deg;
          }
        }

        @keyframes breathe {
          from, to {
            scale: 1;
          }
          50% {
            scale: 1.18;
          }
        }

        @keyframes gloss-sweep {
          0% {
            transform: translateX(-160%) skewX(-24deg);
          }
          35%, 100% {
            transform: translateX(280%) skewX(-24deg);
          }
        }
      `}</style>

      <button
        type={type}
        className={`shiny-cta ${isWhite ? "shiny-cta-white" : ""} ${className}`}
        onClick={onClick}
        disabled={disabled || loading}
        {...props}
      >
        <span className="shiny-glass-curve" />
        <span className="shiny-gloss-gleam" />
        <span className="shiny-glow-center" />
        <span className="shiny-content">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin shrink-0" /> : null}
          {children}
        </span>
      </button>
    </>
  );
}
