import { EMPTY, WATER, FIRE, LAVA, PLASMA, BOAT, CAR, BUG, ANT, BIRD, BEE, WORM, FISH, FIREFLY, FAIRY, MOTH, SLIME } from '../constants'

// Creatures that can ride in a transport train
const PASSENGERS = new Set([BUG, ANT, BIRD, BEE, WORM, FISH, FIREFLY, FAIRY, MOTH, SLIME])

function inBounds(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows
}

function isSolid(cell: number): boolean {
  return cell !== EMPTY && cell !== WATER && cell !== FIRE && cell !== LAVA && cell !== PLASMA
}

function isHazard(cell: number): boolean {
  return cell === FIRE || cell === LAVA || cell === PLASMA
}

/**
 * Scan the area around the transport and move nearby creatures into the
 * trailing chain behind it.
 */
function hookCreatures(g: Uint8Array, x: number, y: number, dir: number, cols: number, rows: number): void {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const cx = x + dx, cy = y + dy
      if (!inBounds(cx, cy, cols, rows)) continue
      const ci = cy * cols + cx
      if (!PASSENGERS.has(g[ci])) continue
      // Find an empty spot behind the transport
      for (let dist = 1; dist <= 4; dist++) {
        const bx = x - dir * dist
        if (!inBounds(bx, y, cols, rows)) break
        const bi = y * cols + bx
        if (g[bi] === EMPTY) {
          g[bi] = g[ci]
          g[ci] = EMPTY
          break
        }
      }
    }
  }
}

/**
 * Pull trailing creatures one step closer to the transport.
 * Process far-to-near so each passenger moves exactly one step.
 */
function pullTrain(g: Uint8Array, x: number, y: number, dir: number, cols: number, rows: number): void {
  for (let dist = 8; dist >= 1; dist--) {
    const bx = x - dir * dist
    // Check same row and one row above/below
    for (let dy = -1; dy <= 1; dy++) {
      const by = y + dy
      if (!inBounds(bx, by, cols, rows)) continue
      const bi = by * cols + bx
      if (!PASSENGERS.has(g[bi])) continue
      // Move one step toward transport, at transport's Y level
      const nx = bx + dir
      if (!inBounds(nx, y, cols, rows)) continue
      const ni = y * cols + nx
      if (g[ni] === EMPTY) {
        g[ni] = g[bi]
        g[bi] = EMPTY
      }
    }
  }
}

/**
 * BOAT: floats on water surface, drifts L/R, picks up critters.
 *
 * - Rises through water to reach the surface
 * - Falls through air (gravity)
 * - Drifts 1–2 cells horizontally when sitting on water
 * - Destroyed by fire / lava / plasma
 */
export function updateBoat(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  // Hazard check
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx, ny = y + dy
      if (inBounds(nx, ny, cols, rows) && isHazard(g[ny * cols + nx])) {
        g[p] = FIRE; return
      }
    }
  }

  // Float up through water (rise to surface)
  if (y > 0 && g[(y - 1) * cols + x] === WATER) {
    g[(y - 1) * cols + x] = BOAT
    g[p] = WATER
    return
  }

  const atBottom = y >= rows - 1
  const below = atBottom ? EMPTY : g[(y + 1) * cols + x]

  // Gravity – fall through air
  if (!atBottom && below === EMPTY) {
    g[(y + 1) * cols + x] = BOAT
    g[p] = EMPTY
    return
  }

  // Can only drift when floating on water
  if (below !== WATER) return

  // Brief rest
  if (rand() < 0.12) return

  const dir = rand() < 0.5 ? -1 : 1

  // Try to drift 1–2 cells
  let bestStep = 0
  for (let step = 1; step <= 2; step++) {
    const sx = x + dir * step
    if (!inBounds(sx, y, cols, rows)) break
    const si = y * cols + sx
    const sc = g[si]
    if (sc === EMPTY || sc === WATER) {
      // Accept if water below (float) OR cell itself is water (submerged – will rise next tick)
      if (sc === WATER) {
        bestStep = step
      } else if ((y + 1) < rows && g[(y + 1) * cols + sx] === WATER) {
        bestStep = step
      } else {
        break // empty with no water support – gap in the water
      }
    } else if (PASSENGERS.has(sc)) {
      // Scoop creature behind before overwriting
      const bx = x - dir
      if (inBounds(bx, y, cols, rows) && g[y * cols + bx] === EMPTY) {
        g[y * cols + bx] = sc
        g[si] = EMPTY
        bestStep = step
      } else {
        break
      }
    } else {
      break
    }
  }

  if (bestStep > 0) {
    const destX = x + dir * bestStep
    hookCreatures(g, x, y, dir, cols, rows)
    g[y * cols + destX] = BOAT
    g[p] = WATER // water fills behind on the surface
    pullTrain(g, destX, y, dir, cols, rows)
  }
}

/**
 * CAR: drives on solid ground, jumps up ledges (up to 5 blocks), picks up critters.
 *
 * - Falls through air (gravity)
 * - Drowns if standing on water
 * - Destroyed by fire / lava / plasma (adjacent)
 * - Moves 1 cell L/R on flat ground
 * - When hitting a wall, scans upward and teleports to the top (up to 5 blocks)
 */
export function updateCar(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  // Hazard check – fire/lava/plasma only
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx, ny = y + dy
      if (inBounds(nx, ny, cols, rows) && isHazard(g[ny * cols + nx])) {
        g[p] = FIRE; return
      }
    }
  }

  const atBottom = y >= rows - 1
  const below = atBottom ? EMPTY : g[(y + 1) * cols + x]

  // Drown when sitting on water
  if (below === WATER) {
    g[p] = EMPTY; return
  }

  // Gravity – fall through air
  if (!atBottom && below === EMPTY) {
    g[(y + 1) * cols + x] = CAR
    g[p] = EMPTY
    return
  }

  // Need solid ground to drive
  if (!isSolid(below) && !atBottom) return

  // Brief rest
  if (rand() < 0.08) return

  const dir = rand() < 0.5 ? -1 : 1
  const nx = x + dir
  if (!inBounds(nx, y, cols, rows)) return

  const nextCell = g[y * cols + nx]

  if (nextCell === EMPTY || PASSENGERS.has(nextCell)) {
    // Scoop any passenger we're driving over
    if (PASSENGERS.has(nextCell)) {
      const bx = x - dir
      if (inBounds(bx, y, cols, rows) && g[y * cols + bx] === EMPTY) {
        g[y * cols + bx] = nextCell
      }
      g[y * cols + nx] = EMPTY
    }
    // Drive forward – gravity handles falling next tick if there's no ground
    hookCreatures(g, x, y, dir, cols, rows)
    g[y * cols + nx] = CAR
    g[p] = EMPTY
    pullTrain(g, nx, y, dir, cols, rows)
  } else if (isSolid(nextCell)) {
    // Wall – try to jump over it (scan up to 5 blocks)
    for (let climb = 1; climb <= 5; climb++) {
      const cy = y - climb
      if (!inBounds(nx, cy, cols, rows)) break
      const wallCell = g[cy * cols + nx]
      if (wallCell === EMPTY || PASSENGERS.has(wallCell)) {
        // Found air – jump here (gravity settles us if no ground)
        if (PASSENGERS.has(wallCell)) {
          const bx = x - dir
          if (inBounds(bx, y, cols, rows) && g[y * cols + bx] === EMPTY) {
            g[y * cols + bx] = wallCell
          }
          g[cy * cols + nx] = EMPTY
        }
        hookCreatures(g, x, y, dir, cols, rows)
        g[cy * cols + nx] = CAR
        g[p] = EMPTY
        pullTrain(g, nx, cy, dir, cols, rows)
        return
      } else if (!isSolid(wallCell)) {
        break // non-solid, non-empty (water etc.) – can't pass through
      }
      // Solid – keep scanning upward
    }
  }
}
