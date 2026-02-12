// Emitter system — runs once per tick, before physics passes.
// Iterates all emitters, validates grid cells, dispatches to handlers.

import {
  forEachEmitter, destroyEmitter,
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
  g: Uint8Array,
  cols: number,
  rows: number,
  chunkMap: ChunkMap,
): void {
  const rand = Math.random
  const toDestroy: number[] = []

  forEachEmitter((emitter, gridIndex) => {
    const { x, y, typeId } = emitter
    const p = y * cols + x

    // Orphan check: grid cell no longer matches → spawner was destroyed
    if (g[p] !== typeId) {
      toDestroy.push(gridIndex)
      return
    }

    // Dispatch to handler
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
      toDestroy.push(gridIndex)
      return
    }

    // Wake chunks around spawner so output particles are processed
    const wakeR = WAKE_RADIUS[typeId] ?? 2
    chunkMap.wakeRadius(x, y, wakeR)
  })

  // Clean up destroyed emitters outside iteration
  for (const idx of toDestroy) {
    destroyEmitter(idx)
  }
}
