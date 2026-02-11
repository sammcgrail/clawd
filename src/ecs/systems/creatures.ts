import { EMPTY, BUG, ANT, BIRD, BEE, FIREFLY, ALIEN, WORM, FAIRY, FISH, MOTH,
  FIRE, PLASMA, LIGHTNING, EMBER, LAVA, ACID, WATER, PLANT, FLOWER, DIRT, SAND,
  FLUFF, SLIME, QUARK, GAS, CRYSTAL, STATIC, GLITTER, ALGAE, HONEY, STONE,
  MOLD, SPORE, HIVE, NEST } from '../constants'

// ── Rising-pass creatures ───────────────────────────────────────────────

export function updateBird(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  let dead = false
  for (let i = 0; i < 2; i++) {
    const bdx = Math.floor(rand() * 3) - 1, bdy = Math.floor(rand() * 3) - 1
    if (bdx === 0 && bdy === 0) continue
    const bnx = x + bdx, bny = y + bdy
    if (bnx >= 0 && bnx < cols && bny >= 0 && bny < rows) {
      const bnc = g[idx(bnx, bny)]
      if (bnc === FIRE || bnc === PLASMA || bnc === LIGHTNING || bnc === EMBER) {
        g[p] = FIRE
        for (let j = 0; j < 4; j++) {
          const ex = x + Math.floor(rand() * 3) - 1, ey = y + Math.floor(rand() * 3) - 1
          if (ex >= 0 && ex < cols && ey >= 0 && ey < rows && g[idx(ex, ey)] === EMPTY && rand() < 0.5) {
            g[idx(ex, ey)] = FIRE
          }
        }
        dead = true; break
      }
      if (bnc === ALIEN || bnc === QUARK) { g[p] = EMPTY; dead = true; break }
    }
  }
  if (dead) return
  if (rand() < 0.003) { g[p] = FLUFF; return }
  if (rand() < 0.4) return
  const r1 = rand(), r2 = rand()
  let bdx = 0, bdy = 0
  if (r1 < 0.5) { bdy = -1; bdx = r2 < 0.35 ? -1 : r2 < 0.7 ? 1 : 0 }
  else if (r1 < 0.75) { bdx = r2 < 0.5 ? -2 : 2; bdy = r2 < 0.4 ? -1 : 0 }
  else if (r1 < 0.9) { bdy = 1; bdx = r2 < 0.5 ? -1 : 1 }
  if (bdx === 0 && bdy === 0) return
  const bnx = x + bdx, bny = y + bdy
  if (bnx >= 0 && bnx < cols && bny >= 0 && bny < rows) {
    const bni = idx(bnx, bny), bnc = g[bni]
    if (bnc === ANT || bnc === BUG || bnc === BEE) {
      g[bni] = BIRD; g[p] = rand() < 0.6 ? BIRD : PLANT
    } else if (bnc === EMPTY) { g[bni] = BIRD; g[p] = EMPTY }
    else if (bnc === FLUFF) { g[bni] = BIRD; g[p] = EMPTY }
  }
}

export function updateBee(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  let dead = false
  for (let i = 0; i < 2; i++) {
    const bdx = Math.floor(rand() * 3) - 1, bdy = Math.floor(rand() * 3) - 1
    if (bdx === 0 && bdy === 0) continue
    const bnx = x + bdx, bny = y + bdy
    if (bnx >= 0 && bnx < cols && bny >= 0 && bny < rows) {
      const bnc = g[idx(bnx, bny)]
      if (bnc === FIRE || bnc === PLASMA || bnc === LIGHTNING || bnc === EMBER) {
        g[p] = FIRE; dead = true; break
      }
    }
  }
  if (dead) return
  const r1 = rand(), r2 = rand()
  let bdx = 0, bdy = 0
  if (r1 < 0.3) { bdy = -1; bdx = r2 < 0.4 ? -1 : r2 < 0.8 ? 1 : 0 }
  else if (r1 < 0.5) { bdy = 1; bdx = r2 < 0.4 ? -1 : r2 < 0.8 ? 1 : 0 }
  else if (r1 < 0.8) { bdx = r2 < 0.5 ? -1 : 1; bdy = r2 < 0.3 ? -1 : r2 < 0.6 ? 1 : 0 }
  if (bdx === 0 && bdy === 0) return
  const bnx = x + bdx, bny = y + bdy
  if (bnx >= 0 && bnx < cols && bny >= 0 && bny < rows) {
    const bni = idx(bnx, bny), bnc = g[bni]
    if (bnc === PLANT) {
      if (rand() < 0.08) {
        for (let fdy = -1; fdy <= 1; fdy++) {
          for (let fdx = -1; fdx <= 1; fdx++) {
            if (fdy === 0 && fdx === 0) continue
            const fnx = bnx + fdx, fny = bny + fdy
            if (fnx >= 0 && fnx < cols && fny >= 0 && fny < rows && g[idx(fnx, fny)] === EMPTY) {
              g[idx(fnx, fny)] = FLOWER; break
            }
          }
        }
      }
    } else if (bnc === EMPTY) { g[bni] = BEE; g[p] = EMPTY }
    else if (bnc === FLOWER) { g[bni] = BEE; g[p] = rand() < 0.1 ? HONEY : (rand() < 0.15 ? EMPTY : FLOWER) }
  }
}

export function updateFirefly(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  let dead = false
  for (let i = 0; i < 2; i++) {
    const fdx = Math.floor(rand() * 3) - 1, fdy = Math.floor(rand() * 3) - 1
    if (fdx === 0 && fdy === 0) continue
    const fnx = x + fdx, fny = y + fdy
    if (fnx >= 0 && fnx < cols && fny >= 0 && fny < rows) {
      const fnc = g[idx(fnx, fny)]
      if (fnc === FIRE || fnc === PLASMA || fnc === LAVA) { g[p] = FIRE; dead = true; break }
      if (fnc === WATER || fnc === ACID) { g[p] = EMPTY; dead = true; break }
      if (fnc === BIRD) { g[p] = EMPTY; dead = true; break }
    }
  }
  if (dead) return
  if (rand() < 0.15) {
    const gdx = Math.floor(rand() * 3) - 1, gdy = Math.floor(rand() * 3) - 1
    const gnx = x + gdx, gny = y + gdy
    if (gnx >= 0 && gnx < cols && gny >= 0 && gny < rows && g[idx(gnx, gny)] === EMPTY) {
      g[idx(gnx, gny)] = rand() < 0.7 ? GLITTER : STATIC
    }
  }
  if (rand() < 0.5) return
  let flowerDir = { x: 0, y: 0 }
  for (let i = 0; i < 3; i++) {
    const sdx = Math.floor(rand() * 9) - 4, sdy = Math.floor(rand() * 9) - 4
    const snx = x + sdx, sny = y + sdy
    if (snx >= 0 && snx < cols && sny >= 0 && sny < rows) {
      if (g[idx(snx, sny)] === FLOWER) { flowerDir = { x: Math.sign(sdx), y: Math.sign(sdy) }; break }
    }
  }
  let fdx = 0, fdy = 0
  if (flowerDir.x !== 0 || flowerDir.y !== 0) { fdx = flowerDir.x; fdy = flowerDir.y }
  else {
    const r = rand()
    if (r < 0.25) { fdy = -1; fdx = rand() < 0.5 ? -1 : 1 }
    else if (r < 0.4) { fdy = 1; fdx = rand() < 0.5 ? -1 : 1 }
    else if (r < 0.7) { fdx = rand() < 0.5 ? -1 : 1 }
  }
  if (fdx === 0 && fdy === 0) return
  const fnx = x + fdx, fny = y + fdy
  if (fnx >= 0 && fnx < cols && fny >= 0 && fny < rows) {
    const fni = idx(fnx, fny), fnc = g[fni]
    if (fnc === EMPTY) { g[fni] = FIREFLY; g[p] = EMPTY }
    else if (fnc === FLOWER) {
      if (rand() < 0.03) {
        const bx = x + Math.floor(rand() * 3) - 1
        const by = y + Math.floor(rand() * 3) - 1
        if (bx >= 0 && bx < cols && by >= 0 && by < rows && g[idx(bx, by)] === EMPTY) {
          g[idx(bx, by)] = FIREFLY
        }
      }
    }
  }
}

// ── Falling-pass creatures ──────────────────────────────────────────────

export function updateBug(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  const bdx = Math.floor(rand() * 3) - 1, bdy = Math.floor(rand() * 3) - 1
  if (bdx !== 0 || bdy !== 0) {
    const bnx = x + bdx, bny = y + bdy
    if (bnx >= 0 && bnx < cols && bny >= 0 && bny < rows) {
      const bnc = g[idx(bnx, bny)]
      if (bnc === FIRE || bnc === PLASMA || bnc === LIGHTNING || bnc === EMBER) { g[p] = FIRE; return }
    }
  }
  if (rand() < 0.5) return
  const dx = Math.floor(rand() * 3) - 1
  const dy = rand() < 0.7 ? 1 : Math.floor(rand() * 3) - 1
  if (dx === 0 && dy === 0) return
  const nx = x + dx, ny = y + dy
  if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
    const ni = idx(nx, ny), nc = g[ni]
    if (nc === PLANT) { g[ni] = BUG; g[p] = rand() < 0.3 ? EMPTY : DIRT }
    else if (nc === EMPTY) { g[ni] = BUG; g[p] = EMPTY }
    else if (nc === WATER) { g[ni] = BUG; g[p] = WATER }
  }
}

export function updateAnt(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  if (rand() < 0.5) return
  const above = y > 0 ? g[idx(x, y - 1)] : EMPTY
  const hasFood = above === PLANT || above === FLOWER || above === DIRT
  const ax = Math.floor(rand() * 3) - 1
  const ay = hasFood ? -1 : (rand() < 0.7 ? 1 : Math.floor(rand() * 3) - 1)
  if (ax === 0 && ay === 0) return
  const anx = x + ax, any_ = y + ay
  if (anx >= 0 && anx < cols && any_ >= 0 && any_ < rows) {
    const ani = idx(anx, any_), anc = g[ani]
    if (anc === FIRE || anc === PLASMA || anc === LAVA) { g[p] = FIRE; return }
    if (anc === ACID) { g[p] = EMPTY; return }
    if (anc === WATER) { g[ani] = ANT; g[p] = WATER; return }
    if (anc === DIRT || anc === SAND || anc === PLANT || anc === FLOWER) { g[ani] = ANT; g[p] = EMPTY }
    else if (anc === EMPTY) { g[ani] = ANT; g[p] = EMPTY }
  }
}

export function updateAlien(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  if (rand() < 0.4) return
  const ax = Math.floor(rand() * 3) - 1
  const ay = rand() < 0.3 ? 1 : Math.floor(rand() * 3) - 1
  if (ax === 0 && ay === 0) return
  const anx = x + ax, any_ = y + ay
  if (anx >= 0 && anx < cols && any_ >= 0 && any_ < rows) {
    const ani = idx(anx, any_), anc = g[ani]
    if (anc === EMPTY) {
      g[ani] = ALIEN
      g[p] = rand() < 0.1 ? SLIME : EMPTY
    }
    else if (anc === BUG || anc === ANT || anc === BIRD || anc === BEE || anc === SLIME) {
      g[ani] = ALIEN; g[p] = SLIME
    } else if (anc === PLANT || anc === FLOWER) { g[ani] = ALIEN; g[p] = SLIME }
    else if (anc === FIRE || anc === PLASMA || anc === LIGHTNING) { g[p] = SLIME }
  }
}

export function updateWorm(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  if (rand() < 0.4) return
  const wx = Math.floor(rand() * 3) - 1
  const wy = rand() < 0.6 ? 1 : Math.floor(rand() * 3) - 1
  if (wx === 0 && wy === 0) return
  const wnx = x + wx, wny = y + wy
  if (wnx >= 0 && wnx < cols && wny >= 0 && wny < rows) {
    const wni = idx(wnx, wny), wnc = g[wni]
    if (wnc === FIRE || wnc === LAVA || wnc === ACID) { g[p] = EMPTY; return }
    if (wnc === BIRD) { g[p] = EMPTY; return }
    if (wnc === DIRT || wnc === SAND) { g[wni] = WORM; g[p] = EMPTY }
    else if (wnc === EMPTY) { g[wni] = WORM; g[p] = EMPTY }
    else if (wnc === WATER) { g[wni] = WORM; g[p] = WATER }
  }
}

export function updateFairy(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  if (rand() < 0.3) return
  const fx = Math.floor(rand() * 3) - 1
  const fy = rand() < 0.6 ? -1 : Math.floor(rand() * 3) - 1
  if (fx === 0 && fy === 0) return
  const fnx = x + fx, fny = y + fy
  if (fnx >= 0 && fnx < cols && fny >= 0 && fny < rows) {
    const fni = idx(fnx, fny), fnc = g[fni]
    if (fnc === FIRE || fnc === LAVA || fnc === PLASMA) { g[p] = GLITTER; return }
    if (fnc === EMPTY) { g[fni] = FAIRY; g[p] = rand() < 0.15 ? GLITTER : EMPTY }
    else if (fnc === DIRT || fnc === SAND) { g[fni] = FAIRY; g[p] = FLOWER }
    else if (fnc === WATER) { g[fni] = FAIRY; g[p] = GLITTER }
    else if (fnc === PLANT) { g[fni] = FAIRY; g[p] = FLOWER }
    else if (fnc === STONE) { g[p] = rand() < 0.1 ? GLITTER : EMPTY }
  }
}

export function updateFish(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  const belowCell = y < rows - 1 ? g[idx(x, y + 1)] : EMPTY
  let inWater = false
  if (belowCell === WATER || (y > 0 && g[idx(x, y - 1)] === WATER)) inWater = true
  else if ((x > 0 && g[idx(x - 1, y)] === WATER) || (x < cols - 1 && g[idx(x + 1, y)] === WATER)) inWater = true
  if (!inWater) { g[p] = EMPTY; return }
  if (rand() < 0.4) return
  const fx = Math.floor(rand() * 3) - 1
  const fy = Math.floor(rand() * 3) - 1
  if (fx === 0 && fy === 0) return
  const fnx = x + fx, fny = y + fy
  if (fnx >= 0 && fnx < cols && fny >= 0 && fny < rows) {
    const fni = idx(fnx, fny), fnc = g[fni]
    if (fnc === WATER) { g[fni] = FISH; g[p] = WATER }
    else if (fnc === BUG || fnc === ALGAE || fnc === WORM) { g[fni] = FISH; g[p] = WATER }
  }
}

export function updateMoth(g: Uint8Array, x: number, y: number, p: number, cols: number, rows: number, rand: () => number): void {
  const idx = (x: number, y: number) => y * cols + x
  if (rand() < 0.3) return
  let targetDx = 0, targetDy = 0
  for (let i = 0; i < 2; i++) {
    const sdx = Math.floor(rand() * 9) - 4, sdy = Math.floor(rand() * 9) - 4
    const snx = x + sdx, sny = y + sdy
    if (snx >= 0 && snx < cols && sny >= 0 && sny < rows) {
      const snc = g[idx(snx, sny)]
      if (snc === FIRE || snc === EMBER || snc === FIREFLY || snc === LIGHTNING) {
        targetDx = sdx > 0 ? 1 : (sdx < 0 ? -1 : 0)
        targetDy = sdy > 0 ? 1 : (sdy < 0 ? -1 : 0)
        break
      }
    }
  }
  const mx = targetDx !== 0 ? targetDx : Math.floor(rand() * 3) - 1
  const my = targetDy !== 0 ? targetDy : (rand() < 0.4 ? -1 : Math.floor(rand() * 3) - 1)
  if (mx === 0 && my === 0) return
  const mnx = x + mx, mny = y + my
  if (mnx >= 0 && mnx < cols && mny >= 0 && mny < rows) {
    const mni = idx(mnx, mny), mnc = g[mni]
    if (mnc === FIRE || mnc === EMBER || mnc === LAVA || mnc === PLASMA) { g[p] = FIRE; return }
    if (mnc === EMPTY) { g[mni] = MOTH; g[p] = EMPTY }
    else if (mnc === PLANT || mnc === FLOWER) { g[mni] = MOTH; g[p] = rand() < 0.3 ? EMPTY : PLANT }
  }
}
