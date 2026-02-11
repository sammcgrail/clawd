// Physics Worker - system orchestrator
// Runs physics simulation and rendering off the main thread
// Uses OffscreenCanvas for GPU-accelerated rendering in the worker

import { CELL_SIZE, MATERIAL_TO_ID, type Material, EMPTY, STONE, TAP, GUN, BLACK_HOLE,
  BIRD, BEE, FIREFLY, ANT, BUG, SLIME, ALIEN, QUARK, MOLD, SPORE } from './ecs/constants'
import { risingPhysicsSystem } from './ecs/systems/rising'
import { fallingPhysicsSystem } from './ecs/systems/falling'
import { renderSystem } from './ecs/systems/render'
import { ChunkMap } from './sim/ChunkMap'

// Worker state
let canvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null
let imageData: ImageData | null = null
let grid: Uint8Array = new Uint8Array(0)
let cols = 0, rows = 0
let isPaused = false
let pendingInputs: Array<{ x: number; y: number; tool: Material | 'erase'; brushSize: number }> = []
const chunkMap = new ChunkMap()

function initGrid(width: number, height: number) {
  cols = Math.floor(width / CELL_SIZE)
  rows = Math.floor(height / CELL_SIZE)
  grid = new Uint8Array(cols * rows)
  chunkMap.init(cols, rows)
  if (ctx) {
    imageData = ctx.createImageData(width, height)
  }
}

function addParticles(cellX: number, cellY: number, tool: Material | 'erase', brushSize: number) {
  const matId = tool === 'erase' ? EMPTY : MATERIAL_TO_ID[tool as Material]

  if (matId === GUN) {
    if (cellX >= 0 && cellX < cols && cellY >= 0 && cellY < rows) {
      const idx = cellY * cols + cellX
      if (grid[idx] !== STONE && grid[idx] !== TAP && grid[idx] !== GUN && grid[idx] !== BLACK_HOLE) {
        grid[idx] = GUN
      }
    }
    chunkMap.wakeRadius(cellX, cellY, 1)
    return
  }

  for (let dy = -brushSize; dy <= brushSize; dy++) {
    for (let dx = -brushSize; dx <= brushSize; dx++) {
      if (dx * dx + dy * dy <= brushSize * brushSize) {
        const nx = cellX + dx, ny = cellY + dy
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          const idx = ny * cols + nx
          let spawnChance = 0.3
          if (matId === BIRD || matId === BEE || matId === FIREFLY) spawnChance = 0.8
          else if (matId === ANT || matId === BUG || matId === SLIME) spawnChance = 0.7
          else if (matId === ALIEN || matId === QUARK) spawnChance = 0.92
          else if (matId === MOLD || matId === SPORE) spawnChance = 0.6
          if ((tool === 'erase' || Math.random() > spawnChance) &&
              (tool === 'erase' || (grid[idx] !== STONE && grid[idx] !== TAP && grid[idx] !== BLACK_HOLE))) {
            grid[idx] = matId
          }
        }
      }
    }
  }
  chunkMap.wakeRadius(cellX, cellY, brushSize + 1)
}

function render() {
  if (!ctx || !imageData || !canvas) return
  const data32 = new Uint32Array(imageData.data.buffer)
  renderSystem(grid, cols, rows, data32, canvas.width, chunkMap)
  ctx.putImageData(imageData, 0, 0)
}

let lastUpdateTime = 0
let physicsAccum = 0
const PHYSICS_STEP = 1000 / 60

function gameLoop(timestamp: number) {
  if (lastUpdateTime === 0) lastUpdateTime = timestamp
  const delta = Math.min(timestamp - lastUpdateTime, 100)
  lastUpdateTime = timestamp

  // Process pending inputs
  for (const input of pendingInputs) {
    addParticles(input.x, input.y, input.tool, input.brushSize)
  }
  pendingInputs = []

  if (!isPaused) {
    physicsAccum += delta
    if (physicsAccum >= PHYSICS_STEP) {
      risingPhysicsSystem(grid, cols, rows, chunkMap)
      fallingPhysicsSystem(grid, cols, rows, chunkMap)
      chunkMap.updateActivity(grid)
      physicsAccum = Math.min(physicsAccum - PHYSICS_STEP, PHYSICS_STEP)
    }
  }

  render()
  requestAnimationFrame(gameLoop)
}

// Message handler
self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data

  switch (type) {
    case 'init':
      canvas = e.data.canvas as OffscreenCanvas
      ctx = canvas.getContext('2d', { willReadFrequently: false })
      initGrid(canvas.width, canvas.height)
      lastUpdateTime = 0
      physicsAccum = 0
      requestAnimationFrame(gameLoop)
      break

    case 'resize':
      if (canvas) {
        canvas.width = data.width
        canvas.height = data.height
        initGrid(data.width, data.height)
      }
      break

    case 'input':
      pendingInputs.push({
        x: data.cellX,
        y: data.cellY,
        tool: data.tool,
        brushSize: data.brushSize
      })
      break

    case 'pause':
      isPaused = data.paused
      break

    case 'reset':
      grid.fill(0)
      chunkMap.wakeAll()
      break
  }
}

export {}
