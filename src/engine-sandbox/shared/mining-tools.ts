// QBLOCK Mining & Tool Durability System
// Comprehensive tool tiers, block hardness categories, sound materials, and drop tables.

export type ToolCategory = "pickaxe" | "shovel" | "axe" | "sword" | "hand";

export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  speed: number;
  durability: number;
}

export const TOOLS: Record<string, ToolDefinition> = {
  // ── Pickaxes ───────────────────────────────────────
  wooden_pickaxe: { id: "wooden_pickaxe", name: "Wooden Pickaxe", category: "pickaxe", speed: 2.0, durability: 59 },
  stone_pickaxe: { id: "stone_pickaxe", name: "Stone Pickaxe", category: "pickaxe", speed: 4.0, durability: 131 },
  iron_pickaxe: { id: "iron_pickaxe", name: "Iron Pickaxe", category: "pickaxe", speed: 6.0, durability: 250 },
  golden_pickaxe: { id: "golden_pickaxe", name: "Golden Pickaxe", category: "pickaxe", speed: 12.0, durability: 32 },
  gold_pickaxe: { id: "gold_pickaxe", name: "Golden Pickaxe", category: "pickaxe", speed: 12.0, durability: 32 },
  diamond_pickaxe: { id: "diamond_pickaxe", name: "Diamond Pickaxe", category: "pickaxe", speed: 8.0, durability: 1561 },
  netherite_pickaxe: { id: "netherite_pickaxe", name: "Netherite Pickaxe", category: "pickaxe", speed: 10.0, durability: 2031 },

  // ── Shovels ────────────────────────────────────────
  wooden_shovel: { id: "wooden_shovel", name: "Wooden Shovel", category: "shovel", speed: 2.0, durability: 59 },
  stone_shovel: { id: "stone_shovel", name: "Stone Shovel", category: "shovel", speed: 4.0, durability: 131 },
  iron_shovel: { id: "iron_shovel", name: "Iron Shovel", category: "shovel", speed: 6.0, durability: 250 },
  golden_shovel: { id: "golden_shovel", name: "Golden Shovel", category: "shovel", speed: 12.0, durability: 32 },
  gold_shovel: { id: "gold_shovel", name: "Golden Shovel", category: "shovel", speed: 12.0, durability: 32 },
  diamond_shovel: { id: "diamond_shovel", name: "Diamond Shovel", category: "shovel", speed: 8.0, durability: 1561 },

  // ── Axes ───────────────────────────────────────────
  wooden_axe: { id: "wooden_axe", name: "Wooden Axe", category: "axe", speed: 2.0, durability: 59 },
  stone_axe: { id: "stone_axe", name: "Stone Axe", category: "axe", speed: 4.0, durability: 131 },
  iron_axe: { id: "iron_axe", name: "Iron Axe", category: "axe", speed: 6.0, durability: 250 },
  golden_axe: { id: "golden_axe", name: "Golden Axe", category: "axe", speed: 12.0, durability: 32 },
  gold_axe: { id: "gold_axe", name: "Golden Axe", category: "axe", speed: 12.0, durability: 32 },
  diamond_axe: { id: "diamond_axe", name: "Diamond Axe", category: "axe", speed: 8.0, durability: 1561 },
  netherite_axe: { id: "netherite_axe", name: "Netherite Axe", category: "axe", speed: 10.0, durability: 2031 },

  // ── Swords (effective vs cobwebs/leaves/foliage) ───
  short_sword: { id: "short_sword", name: "Short Sword", category: "sword", speed: 1.5, durability: 59 },
  gold_sword: { id: "gold_sword", name: "Golden Sword", category: "sword", speed: 1.5, durability: 32 },
  iron_sword: { id: "iron_sword", name: "Iron Sword", category: "sword", speed: 1.5, durability: 250 },
  diamond_sword: { id: "diamond_sword", name: "Diamond Sword", category: "sword", speed: 1.5, durability: 1561 },
  dark_magic_staff: { id: "dark_magic_staff", name: "Dark Magic Sickle Staff", category: "sword", speed: 1.8, durability: 2031 },
};

/** Identifies if an item is a tool with durability and mining speed */
export function getToolDefinition(itemId: number | string | null | undefined): ToolDefinition | null {
  if (typeof itemId !== "string") return null;
  const key = itemId.toLowerCase().trim();
  if (TOOLS[key]) return TOOLS[key];

  // Fuzzy match for custom named tools
  if (key.includes("pickaxe")) {
    if (key.includes("diamond")) return TOOLS.diamond_pickaxe;
    if (key.includes("iron")) return TOOLS.iron_pickaxe;
    if (key.includes("stone")) return TOOLS.stone_pickaxe;
    if (key.includes("gold")) return TOOLS.golden_pickaxe;
    if (key.includes("netherite")) return TOOLS.netherite_pickaxe;
    return TOOLS.wooden_pickaxe;
  }
  if (key.includes("shovel")) {
    if (key.includes("diamond")) return TOOLS.diamond_shovel;
    if (key.includes("iron")) return TOOLS.iron_shovel;
    if (key.includes("stone")) return TOOLS.stone_shovel;
    if (key.includes("gold")) return TOOLS.golden_shovel;
    return TOOLS.wooden_shovel;
  }
  if (key.includes("axe")) {
    if (key.includes("diamond")) return TOOLS.diamond_axe;
    if (key.includes("iron")) return TOOLS.iron_axe;
    if (key.includes("stone")) return TOOLS.stone_axe;
    if (key.includes("gold")) return TOOLS.golden_axe;
    if (key.includes("netherite")) return TOOLS.netherite_axe;
    return TOOLS.wooden_axe;
  }
  if (key.includes("sword") || key.includes("staff")) {
    if (key.includes("diamond")) return TOOLS.diamond_sword;
    if (key.includes("iron")) return TOOLS.iron_sword;
    if (key.includes("gold")) return TOOLS.gold_sword;
    if (key.includes("staff")) return TOOLS.dark_magic_staff;
    return TOOLS.short_sword;
  }

  return null;
}

/** Determines what tool type is best suited for breaking a block */
export function getBlockPreferredTool(blockId: number, blockName = ""): ToolCategory {
  const name = blockName.toLowerCase();

  // Foliage / Leaves / Cobwebs
  if (blockId === 9 || /leaves|foliage|vine|web|flower|grass_plant/.test(name)) {
    return "sword";
  }

  // Shovel blocks: Soil, dirt, sand, gravel, snow, clay
  if (
    blockId === 1 || // Grass
    blockId === 2 || // Dirt
    blockId === 6 || // Sand
    blockId === 15 || // Gravel
    blockId === 16 || // Snow
    blockId === 63 || // Slime
    /dirt|grass|sand|gravel|snow|clay|mud|path/.test(name)
  ) {
    return "shovel";
  }

  // Axe blocks: Logs, planks, chests, doors, wooden slabs
  if (
    blockId === 7 || // Oak Log
    blockId === 8 || // Birch Log
    blockId === 13 || // Oak Planks
    blockId === 49 || // Wood Door
    blockId === 51 || // Wood Door
    blockId === 55 || // Chest
    blockId === 56 || // Trapped Chest
    blockId === 64 || // Oak Slab
    blockId === 66 || // Oak VSlab
    /log|wood|plank|chest|bookshelf|door|fence|gate|ladder|barrel|pumpkin|melon/.test(name)
  ) {
    return "axe";
  }

  // Pickaxe blocks: Stone, cobble, ores, minerals, metals, obsidian, bricks
  return "pickaxe";
}

/** Determines which synthesized sound profile to use for a block */
export function getBlockSoundMaterial(blockId: number, blockName = ""): string {
  const name = blockName.toLowerCase();

  if (blockId === 10 || blockId === 17 || blockId === 58 || /glass|ice|crystal|amethyst/.test(name)) {
    return "glass";
  }
  if (blockId === 19 || blockId === 20 || blockId === 47 || blockId === 48 || blockId === 50 || /gold|iron|metal|ore|diamond|emerald|lapis|copper|ingot/.test(name)) {
    return "gold";
  }
  if (blockId === 7 || blockId === 8 || blockId === 13 || blockId === 55 || blockId === 56 || /log|wood|plank|door|chest|bookshelf|ladder/.test(name)) {
    return "wood";
  }
  if (blockId === 6 || blockId === 15 || /sand|gravel/.test(name)) {
    return "sand";
  }
  if (blockId === 16 || /snow/.test(name)) {
    return "snow";
  }
  if (blockId === 9 || /leaves|vine|plant|flower|foliage/.test(name)) {
    return "leaves";
  }
  if (blockId === 1 || blockId === 2 || /dirt|grass|clay|mud/.test(name)) {
    return "dirt";
  }

  return "stone";
}

/** Determines what item ID drops when a block is broken */
export function getBlockDrop(blockId: number): number | null {
  // Glass and Ice shatter without dropping items unless silk touch
  if (blockId === 10 || blockId === 17 || blockId === 58) {
    return null;
  }
  // Grass drops Dirt
  if (blockId === 1) {
    return 2;
  }
  // Stone drops Cobblestone
  if (blockId === 3) {
    return 4;
  }
  // Diamond Ore drops Diamond Block (or diamond)
  if (blockId === 48) {
    return 20;
  }
  // Iron Ore drops Iron Block (or ore)
  if (blockId === 47) {
    return 47;
  }
  // Leaves have a small chance of dropping, otherwise null
  if (blockId === 9) {
    return Math.random() < 0.15 ? 1 : null;
  }

  // All other blocks drop themselves
  return blockId;
}

/** Computes the effective mining speed multiplier */
export function calculateMiningSpeed(
  tool: ToolDefinition | null,
  preferredCategory: ToolCategory
): number {
  if (!tool) {
    // Bare hand
    return 1.0;
  }

  if (tool.category === preferredCategory) {
    // Proper tool bonus
    return tool.speed;
  }

  // Swords cut foliage/leaves exceptionally fast
  if (preferredCategory === "sword" && tool.category === "sword") {
    return 15.0;
  }

  // Sword or wrong tool on generic block
  if (tool.category === "sword") {
    return 1.4;
  }

  // Wrong tool is slightly slower or equal to hand
  return 1.0;
}
