// Emitter ECS system — runs once per tick, before physics passes.
// Queries all emitter entities, validates grid cells, dispatches to handlers.
// Not chunk-aware: spawners always run even in sleeping chunks.

import { query, commitRemovals } from 'bitecs'
import {
  type OrcWorld, EmitterPos, EmitterConfig,
  destroyEmitter,
} from '../orchestration'
import {
  TAP, ANTHILL, HIVE, NEST, GUN, VOLCANO, STAR, BLACK_HOLE,
} from '../constants'
import {
  updateTap, updateAnthill, updateHive, updateNest,
  updateGun, updateVolcano, updateStar, updateBlackHole,
} from './spawners'
import type { ChunkMap } from '../../sim/ChunkMap'

/** Per-spawner-type wake radius (grid cells). */
const WAKE_RADIUS: Partial<Record<number, number>> = {
  [TAP]: 2,
  [ANTHILL]: 2,
  [HIVE]: 2,
  [NEST]: 2,
  [GUN]: 2,
  [VOLCANO]: 4,
  [STAR]: 6,
  [BLACK_HOLE]: 12,
}

export function emitterSystem(
  world: OrcWorld,
  g: Uint8Array,
  cols: number,
  rows: number,
  chunkMap: ChunkMap,
): void {
  const emitters = query(world, [EmitterPos, EmitterConfig])
  const rand = Math.random

  for (const eid of emitters) {
    const x = EmitterPos.x[eid]
    const y = EmitterPos.y[eid]
    const typeId = EmitterConfig.typeId[eid]
    const p = y * cols + x

    // Orphan check: grid cell no longer matches → spawner was destroyed
    if (g[p] !== typeId) {
      destroyEmitter(world, eid, cols)
      continue
    }

    // Dispatch to existing handler function
    switch (typeId) {
      case TAP:        updateTap(g, x, y, p, cols, rows, rand); break
      case ANTHILL:    updateAnthill(g, x, y, p, cols, rows, rand); break
      case HIVE:       updateHive(g, x, y, p, cols, rows, rand); break
      case NEST:       updateNest(g, x, y, p, cols, rows, rand); break
      case GUN:        updateGun(g, x, y, p, cols, rows, rand); break
      case VOLCANO:    updateVolcano(g, x, y, p, cols, rows, rand); break
      case STAR:       updateStar(g, x, y, p, cols, rows, rand); break
      case BLACK_HOLE: updateBlackHole(g, x, y, p, cols, rows, rand); break
    }

    // Post-handler orphan check (VOLCANO can self-destruct → STONE)
    if (g[p] !== typeId) {
      destroyEmitter(world, eid, cols)
      continue
    }

    // Wake chunks around spawner so output particles are processed
    const wakeR = WAKE_RADIUS[typeId] ?? 2
    chunkMap.wakeRadius(x, y, wakeR)
  }

  commitRemovals(world)
}
