import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Marquee } from "@/components/ui/3d-testimonails";

// Unique reviews data
const testimonials = [
  {
    name: "Ava Green",
    username: "@ava",
    body: "Cascade AI made my workflow 10x faster!",
    img: "https://cdn.21st.dev/assets/mirror/55/55cf6231499bcdc496f15ff1d28d4170ac9b99e9279495caa44fca70886d8b2e.jpg",
    country: "🇦🇺 Australia",
  },
  {
    name: "Ana Miller",
    username: "@ana",
    body: "Vertical marquee is a game changer!",
    img: "https://cdn.21st.dev/assets/mirror/f0/f07b84f12ef125cbb837a7bd64da401992f5f62bd55fee10d01cd3dcc8abae80.jpg",
    country: "🇩🇪 Germany",
  },
  {
    name: "Mateo Rossi",
    username: "@mat",
    body: "Animations are buttery smooth!",
    img: "https://cdn.21st.dev/assets/mirror/7c/7c0d2aa99715b15c218385f5679347782843c02f939d8eee6f9cb1cad6ba6ed0.jpg",
    country: "🇮🇹 Italy",
  },
  {
    name: "Maya Patel",
    username: "@maya",
    body: "Setup was a breeze!",
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    country: "🇮🇳 India",
  },
  {
    name: "Lucas Silva",
    username: "@lucas",
    body: "The 3D cards and fluid physics feel next level.",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    country: "🇧🇷 Brazil",
  },
  {
    name: "Elena Rostova",
    username: "@elena",
    body: "Best community feedback display we have ever built!",
    img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
    country: "🇪🇸 Spain",
  },
  {
    name: "Liam Vance",
    username: "@liam",
    body: "Flawless responsive behavior across desktop & mobile.",
    img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    country: "🇺🇸 United States",
  },
  {
    name: "Chloe Kim",
    username: "@chloe",
    body: "Clean code, modern animations, super easy to drop in.",
    img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    country: "🇰🇷 South Korea",
  },
  {
    name: "Noah Dupont",
    username: "@noah",
    body: "QBLOCK has set a completely new standard for voxel games!",
    img: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80",
    country: "🇫🇷 France",
  },
];

export function TestimonialCard({
  img,
  name,
  username,
  body,
  country,
}: {
  img: string;
  name: string;
  username: string;
  body: string;
  country: string;
}) {
  return (
    <Card className="w-64 cursor-pointer overflow-hidden border border-black/[0.08] dark:border-white/10 bg-white/70 dark:bg-[#14171d]/80 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:bg-white dark:hover:bg-[#1c2028] shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-black/[0.06] dark:border-white/10">
            <AvatarImage src={img} alt={name} />
            <AvatarFallback>{name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-tight text-foreground truncate">{name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{country}</span>
            </div>
            <span className="text-[10px] text-muted-foreground truncate">{username}</span>
          </div>
        </div>
        <p className="mt-2.5 text-xs font-medium leading-relaxed text-foreground/80 dark:text-foreground/70">{body}</p>
      </CardContent>
    </Card>
  );
}

export function DemoOne() {
  const firstColumn = testimonials.slice(0, 3);
  const secondColumn = testimonials.slice(3, 6);
  const thirdColumn = testimonials.slice(6, 9);

  return (
    <div className="relative flex h-[500px] w-full flex-row items-center justify-center gap-4 overflow-hidden [perspective:1000px]">
      <div
        className="flex flex-row items-center gap-4"
        style={{
          transform: "rotateX(20deg) rotateZ(-20deg) skewX(20deg)",
        }}
      >
        <Marquee vertical pauseOnHover className="[--duration:25s]">
          {firstColumn.map((item) => (
            <TestimonialCard key={item.username} {...item} />
          ))}
        </Marquee>
        <Marquee vertical reverse pauseOnHover className="[--duration:25s]">
          {secondColumn.map((item) => (
            <TestimonialCard key={item.username} {...item} />
          ))}
        </Marquee>
        <Marquee vertical pauseOnHover className="[--duration:25s]">
          {thirdColumn.map((item) => (
            <TestimonialCard key={item.username} {...item} />
          ))}
        </Marquee>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background" />
    </div>
  );
}

export default DemoOne;
