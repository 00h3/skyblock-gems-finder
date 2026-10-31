import React, { useState, useRef, useEffect } from 'react';
import './HoldButton.css';

export interface HoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fillColor?: string;
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  holdTime?: number;
  onHoldComplete?: () => void;
  children: React.ReactNode;
  doneText?: React.ReactNode;
}

export function HoldButton({
  fillColor = '#fa4616',
  size = 'md',
  glow = true,
  holdTime = 1500,
  onHoldComplete,
  children,
  doneText = 'Ready!',
  className = '',
  onClick,
  ...props
}: HoldButtonProps) {
  const [phase, setPhase] = useState<'idle' | 'holding' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const startHold = (e: React.PointerEvent) => {
    if (props.disabled) return;
    setPhase('holding');
    startTimeRef.current = performance.now();

    const updateProgress = (now: number) => {
      if (!startTimeRef.current) return;
      const elapsed = now - startTimeRef.current;
      const p = Math.min(1, elapsed / holdTime);
      setProgress(p);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(updateProgress);
      } else {
        setPhase('done');
        if (onHoldComplete) onHoldComplete();
        setTimeout(() => {
          setPhase('idle');
          setProgress(0);
        }, 1200);
      }
    };

    rafRef.current = requestAnimationFrame(updateProgress);
  };

  const endHold = () => {
    if (phase === 'done') return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startTimeRef.current = null;
    if (phase === 'holding') {
      setPhase('idle');
      setProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const sizeClass = size === 'sm' ? 'hold-button--sm' : size === 'lg' ? 'hold-button--lg' : 'hold-button--md';

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`hold-button ${sizeClass} ${className}`}
      data-phase={phase}
      data-glow={glow ? 'true' : 'false'}
      data-input="pointer"
      style={
        {
          '--hb-fill': fillColor,
          '--hb-p': progress,
          '--hb-hold': `${holdTime}ms`,
        } as React.CSSProperties
      }
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onClick={(e) => {
        if (onClick) onClick(e);
      }}
      {...props}
    >
      <div className="hold-button__pulse" />
      <div className="hold-button__label">
        <span className="hold-button__idle">{children}</span>
        <span className="hold-button__done">{doneText}</span>
      </div>
      <div className="hold-button__clip">
        <div className="hold-button__fill">
          <span>{children}</span>
        </div>
      </div>
    </button>
  );
}
