import { EMPTY, FIRE, BLUE_FIRE, GAS, SPORE, CLOUD, FIREWORK, BUBBLE, COMET, PLASMA, LIGHTNING,
  BULLET_N, BULLET_NW, PLANT, FLUFF, BUG, GUNPOWDER, FLOWER, HIVE, NEST, EMBER, SAND, GLASS,
  WATER, ACID, HONEY, POISON, MOLD, ALGAE, DIRT, STONE, STATIC, NITRO, BULLET_S, BULLET_SE, BULLET_SW,
  GLITTER, BULLET_TRAIL, BIRD, BEE, FIREFLY } from '../constants'
import { updateBulletRising } from './projectiles'
import { updateBird } from './creatures'
import { updateBee } from './creatures'
import { updateFirefly } from './creatures'

export function risingPhysicsSystem(g: Uint8Array, cols: number, rows: number): void {
  const idx = (x: number, y: number) => y * cols + x
  const rand = Math.random
  for (let y = 0; y < rows; y++) {
    const leftToRight = rand() < 0.5
    for (let i = 0; i < cols; i++) {
      const x = leftToRight ? i : cols - 1 - i
      const p = y * cols + x
      const c = g[p]
      if (c === EMPTY) continue

      // Bullets (rising): BULLET_N through BULLET_NW
      if (c >= BULLET_N && c <= BULLET_NW) {
        updateBulletRising(g, x, y, p, c, cols, rows, leftToRight, rand)
      }

      // FIRE / BLUE_FIRE
      else if (c === FIRE || c === BLUE_FIRE) {
        if (y === 0) { g[p] = EMPTY; continue }
        if (rand() < 0.1) { g[p] = rand() < 0.25 ? GAS : rand() < 0.15 ? EMBER : EMPTY; continue }
        for (let i = 0; i < 3; i++) {
          const dx = Math.floor(rand() * 3) - 1, dy = Math.floor(rand() * 3) - 1
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const ni = idx(nx, ny), nc = g[ni]
            if ((nc === PLANT || nc === FLUFF || nc === BUG || nc === GAS || nc === GUNPOWDER || nc === FLOWER || nc === HIVE || nc === NEST) && rand() < 0.5) g[ni] = FIRE
          }
        }
        const up = idx(x, y - 1)
        if (y > 0 && g[up] === EMPTY) { g[up] = c; g[p] = EMPTY }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          if (y > 0 && x + dx >= 0 && x + dx < cols && g[idx(x + dx, y - 1)] === EMPTY) {
            g[idx(x + dx, y - 1)] = c; g[p] = EMPTY
          }
        }
      }

      // GAS
      else if (c === GAS) {
        if (y === 0) { g[p] = EMPTY; continue }
        if (rand() < 0.02) { g[p] = EMPTY; continue }
        const up = idx(x, y - 1)
        if (y > 0 && g[up] === EMPTY) { g[up] = GAS; g[p] = EMPTY }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          if (y > 0 && x + dx >= 0 && x + dx < cols && g[idx(x + dx, y - 1)] === EMPTY) {
            g[idx(x + dx, y - 1)] = GAS; g[p] = EMPTY
          } else if (x + dx >= 0 && x + dx < cols && g[idx(x + dx, y)] === EMPTY) {
            g[idx(x + dx, y)] = GAS; g[p] = EMPTY
          }
        }
      }

      // SPORE
      else if (c === SPORE) {
        if (rand() < 0.01) { g[p] = EMPTY; continue }
        for (let i = 0; i < 3; i++) {
          const sdx = Math.floor(rand() * 3) - 1, sdy = Math.floor(rand() * 3) - 1
          if (sdx === 0 && sdy === 0) continue
          const snx = x + sdx, sny = y + sdy
          if (snx >= 0 && snx < cols && sny >= 0 && sny < rows) {
            const snc = g[idx(snx, sny)]
            if ((snc === PLANT || snc === FLOWER || snc === FLUFF || snc === HONEY || snc === DIRT || snc === ALGAE) && rand() < 0.35) {
              g[idx(snx, sny)] = MOLD; g[p] = EMPTY; break
            }
          }
        }
        if (rand() < 0.4) {
          const sdx = Math.floor(rand() * 3) - 1
          const sdy = rand() < 0.6 ? -1 : (rand() < 0.5 ? 0 : 1)
          const snx = x + sdx, sny = y + sdy
          if (snx >= 0 && snx < cols && sny >= 0 && sny < rows && g[idx(snx, sny)] === EMPTY) {
            g[idx(snx, sny)] = SPORE; g[p] = EMPTY
          }
        }
      }

      // CLOUD
      else if (c === CLOUD) {
        if (y < rows - 1 && g[idx(x, y + 1)] === EMPTY && rand() < 0.04) g[idx(x, y + 1)] = WATER
        if (rand() < 0.3) {
          const dx = rand() < 0.5 ? -1 : 1
          const dy = rand() < 0.3 ? -1 : rand() < 0.5 ? 1 : 0
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && g[idx(nx, ny)] === EMPTY) {
            g[idx(nx, ny)] = CLOUD; g[p] = EMPTY
          }
        }
      }

      // FIREWORK
      else if (c === FIREWORK) {
        if (y > 0 && rand() < 0.95) {
          const above = idx(x, y - 1)
          if (g[above] === EMPTY) { g[above] = FIREWORK; g[p] = EMPTY }
          else {
            g[p] = EMPTY
            const r = 8
            const colors = [FIRE, EMBER, STATIC, PLASMA, GLITTER, BLUE_FIRE]
            for (let edy = -r; edy <= r; edy++) {
              for (let edx = -r; edx <= r; edx++) {
                if (edx * edx + edy * edy <= r * r && rand() < 0.5) {
                  const ex = x + edx, ey = y + edy
                  if (ex >= 0 && ex < cols && ey >= 0 && ey < rows && g[idx(ex, ey)] === EMPTY) {
                    g[idx(ex, ey)] = colors[Math.floor(rand() * colors.length)]
                  }
                }
              }
            }
          }
        } else {
          g[p] = EMPTY
          const r = 7
          const colors = [FIRE, EMBER, STATIC, PLASMA, GLITTER, BLUE_FIRE]
          for (let edy = -r; edy <= r; edy++) {
            for (let edx = -r; edx <= r; edx++) {
              if (edx * edx + edy * edy <= r * r && rand() < 0.45) {
                const ex = x + edx, ey = y + edy
                if (ex >= 0 && ex < cols && ey >= 0 && ey < rows && g[idx(ex, ey)] === EMPTY) {
                  g[idx(ex, ey)] = colors[Math.floor(rand() * colors.length)]
                }
              }
            }
          }
        }
      }

      // BUBBLE
      else if (c === BUBBLE) {
        let inLiquid = false
        for (let i = 0; i < 3; i++) {
          const bdx = Math.floor(rand() * 3) - 1, bdy = Math.floor(rand() * 3) - 1
          const bnx = x + bdx, bny = y + bdy
          if (bnx >= 0 && bnx < cols && bny >= 0 && bny < rows) {
            const bnc = g[idx(bnx, bny)]
            if (bnc === WATER || bnc === ACID || bnc === HONEY || bnc === POISON) { inLiquid = true; break }
          }
        }
        if (inLiquid) {
          if (y > 0 && rand() < 0.6) {
            const above = idx(x, y - 1)
            const ac = g[above]
            if (ac === WATER || ac === ACID || ac === HONEY || ac === POISON) {
              g[above] = BUBBLE; g[p] = ac
            } else if (ac === EMPTY) {
              g[p] = EMPTY
              for (let i = 0; i < 3; i++) {
                const sx = x + Math.floor(rand() * 3) - 1
                const sy = y - 1 - Math.floor(rand() * 2)
                if (sx >= 0 && sx < cols && sy >= 0 && sy < rows && g[idx(sx, sy)] === EMPTY) {
                  g[idx(sx, sy)] = WATER
                }
              }
            }
          }
          if (rand() < 0.2) {
            const bdx = rand() < 0.5 ? -1 : 1
            if (x + bdx >= 0 && x + bdx < cols) {
              const side = idx(x + bdx, y)
              const sc = g[side]
              if (sc === WATER || sc === ACID || sc === HONEY || sc === POISON) {
                g[side] = BUBBLE; g[p] = sc
              }
            }
          }
        } else {
          g[p] = GAS
        }
      }

      // COMET
      else if (c === COMET) {
        const cdy = rand() < 0.8 ? -2 : -1
        const cdx = Math.floor(rand() * 3) - 1
        let moved = false
        for (let step = Math.abs(cdy); step > 0; step--) {
          const cny = y - step
          const cnx = x + (step === Math.abs(cdy) ? cdx : 0)
          if (cny >= 0 && cny < rows && cnx >= 0 && cnx < cols) {
            const ci = idx(cnx, cny)
            const cc = g[ci]
            if (cc === EMPTY) { g[ci] = COMET; g[p] = BLUE_FIRE; moved = true; break }
            else if (cc === WATER) { g[ci] = GAS; g[p] = BLUE_FIRE; moved = true; break }
            else if (cc === PLANT || cc === FLUFF || cc === FLOWER) { g[ci] = BLUE_FIRE; g[p] = BLUE_FIRE; moved = true; break }
            else if (cc === SAND) { g[ci] = GLASS; g[p] = BLUE_FIRE; moved = true; break }
            else {
              g[p] = EMPTY
              for (let edy = -2; edy <= 2; edy++) {
                for (let edx = -2; edx <= 2; edx++) {
                  const ex = x + edx, ey = y + edy
                  if (ex >= 0 && ex < cols && ey >= 0 && ey < rows && g[idx(ex, ey)] === EMPTY) {
                    g[idx(ex, ey)] = rand() < 0.6 ? BLUE_FIRE : EMBER
                  }
                }
              }
              moved = true; break
            }
          }
        }
        if (!moved || rand() < 0.05) g[p] = BLUE_FIRE
      }

      // PLASMA
      else if (c === PLASMA) {
        if (y === 0) { g[p] = EMPTY; continue }
        if (rand() < 0.08) { g[p] = EMPTY; continue }
        for (let i = 0; i < 3; i++) {
          const dx = Math.floor(rand() * 3) - 1, dy = Math.floor(rand() * 3) - 1
          if (dx === 0 && dy === 0) continue
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const nc = g[idx(nx, ny)]
            if (nc === SAND && rand() < 0.5) g[idx(nx, ny)] = PLASMA
            else if ((nc === PLANT || nc === FLUFF || nc === GAS || nc === FLOWER) && rand() < 0.5) g[idx(nx, ny)] = FIRE
          }
        }
        const up = idx(x, y - 1)
        if (y > 0 && g[up] === EMPTY) { g[up] = PLASMA; g[p] = EMPTY }
        else {
          const dx = rand() < 0.5 ? -1 : 1
          if (y > 0 && x + dx >= 0 && x + dx < cols && g[idx(x + dx, y - 1)] === EMPTY) {
            g[idx(x + dx, y - 1)] = PLASMA; g[p] = EMPTY
          }
        }
      }

      // LIGHTNING
      else if (c === LIGHTNING) {
        if (rand() < 0.2) { g[p] = rand() < 0.2 ? STATIC : EMPTY; continue }
        let struck = false
        for (let dist = 1; dist <= 3 && !struck; dist++) {
          const ny = y + dist
          if (ny >= rows) break
          const ti = idx(x, ny), t = g[ti]
          if (t === SAND) {
            g[ti] = GLASS; g[p] = EMPTY; struck = true
            for (let branch = 0; branch < 3; branch++) {
              let tx = x, ty = ny, dirX = rand() < 0.5 ? -1 : 1
              for (let len = 0; len < 8; len++) {
                if (rand() < 0.3) dirX = rand() < 0.5 ? -1 : 1
                tx += dirX; ty += rand() < 0.8 ? 1 : 0
                if (tx < 0 || tx >= cols || ty >= rows) break
                const bi = idx(tx, ty)
                if (g[bi] === SAND) g[bi] = GLASS
                else if (g[bi] !== EMPTY && g[bi] !== GLASS) break
              }
            }
          } else if (t === WATER) {
            g[ti] = LIGHTNING; g[p] = EMPTY; struck = true
            for (let dx = -3; dx <= 3; dx++) {
              const wx = x + dx
              if (wx >= 0 && wx < cols && g[idx(wx, ny)] === WATER && rand() < 0.7) g[idx(wx, ny)] = LIGHTNING
            }
          } else if (t === PLANT || t === FLUFF || t === BUG) {
            g[ti] = FIRE; g[p] = EMPTY; struck = true
          } else if (t === NITRO) {
            g[p] = EMPTY
            const r = 15
            for (let edy = -r; edy <= r; edy++) {
              for (let edx = -r; edx <= r; edx++) {
                if (edx * edx + edy * edy <= r * r) {
                  const ex = x + edx, ey = ny + edy
                  if (ex >= 0 && ex < cols && ey >= 0 && ey < rows) {
                    const ei = idx(ex, ey), ec = g[ei]
                    if (ec === WATER) g[ei] = rand() < 0.7 ? STONE : EMPTY
                    else if (ec !== STONE && ec !== GLASS) g[ei] = FIRE
                  }
                }
              }
            }
            struck = true
          } else if (t === STONE || t === GLASS) {
            g[p] = EMPTY; struck = true
          } else if (t === DIRT) {
            if (rand() < 0.4) g[ti] = GLASS
            g[p] = EMPTY; struck = true
          } else if (t === EMPTY) continue
          else { g[p] = EMPTY; struck = true }
        }
        if (!struck && y + 1 < rows && g[idx(x, y + 1)] === EMPTY) {
          g[idx(x, y + 1)] = LIGHTNING; g[p] = EMPTY
          if (rand() < 0.15) {
            const bx = x + (rand() < 0.5 ? -1 : 1)
            if (bx >= 0 && bx < cols && g[idx(bx, y)] === EMPTY) g[idx(bx, y)] = LIGHTNING
          }
        } else if (!struck) g[p] = EMPTY
      }

      // Creature handlers
      else if (c === BIRD) {
        updateBird(g, x, y, p, cols, rows, rand)
      } else if (c === BEE) {
        updateBee(g, x, y, p, cols, rows, rand)
      } else if (c === FIREFLY) {
        updateFirefly(g, x, y, p, cols, rows, rand)
      }
    }
  }
}
