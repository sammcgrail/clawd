import { EMPTY, FIRE, PLASMA, LIGHTNING, BLUE_FIRE, CELL_SIZE,
  COLORS_U32, FIRE_COLORS, PLASMA_COLORS, LIGHTNING_COLORS, BLUE_FIRE_COLORS, BG_COLOR } from '../constants'
import { type ChunkMap, CHUNK_SIZE, CHUNK_SHIFT } from '../../sim/ChunkMap'

export function renderSystem(
  typeGrid: Uint8Array,
  cols: number,
  rows: number,
  data32: Uint32Array,
  canvasWidth: number,
  chunkMap: ChunkMap
): void {
  const cellSize = CELL_SIZE
  const { chunkCols, chunkRows, renderDirty } = chunkMap

  for (let chunkY = 0; chunkY < chunkRows; chunkY++) {
    for (let chunkX = 0; chunkX < chunkCols; chunkX++) {
      const ci = chunkY * chunkCols + chunkX
      if (!renderDirty[ci]) continue
      renderDirty[ci] = 0

      const yStart = chunkY << CHUNK_SHIFT
      const xStart = chunkX << CHUNK_SHIFT
      const yEnd = Math.min(yStart + CHUNK_SIZE, rows)
      const xEnd = Math.min(xStart + CHUNK_SIZE, cols)

      // Clear this chunk's pixel region to background
      for (let cy = yStart; cy < yEnd; cy++) {
        const pixY = cy * cellSize
        for (let row = 0; row < cellSize; row++) {
          const rowStart = (pixY + row) * canvasWidth + xStart * cellSize
          const rowEnd = rowStart + (xEnd - xStart) * cellSize
          for (let px = rowStart; px < rowEnd; px++) {
            data32[px] = BG_COLOR
          }
        }
      }

      // Render cells in this chunk
      for (let cy = yStart; cy < yEnd; cy++) {
        const rowOff = cy * cols
        const baseY = cy * cellSize * canvasWidth

        for (let cx = xStart; cx < xEnd; cx++) {
          const c = typeGrid[rowOff + cx]
          if (c === EMPTY) continue

          let color: number
          if (c === FIRE) color = FIRE_COLORS[(cx + cy) & 31]
          else if (c === PLASMA) color = PLASMA_COLORS[(cx + cy) & 63]
          else if (c === LIGHTNING) color = LIGHTNING_COLORS[(cx + cy) & 31]
          else if (c === BLUE_FIRE) color = BLUE_FIRE_COLORS[(cx + cy) & 31]
          else color = COLORS_U32[c]

          const baseX = cx * cellSize
          const row0 = baseY + baseX
          const row1 = row0 + canvasWidth
          const row2 = row1 + canvasWidth
          const row3 = row2 + canvasWidth

          data32[row0] = data32[row0 + 1] = data32[row0 + 2] = data32[row0 + 3] = color
          data32[row1] = data32[row1 + 1] = data32[row1 + 2] = data32[row1 + 3] = color
          data32[row2] = data32[row2 + 1] = data32[row2 + 2] = data32[row2 + 3] = color
          data32[row3] = data32[row3 + 1] = data32[row3 + 2] = data32[row3 + 3] = color
        }
      }
    }
  }
}
