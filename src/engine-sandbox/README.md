# Sandbox engine

The Sandbox route at `/game/sandbox` runs BedWars, Skyblock, and BlockFall on
one shared voxel engine. Keep shared rendering, world, player, and interaction
systems in `shared/`; keep mode-specific systems in that game's folder.

- `shared/` — engine systems used by more than one game mode
- `bedwars/` — BedWars lobby and model systems
- `skyblock/` — Skyblock progression, economy, environment, and world events
- `blockfall/` — BlockFall round and match flow

The route remains in `src/routes/game.sandbox.tsx` as the runtime coordinator;
it is intentionally not a second engine.
