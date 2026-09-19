import React, { useRef, useState, useCallback } from "react";
import { motion, useSpring, useMotionValue, useTransform } from "framer-motion";

const MASCOT_LOCAL_SRC = "/characters/mascot_character.png";
const MASCOT_CDN_SRC =
  "https://cdn.discordapp.com/attachments/1543864533813039178/1547570183173050489/file_00000000dd8c81f48d6681996a30ce64.png?ex=6aa3e68c&is=6aa2950c&hm=529a036239ecbdbf87c70865bb47cd8d2868f398ada81387f22a239472d89bc6&";

interface Interactive3DMascotProps {
  size?: number;
  className?: string;
}

export function Interactive3DMascot({ size = 130, className = "" }: Interactive3DMascotProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [imgSrc, setImgSrc] = useState(MASCOT_LOCAL_SRC);

  // Motion values for normalized pointer coordinates [-1, 1]
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for 3D rotation physics
  const springConfig = { damping: 18, stiffness: 220, mass: 0.5 };
  const rotateX = useSpring(useTransform(y, [-1, 1], [22, -22]), springConfig);
  const rotateY = useSpring(useTransform(x, [-1, 1], [-22, 22]), springConfig);
  const scale = useSpring(isInteracting ? 1.06 : 1, springConfig);

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalize from -1 to 1 based on container bounds (with padding)
      const normX = Math.max(-1.2, Math.min(1.2, (clientX - centerX) / (rect.width / 2)));
      const normY = Math.max(-1.2, Math.min(1.2, (clientY - centerY) / (rect.height / 2)));

      x.set(normX);
      y.set(normY);
    },
    [x, y],
  );

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsInteracting(true);
    handlePointerMove(e.clientX, e.clientY);
  };

  const onMouseLeave = () => {
    setIsInteracting(false);
    x.set(0);
    y.set(0);
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsInteracting(true);
    if (e.touches[0]) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchEnd = () => {
    setIsInteracting(false);
    x.set(0);
    y.set(0);
  };

  // Aspect ratio of the mascot image is ~3:2 (1536x1024)
  const calculatedWidth = Math.round(size * 1.35);
  const calculatedHeight = Math.round(size);

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      className={`relative flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
      style={{
        perspective: 900,
      }}
    >
      {/* 3D Tilting Mascot Container */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: "preserve-3d",
        }}
        animate={
          !isInteracting
            ? {
                y: [-4, 4, -4],
                rotateZ: [-0.6, 0.6, -0.6],
              }
            : {
                y: 0,
                rotateZ: 0,
              }
        }
        transition={
          !isInteracting
            ? {
                duration: 3.8,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {
                duration: 0.2,
              }
        }
        className="relative flex items-center justify-center will-change-transform"
      >
        <img
          src={imgSrc}
          onError={() => {
            if (imgSrc !== MASCOT_CDN_SRC) {
              setImgSrc(MASCOT_CDN_SRC);
            }
          }}
          alt="QBlock Character"
          style={{
            width: calculatedWidth,
            height: calculatedHeight,
            filter:
              "drop-shadow(-2px -2px 0 rgba(0,0,0,0.85)) drop-shadow(2px -2px 0 rgba(0,0,0,0.85)) drop-shadow(-2px 2px 0 rgba(0,0,0,0.85)) drop-shadow(2px 2px 0 rgba(0,0,0,0.85)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.2))",
          }}
          className="object-contain pointer-events-none transition-filter duration-200"
          referrerPolicy="no-referrer"
          draggable={false}
        />
      </motion.div>

      {/* Dynamic 3D Contact Shadow beneath character */}
      <motion.div
        animate={
          !isInteracting
            ? {
                scale: [0.92, 1.08, 0.92],
                opacity: [0.22, 0.38, 0.22],
              }
            : {
                scale: 1.04,
                opacity: 0.32,
              }
        }
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="h-2 rounded-full bg-slate-900/40 blur-[4px] mt-1"
        style={{
          width: Math.round(calculatedWidth * 0.55),
        }}
      />
    </div>
  );
}

export default Interactive3DMascot;
