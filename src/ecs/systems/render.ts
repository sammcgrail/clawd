import { EMPTY, FIRE, PLASMA, LIGHTNING, BLUE_FIRE, CELL_SIZE,
  COLORS_U32, FIRE_COLORS, PLASMA_COLORS, LIGHTNING_COLORS, BLUE_FIRE_COLORS, BG_COLOR } from '../constants'

export function renderSystem(
  typeGrid: Uint8Array,
  cols: number,
  rows: number,
  data32: Uint32Array,
  canvasWidth: number
): void {
  data32.fill(BG_COLOR)
  const cellSize = CELL_SIZE

  for (let cy = 0; cy < rows; cy++) {
    const rowOff = cy * cols
    const baseY = cy * cellSize * canvasWidth

    for (let cx = 0; cx < cols; cx++) {
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
