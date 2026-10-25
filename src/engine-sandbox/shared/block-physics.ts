import type { World } from "./world";

/** Block ids affected by gravity. Kept empty so placed blocks stay solid and never disappear into the void. */
export const GRAVITY_BLOCKS = new Set<number>();

const STEP_SECONDS = 0.06;
const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/**
 * Lightweight falling-block simulation. Only positions touched by edits are
 * checked, so idle cost is zero. Unsupported sand/gravel drops one block per
 * step, giving a visible fall instead of an instant teleport.
 */
export class BlockGravity {
  private pending = new Map<string, [number, number, number]>();
  private acc = 0;

  constructor(
    private world: World,
    private onMove: (x: number, y: number, z: number, id: number) => void,
  ) {}

  notify(x: number, y: number, z: number) {
    this.pending.set(key(x, y, z), [x, y, z]);
    this.pending.set(key(x, y + 1, z), [x, y + 1, z]);
  }

  tick(dt: number) {
    if (this.pending.size === 0) return;
    this.acc += dt;
    if (this.acc < STEP_SECONDS) return;
    this.acc = 0;
    const batch = [...this.pending.values()];
    this.pending.clear();
    for (const [x, y, z] of batch) {
      const id = this.world.get(x, y, z);
      if (!GRAVITY_BLOCKS.has(id) || y <= 0 || this.world.get(x, y - 1, z) !== 0) continue;
      this.world.set(x, y, z, 0);
      this.world.set(x, y - 1, z, id);
      this.onMove(x, y, z, 0);
      this.onMove(x, y - 1, z, id);
      this.pending.set(key(x, y - 1, z), [x, y - 1, z]);
      this.pending.set(key(x, y + 1, z), [x, y + 1, z]);
    }
  }
}
