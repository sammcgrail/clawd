// ECS Orchestration — bitECS world for gameplay entities (emitters, singletons)
// The grid stays as a flat Uint8Array; ECS manages the "meta" layer around it.

import {
  createWorld, addEntity, removeEntity,
  addComponent, commitRemovals,
} from 'bitecs'
import { ARCHETYPE_FLAGS, F_SPAWNER } from './archetypes'
import { CHUNK_SHIFT } from '../sim/ChunkMap'
import type { ChunkMap } from '../sim/ChunkMap'

// ═══════════════════════════════════════════════════════════════
// World
// ═══════════════════════════════════════════════════════════════

export type OrcWorld = ReturnType<typeof createWorld>

export function createOrcWorld(): OrcWorld {
  return createWorld()
}

// ═══════════════════════════════════════════════════════════════
// Components — plain-object pattern (matches existing components.ts)
// ═══════════════════════════════════════════════════════════════

/** Grid position of an emitter entity (integer coords). */
export const EmitterPos = { x: [] as number[], y: [] as number[] }

/** Spawner type ID (TAP=23, GUN=30, etc.). Determines handler dispatch. */
export const EmitterConfig = { typeId: [] as number[] }

/** Simulation settings singleton. */
export const SimConfig = { paused: [] as number[], physicsStep: [] as number[] }

/** Camera state singleton (placeholder for future pan/zoom). */
export const CameraState = { x: [] as number[], y: [] as number[], zoom: [] as number[] }

/** Current tool/brush state singleton. */
export const ToolState = {
  toolId: [] as number[],
  brushSize: [] as number[],
  active: [] as number[],
}

// ═══════════════════════════════════════════════════════════════
// Position → Entity mapping
// ═══════════════════════════════════════════════════════════════

/** Maps grid index (y * cols + x) → emitter entity ID. O(1) lookup. */
const posToEntity = new Map<number, number>()

export function getEmitterAt(gridIndex: number): number | undefined {
  return posToEntity.get(gridIndex)
}

// ═══════════════════════════════════════════════════════════════
// Emitter entity lifecycle
// ═══════════════════════════════════════════════════════════════

export function createEmitter(
  world: OrcWorld, x: number, y: number, typeId: number, cols: number
): number {
  const eid = addEntity(world)
  addComponent(world, eid, EmitterPos)
  EmitterPos.x[eid] = x
  EmitterPos.y[eid] = y
  addComponent(world, eid, EmitterConfig)
  EmitterConfig.typeId[eid] = typeId
  posToEntity.set(y * cols + x, eid)
  return eid
}

export function destroyEmitter(
  world: OrcWorld, eid: number, cols: number
): void {
  const gridIdx = EmitterPos.y[eid] * cols + EmitterPos.x[eid]
  posToEntity.delete(gridIdx)
  removeEntity(world, eid)
}

export function destroyAllEmitters(world: OrcWorld): void {
  for (const [, eid] of posToEntity) {
    removeEntity(world, eid)
  }
  posToEntity.clear()
  commitRemovals(world)
}

/** Check if a particle type ID has the F_SPAWNER flag. */
export function isSpawnerType(typeId: number): boolean {
  return typeId > 0 && (ARCHETYPE_FLAGS[typeId] & F_SPAWNER) !== 0
}

// ═══════════════════════════════════════════════════════════════
// Singleton entity creation
// ═══════════════════════════════════════════════════════════════

export function createSimConfigEntity(world: OrcWorld): number {
  const eid = addEntity(world)
  addComponent(world, eid, SimConfig)
  SimConfig.paused[eid] = 0
  SimConfig.physicsStep[eid] = 1000 / 60
  return eid
}

export function createCameraEntity(world: OrcWorld): number {
  const eid = addEntity(world)
  addComponent(world, eid, CameraState)
  CameraState.x[eid] = 0
  CameraState.y[eid] = 0
  CameraState.zoom[eid] = 1
  return eid
}

export function createToolEntity(world: OrcWorld): number {
  const eid = addEntity(world)
  addComponent(world, eid, ToolState)
  ToolState.toolId[eid] = 1     // SAND
  ToolState.brushSize[eid] = 3
  ToolState.active[eid] = 0
  return eid
}

// ═══════════════════════════════════════════════════════════════
// Sim API — clean boundary for ECS systems to interact with grid
// ═══════════════════════════════════════════════════════════════

/** Read a cell from the grid. Returns -1 if out of bounds. */
export function queryCell(
  grid: Uint8Array, x: number, y: number, cols: number, rows: number
): number {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return -1
  return grid[y * cols + x]
}

/** Write a cell and wake its chunk. */
export function simSetCell(
  grid: Uint8Array, x: number, y: number, type: number,
  cols: number, rows: number, chunkMap: ChunkMap
): void {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return
  grid[y * cols + x] = type
  chunkMap.wakeChunk(x >> CHUNK_SHIFT, y >> CHUNK_SHIFT)
}

/** Fill a circle on the grid and wake affected chunks. */
export function paintCircle(
  grid: Uint8Array, cx: number, cy: number, radius: number,
  type: number, cols: number, rows: number, chunkMap: ChunkMap
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        const nx = cx + dx, ny = cy + dy
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          grid[ny * cols + nx] = type
        }
      }
    }
  }
  chunkMap.wakeRadius(cx, cy, radius + 1)
}
