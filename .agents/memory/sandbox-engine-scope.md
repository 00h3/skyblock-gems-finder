---
name: Sandbox engine scope
description: The shared Sandbox runtime and game modes that must be preserved.
---

The user identifies the Game Sandbox as the main engine shared by BedWars,
Skyblock, and BlockFall, and explicitly wants that game preserved when removing
other engine or game features.

**Why:** the user stated this scope while asking to remove a separate engine.

**How to apply:** preserve the shared Sandbox runtime and all three named modes;
confirm before removing additional game features.

## Performance work must preserve visual quality

Keep the games' visual quality and Retina rendering intact while addressing lag.
Do not silently reduce resolution, texture detail, shadows, or visual effects as
a performance fix.

**Why:** the user explicitly said they do not want quality or Retina downgraded
to reduce lag in BedWars, Skyblock, and BlockFall.

**How to apply:** profile first, then optimize rendering and simulation work
without lowering visual fidelity; keep the device-pixel ratio on portrait and
landscape resizes, and ask before considering any visible tradeoff.
