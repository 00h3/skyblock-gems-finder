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
    id: "block-fall",
    title: "Block Fall",
    subtitle: "Platforms vanish fast",
    bio: "Stay moving as blocks disintegrate under your footsteps. Last survivor wins.",
    img: baseplateIcon,
    hue: "from-red-400 via-amber-400 to-yellow-300",
    mode: "Arcade",
    modeColor: "#dc2626",
    mood: "voxel",
    players: "890",
    likes: "3.1K",
    popularity: 88,
  },
  {
    id: "baseplate",
    title: "Baseplate",
    subtitle: "Classic building canvas",
    bio: "Endless flat voxel terrain powered by the SkyBlock engine. Build, test, and explore freely.",
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
  {
    id: "bedwars",
    title: "Bedwars",
    subtitle: "Protect your bed",
    bio: "Defend your bed and break everyone else's. Queue up in the golden-hour lobby.",
    img: baseplateIcon,
    hue: "from-amber-300 via-orange-300 to-rose-300",
    mode: "PvP",
    modeColor: "#d97706",
    mood: "voxel",
    players: "1.4K",
    likes: "4.8K",
    badge: "NEW",
    popularity: 92,
  },
];

export const UPLOADED_DISCOVER_TABS = ["Party", "PvP", "Building", "Fantasy", "Time Pass"] as const;
