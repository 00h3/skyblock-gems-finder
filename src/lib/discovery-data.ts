import baseplateIcon from "@/assets/game-baseplate.jpg";

export type Mood = "all" | "popular" | "voxel" | "horror";

export type DiscoveryGame = {
  id: string;
  title: string;
  subtitle: string;
  bio: string;
  img: string;
  hue: string;
  mode: string;
  modeColor: string;
  mood: Exclude<Mood, "all">;
  players: string;
  likes: string;
  badge?: "NEW" | "UPDATED";
  progress?: number;
  popularity: number;
};

export const DISCOVERY_GAMES: DiscoveryGame[] = [
  {
    id: "skyblock",
    title: "SkyBlock",
    subtitle: "Classic floating island",
    bio: "Build and expand your floating island in the sky starting with just a tree and a chest.",
    img: baseplateIcon,
    hue: "from-sky-400 via-emerald-300 to-emerald-200",
    mode: "SkyBlock",
    modeColor: "#0284c7",
    mood: "popular",
    players: "2.1K",
    likes: "9.2K",
    badge: "NEW",
    popularity: 98,
  },
  {
    id: "baseplate",
    title: "Cell 99",
    subtitle: "Classic building canvas",
    bio: "Endless flat voxel terrain powered by the SkyBlock engine. Build, test, and explore freely in Cell 99.",
    img: baseplateIcon,
    hue: "from-emerald-400 via-teal-400 to-sky-300",
    mode: "Sandbox",
    modeColor: "#059669",
    mood: "popular",
    players: "3.4K",
    likes: "8.7K",
    badge: "NEW",
    popularity: 96,
  },
];

export const UPLOADED_DISCOVER_TABS = ["All", "Building", "Sandbox", "Survival"] as const;
