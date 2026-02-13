import { EMPTY, WATER, FIRE, LAVA, PLASMA, BOAT, CAR, BUG, ANT, BIRD, BEE, WORM, FISH, FIREFLY, FAIRY, MOTH, SLIME } from '../constants'

// Creatures that can be picked up by transport
const PASSENGERS = new Set([BUG, ANT, BIRD, BEE, WORM, FISH, FIREFLY, FAIRY, MOTH, SLIME])

function inBounds(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows
}

// Check if a cell is passable for boats (empty or water)
function isBoatPassable(cell: number): boolean {
  return cell === EMPTY || cell === WATER
}

// Check if a cell is solid ground (not empty, water, fire, lava, etc)
function isSolidGround(cell: number): boolean {
  return cell !== EMPTY && cell !== WATER && cell !== FIRE && cell !== LAVA && cell !== PLASMA
}

/**
 * Hook nearby creatures into the train behind the transport
 * Scans area around current position and moves creatures to trail behind
 */
function hookNearbyCreatures(g: Uint8Array, x: number, y: number, dir: number, cols: number, rows: number): void {
  // Check 3x3 area around transport for creatures to hook
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue
      // Skip the direction we're moving into
      if (dx === dir) continue

      const checkX = x + dx
      const checkY = y + dy
      if (!inBounds(checkX, checkY, cols, rows)) continue

      const checkIdx = checkY * cols + checkX
      const cell = g[checkIdx]

      if (PASSENGERS.has(cell)) {
        // Find a spot behind the transport for this creature
        const behindX = x - dir
        if (inBounds(behindX, y, cols, rows)) {
          const behindIdx = y * cols + behindX
          if (g[behindIdx] === EMPTY) {
            g[behindIdx] = cell
            g[checkIdx] = EMPTY
          } else {
            // Try one more spot back
            const behindX2 = x - dir * 2
            if (inBounds(behindX2, y, cols, rows)) {
              const behindIdx2 = y * cols + behindX2
              if (g[behindIdx2] === EMPTY) {
                g[behindIdx2] = cell
                g[checkIdx] = EMPTY
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Pull passengers in a chain from behind the transport
 */
function pullPassengerTrain(g: Uint8Array, x: number, y: number, dir: number, cols: number, rows: number): void {
  // The transport moved in 'dir' direction, so passengers are behind at x - dir
  // We need to pull them forward to follow

  const behindDir = -dir
  let positions: Array<{x: number, y: number, type: number}> = []

  // Scan behind for passengers (up to 8 cells back, check vertically too)
  for (let dist = 1; dist <= 8; dist++) {
    const checkX = x + behindDir * dist

    // Check at same height and +/-1 height
    for (let dy = -1; dy <= 1; dy++) {
      const checkY = y + dy
      if (!inBounds(checkX, checkY, cols, rows)) continue

      const checkIdx = checkY * cols + checkX
      const cell = g[checkIdx]

      if (PASSENGERS.has(cell)) {
        positions.push({ x: checkX, y: checkY, type: cell })
      }
    }
  }

  // Move each passenger one step closer to the transport
  for (const pos of positions) {
    const moveDir = dir // Move toward transport
    const newX = pos.x + moveDir
    const newY = pos.y

    if (!inBounds(newX, newY, cols, rows)) continue

    const newIdx = newY * cols + newX
    const oldIdx = pos.y * cols + pos.x

    // Only move if destination is empty
    if (g[newIdx] === EMPTY) {
      g[newIdx] = pos.type
      g[oldIdx] = EMPTY
    }
  }
}

/**
 * BOAT: floats on water, moves left/right (2-3 cells), picks up creatures in a train behind it
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

  // Move horizontally - longer movement (2-3 cells)
  if (rand() < 0.2) return // Sometimes rest

  const dir = rand() < 0.5 ? -1 : 1
  const moveDistance = rand() < 0.6 ? 2 : 3 // Move 2-3 cells

  // Find how far we can actually move
  let actualMove = 0
  for (let d = 1; d <= moveDistance; d++) {
    const checkX = x + dir * d
    if (!inBounds(checkX, y, cols, rows)) break

    const checkIdx = y * cols + checkX
    const checkCell = g[checkIdx]

    // Check if we can pass through (empty, water, or passenger)
    if (isBoatPassable(checkCell)) {
      // Also need water below to float
      const checkBelowIdx = (y + 1) * cols + checkX
      const checkBelow = y < rows - 1 ? g[checkBelowIdx] : EMPTY
      if (checkBelow === WATER) {
        actualMove = d
      } else {
        break
      }
    } else if (PASSENGERS.has(checkCell)) {
      // Hook this creature
      const behindX = x - dir
      if (inBounds(behindX, y, cols, rows) && g[y * cols + behindX] === EMPTY) {
        g[y * cols + behindX] = checkCell
        g[checkIdx] = EMPTY
      }
      actualMove = d
    } else {
      break
    }
  }

  if (actualMove > 0) {
    const targetX = x + dir * actualMove
    const targetIdx = y * cols + targetX

    // Hook nearby creatures before moving
    hookNearbyCreatures(g, x, y, dir, cols, rows)

    // Move the boat
    g[targetIdx] = BOAT
    g[p] = WATER // Leave water behind

    // Pull the passenger train
    pullPassengerTrain(g, targetX, y, dir, cols, rows)
  }
}

/**
 * CAR: drives on solid ground, moves left/right (2-3 cells), climbs ledges up to 5 blocks, picks up creatures
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
  if (!isSolidGround(below) && y < rows - 1) {
    if (below === EMPTY) {
      g[belowIdx] = CAR
      g[p] = EMPTY
    }
    return
  }

  // Move horizontally - longer movement (2-3 cells)
  if (rand() < 0.15) return // Sometimes rest

  const dir = rand() < 0.5 ? -1 : 1
  const moveDistance = rand() < 0.5 ? 2 : 3 // Move 2-3 cells

  // Find how far we can actually move, including climbing
  let actualMove = 0
  let climbHeight = 0

  for (let d = 1; d <= moveDistance; d++) {
    const checkX = x + dir * d
    if (!inBounds(checkX, y - climbHeight, cols, rows)) break

    const checkY = y - climbHeight
    const checkIdx = checkY * cols + checkX
    const checkCell = g[checkIdx]

    if (checkCell === EMPTY || PASSENGERS.has(checkCell)) {
      // Check if there's ground at this position
      const groundIdx = (checkY + 1) * cols + checkX
      const groundCell = checkY < rows - 1 ? g[groundIdx] : EMPTY

      if (isSolidGround(groundCell)) {
        // Hook any passengers we're passing through
        if (PASSENGERS.has(checkCell)) {
          const behindX = x - dir
          if (inBounds(behindX, y, cols, rows) && g[y * cols + behindX] === EMPTY) {
            g[y * cols + behindX] = checkCell
            g[checkIdx] = EMPTY
          }
        }
        actualMove = d
      } else if (groundCell === EMPTY) {
        // No ground, check if we can drop down (max 2 blocks)
        for (let dropDist = 1; dropDist <= 2; dropDist++) {
          const dropY = checkY + dropDist
          if (!inBounds(checkX, dropY, cols, rows)) break
          const dropGroundIdx = (dropY + 1) * cols + checkX
          const dropGround = dropY < rows - 1 ? g[dropGroundIdx] : EMPTY
          if (isSolidGround(dropGround) && g[dropY * cols + checkX] === EMPTY) {
            actualMove = d
            climbHeight = -dropDist // Negative means dropping
            break
          }
        }
        if (actualMove < d) break // Couldn't find ground
      } else {
        break
      }
    } else if (isSolidGround(checkCell)) {
      // Hit a wall - try to climb it (up to 5 blocks)
      let canClimb = false
      for (let climbDist = 1; climbDist <= 5; climbDist++) {
        const climbY = checkY - climbDist
        if (!inBounds(checkX, climbY, cols, rows)) break

        const climbIdx = climbY * cols + checkX
        const climbCell = g[climbIdx]

        // Check if we can stand at this height
        if (climbCell === EMPTY || PASSENGERS.has(climbCell)) {
          // Make sure there's space for the car (need empty above too if climbing)
          const aboveClimbIdx = (climbY - 1) * cols + checkX
          const aboveClear = climbY === 0 || g[aboveClimbIdx] === EMPTY

          // Check ground at climb destination
          const climbGroundIdx = (climbY + 1) * cols + checkX
          const climbGround = g[climbGroundIdx]

          if (aboveClear && isSolidGround(climbGround)) {
            actualMove = d
            climbHeight = climbDist
            canClimb = true
            break
          }
        } else if (!isSolidGround(climbCell)) {
          break // Hit something we can't climb through
        }
        // If it's solid, keep checking higher
      }
      if (!canClimb) break
    } else {
      break
    }
  }

  if (actualMove > 0) {
    const targetX = x + dir * actualMove
    const targetY = y - climbHeight
    const targetIdx = targetY * cols + targetX

    // Hook nearby creatures before moving
    hookNearbyCreatures(g, x, y, dir, cols, rows)

    // Move the car
    g[targetIdx] = CAR
    g[p] = EMPTY

    // Pull the passenger train
    pullPassengerTrain(g, targetX, targetY, dir, cols, rows)
  }
}
