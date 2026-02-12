import { useRef, useEffect, useState, useCallback } from 'react'
import './App.css'
import { WORLD_COLS, WORLD_ROWS, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from './ecs/constants'

type Material = 'sand' | 'water' | 'dirt' | 'stone' | 'plant' | 'fire' | 'gas' | 'fluff' | 'bug' | 'plasma' | 'nitro' | 'glass' | 'lightning' | 'slime' | 'ant' | 'alien' | 'quark' | 'crystal' | 'ember' | 'static' | 'bird' | 'gunpowder' | 'tap' | 'anthill' | 'bee' | 'flower' | 'hive' | 'honey' | 'nest' | 'gun' | 'cloud' | 'acid' | 'lava' | 'snow' | 'volcano' | 'mold' | 'mercury' | 'void' | 'seed' | 'rust' | 'spore' | 'algae' | 'poison' | 'dust' | 'firework' | 'bubble' | 'glitter' | 'star' | 'comet' | 'blackhole' | 'firefly' | 'worm' | 'fairy' | 'fish' | 'moth'
type Tool = Material | 'erase'

const BUTTON_COLORS: Record<Tool, string> = {
  erase: '#f87171',
  sand: '#e6c86e', water: '#4a90d9', dirt: '#8b5a2b', stone: '#666666',
  plant: '#228b22', fire: '#ff6600', gas: '#888888', fluff: '#f5e6d3',
  bug: '#ff69b4', plasma: '#c8a2c8', nitro: '#39ff14', glass: '#a8d8ea',
  lightning: '#ffff88', slime: '#9acd32', ant: '#6b2a1a', alien: '#00ff00', quark: '#ff00ff',
  crystal: '#80d0ff', ember: '#ff4020', static: '#44ffff', bird: '#e8e8e8', gunpowder: '#303030', tap: '#c0c0c0', anthill: '#b08030',
  bee: '#ffd800', flower: '#cc44ff', hive: '#e8b840', honey: '#ffa030', nest: '#a08080', gun: '#505050', cloud: '#c8d0d8',
  acid: '#bfff00', lava: '#dc1414', snow: '#e0f0ff',
  volcano: '#660000', mold: '#7b68ee', mercury: '#b8c0c8', void: '#2e0854', seed: '#d4a574',
  rust: '#b7410e', spore: '#20b2aa', algae: '#2e8b57', poison: '#8b008b', dust: '#deb887',
  firework: '#ff6600', bubble: '#87ceeb', glitter: '#c0c0c0', star: '#ffdf00', comet: '#7df9ff', blackhole: '#000000',
  firefly: '#bfff00',
  worm: '#c09080', fairy: '#ff88ff',
  fish: '#ffa500', moth: '#d2b48c',
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const workerInitRef = useRef(false)
  const [tool, setTool] = useState<Tool>('sand')
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(3)
  const [isPaused, setIsPaused] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const lastMaterialRef = useRef<Material>('sand')
  const dimensionsRef = useRef({ cols: WORLD_COLS, rows: WORLD_ROWS })
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null)
  const toolRef = useRef<Tool>('sand')
  const brushSizeRef = useRef(3)

  // Camera state (main thread mirror for coordinate transform)
  const camXRef = useRef(0)
  const camYRef = useRef(0)
  const zoomRef = useRef(DEFAULT_ZOOM)

  // Pan state
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 })

  // Keep refs in sync with state
  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { brushSizeRef.current = brushSize }, [brushSize])

  const clampCamera = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const z = zoomRef.current
    const { cols, rows } = dimensionsRef.current
    const viewW = rect.width / z, viewH = rect.height / z
    camXRef.current = Math.max(0, Math.min(camXRef.current, Math.max(0, cols - viewW)))
    camYRef.current = Math.max(0, Math.min(camYRef.current, Math.max(0, rows - viewH)))
  }, [])

  const sendCamera = useCallback(() => {
    clampCamera()
    workerRef.current?.postMessage({
      type: 'camera',
      data: { camX: camXRef.current, camY: camYRef.current, zoom: zoomRef.current }
    })
  }, [clampCamera])

  const getCellPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const z = zoomRef.current
    const { cols, rows } = dimensionsRef.current

    // Clamp camera the same way the worker renderer does
    const viewW = rect.width / z, viewH = rect.height / z
    const maxCamX = Math.max(0, cols - viewW)
    const maxCamY = Math.max(0, rows - viewH)
    const cx = Math.max(0, Math.min(camXRef.current, maxCamX))
    const cy = Math.max(0, Math.min(camYRef.current, maxCamY))

    const x = Math.floor(cx + (clientX - rect.left) / z)
    const y = Math.floor(cy + (clientY - rect.top) / z)
    if (x >= 0 && x < cols && y >= 0 && y < rows) return { x, y }
    return null
  }, [])

  const sendInput = useCallback((clientX: number, clientY: number) => {
    const pos = getCellPos(clientX, clientY)
    if (!pos || !workerRef.current) return
    workerRef.current.postMessage({
      type: 'input',
      data: {
        cellX: pos.x,
        cellY: pos.y,
        tool: toolRef.current,
        brushSize: brushSizeRef.current
      }
    })
  }, [getCellPos])


  // Initialize worker and transfer canvas.
  // transferControlToOffscreen is a one-shot operation — the canvas becomes a
  // permanent placeholder and can never be re-transferred. A guard ref prevents
  // React StrictMode's double-mount from breaking things.
  useEffect(() => {
    if (workerInitRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return
    workerInitRef.current = true

    const width = container.clientWidth
    const height = container.clientHeight
    canvas.width = width
    canvas.height = height

    // Camera: center horizontally, align bottom of viewport to bottom of grid
    const viewW = width / DEFAULT_ZOOM
    const viewH = height / DEFAULT_ZOOM
    camXRef.current = Math.max(0, (WORLD_COLS - viewW) / 2)
    camYRef.current = Math.max(0, WORLD_ROWS - viewH)
    zoomRef.current = DEFAULT_ZOOM

    // Create worker
    const worker = new Worker(
      new URL('./physics.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    // Transfer canvas control to worker
    const offscreen = canvas.transferControlToOffscreen()
    worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen])

    // Handle resize
    const handleResize = () => {
      const container = canvas.parentElement
      if (!container) return
      const width = container.clientWidth
      const height = container.clientHeight
      worker.postMessage({ type: 'resize', data: { width, height } })
    }

    window.addEventListener('resize', handleResize)
  }, [])

  // Sync pause state with worker
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'pause', data: { paused: isPaused } })
    }
  }, [isPaused])

  // Continuous drawing interval
  useEffect(() => {
    if (!isDrawing) return
    const interval = setInterval(() => {
      const pos = pointerPosRef.current
      if (pos) sendInput(pos.x, pos.y)
    }, 50)
    return () => clearInterval(interval)
  }, [isDrawing, sendInput])

  // Keyboard shortcuts for brush size
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ']' || e.key === '=') setBrushSize(prev => Math.min(30, prev + 1))
      if (e.key === '[' || e.key === '-') setBrushSize(prev => Math.max(1, prev - 1))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'reset' })
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDropdownOpen(false)

    // Right-click → pan
    if (e.button === 2) {
      isPanningRef.current = true
      panStartRef.current = {
        x: e.clientX, y: e.clientY,
        camX: camXRef.current, camY: camYRef.current
      }
      return
    }

    // Left-click → draw
    setIsDrawing(true)
    pointerPosRef.current = { x: e.clientX, y: e.clientY }
    sendInput(e.clientX, e.clientY)
  }, [sendInput])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Pan
    if (isPanningRef.current) {
      const dx = (e.clientX - panStartRef.current.x) / zoomRef.current
      const dy = (e.clientY - panStartRef.current.y) / zoomRef.current
      camXRef.current = panStartRef.current.camX - dx
      camYRef.current = panStartRef.current.camY - dy
      sendCamera()
      return
    }

    // Draw
    pointerPosRef.current = { x: e.clientX, y: e.clientY }
    if (isDrawing) sendInput(e.clientX, e.clientY)
  }, [isDrawing, sendInput, sendCamera])

  const handlePointerUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false
      return
    }
    setIsDrawing(false)
    pointerPosRef.current = null
  }, [])

  const handlePointerEnter = useCallback((e: React.PointerEvent) => {
    if (e.buttons > 0 && !isPanningRef.current) {
      setIsDrawing(true)
      pointerPosRef.current = { x: e.clientX, y: e.clientY }
    }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()

    // Right-click held + scroll → brush size
    if (isPanningRef.current || e.buttons === 2) {
      setBrushSize(prev => e.deltaY > 0 ? Math.max(1, prev - 1) : Math.min(30, prev + 1))
      return
    }

    // Plain scroll → zoom
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cursorPx = e.clientX - rect.left
    const cursorPy = e.clientY - rect.top

    const oldZoom = zoomRef.current
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * factor))

    // Keep world position under cursor fixed
    const worldX = camXRef.current + cursorPx / oldZoom
    const worldY = camYRef.current + cursorPy / oldZoom
    camXRef.current = worldX - cursorPx / newZoom
    camYRef.current = worldY - cursorPy / newZoom
    zoomRef.current = newZoom

    sendCamera()
  }, [sendCamera])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const materials: Tool[] = ['erase', 'sand', 'water', 'dirt', 'stone', 'plant', 'fire', 'gas', 'fluff', 'bug', 'plasma', 'nitro', 'glass', 'lightning', 'slime', 'ant', 'alien', 'quark', 'crystal', 'ember', 'static', 'bird', 'gunpowder', 'tap', 'anthill', 'bee', 'flower', 'hive', 'honey', 'nest', 'gun', 'cloud', 'acid', 'lava', 'snow', 'volcano', 'mold', 'mercury', 'void', 'seed', 'rust', 'spore', 'algae', 'poison', 'dust', 'firework', 'bubble', 'glitter', 'star', 'comet', 'blackhole', 'firefly', 'worm', 'fairy', 'fish', 'moth']

  return (
    <div className="app">
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerEnter={handlePointerEnter}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: 'none' }}
        />
      </div>
      <div className="controls">
        <div className="action-btns">
          <button className={`ctrl-btn playpause ${isPaused ? 'paused' : 'playing'}`} onClick={() => setIsPaused(!isPaused)}>
            {isPaused
              ? <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>
            }
          </button>
          <button className="ctrl-btn reset" onClick={reset}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>
          </button>
        </div>
        <div className="material-dropdown" ref={dropdownRef}>
          <button
            className="material-dropdown-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ '--material-color': BUTTON_COLORS[tool] } as React.CSSProperties}
          >
            <span className="material-dot" style={{ background: BUTTON_COLORS[tool] }} />
            <span>{tool}</span>
            <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="currentColor" style={{ transform: dropdownOpen ? 'rotate(180deg)' : undefined }}>
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="material-dropdown-menu">
              {materials.map((m) => (
                <button
                  key={m}
                  className={`material-dropdown-item ${tool === m ? 'active' : ''}`}
                  onClick={() => { if (m !== 'erase') lastMaterialRef.current = m as Material; setTool(m); setDropdownOpen(false) }}
                >
                  <span className="material-dot" style={{ background: BUTTON_COLORS[m] }} />
                  <span>{m}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
