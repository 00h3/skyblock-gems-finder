export function Globe({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute h-56 w-56 rounded-full border border-white/25 bg-[radial-gradient(circle_at_35%_28%,#fff8,transparent_18%),radial-gradient(circle_at_35%_30%,#38bdf8,#1d4ed8_58%,#172554)] shadow-[0_0_60px_#38bdf855] ${className}`}
    >
      <div className="absolute inset-[13%] rounded-full border border-white/20 [transform:rotate(-24deg)_scaleX(.42)]" />
      <div className="absolute inset-[13%] rounded-full border border-white/20 [transform:rotate(24deg)_scaleX(.42)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
      <div className="absolute left-[24%] top-[28%] h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
      <div className="absolute left-[65%] top-[53%] h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_10px_#fcd34d]" />
    </div>
  );
}
