'use client';

import React, { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, motionValue, useReducedMotion, useTransform } from 'motion/react';

import './JellyRadio.css';

export interface JellyRadioItemObject {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export type JellyRadioItem = string | JellyRadioItemObject;

export interface JellyRadioProps {
  items?: JellyRadioItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, index: number) => void;
  chipColor?: string;
  activeColor?: string;
  textColor?: string;
  activeTextColor?: string;
  size?: 'sm' | 'md' | 'lg';
  gap?: number;
  radius?: number;
  swell?: number;
  barge?: number;
  shrink?: number;
  jelly?: number;
  bounce?: number;
  stagger?: number;
  stiffness?: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const DEFAULT_ITEMS: JellyRadioItem[] = ['Off', 'Low', 'Medium', 'High', 'Max'];
const SIZES: Record<'sm' | 'md' | 'lg', [number, number, number]> = {
  sm: [28, 12, 12],
  md: [36, 13, 16],
  lg: [44, 14, 20]
};

const spring = (k: number, m: number, bounce: number) => ({
  type: 'spring' as const,
  stiffness: k,
  damping: 2 * Math.sqrt(k * m) * (1 - bounce),
  mass: m
});

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  mv: {
    x: ReturnType<typeof motionValue<number>>;
    sx: ReturnType<typeof motionValue<number>>;
    sy: ReturnType<typeof motionValue<number>>;
  };
  children: React.ReactNode;
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip({ mv, children, ...rest }, ref) {
  const transform = useTransform(() => `translateX(${mv.x.get()}px) scale(${mv.sx.get()}, ${mv.sy.get()})`);
  return (
    <motion.button ref={ref} style={{ transform }} {...rest}>
      {children}
    </motion.button>
  );
});

export default function JellyRadio({
  items = DEFAULT_ITEMS,
  value: controlledValue,
  defaultValue,
  onChange,
  chipColor = '#27272a',
  activeColor = '#f5f5f5',
  textColor = '#f5f5f5',
  activeTextColor = '#18181b',
  size = 'md',
  gap = 8,
  radius = 18,
  swell = 0.2,
  barge = 6,
  shrink = 0.05,
  jelly = 1,
  bounce = 0.25,
  stagger = 22,
  stiffness = 580,
  disabled = false,
  ariaLabel = 'Options',
  className = ''
}: JellyRadioProps) {
  const normalizedItems = items.map(item =>
    typeof item === 'string' ? { value: item, label: item } : item
  );

  const initialVal = controlledValue !== undefined
    ? controlledValue
    : defaultValue !== undefined
    ? defaultValue
    : normalizedItems[0]?.value ?? '';

  const [selectedVal, setSelectedVal] = useState<string>(initialVal);
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : selectedVal;

  const activeIndex = Math.max(
    0,
    normalizedItems.findIndex(i => i.value === activeValue)
  );

  const isReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const mvsRef = useRef<
    Array<{
      x: ReturnType<typeof motionValue<number>>;
      sx: ReturnType<typeof motionValue<number>>;
      sy: ReturnType<typeof motionValue<number>>;
    }>
  >([]);

  if (mvsRef.current.length !== normalizedItems.length) {
    mvsRef.current = normalizedItems.map(() => ({
      x: motionValue(0),
      sx: motionValue(1),
      sy: motionValue(1)
    }));
  }

  const [heightPx, fontSizePx, pxPx] = SIZES[size] || SIZES.md;

  useLayoutEffect(() => {
    const widths = buttonRefs.current.map(b => b?.offsetWidth || 0);
    if (widths.length === 0) return;

    const n = normalizedItems.length;
    const targetIdx = activeIndex;

    for (let i = 0; i < n; i++) {
      const mv = mvsRef.current[i];
      if (!mv) continue;

      let targetX = 0;
      let targetSx = 1;
      let targetSy = 1;

      if (i === targetIdx) {
        targetSx = 1 + swell;
        targetSy = 1 - swell * jelly * 0.3;
      } else {
        targetSx = 1 - shrink;
        targetSy = 1 - shrink * 0.5;

        const dist = Math.abs(i - targetIdx);
        const direction = i < targetIdx ? -1 : 1;
        const pushAmount = barge + (swell * (widths[targetIdx] || 40)) / (dist * 1.5 + 1);
        targetX = direction * pushAmount;
      }

      if (isReduced) {
        mv.x.set(targetX);
        mv.sx.set(targetSx);
        mv.sy.set(targetSy);
      } else {
        const delay = Math.abs(i - targetIdx) * (stagger / 1000);
        const springConfig = spring(stiffness / (1 + Math.abs(i - targetIdx) * 0.2), 1, bounce);

        animate(mv.x, targetX, { ...springConfig, delay });
        animate(mv.sx, targetSx, { ...springConfig, delay });
        animate(mv.sy, targetSy, { ...springConfig, delay });
      }
    }
  }, [activeIndex, normalizedItems.length, swell, barge, shrink, jelly, bounce, stagger, stiffness, isReduced]);

  const handleSelect = (val: string, idx: number, disabledItem?: boolean) => {
    if (disabled || disabledItem) return;
    if (!isControlled) {
      setSelectedVal(val);
    }
    onChange?.(val, idx);
  };

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`jelly-radio-group ${disabled ? 'jelly-radio-disabled' : ''} ${className}`}
      style={{ gap: `${gap}px` }}
    >
      {normalizedItems.map((item, idx) => {
        const isActive = item.value === activeValue;
        const mv = mvsRef.current[idx];

        return (
          <Chip
            key={item.value}
            ref={el => {
              buttonRefs.current[idx] = el;
            }}
            mv={mv}
            role="radio"
            aria-checked={isActive}
            disabled={disabled || item.disabled}
            onClick={() => handleSelect(item.value, idx, item.disabled)}
            className={`jelly-radio-chip ${isActive ? 'active' : ''}`}
            style={{
              height: `${heightPx}px`,
              padding: `0 ${pxPx}px`,
              borderRadius: `${radius}px`,
              fontSize: `${fontSizePx}px`,
              backgroundColor: isActive ? activeColor : chipColor,
              color: isActive ? activeTextColor : textColor
            }}
          >
            {item.icon && <span className="jelly-radio-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </Chip>
        );
      })}
    </div>
  );
}
