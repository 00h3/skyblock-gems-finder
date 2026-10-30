import React from "react";
import { ThreeDTestimonials } from "@/components/ui/3d-testimonials";

export function ThreeDTestimonialsDemo() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-[#0c0d0f] transition-colors">
      <div className="text-center mb-6 max-w-md">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#fa4616] bg-[#fa4616]/10 px-3 py-1 rounded-full">
          Player Reviews
        </span>
        <h2 className="text-2xl font-black text-foreground mt-3 tracking-tight">
          What the QBLOCK Community Says
        </h2>
        <p className="text-sm text-foreground/60 mt-1">
          Real reviews from top builders, PvP champions, and world creators.
        </p>
      </div>

      <ThreeDTestimonials />
    </div>
  );
}

export default ThreeDTestimonialsDemo;
