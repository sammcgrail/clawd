import { EMPTY, WATER, FIRE, LAVA, PLASMA, BOAT, CAR, BUG, ANT, BIRD, BEE, WORM, FISH, FIREFLY, FAIRY, MOTH } from '../constants'

// Creatures that can be picked up by transport
const PASSENGERS = new Set([BUG, ANT, BIRD, BEE, WORM, FISH, FIREFLY, FAIRY, MOTH])

function inBounds(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows
}

/**
 * BOAT: floats on water, moves left/right, picks up creatures in a train behind it
 */
export function updateBoat(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  // Check for hazards
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx, ny = y + dy
      if (inBounds(nx, ny, cols, rows)) {
        const nc = g[ny * cols + nx]
        if (nc === FIRE || nc === LAVA || nc === PLASMA) {
          g[p] = FIRE
          return
        }
      }
    }
  }

  // Float to top of water - if above is water, swap up
  if (y > 0) {
    const above = g[(y - 1) * cols + x]
    if (above === WATER) {
      g[(y - 1) * cols + x] = BOAT
      g[p] = WATER
      return
    }
  }

  // Must be on water to move (check below)
  const belowIdx = (y + 1) * cols + x
  const below = y < rows - 1 ? g[belowIdx] : EMPTY
  const onWater = below === WATER

  if (!onWater && y < rows - 1) {
    // Sink if not on water - just fall
    if (below === EMPTY) {
      g[belowIdx] = BOAT
      g[p] = EMPTY
    }
    return
  }

  // Move horizontally with some randomness
  if (rand() < 0.3) return // Sometimes rest

  const dir = rand() < 0.5 ? -1 : 1
  const nx = x + dir

  if (!inBounds(nx, y, cols, rows)) return

  const targetIdx = y * cols + nx
  const target = g[targetIdx]

  // Can move into empty space or water
  if (target === EMPTY || target === WATER) {
    // Before moving, check for passengers to pull
    pullPassengers(g, x, y, -dir, cols, rows) // Pull from opposite direction

    g[targetIdx] = BOAT
    g[p] = below === WATER ? WATER : EMPTY
  }
  // Can pick up passengers when hitting them
  else if (PASSENGERS.has(target)) {
    // Push the passenger into a trailing position
    const behindX = x - dir
    if (inBounds(behindX, y, cols, rows) && g[y * cols + behindX] === EMPTY) {
      g[y * cols + behindX] = target
    }
    g[targetIdx] = BOAT
    g[p] = below === WATER ? WATER : EMPTY
  }
}

/**
 * CAR: drives on solid ground, moves left/right, picks up creatures in a train behind it
 */
export function updateCar(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  // Check for hazards
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx, ny = y + dy
      if (inBounds(nx, ny, cols, rows)) {
        const nc = g[ny * cols + nx]
        if (nc === FIRE || nc === LAVA || nc === PLASMA) {
          g[p] = FIRE
          return
        }
        if (nc === WATER) {
          // Cars rust/die in water
          g[p] = EMPTY
          return
        }
      }
    }
  }

  // Gravity - need solid ground below to drive
  const belowIdx = (y + 1) * cols + x
  const below = y < rows - 1 ? g[belowIdx] : EMPTY

  // If nothing solid below, fall
  const isSolid = below !== EMPTY && below !== WATER && below !== FIRE && below !== LAVA
  if (!isSolid && y < rows - 1) {
    if (below === EMPTY) {
      g[belowIdx] = CAR
      g[p] = EMPTY
    }
    return
  }

  // Move horizontally with some randomness
  if (rand() < 0.25) return // Sometimes rest

  const dir = rand() < 0.5 ? -1 : 1
  const nx = x + dir

  if (!inBounds(nx, y, cols, rows)) return

  const targetIdx = y * cols + nx
  const target = g[targetIdx]

  // Check if there's ground at the new position
  const newBelowIdx = (y + 1) * cols + nx
  const newBelow = y < rows - 1 ? g[newBelowIdx] : EMPTY
  const hasGround = newBelow !== EMPTY && newBelow !== WATER

  // Can move into empty space if there's ground
  if (target === EMPTY && hasGround) {
    // Pull passengers from behind
    pullPassengers(g, x, y, -dir, cols, rows)

    g[targetIdx] = CAR
    g[p] = EMPTY
  }
  // Can climb up one block
  else if (target !== EMPTY && target !== WATER && y > 0) {
    const aboveIdx = (y - 1) * cols + x
    const aboveTargetIdx = (y - 1) * cols + nx
    if (g[aboveIdx] === EMPTY && g[aboveTargetIdx] === EMPTY) {
      pullPassengers(g, x, y, -dir, cols, rows)
      g[aboveTargetIdx] = CAR
      g[p] = EMPTY
    }
  }
  // Can pick up passengers when hitting them
  else if (PASSENGERS.has(target)) {
    const behindX = x - dir
    if (inBounds(behindX, y, cols, rows) && g[y * cols + behindX] === EMPTY) {
      g[y * cols + behindX] = target
    }
    g[targetIdx] = CAR
    g[p] = EMPTY
  }
}

/**
 * Pull passengers in a chain from the specified direction
 */
function pullPassengers(g: Uint8Array, x: number, y: number, fromDir: number, cols: number, rows: number): void {
  // Look behind for passengers to pull forward
  let checkX = x + fromDir
  let prevX = x

  for (let i = 0; i < 5; i++) { // Max chain length of 5
    if (!inBounds(checkX, y, cols, rows)) break

    const checkIdx = y * cols + checkX
    const cell = g[checkIdx]

    if (PASSENGERS.has(cell)) {
      // Pull this passenger toward the transport
      const pullToIdx = y * cols + prevX
      if (g[pullToIdx] === EMPTY) {
        g[pullToIdx] = cell
        g[checkIdx] = EMPTY
        prevX = checkX
        checkX += fromDir
      } else {
        break
      }
    } else if (cell === EMPTY) {
      // Gap in chain, stop pulling
      break
    } else {
      // Hit something solid, stop
      break
    }
  }
}
