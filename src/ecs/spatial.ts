import type { GameWorld } from './world'

export function getEntityAt(world: GameWorld, x: number, y: number): number {
  return world.grid.spatialGrid[y * world.grid.cols + x]
}

export function getTypeAt(world: GameWorld, x: number, y: number): number {
  return world.grid.typeGrid[y * world.grid.cols + x]
}

export function inBounds(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows
}
