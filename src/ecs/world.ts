import { createWorld, getAllEntities, removeEntity, type World } from 'bitecs'
import { CELL_SIZE, EMPTY } from './constants'

export interface GridState {
  cols: number
  rows: number
  spatialGrid: Int32Array
  typeGrid: Uint8Array
}

export type GameWorld = World<{
  grid: GridState
}>

export function createGameWorld(): GameWorld {
  return createWorld({
    grid: {
      cols: 0,
      rows: 0,
      spatialGrid: new Int32Array(0),
      typeGrid: new Uint8Array(0),
    },
  }) as GameWorld
}

export function initGrid(world: GameWorld, width: number, height: number): void {
  const cols = Math.floor(width / CELL_SIZE)
  const rows = Math.floor(height / CELL_SIZE)
  world.grid.cols = cols
  world.grid.rows = rows
  world.grid.spatialGrid = new Int32Array(cols * rows).fill(-1)
  world.grid.typeGrid = new Uint8Array(cols * rows)
}

export function resetGrid(world: GameWorld): void {
  const entities = getAllEntities(world)
  for (const eid of entities) {
    removeEntity(world, eid)
  }
  world.grid.spatialGrid.fill(-1)
  world.grid.typeGrid.fill(EMPTY)
}
