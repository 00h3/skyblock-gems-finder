"use client";

import { useRef } from "react";

interface AuthArtwork3DProps {
  className?: string;
  size?: "hero" | "compact";
  priority?: boolean;
}

export function AuthArtwork3D({ className = "", size = "hero" }: AuthArtwork3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isCompact = size === "compact";

  return (
    <div
      ref={containerRef}
      className={`relative select-none flex flex-col items-center justify-center ${className}`}
    >
      <style>{`
        .wrap_card {
          position: relative;
          width: var(--w-wrap-card);
          height: calc(var(--h-card) * 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: ${isCompact ? "-20px" : "-38px"};
          --w-card: ${isCompact ? "92px" : "150px"};
          --h-card: ${isCompact ? "92px" : "150px"};
          --rotate-card: 10deg;
          --insetX-card: ${isCompact ? "16px" : "28px"};
          --t-card: calc(var(--insetX-card) * 0.65);
          --w-wrap-card: calc(var(--w-card) + calc(calc(var(--w-card) / 1.5) * 2));
        }

        .card {
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          overflow: visible;
          animation: rotating 9.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          order: var(--order);
          width: var(--w-card);
          height: var(--h-card);
          z-index: var(--z1);
          top: var(--t1);
          left: var(--l1);
          right: var(--r1);
          transform: var(--trans1);
          --x1: var(--insetX-card);
          --x2: calc(var(--w-wrap-card) - calc(var(--w-card) + var(--insetX-card)));
          --to-left: rotate(calc(var(--rotate-card) * -1)) translateY(4px);
          --to-center: calc((var(--w-wrap-card) - var(--w-card)) / 2);
          --to-right: rotate(calc(var(--rotate-card) * 1)) translateY(4px);
          transition: transform 0.4s ease;
        }

        .content {
          background-color: transparent !important;
          border: none !important;
          outline: none !important;
          overflow: visible;
          position: relative;
          width: 100%;
          height: 100%;
          box-shadow: none !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-screenshot {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          pointer-events: none;
          filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.12));
        }

        /* Card 1 */
        .card:nth-child(1) {
          --order: 2;
          --z1: 3;
          --t1: 0;
          --l1: var(--to-center);
          --r1: var(--to-center);
          --trans1: rotate(0deg) scale(1.06);
          --z2: 1;
          --t2: var(--t-card);
          --l2: var(--x1);
          --r2: var(--x2);
          --trans2: var(--to-left) scale(0.92);
          --z3: 1;
          --t3: var(--t-card);
          --l3: var(--x2);
          --r3: var(--x1);
          --trans3: var(--to-right) scale(0.92);
        }

        /* Card 2 */
        .card:nth-child(2) {
          --order: 3;
          --z1: 1;
          --t1: var(--t-card);
          --l1: var(--x2);
          --r1: var(--x1);
          --trans1: var(--to-right) scale(0.92);
          --z2: 3;
          --t2: 0;
          --l2: var(--to-center);
          --r2: var(--to-center);
          --trans2: rotate(0deg) scale(1.06);
          --z3: 1;
          --t3: var(--t-card);
          --l3: var(--x1);
          --r3: var(--x2);
          --trans3: var(--to-left) scale(0.92);
        }

        /* Card 3 */
        .card:nth-child(3) {
          --order: 1;
          --z1: 1;
          --t1: var(--t-card);
          --l1: var(--x1);
          --r1: var(--x2);
          --trans1: var(--to-left) scale(0.92);
          --z2: 1;
          --t2: var(--t-card);
          --l2: var(--x2);
          --r2: var(--x1);
          --trans2: var(--to-right) scale(0.92);
          --z3: 3;
          --t3: 0;
          --l3: var(--to-center);
          --r3: var(--to-center);
          --trans3: rotate(0deg) scale(1.06);
        }

        @keyframes rotating {
          0%,
          100% {
            z-index: var(--z1);
            top: var(--t1);
            left: var(--l1);
            right: var(--r1);
            transform: var(--trans1);
          }
          33.33% {
            z-index: var(--z2);
            top: var(--t2);
            left: var(--l2);
            right: var(--r2);
            transform: var(--trans2);
          }
          66.66% {
            z-index: var(--z3);
            top: var(--t3);
            left: var(--l3);
            right: var(--r3);
            transform: var(--trans3);
          }
        }
      `}</style>

      <div className="wrap_card">
        {/* Card 1: Running Cat (Transparent, no outline or thickness) */}
        <div className="card">
          <div className="content">
            <img
              src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
              alt="Running Cat"
              className="card-screenshot"
              loading="eager"
            />
          </div>
        </div>

        {/* Card 2: Running Cat (Transparent, no outline or thickness) */}
        <div className="card">
          <div className="content">
            <img
              src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
              alt="Running Cat"
              className="card-screenshot"
              loading="eager"
            />
          </div>
        </div>

        {/* Card 3: Running Cat (Transparent, no outline or thickness) */}
        <div className="card">
          <div className="content">
            <img
              src="https://maxwell.z3ki.dev/bot/_files/running-cat-transparent/running_cat_transparent.gif"
              alt="Running Cat"
              className="card-screenshot"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
