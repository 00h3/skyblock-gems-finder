import React from "react";

interface IsometricGridLoaderProps {
  progress?: number;
  subtitle?: string;
  showTitle?: boolean;
  className?: string;
}

export function IsometricGridLoader({
  progress,
  subtitle,
  showTitle = true,
  className = "",
}: IsometricGridLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <style>{`
        .qblock-isometric-scene {
          --duration: 2.8s;
          --primary: #ff5500;
          --primary-light: #ff7a2b;
          --primary-bright: #ffa166;
          --primary-dark: #b83600;
          --primary-rgba: rgba(255, 85, 0, 0);
          width: 180px;
          height: 180px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 800px;
          transform-style: preserve-3d;
        }

        .qblock-loader {
          width: 140px;
          height: 140px;
          position: relative;
          transform-style: preserve-3d;
          transform: rotateX(60deg) rotateZ(45deg);
        }

        .qblock-loader .ground {
          position: absolute;
          width: 140px;
          height: 140px;
          left: 0;
          top: 0;
          transform-style: preserve-3d;
          border-radius: 20px;
          background: radial-gradient(circle, rgba(255, 85, 0, 0.25) 0%, rgba(255, 85, 0, 0) 70%);
          box-shadow: 0 0 30px rgba(255, 85, 0, 0.35);
          animation: qb-ground-pulse var(--duration) ease-in-out infinite;
        }

        .qblock-loader .ground div {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          border: 1px dashed rgba(255, 122, 43, 0.3);
          transform: translateZ(-2px);
        }

        .qblock-loader .box {
          --size: 28px;
          width: var(--size);
          height: var(--size);
          position: absolute;
          transform-style: preserve-3d;
          transition: transform 0.2s ease;
        }

        /* 3D Cube Faces */
        .qblock-loader .box > div {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
        }

        /* Top Face */
        .qblock-loader .box::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #ff9452, #ff6014);
          transform: translateZ(var(--size));
          box-shadow: inset 0 0 4px rgba(255, 255, 255, 0.6);
        }

        /* Front / Side Faces */
        .qblock-loader .box::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, #d64200, #9e2a00);
          transform-origin: bottom;
          transform: rotateX(-90deg);
        }

        .qblock-loader .box > div::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, #f25005, #b83600);
          transform-origin: right;
          transform: rotateY(90deg);
        }

        .qblock-loader .box > div::after {
          content: "";
          position: absolute;
          inset: 0;
          background: #802000;
          transform-origin: top;
          transform: rotateX(90deg);
        }

        /* 8 Boxes Positions & Keyframe animations */
        .qblock-loader .box0 {
          left: 20px;
          top: 20px;
          animation: qb-box0 var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .qblock-loader .box1 {
          left: 56px;
          top: 20px;
          animation: qb-box1 var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .qblock-loader .box2 {
          left: 92px;
          top: 20px;
          animation: qb-box2 var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .qblock-loader .box3 {
          left: 92px;
          top: 56px;
          animation: qb-box3 var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .qblock-loader .box4 {
          left: 92px;
          top: 92px;
          animation: qb-box4 var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .qblock-loader .box5 {
          left: 56px;
          top: 92px;
          animation: qb-box5 var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .qblock-loader .box6 {
          left: 20px;
          top: 92px;
          animation: qb-box6 var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .qblock-loader .box7 {
          left: 20px;
          top: 56px;
          animation: qb-box7 var(--duration) cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes qb-ground-pulse {
          0%, 100% {
            transform: scale(0.95);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
            box-shadow: 0 0 45px rgba(255, 85, 0, 0.65);
          }
        }

        @keyframes qb-box0 {
          0%, 100% { transform: translateZ(0); }
          12.5% { transform: translateZ(36px) scale(1.05); }
          25% { transform: translateZ(0); }
        }
        @keyframes qb-box1 {
          0%, 100% { transform: translateZ(0); }
          25% { transform: translateZ(36px) scale(1.05); }
          37.5% { transform: translateZ(0); }
        }
        @keyframes qb-box2 {
          0%, 100% { transform: translateZ(0); }
          37.5% { transform: translateZ(36px) scale(1.05); }
          50% { transform: translateZ(0); }
        }
        @keyframes qb-box3 {
          0%, 100% { transform: translateZ(0); }
          50% { transform: translateZ(36px) scale(1.05); }
          62.5% { transform: translateZ(0); }
        }
        @keyframes qb-box4 {
          0%, 100% { transform: translateZ(0); }
          62.5% { transform: translateZ(36px) scale(1.05); }
          75% { transform: translateZ(0); }
        }
        @keyframes qb-box5 {
          0%, 100% { transform: translateZ(0); }
          75% { transform: translateZ(36px) scale(1.05); }
          87.5% { transform: translateZ(0); }
        }
        @keyframes qb-box6 {
          0%, 100% { transform: translateZ(0); }
          87.5% { transform: translateZ(36px) scale(1.05); }
          100% { transform: translateZ(0); }
        }
        @keyframes qb-box7 {
          0%, 12.5% { transform: translateZ(0); }
          6.25% { transform: translateZ(36px) scale(1.05); }
          100% { transform: translateZ(0); }
        }
      `}</style>

      {/* Glowing QBLOCK Title Upper */}
      {showTitle && (
        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            <span
              className="text-[32px] sm:text-[38px] font-black tracking-[-0.04em] uppercase text-[#ff5500] drop-shadow-[0_0_24px_rgba(255,85,0,0.6)]"
              style={{
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                textShadow: "0 2px 14px rgba(255, 85, 0, 0.7), 0 0 35px rgba(255, 120, 40, 0.4)",
              }}
            >
              QBLOCK
            </span>
          </div>
          <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-[#ff5500] to-transparent mt-1 opacity-80" />
        </div>
      )}

      {/* 3D Isometric 8-Box Grid Loader */}
      <div className="qblock-isometric-scene">
        <div className="loader qblock-loader">
          <div className="box box0">
            <div></div>
          </div>
          <div className="box box1">
            <div></div>
          </div>
          <div className="box box2">
            <div></div>
          </div>
          <div className="box box3">
            <div></div>
          </div>
          <div className="box box4">
            <div></div>
          </div>
          <div className="box box5">
            <div></div>
          </div>
          <div className="box box6">
            <div></div>
          </div>
          <div className="box box7">
            <div></div>
          </div>
          <div className="ground">
            <div></div>
          </div>
        </div>
      </div>

      {/* Subtitle / Progress */}
      <div className="mt-4 flex flex-col items-center gap-1.5 min-h-[40px]">
        {typeof progress === "number" && (
          <div className="text-[#ff5500] font-mono font-bold text-[14px] tracking-wider">
            {progress}%
          </div>
        )}
        {subtitle && (
          <p className="text-slate-400 dark:text-slate-500 text-[13px] font-medium tracking-wide">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
