# Agent Development Tips

## Build and Deploy Workflow

**ALWAYS run build and push after making code changes:**

```bash
bun run build && git add -A && git commit -m "Your message" && git push -u origin <branch-name>
```

The build outputs to `/docs` folder which is deployed via GitHub Pages.

## Architecture

The game uses a **hybrid bitECS + spatial grid** architecture:
- Physics + rendering run in a **Web Worker** (`physics.worker.ts`) using OffscreenCanvas
- The main thread (`App.tsx`) handles UI and sends input events via `postMessage`
- The simulation grid is a flat `Uint8Array` where each byte is a particle type ID
- Systems iterate the grid in row order (NOT via ECS queries) to preserve simulation correctness

## Key Files

- `/src/App.tsx` - React UI, material picker, brush controls, worker communication
- `/src/App.css` - UI styling
- `/src/physics.worker.ts` - System orchestrator: game loop, input handling, calls physics + render systems
- `/src/ecs/constants.ts` - Particle type IDs (0-65), color tables, `MATERIAL_TO_ID`, `CELL_SIZE`
- `/src/ecs/components.ts` - bitECS component definitions (`Position`, `ParticleType`)
- `/src/ecs/world.ts` - `GameWorld` type, `createGameWorld()`, `initGrid()`, `resetGrid()`
- `/src/ecs/spatial.ts` - Grid helpers: `getEntityAt()`, `getTypeAt()`, `inBounds()`
- `/src/ecs/lifecycle.ts` - Entity lifecycle: `spawnParticle`, `destroyParticle`, `moveParticle`, `swapParticles`, `setCell`
- `/src/ecs/systems/render.ts` - Fills ImageData from typeGrid
- `/src/ecs/systems/input.ts` - Processes user input events via ECS lifecycle
- `/src/ecs/systems/rising.ts` - Rising pass (top-to-bottom): fire, gas, plasma, lightning, comet, bubbles, birds, bees, fireflies
- `/src/ecs/systems/falling.ts` - Falling pass (bottom-to-top): dispatches to all subsystems below + inline sand/water/dirt/fluff/nitro/slime/gunpowder/honey/snow/poison
- `/src/ecs/systems/creatures.ts` - 10 creature handlers: bird, bee, bug, ant, alien, firefly, worm, fairy, fish, moth
- `/src/ecs/systems/spawners.ts` - 8 spawner handlers: tap, anthill, hive, nest, gun, volcano, star, black hole
- `/src/ecs/systems/reactions.ts` - 6 reaction handlers: acid, lava, mold, mercury, void, rust
- `/src/ecs/systems/growing.ts` - 3 growth handlers: plant, seed, algae
- `/src/ecs/systems/effects.ts` - 6 effect handlers: quark, crystal, ember, static, dust, glitter
- `/src/ecs/systems/projectiles.ts` - Bullet movement (rising/falling), bullet trail fading
- `/docs/` - Built output for deployment
- `/README.md` - Full particle documentation and interactions
- `/mermaid.md` - Visual interaction diagrams

## System Pipeline (per physics step)

1. `risingPhysicsSystem(grid, cols, rows)` - top-to-bottom iteration
2. `fallingPhysicsSystem(grid, cols, rows)` - bottom-to-top iteration
3. `renderSystem(typeGrid, cols, rows, data32, canvasWidth)` - fill pixel buffer

Each system handler has the signature:
```typescript
(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number) => void
```
Where `g` is the grid, `(x,y)` are coordinates, `p` is the flat index, `cols`/`rows` are dimensions, `rand` is `Math.random`.

## Particle System

- Numeric IDs (0-65) defined in `constants.ts`
- Rising elements processed top-to-bottom in `rising.ts`
- Falling elements processed bottom-to-top in `falling.ts`
- Use `rand()` for probabilistic physics
- Each row randomizes left-to-right vs right-to-left iteration

## Internal (Non-Paintable) Particles

Some particles are internal and NOT added to Material type or materials array:
- **Bullets:** BULLET_N (31), BULLET_NE (32), BULLET_E (33), BULLET_SE (34), BULLET_S (35), BULLET_SW (36), BULLET_W (37), BULLET_NW (38)
- **Bullet Trail:** BULLET_TRAIL (39)

These are spawned by other particles (e.g., Gun spawns Bullets) and have physics but no paint button.

## Special Spawn Behaviors

Some particles have custom spawn rules in `addParticles` (in `physics.worker.ts`):
- **Gun:** Single pixel only (ignores brush size)
- **Bird/Bee/Firefly:** 20% spawn rate (sparse)
- **Ant/Bug/Slime:** 30% spawn rate
- **Alien/Quark:** 8% spawn rate (very sparse)
- **Mold/Spore:** 40% spawn rate

## Adding New Particles

1. Add constant in `src/ecs/constants.ts`: `export const NEW_PARTICLE = XX`
2. Add to `Material` type union (if paintable)
3. Add to `MATERIAL_TO_ID` (if paintable)
4. Add color to `COLORS_U32` array at the matching index (ABGR format)
5. Add button color to `BUTTON_COLORS` in `App.tsx` (if paintable)
6. Add to `materials` array in `App.tsx` for button display (if paintable)
7. Add physics handler in the appropriate system file:
   - Rising particles: `src/ecs/systems/rising.ts`
   - Falling granulars/liquids: inline in `src/ecs/systems/falling.ts`
   - Creatures: `src/ecs/systems/creatures.ts`
   - Spawners: `src/ecs/systems/spawners.ts`
   - Reactions: `src/ecs/systems/reactions.ts`
   - Growing: `src/ecs/systems/growing.ts`
   - Effects: `src/ecs/systems/effects.ts`
   - Projectiles: `src/ecs/systems/projectiles.ts`
8. Wire the handler into `falling.ts` or `rising.ts` dispatch
9. Add special spawn rate in `addParticles` if needed (in `physics.worker.ts`)
10. Add to fire spreading list if flammable
11. Update README.md with particle documentation
12. Update mermaid.md with interaction diagrams

## Adding Internal Particles (like Bullets)

1. Add constants for variants in `constants.ts`
2. Add colors to `COLORS_U32` for each variant
3. Add physics handler in appropriate system file
4. Wire handler into `rising.ts` or `falling.ts` dispatch
5. Have parent particle spawn them (e.g., Gun spawns Bullets)
6. Do NOT add to Material type, MATERIAL_TO_ID, BUTTON_COLORS, or materials array

## Common Patterns

### Spawner Pattern (Tap, Hive, Anthill, Nest, Gun, Volcano, Star, Black Hole)
```typescript
export function updateSpawner(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  // Check for fire - spawner burns
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      // fire check...
    }
  }
  // Spawn at rate
  if (rand() < 0.05) {
    // spawn child particle nearby
  }
}
```

### Creature Pattern (Bug, Ant, Bird, Bee, Firefly, Alien, Worm, Fairy, Fish, Moth)
```typescript
export function updateCreature(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  // Check for death conditions (fire, predators)
  // Movement logic
  // Eating/interaction logic
}
```

### Projectile Pattern (Bullets)
```typescript
// Direction encoded in particle type (BULLET_N through BULLET_NW)
// Move multiple cells per frame
// Interact with targets (destroy, ignite, pass through)
// Remove at boundaries
```

## Protected Particles

These cannot be painted over:
- Stone (except by erase)
- Tap (except by erase)
- Black Hole (except by erase)

## Destruction Hierarchy

- Bullets destroy almost everything
- Gunpowder explosions (radius 6) destroy most things except Stone/Glass/Water
- Nitro explosions (radius 12) destroy most things except Stone/Glass
- Fire destroys flammables only
- Acid dissolves organic + slowly dissolves Stone/Glass/Crystal
- Lava melts sand to glass, ignites organics, solidifies in water
- Void consumes anything except Stone/Glass/Crystal/structural particles

## OffscreenCanvas + React StrictMode

The canvas is transferred to the worker via `transferControlToOffscreen()` which is a one-shot operation. A `workerInitRef` guard prevents React 18 StrictMode's double-mount from breaking this. The worker is a page-lifetime resource with no cleanup.
