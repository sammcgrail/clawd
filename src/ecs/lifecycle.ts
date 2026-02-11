import { addEntity, removeEntity, addComponent, removeComponent } from 'bitecs'
import {
  Position,
  Gravity, Buoyancy, Liquid, Density, RandomWalk,
  Appearance, Volatile, MeltOnHeat,
  Flammable, HeatSource, Immobile, Living, KillsCreatures,
  Explosive,
  SpawnerHandler, CreatureHandler, GrowthHandler,
  CorrosiveHandler, InfectiousHandler, ProjectileHandler,
  LightningHandler, FireworkHandler, BubbleHandler, CometHandler,
} from './components'
import { ARCHETYPES, type ArchetypeDef } from './archetypes'
import { EMPTY } from './constants'
import type { GameWorld } from './world'

// All archetype-related components for bulk removal during transform
const ARCHETYPE_COMPONENTS = [
  Gravity, Buoyancy, Liquid, Density, RandomWalk,
  Appearance, Volatile, MeltOnHeat,
  Flammable, HeatSource, Immobile, Living, KillsCreatures,
  Explosive,
  SpawnerHandler, CreatureHandler, GrowthHandler,
  CorrosiveHandler, InfectiousHandler, ProjectileHandler,
  LightningHandler, FireworkHandler, BubbleHandler, CometHandler,
] as const

function applyArchetype(world: GameWorld, eid: number, arch: ArchetypeDef): void {
  // Movement
  if (arch.gravity !== undefined) {
    addComponent(world, eid, Gravity)
    Gravity.chance[eid] = arch.gravity
  }
  if (arch.buoyancy !== undefined) {
    addComponent(world, eid, Buoyancy)
    Buoyancy.chance[eid] = arch.buoyancy
  }
  if (arch.liquid !== undefined) {
    addComponent(world, eid, Liquid)
    Liquid.chance[eid] = arch.liquid
  }
  if (arch.density !== undefined) {
    addComponent(world, eid, Density)
    Density.value[eid] = arch.density
  }
  if (arch.randomWalk !== undefined) {
    addComponent(world, eid, RandomWalk)
    RandomWalk.chance[eid] = arch.randomWalk
  }

  // Visual
  addComponent(world, eid, Appearance)
  Appearance.color[eid] = arch.color
  Appearance.palette[eid] = arch.palette ?? 0

  // Lifecycle
  if (arch.volatile) {
    addComponent(world, eid, Volatile)
    Volatile.chance[eid] = arch.volatile[0]
    Volatile.into[eid] = arch.volatile[1]
  }
  if (arch.meltOnHeat !== undefined) {
    addComponent(world, eid, MeltOnHeat)
    MeltOnHeat.into[eid] = arch.meltOnHeat
  }

  // Reaction tags
  if (arch.flammable) addComponent(world, eid, Flammable)
  if (arch.heatSource) addComponent(world, eid, HeatSource)
  if (arch.immobile) addComponent(world, eid, Immobile)
  if (arch.living) addComponent(world, eid, Living)
  if (arch.killsCreatures) addComponent(world, eid, KillsCreatures)

  // Parameterized reactions
  if (arch.explosive) {
    addComponent(world, eid, Explosive)
    Explosive.radius[eid] = arch.explosive[0]
    Explosive.trigger[eid] = arch.explosive[1]
  }

  // Handler tags
  if (arch.spawnerHandler) addComponent(world, eid, SpawnerHandler)
  if (arch.creatureHandler) addComponent(world, eid, CreatureHandler)
  if (arch.growthHandler) addComponent(world, eid, GrowthHandler)
  if (arch.corrosiveHandler) addComponent(world, eid, CorrosiveHandler)
  if (arch.infectiousHandler) addComponent(world, eid, InfectiousHandler)
  if (arch.projectileHandler) addComponent(world, eid, ProjectileHandler)
  if (arch.lightningHandler) addComponent(world, eid, LightningHandler)
  if (arch.fireworkHandler) addComponent(world, eid, FireworkHandler)
  if (arch.bubbleHandler) addComponent(world, eid, BubbleHandler)
  if (arch.cometHandler) addComponent(world, eid, CometHandler)
}

function stripArchetypeComponents(world: GameWorld, eid: number): void {
  for (const comp of ARCHETYPE_COMPONENTS) {
    removeComponent(world, eid, comp)
  }
}

export function spawnParticle(world: GameWorld, x: number, y: number, type: number): number {
  const arch = ARCHETYPES[type]
  if (!arch) return -1 // EMPTY has no entity

  const eid = addEntity(world)
  addComponent(world, eid, Position)
  Position.x[eid] = x
  Position.y[eid] = y

  applyArchetype(world, eid, arch)

  const idx = y * world.grid.cols + x
  world.grid.spatialGrid[idx] = eid
  world.grid.typeGrid[idx] = type
  return eid
}

export function destroyParticle(world: GameWorld, eid: number): void {
  const x = Position.x[eid]
  const y = Position.y[eid]
  const idx = y * world.grid.cols + x
  world.grid.spatialGrid[idx] = -1
  world.grid.typeGrid[idx] = EMPTY
  removeEntity(world, eid)
}

export function moveParticle(world: GameWorld, eid: number, newX: number, newY: number): void {
  const oldX = Position.x[eid]
  const oldY = Position.y[eid]
  const cols = world.grid.cols

  const oldIdx = oldY * cols + oldX
  const type = world.grid.typeGrid[oldIdx]
  world.grid.spatialGrid[oldIdx] = -1
  world.grid.typeGrid[oldIdx] = EMPTY

  Position.x[eid] = newX
  Position.y[eid] = newY
  const newIdx = newY * cols + newX
  world.grid.spatialGrid[newIdx] = eid
  world.grid.typeGrid[newIdx] = type
}

export function swapParticles(world: GameWorld, eid1: number, eid2: number): void {
  const x1 = Position.x[eid1], y1 = Position.y[eid1]
  const x2 = Position.x[eid2], y2 = Position.y[eid2]
  const cols = world.grid.cols

  Position.x[eid1] = x2; Position.y[eid1] = y2
  Position.x[eid2] = x1; Position.y[eid2] = y1

  const idx1 = y1 * cols + x1
  const idx2 = y2 * cols + x2
  world.grid.spatialGrid[idx1] = eid2
  world.grid.spatialGrid[idx2] = eid1

  const t1 = world.grid.typeGrid[idx1]
  world.grid.typeGrid[idx1] = world.grid.typeGrid[idx2]
  world.grid.typeGrid[idx2] = t1
}

export function transformParticle(world: GameWorld, eid: number, newType: number): void {
  const arch = ARCHETYPES[newType]
  if (!arch) {
    // Transforming to EMPTY = destroy
    destroyParticle(world, eid)
    return
  }

  // Strip old archetype components, apply new ones
  stripArchetypeComponents(world, eid)
  applyArchetype(world, eid, arch)

  const x = Position.x[eid], y = Position.y[eid]
  world.grid.typeGrid[y * world.grid.cols + x] = newType
}

export function setCell(world: GameWorld, x: number, y: number, type: number): void {
  const idx = y * world.grid.cols + x
  const existingEid = world.grid.spatialGrid[idx]

  if (type === EMPTY) {
    if (existingEid !== -1) destroyParticle(world, existingEid)
    else world.grid.typeGrid[idx] = EMPTY
  } else if (existingEid !== -1) {
    transformParticle(world, existingEid, type)
  } else {
    spawnParticle(world, x, y, type)
  }
}
