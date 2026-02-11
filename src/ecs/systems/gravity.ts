import { ARCHETYPES, ARCHETYPE_FLAGS, F_LIQUID } from '../archetypes'
import { EMPTY, DIRT } from '../constants'

/**
 * Generic gravity: fall down, density-sink through lighter liquids, diagonal slide.
 * Used by purely data-driven particles (SAND, WATER, DIRT, FLUFF, HONEY).
 * Returns true if the particle moved.
 */
export function applyGravity(
  g: Uint8Array, x: number, y: number, p: number,
  cols: number, rows: number, type: number, rand: () => number
): boolean {
  const arch = ARCHETYPES[type]!

  // Chance gate
  if (rand() > arch.gravity!) return false

  // At bottom edge
  if (y >= rows - 1) return false

  const below = p + cols
  const belowType = g[below]

  // 1. Fall into empty
  if (belowType === EMPTY) {
    g[below] = type
    g[p] = EMPTY
    return true
  }

  // 2. Density sinking through lighter liquids
  if (arch.density !== undefined) {
    const belowArch = ARCHETYPES[belowType]
    if (belowArch && belowArch.density !== undefined &&
      arch.density > belowArch.density &&
      (ARCHETYPE_FLAGS[belowType] & F_LIQUID)) {
      g[below] = type
      g[p] = belowType
      return true
    }
  }

  // 3. Diagonal slide (DIRT doesn't slide)
  if (type !== DIRT) {
    const dx = rand() < 0.5 ? -1 : 1
    if (x + dx >= 0 && x + dx < cols && g[below + dx] === EMPTY) {
      g[below + dx] = type
      g[p] = EMPTY
      return true
    }
    if (x - dx >= 0 && x - dx < cols && g[below - dx] === EMPTY) {
      g[below - dx] = type
      g[p] = EMPTY
      return true
    }
  }

  return false
}
