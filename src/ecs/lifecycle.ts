import { addEntity, removeEntity, addComponent } from 'bitecs'
import { Position, ParticleType } from './components'
import { EMPTY } from './constants'
import type { GameWorld } from './world'

export function spawnParticle(world: GameWorld, x: number, y: number, type: number): number {
  const eid = addEntity(world)
  addComponent(world, eid, Position)
  addComponent(world, eid, ParticleType)
  Position.x[eid] = x
  Position.y[eid] = y
  ParticleType[eid] = type

  const idx = y * world.grid.cols + x
  world.grid.spatialGrid[idx] = eid
  world.grid.typeGrid[idx] = type
  return eid
}

export function destroyParticle(world: GameWorld, eid: number): void {
  const x = Position.x[eid]
  const y = Position.y[eid]
  const idx = y * world.grid.cols + x
  world.grid.spatialGrid[idx] = -1
  world.grid.typeGrid[idx] = EMPTY
  removeEntity(world, eid)
}

export function moveParticle(world: GameWorld, eid: number, newX: number, newY: number): void {
  const oldX = Position.x[eid]
  const oldY = Position.y[eid]
  const cols = world.grid.cols
  const type = ParticleType[eid]

  const oldIdx = oldY * cols + oldX
  world.grid.spatialGrid[oldIdx] = -1
  world.grid.typeGrid[oldIdx] = EMPTY

  Position.x[eid] = newX
  Position.y[eid] = newY
  const newIdx = newY * cols + newX
  world.grid.spatialGrid[newIdx] = eid
  world.grid.typeGrid[newIdx] = type
}

export function swapParticles(world: GameWorld, eid1: number, eid2: number): void {
  const x1 = Position.x[eid1], y1 = Position.y[eid1]
  const x2 = Position.x[eid2], y2 = Position.y[eid2]
  const cols = world.grid.cols

  Position.x[eid1] = x2; Position.y[eid1] = y2
  Position.x[eid2] = x1; Position.y[eid2] = y1

  const idx1 = y1 * cols + x1
  const idx2 = y2 * cols + x2
  world.grid.spatialGrid[idx1] = eid2
  world.grid.spatialGrid[idx2] = eid1

  const t1 = world.grid.typeGrid[idx1]
  world.grid.typeGrid[idx1] = world.grid.typeGrid[idx2]
  world.grid.typeGrid[idx2] = t1
}

export function transformParticle(world: GameWorld, eid: number, newType: number): void {
  ParticleType[eid] = newType
  const x = Position.x[eid], y = Position.y[eid]
  world.grid.typeGrid[y * world.grid.cols + x] = newType
}

export function setCell(world: GameWorld, x: number, y: number, type: number): void {
  const idx = y * world.grid.cols + x
  const existingEid = world.grid.spatialGrid[idx]

  if (type === EMPTY) {
    if (existingEid !== -1) destroyParticle(world, existingEid)
    else {
      world.grid.typeGrid[idx] = EMPTY
    }
  } else if (existingEid !== -1) {
    transformParticle(world, existingEid, type)
  } else {
    spawnParticle(world, x, y, type)
  }
}
