import { SandboxGame } from "@/routes/game.sandbox";

/** Bedwars uses the exact Sandbox renderer and touch/physics controls. */
export function BedwarsGoldenDays() {
  return <SandboxGame goldenDays />;
}
