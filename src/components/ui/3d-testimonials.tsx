"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Marquee } from "@/components/ui/3d-testimonails";

export { Marquee } from "@/components/ui/3d-testimonails";

export interface TestimonialItem {
  name: string;
  username: string;
  body: string;
  img: string;
  country: string;
  badge?: string;
}

export const TESTIMONIALS_DATA: TestimonialItem[] = [
  {
    name: "Alex 'VoxelGod'",
    username: "@voxel_god",
    body: "The physics and instant block placement in QBLOCK SkyBlock feel 10x smoother than any other voxel platform. Expanding celestial islands with friends is pure addictive fun!",
    img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    country: "🇺🇸 United States",
    badge: "Top Builder",
  },
  {
    name: "Sarah 'Frostbite'",
    username: "@frostbite_qb",
    body: "The zero-latency hits, clutch bed defense, and liquid glass HUD give Bedwars an insane competitive edge. You literally feel every swing and knockback.",
    img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    country: "🇨🇦 Canada",
    badge: "PvP Master",
  },
  {
    name: "Marcus Chen",
    username: "@marcus_dev",
    body: "As a game dev, building custom realms on Baseplate with QBLOCK's tools is effortless. The performance on mobile and desktop web is lightyears ahead.",
    img: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80",
    country: "🇸🇬 Singapore",
    badge: "Verified Dev",
  },
  {
    name: "Ava Green",
    username: "@ava",
    body: "Cascade engine made our voxel workflow 10x faster! Building and exploring realms in real-time runs like butter.",
    img: "https://cdn.21st.dev/assets/mirror/55/55cf6231499bcdc496f15ff1d28d4170ac9b99e9279495caa44fca70886d8b2e.jpg",
    country: "🇦🇺 Australia",
    badge: "Architect",
  },
  {
    name: "Ana Miller",
    username: "@ana",
    body: "The 3D vertical marquee and fluid glass interface are absolute game changers. It feels like an AAA console title in a browser.",
    img: "https://cdn.21st.dev/assets/mirror/f0/f07b84f12ef125cbb837a7bd64da401992f5f62bd55fee10d01cd3dcc8abae80.jpg",
    country: "🇩🇪 Germany",
    badge: "Voxel Pro",
  },
  {
    name: "Mateo Rossi",
    username: "@mat",
    body: "Animations are buttery smooth! The inventory drag & drop and liquid menu respond instantaneously with haptics.",
    img: "https://cdn.21st.dev/assets/mirror/7c/7c0d2aa99715b15c218385f5679347782843c02f939d8eee6f9cb1cad6ba6ed0.jpg",
    country: "🇮🇹 Italy",
    badge: "Champion",
  },
  {
    name: "Maya Patel",
    username: "@maya",
    body: "Setting up multiplayer servers and inviting guild mates took 5 seconds. Incredible performance on mobile phones.",
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    country: "🇮🇳 India",
    badge: "Guild Leader",
  },
  {
    name: "Lucas Silva",
    username: "@lucas_vox",
    body: "Custom skins, accessories, and voxel shading render with zero stutter even in 50-player lobbies. Stunning work!",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    country: "🇧🇷 Brazil",
    badge: "Content Creator",
  },
  {
    name: "Chloe Kim",
    username: "@chloe_qb",
    body: "Trading in the Auction House and fighting Phoenix Bosses with guild members is the best gaming experience of this year.",
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    country: "🇰🇷 South Korea",
    badge: "Collector",
  },
];

export function TestimonialCard({
  img,
  name,
  username,
  body,
  country,
}: TestimonialItem) {
  return (
    <div className="qb-squircle press relative w-64 cursor-pointer overflow-hidden rounded-[14px] border border-black/[0.08] dark:border-white/10 bg-white/90 dark:bg-[#15181f]/90 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] shadow-[0_8px_20px_rgba(0,0,0,0.05)] select-none">
      {/* Top gloss curve */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 dark:from-white/15 to-transparent pointer-events-none z-10" />
      <span
        className="pointer-events-none absolute inset-0 -translate-x-[160%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent z-10"
        style={{ animation: "glossyShineSweep 16s cubic-bezier(0.4, 0, 0.2, 1) infinite" }}
      />
      <div className="relative z-20 p-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9 shrink-0 border border-black/[0.06] dark:border-white/10">
            <AvatarImage src={img} alt={name} />
            <AvatarFallback className="text-[11px] font-bold">{name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[12px] font-black tracking-tight text-[#1A1D20] dark:text-white truncate">
                {name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#6B7280] dark:text-[#9ea7b3] truncate">{username}</span>
              <span className="text-[9.5px] text-[#6B7280]/70 shrink-0">{country}</span>
            </div>
          </div>
        </div>
        <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-[#1A1D20]/90 dark:text-white/90">
          {body}
        </p>
      </div>
    </div>
  );
}

export interface ThreeDTestimonialsProps {
  className?: string;
  items?: TestimonialItem[];
}

export function ThreeDTestimonials({
  className,
  items = TESTIMONIALS_DATA,
}: ThreeDTestimonialsProps) {
  const firstColumn = items.slice(0, 3);
  const secondColumn = items.slice(3, 6);
  const thirdColumn = items.slice(6, 9);

  return (
    <div
      className={`relative flex h-[380px] w-full flex-row items-center justify-center gap-2.5 overflow-hidden [perspective:1000px] select-none ${className ?? ""}`}
    >
      <div
        className="flex flex-row items-center gap-2.5"
        style={{
          transform: "rotateX(18deg) rotateZ(-16deg) skewX(16deg)",
        }}
      >
        <Marquee vertical pauseOnHover className="[--duration:28s]">
          {firstColumn.map((item) => (
            <TestimonialCard key={item.username} {...item} />
          ))}
        </Marquee>
        <Marquee vertical reverse pauseOnHover className="[--duration:24s]">
          {secondColumn.map((item) => (
            <TestimonialCard key={item.username} {...item} />
          ))}
        </Marquee>
        <Marquee vertical pauseOnHover className="[--duration:30s]">
          {thirdColumn.map((item) => (
            <TestimonialCard key={item.username} {...item} />
          ))}
        </Marquee>
      </div>

      {/* Subtle depth fade gradients top and bottom */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#f1f2f4] dark:from-[#0e0f12] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#f1f2f4] dark:from-[#0e0f12] to-transparent z-10" />
    </div>
  );
}

export default ThreeDTestimonials;
