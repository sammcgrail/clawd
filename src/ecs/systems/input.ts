import { EMPTY, STONE, TAP, BLACK_HOLE, GUN, BIRD, BEE, FIREFLY, ANT, BUG, SLIME,
  ALIEN, QUARK, MOLD, SPORE, MATERIAL_TO_ID, type Material } from '../constants'
import { setCell } from '../lifecycle'
import { inBounds } from '../spatial'
import type { GameWorld } from '../world'

export interface InputEvent {
  x: number
  y: number
  tool: Material | 'erase'
  brushSize: number
}

export function inputSystem(world: GameWorld, pendingInputs: InputEvent[]): void {
  const { cols, rows } = world.grid

  for (const input of pendingInputs) {
    const { x: cellX, y: cellY, tool, brushSize } = input
    const matId = tool === 'erase' ? EMPTY : MATERIAL_TO_ID[tool as Material]

    if (matId === GUN) {
      if (inBounds(cellX, cellY, cols, rows)) {
        const existingType = world.grid.typeGrid[cellY * cols + cellX]
        if (existingType !== STONE && existingType !== TAP && existingType !== GUN && existingType !== BLACK_HOLE) {
          setCell(world, cellX, cellY, GUN)
        }
      }
      continue
    }

    for (let dy = -brushSize; dy <= brushSize; dy++) {
      for (let dx = -brushSize; dx <= brushSize; dx++) {
        if (dx * dx + dy * dy > brushSize * brushSize) continue
        const nx = cellX + dx, ny = cellY + dy
        if (!inBounds(nx, ny, cols, rows)) continue

        let spawnChance = 0.3
        if (matId === BIRD || matId === BEE || matId === FIREFLY) spawnChance = 0.8
        else if (matId === ANT || matId === BUG || matId === SLIME) spawnChance = 0.7
        else if (matId === ALIEN || matId === QUARK) spawnChance = 0.92
        else if (matId === MOLD || matId === SPORE) spawnChance = 0.6

        if ((tool === 'erase' || Math.random() > spawnChance) &&
            (tool === 'erase' || (world.grid.typeGrid[ny * cols + nx] !== STONE &&
              world.grid.typeGrid[ny * cols + nx] !== TAP &&
              world.grid.typeGrid[ny * cols + nx] !== BLACK_HOLE))) {
          setCell(world, nx, ny, matId)
        }
      }
    }
  }
}
