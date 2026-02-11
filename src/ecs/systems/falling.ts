import { EMPTY, SAND, WATER, DIRT, FLUFF, NITRO, SLIME, GUNPOWDER, HONEY, SNOW, POISON,
  FIRE, GAS, PLASMA, EMBER, LAVA, GLASS, STONE, ACID,
  BUG, ANT, ALIEN, WORM, FAIRY, FISH, MOTH, QUARK, CRYSTAL, STATIC, DUST, GLITTER,
  BULLET_S, BULLET_SE, BULLET_SW, BULLET_TRAIL,
  TAP, ANTHILL, HIVE, NEST, GUN, VOLCANO, STAR, BLACK_HOLE,
  MOLD, MERCURY, VOID, RUST, PLANT, SEED, ALGAE,
  BIRD, BEE, FLOWER } from '../constants'
import { updateBug, updateAnt, updateAlien, updateWorm, updateFairy, updateFish, updateMoth } from './creatures'
import { updateBulletFalling, updateBulletTrail } from './projectiles'
import { updateTap, updateAnthill, updateHive, updateNest, updateGun, updateVolcano, updateStar, updateBlackHole } from './spawners'
import { updateAcid, updateLava, updateMold, updateMercury, updateVoid, updateRust } from './reactions'
import { updatePlant, updateSeed, updateAlgae } from './growing'
import { updateQuark, updateCrystal, updateEmber, updateStatic, updateDust, updateGlitter } from './effects'

export function fallingPhysicsSystem(g: Uint8Array, cols: number, rows: number): void {
  const idx = (x: number, y: number) => y * cols + x
  const rand = Math.random

  for (let y = rows - 2; y >= 0; y--) {
    const leftToRight = rand() < 0.5
    for (let i = 0; i < cols; i++) {
      const x = leftToRight ? i : cols - 1 - i
      const p = idx(x, y)
      const c = g[p]
      if (c === EMPTY) continue

      const below = idx(x, y + 1)
      const belowCell = g[below]

      // South-moving bullets
      if (c === BULLET_S || c === BULLET_SE || c === BULLET_SW) {
        updateBulletFalling(g, x, y, p, c, cols, rows, leftToRight, rand)
        continue
      }

      // Bullet trail fades
      if (c === BULLET_TRAIL) {
        updateBulletTrail(g, p, rand)
        continue
      }

      // Spawners
      if (c === TAP) { updateTap(g, x, y, p, cols, rows, rand); continue }
      if (c === ANTHILL) { updateAnthill(g, x, y, p, cols, rows, rand); continue }
      if (c === HIVE) { updateHive(g, x, y, p, cols, rows, rand); continue }
      if (c === NEST) { updateNest(g, x, y, p, cols, rows, rand); continue }
      if (c === GUN) { updateGun(g, x, y, p, cols, rows, rand); continue }
      if (c === VOLCANO) { updateVolcano(g, x, y, p, cols, rows, rand); continue }
      if (c === STAR) { updateStar(g, x, y, p, cols, rows, rand); continue }
      if (c === BLACK_HOLE) { updateBlackHole(g, x, y, p, cols, rows, rand); continue }

      // SAND
      if (c === SAND) {
        if (belowCell === EMPTY) { g[below] = SAND; g[p] = EMPTY }
        else if (belowCell === WATER || belowCell === ACID) { g[below] = SAND; g[p] = belowCell }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          const nx1 = x + dx, nx2 = x - dx
          if (nx1 >= 0 && nx1 < cols && g[idx(nx1, y + 1)] === EMPTY) { g[idx(nx1, y + 1)] = SAND; g[p] = EMPTY }
          else if (nx2 >= 0 && nx2 < cols && g[idx(nx2, y + 1)] === EMPTY) { g[idx(nx2, y + 1)] = SAND; g[p] = EMPTY }
        }
      }
      // WATER
      else if (c === WATER) {
        if (belowCell === EMPTY) { g[below] = WATER; g[p] = EMPTY }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          const nx1 = x + dx, nx2 = x - dx
          if (nx1 >= 0 && nx1 < cols && g[idx(nx1, y + 1)] === EMPTY) { g[idx(nx1, y + 1)] = WATER; g[p] = EMPTY }
          else if (nx2 >= 0 && nx2 < cols && g[idx(nx2, y + 1)] === EMPTY) { g[idx(nx2, y + 1)] = WATER; g[p] = EMPTY }
          else if (nx1 >= 0 && nx1 < cols && g[idx(nx1, y)] === EMPTY) { g[idx(nx1, y)] = WATER; g[p] = EMPTY }
          else if (nx2 >= 0 && nx2 < cols && g[idx(nx2, y)] === EMPTY) { g[idx(nx2, y)] = WATER; g[p] = EMPTY }
        }
      }
      // DIRT
      else if (c === DIRT) {
        if (belowCell === EMPTY) { g[below] = DIRT; g[p] = EMPTY }
        else if (belowCell === WATER) { g[below] = DIRT; g[p] = WATER }
      }
      // FLUFF
      else if (c === FLUFF) {
        if (rand() < 0.3 && belowCell === EMPTY) { g[below] = FLUFF; g[p] = EMPTY }
        else if (rand() < 0.15) {
          const dx = rand() < 0.5 ? -1 : 1
          if (x + dx >= 0 && x + dx < cols && g[idx(x + dx, y + 1)] === EMPTY) {
            g[idx(x + dx, y + 1)] = FLUFF; g[p] = EMPTY
          }
        }
      }
      // Creatures
      else if (c === BUG) { updateBug(g, x, y, p, cols, rows, rand) }
      else if (c === ANT) { updateAnt(g, x, y, p, cols, rows, rand) }
      else if (c === ALIEN) { updateAlien(g, x, y, p, cols, rows, rand) }
      else if (c === WORM) { updateWorm(g, x, y, p, cols, rows, rand) }
      else if (c === FAIRY) { updateFairy(g, x, y, p, cols, rows, rand) }
      else if (c === FISH) { updateFish(g, x, y, p, cols, rows, rand) }
      else if (c === MOTH) { updateMoth(g, x, y, p, cols, rows, rand) }
      // NITRO
      else if (c === NITRO) {
        const aboveCell = y > 0 ? g[idx(x, y - 1)] : EMPTY
        const shouldExplode =
          (belowCell !== EMPTY && belowCell !== WATER && belowCell !== NITRO) ||
          (aboveCell !== EMPTY && aboveCell !== WATER && aboveCell !== NITRO)
        if (shouldExplode) {
          const r = 12
          for (let edy = -r; edy <= r; edy++) {
            for (let edx = -r; edx <= r; edx++) {
              if (edx * edx + edy * edy <= r * r) {
                const ex = x + edx, ey = y + edy
                if (ex >= 0 && ex < cols && ey >= 0 && ey < rows) {
                  const ei = idx(ex, ey), ec = g[ei]
                  if (ec === WATER) g[ei] = rand() < 0.7 ? STONE : EMPTY
                  else if (ec !== STONE && ec !== GLASS) g[ei] = FIRE
                }
              }
            }
          }
          continue
        }
        if (g[p] !== NITRO) continue
        if (belowCell === EMPTY) { g[below] = NITRO; g[p] = EMPTY }
        else if (belowCell === WATER) { g[below] = NITRO; g[p] = WATER }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          const nx1 = x + dx, nx2 = x - dx
          if (nx1 >= 0 && nx1 < cols && g[idx(nx1, y + 1)] === EMPTY) { g[idx(nx1, y + 1)] = NITRO; g[p] = EMPTY }
          else if (nx2 >= 0 && nx2 < cols && g[idx(nx2, y + 1)] === EMPTY) { g[idx(nx2, y + 1)] = NITRO; g[p] = EMPTY }
          else if (nx1 >= 0 && nx1 < cols && g[idx(nx1, y)] === EMPTY) { g[idx(nx1, y)] = NITRO; g[p] = EMPTY }
          else if (nx2 >= 0 && nx2 < cols && g[idx(nx2, y)] === EMPTY) { g[idx(nx2, y)] = NITRO; g[p] = EMPTY }
        }
      }
      // SLIME
      else if (c === SLIME) {
        for (let i = 0; i < 2; i++) {
          const sdx = Math.floor(rand() * 3) - 1, sdy = Math.floor(rand() * 3) - 1
          if (sdx === 0 && sdy === 0) continue
          const snx = x + sdx, sny = y + sdy
          if (snx >= 0 && snx < cols && sny >= 0 && sny < rows) {
            const snc = g[idx(snx, sny)]
            if (snc === FIRE || snc === PLASMA || snc === EMBER || snc === LAVA) { g[p] = GAS; break }
          }
        }
        if (g[p] !== SLIME) continue
        if (rand() < 0.6) continue
        if (belowCell === EMPTY) { g[below] = SLIME; g[p] = EMPTY }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          const nx = x + dx
          if (nx >= 0 && nx < cols && g[idx(nx, y + 1)] === EMPTY) { g[idx(nx, y + 1)] = SLIME; g[p] = EMPTY }
          else if (nx >= 0 && nx < cols && g[idx(nx, y)] === EMPTY && rand() < 0.3) { g[idx(nx, y)] = SLIME; g[p] = EMPTY }
        }
      }
      // Effects
      else if (c === QUARK) { updateQuark(g, x, y, p, cols, rows, rand) }
      else if (c === CRYSTAL) { updateCrystal(g, x, y, p, cols, rows, rand) }
      else if (c === EMBER) { updateEmber(g, x, y, p, cols, rows, rand) }
      else if (c === STATIC) { updateStatic(g, x, y, p, cols, rows, rand) }
      // GUNPOWDER
      else if (c === GUNPOWDER) {
        for (let i = 0; i < 2; i++) {
          const gdx = Math.floor(rand() * 3) - 1, gdy = Math.floor(rand() * 3) - 1
          if (gdx === 0 && gdy === 0) continue
          const gnx = x + gdx, gny = y + gdy
          if (gnx >= 0 && gnx < cols && gny >= 0 && gny < rows) {
            const gnc = g[idx(gnx, gny)]
            if (gnc === FIRE || gnc === PLASMA || gnc === EMBER || gnc === LAVA) {
              const r = 6
              for (let edy = -r; edy <= r; edy++) {
                for (let edx = -r; edx <= r; edx++) {
                  if (edx * edx + edy * edy <= r * r) {
                    const ex = x + edx, ey = y + edy
                    if (ex >= 0 && ex < cols && ey >= 0 && ey < rows) {
                      const ei = idx(ex, ey), ec = g[ei]
                      if (ec !== STONE && ec !== GLASS && ec !== WATER) g[ei] = FIRE
                    }
                  }
                }
              }
              break
            }
          }
        }
        if (g[p] !== GUNPOWDER) continue
        if (belowCell === EMPTY) { g[below] = GUNPOWDER; g[p] = EMPTY }
        else if (belowCell === WATER) { g[below] = GUNPOWDER; g[p] = WATER }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          const nx1 = x + dx, nx2 = x - dx
          if (nx1 >= 0 && nx1 < cols && g[idx(nx1, y + 1)] === EMPTY) { g[idx(nx1, y + 1)] = GUNPOWDER; g[p] = EMPTY }
          else if (nx2 >= 0 && nx2 < cols && g[idx(nx2, y + 1)] === EMPTY) { g[idx(nx2, y + 1)] = GUNPOWDER; g[p] = EMPTY }
        }
      }
      // HONEY
      else if (c === HONEY) {
        if (rand() > 0.15) continue
        if (belowCell === EMPTY) { g[below] = HONEY; g[p] = EMPTY }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          const nx1 = x + dx, nx2 = x - dx
          if (nx1 >= 0 && nx1 < cols && g[idx(nx1, y + 1)] === EMPTY) { g[idx(nx1, y + 1)] = HONEY; g[p] = EMPTY }
          else if (nx2 >= 0 && nx2 < cols && g[idx(nx2, y + 1)] === EMPTY) { g[idx(nx2, y + 1)] = HONEY; g[p] = EMPTY }
          else if (nx1 >= 0 && nx1 < cols && g[idx(nx1, y)] === EMPTY && rand() < 0.3) { g[idx(nx1, y)] = HONEY; g[p] = EMPTY }
          else if (nx2 >= 0 && nx2 < cols && g[idx(nx2, y)] === EMPTY && rand() < 0.3) { g[idx(nx2, y)] = HONEY; g[p] = EMPTY }
        }
      }
      // Reactions
      else if (c === ACID) { updateAcid(g, x, y, p, cols, rows, rand) }
      else if (c === LAVA) { updateLava(g, x, y, p, cols, rows, rand) }
      else if (c === MOLD) { updateMold(g, x, y, p, cols, rows, rand) }
      else if (c === MERCURY) { updateMercury(g, x, y, p, cols, rows, rand) }
      else if (c === VOID) { updateVoid(g, x, y, p, cols, rows, rand) }
      else if (c === RUST) { updateRust(g, x, y, p, cols, rows, rand) }
      // SNOW
      else if (c === SNOW) {
        let melted = false
        if (rand() < 0.4) {
          for (let sdy = -1; sdy <= 1 && !melted; sdy++) {
            for (let sdx = -1; sdx <= 1 && !melted; sdx++) {
              if (sdy === 0 && sdx === 0) continue
              const snx = x + sdx, sny = y + sdy
              if (snx >= 0 && snx < cols && sny >= 0 && sny < rows) {
                const snc = g[idx(snx, sny)]
                if ((snc === FIRE || snc === PLASMA || snc === EMBER || snc === LAVA) && rand() < 0.6) { g[p] = WATER; melted = true }
                else if (snc === WATER && rand() < 0.04) { g[idx(snx, sny)] = GLASS }
              }
            }
          }
        }
        if (melted) continue
        if (rand() < 0.25 && belowCell === EMPTY) { g[below] = SNOW; g[p] = EMPTY }
        else if (rand() < 0.1) {
          const sdx = rand() < 0.5 ? -1 : 1
          if (x + sdx >= 0 && x + sdx < cols && g[idx(x + sdx, y + 1)] === EMPTY) {
            g[idx(x + sdx, y + 1)] = SNOW; g[p] = EMPTY
          }
        }
      }
      // Growing
      else if (c === PLANT) { updatePlant(g, x, y, p, cols, rows, rand) }
      else if (c === SEED) { updateSeed(g, x, y, p, cols, rows, rand) }
      else if (c === ALGAE) { updateAlgae(g, x, y, p, cols, rows, rand) }
      // POISON
      else if (c === POISON) {
        for (let i = 0; i < 3; i++) {
          const pdx = Math.floor(rand() * 3) - 1, pdy = Math.floor(rand() * 3) - 1
          if (pdx === 0 && pdy === 0) continue
          const pnx = x + pdx, pny = y + pdy
          if (pnx >= 0 && pnx < cols && pny >= 0 && pny < rows) {
            const pnc = g[idx(pnx, pny)]
            if ((pnc === BUG || pnc === ANT || pnc === BIRD || pnc === BEE || pnc === SLIME) && rand() < 0.5) {
              g[idx(pnx, pny)] = POISON
            } else if (pnc === ALGAE && rand() < 0.08) { g[idx(pnx, pny)] = POISON }
            else if (pnc === PLANT && rand() < 0.05) { g[idx(pnx, pny)] = POISON }
            else if (pnc === WATER && rand() < 0.15) { g[idx(pnx, pny)] = EMPTY; if (rand() < 0.5) g[p] = WATER }
          }
        }
        if (rand() > 0.3) continue
        if (belowCell === EMPTY) { g[below] = POISON; g[p] = EMPTY }
        else {
          const pdx = rand() < 0.5 ? -1 : 1
          const pnx1 = x + pdx, pnx2 = x - pdx
          if (pnx1 >= 0 && pnx1 < cols && g[idx(pnx1, y + 1)] === EMPTY) { g[idx(pnx1, y + 1)] = POISON; g[p] = EMPTY }
          else if (pnx2 >= 0 && pnx2 < cols && g[idx(pnx2, y + 1)] === EMPTY) { g[idx(pnx2, y + 1)] = POISON; g[p] = EMPTY }
          else if (pnx1 >= 0 && pnx1 < cols && g[idx(pnx1, y)] === EMPTY) { g[idx(pnx1, y)] = POISON; g[p] = EMPTY }
          else if (pnx2 >= 0 && pnx2 < cols && g[idx(pnx2, y)] === EMPTY) { g[idx(pnx2, y)] = POISON; g[p] = EMPTY }
        }
      }
      // DUST
      else if (c === DUST) { updateDust(g, x, y, p, cols, rows, rand) }
      // GLITTER
      else if (c === GLITTER) { updateGlitter(g, x, y, p, cols, rows, rand) }
    }
  }
}
