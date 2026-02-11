// bitECS component definitions
// Components are plain objects/arrays accessed via entity ID indexing
// Each particle type is defined by its component composition (see archetypes.ts)

// ── Core ──
export const Position = { x: [] as number[], y: [] as number[] }

// ── Movement ──
export const Gravity = { chance: [] as number[] }       // Falls downward with probability
export const Buoyancy = { chance: [] as number[] }      // Rises upward with probability
export const Liquid = { chance: [] as number[] }        // Flows sideways when vertically blocked
export const Density = { value: [] as number[] }        // Higher sinks through lower
export const RandomWalk = { chance: [] as number[] }    // Moves randomly in 8 directions

// ── Visual ──
export const Appearance = {
  color: [] as number[],    // ABGR uint32 static color
  palette: [] as number[],  // 0=static, 1=fire, 2=plasma, 3=lightning, 4=blue_fire
}

// ── Lifecycle ──
export const Volatile = {
  chance: [] as number[],   // Per-tick decay probability
  into: [] as number[],     // Type to transform into
}
export const MeltOnHeat = { into: [] as number[] }  // Transforms near HeatSource

// ── Reaction tags (zero-data) ──
export const Flammable = {} as Record<string, never>
export const HeatSource = {} as Record<string, never>
export const Immobile = {} as Record<string, never>
export const Living = {} as Record<string, never>
export const KillsCreatures = {} as Record<string, never>

// ── Parameterized reactions ──
export const Explosive = {
  radius: [] as number[],   // Blast radius
  trigger: [] as number[],  // 0=heat-adjacent, 1=solid-contact
}

// ── Handler tags (dispatch to type-specific functions) ──
export const SpawnerHandler = {} as Record<string, never>
export const CreatureHandler = {} as Record<string, never>
export const GrowthHandler = {} as Record<string, never>
export const CorrosiveHandler = {} as Record<string, never>
export const InfectiousHandler = {} as Record<string, never>
export const ProjectileHandler = {} as Record<string, never>
export const LightningHandler = {} as Record<string, never>
export const FireworkHandler = {} as Record<string, never>
export const BubbleHandler = {} as Record<string, never>
export const CometHandler = {} as Record<string, never>

// All components for registration
export const ALL_COMPONENTS = [
  Position,
  Gravity, Buoyancy, Liquid, Density, RandomWalk,
  Appearance, Volatile, MeltOnHeat,
  Flammable, HeatSource, Immobile, Living, KillsCreatures,
  Explosive,
  SpawnerHandler, CreatureHandler, GrowthHandler,
  CorrosiveHandler, InfectiousHandler, ProjectileHandler,
  LightningHandler, FireworkHandler, BubbleHandler, CometHandler,
] as const
