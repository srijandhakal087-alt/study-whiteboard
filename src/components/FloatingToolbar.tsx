import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eye,
  EyeOff,
  FileImage,
  FileText,
  FolderOpen,
  Focus,
  Gauge,
  Home,
  ImagePlus,
  Minus,
  PaintBucket,
  Pause,
  Play,
  Plus,
  RectangleHorizontal,
  Redo2,
  Ruler,
  Settings,
  Timer,
  Undo2,
  Trash2,
  Copy,
  X,
} from 'lucide-react'
import {
  DefaultColorStyle,
  DefaultFillStyle,
  DefaultSizeStyle,
  GeoShapeGeoStyle,
  createShapeId,
  toRichText,
  useEditor,
  useValue,
  type TLDefaultColorStyle,
  type TLDefaultSizeStyle,
} from 'tldraw'
import { exportBoard } from '../export/exportBoard'
import { exportAnnotatedPdf, getPdfPageIds, importPdf } from '../pdf/pdfTools'
import { useWhiteboardUi } from './WhiteboardUiContext'

const backgroundColors = ['#fff0a8', '#f8e1cf', '#f3d6d6', '#ded2ed', '#d4ebf5', '#e8f2d2', '#ffffff', '#f5f5f5', '#dedede', '#202020']
const backgroundPatterns = [
  ['solid', 'Solid'], ['dot', 'Dot'], ['square', 'Square'], ['graph', 'Graph'], ['hybrid', 'Hybrid'],
  ['diamond', 'Diamond'], ['wide-rule', 'Wide rule'], ['triangle', 'Triangle'], ['narrow-rule', 'Narrow rule'],
  ['notebook-page', 'Notebook page'],
] as const

const penColors: Array<{ name: string; value: TLDefaultColorStyle; hex: string }> = [
  { name: 'Black', value: 'black', hex: '#1f2328' },
  { name: 'Blue', value: 'blue', hex: '#2563eb' },
  { name: 'Red', value: 'red', hex: '#dc3f45' },
  { name: 'Green', value: 'green', hex: '#16835a' },
]

const highlighterColors: Array<{ name: string; value: TLDefaultColorStyle; hex: string }> = [
  { name: 'Yellow', value: 'yellow', hex: '#f5e84d' },
  { name: 'Blue', value: 'light-blue', hex: '#78c7f0' },
  { name: 'Pink', value: 'light-red', hex: '#f3a5b5' },
  { name: 'Green', value: 'light-green', hex: '#9bd7a5' },
]

const expandedPenColors: Array<{ id: string; name: string; value: TLDefaultColorStyle; fill: string }> = [
  { id: 'black', name: 'Black', value: 'black', fill: '#202124' },
  { id: 'yellow', name: 'Yellow', value: 'yellow', fill: '#ffd54f' },
  { id: 'amber', name: 'Amber', value: 'orange', fill: '#f5b63f' },
  { id: 'orange', name: 'Orange', value: 'orange', fill: '#df6f32' },
  { id: 'red', name: 'Red', value: 'red', fill: '#d43732' },
  { id: 'crimson', name: 'Crimson', value: 'light-red', fill: '#b32450' },
  { id: 'magenta', name: 'Magenta', value: 'light-violet', fill: '#bc2f78' },
  { id: 'purple', name: 'Purple', value: 'violet', fill: '#573a91' },
  { id: 'violet', name: 'Violet', value: 'light-violet', fill: '#8250b6' },
  { id: 'sky', name: 'Sky blue', value: 'light-blue', fill: '#68bee9' },
  { id: 'blue', name: 'Blue', value: 'blue', fill: '#3d6dbd' },
  { id: 'lime', name: 'Lime', value: 'light-green', fill: '#8bc133' },
  { id: 'green', name: 'Green', value: 'green', fill: '#4da260' },
  { id: 'gray', name: 'Light gray', value: 'grey', fill: '#eeeeee' },
  { id: 'rainbow', name: 'Rainbow', value: 'yellow', fill: 'conic-gradient(#e94b45, #f2d64b, #55a66b, #4f87d7, #8b55ad, #e94b45)' },
  { id: 'galaxy', name: 'Galaxy', value: 'violet', fill: 'radial-gradient(circle at 68% 24%, #fff 0 2%, transparent 3%), radial-gradient(circle at 28% 66%, #8ad7ed 0 3%, transparent 4%), linear-gradient(135deg, #19345f, #833b91 48%, #24a4a5)' },
]

type InkPreset = { color: TLDefaultColorStyle; colorId: string; fill: string }
type PenThicknessPreset = { size: TLDefaultSizeStyle; scale: number }

const initialPenPresets: InkPreset[] = [
  { color: 'black', colorId: 'black', fill: '#202124' },
  { color: 'red', colorId: 'red', fill: '#d43732' },
  { color: 'blue', colorId: 'galaxy', fill: expandedPenColors.find((option) => option.id === 'galaxy')!.fill },
]

const initialHighlighterPreset: InkPreset = { color: 'yellow', colorId: 'yellow', fill: '#f5e84d' }

const sizes: Array<{ name: string; value: TLDefaultSizeStyle; width: number; scale: number }> = [
  { name: 'Hairline', value: 's', width: 1, scale: 0.35 },
  { name: 'Extra fine', value: 's', width: 1.5, scale: 0.55 },
  { name: 'Fine', value: 's', width: 2, scale: 0.75 },
  { name: 'Thin', value: 's', width: 2.5, scale: 1 },
  { name: 'Medium', value: 'm', width: 4, scale: 1 },
  { name: 'Thick', value: 'l', width: 7, scale: 1 },
  { name: 'Extra thick', value: 'xl', width: 11, scale: 1 },
]

const PEN_THICKNESS_STORAGE_KEY = 'study-whiteboard:pen-thicknesses:v1'
const defaultPenThicknesses: PenThicknessPreset[] = [
  { size: 'm', scale: 1 },
  { size: 'm', scale: 1 },
  { size: 'm', scale: 1 },
]

function loadPenThicknesses(): PenThicknessPreset[] {
  try {
    const stored = JSON.parse(localStorage.getItem(PEN_THICKNESS_STORAGE_KEY) ?? '[]') as unknown[]
    return defaultPenThicknesses.map((fallback, index) => {
      const candidate = stored[index] as Partial<PenThicknessPreset> | undefined
      const valid = candidate && sizes.some((option) => option.value === candidate.size && option.scale === candidate.scale)
      return valid ? { size: candidate.size!, scale: candidate.scale! } : { ...fallback }
    })
  } catch {
    return defaultPenThicknesses.map((preset) => ({ ...preset }))
  }
}

function savePenThicknesses(presets: PenThicknessPreset[]) {
  try {
    localStorage.setItem(PEN_THICKNESS_STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // Keep the in-memory presets usable if browser storage is unavailable.
  }
}

export function FloatingToolbar() {
  const editor = useEditor()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const didInitializePenThickness = useRef(false)
  const { background, boardName, eraserMode, inkScale, openBoardManager, pressureEnabled, saveStatus, setBackground, setEraserMode, setInkColor, setInkScale, setPressureEnabled } = useWhiteboardUi()
  const activeTool = useValue('active tool', () => editor.getCurrentToolId(), [editor])
  const canUndo = useValue('can undo', () => editor.getCanUndo(), [editor])
  const canRedo = useValue('can redo', () => editor.getCanRedo(), [editor])
  const zoom = useValue('zoom level', () => editor.getZoomLevel(), [editor])
  const selectedIds = useValue('selected shapes', () => editor.getSelectedShapeIds(), [editor])
  const pdfPageIds = useValue('pdf pages', () => getPdfPageIds(editor), [editor])
  const [inkMode, setInkMode] = useState<'draw' | 'highlight'>('draw')
  const [color, setColor] = useState<TLDefaultColorStyle>('black')
  const [selectedColorId, setSelectedColorId] = useState('black')
  const [activePenIndex, setActivePenIndex] = useState(0)
  const [hoveredPenIndex, setHoveredPenIndex] = useState<number | null>(null)
  const [penPresets, setPenPresets] = useState<InkPreset[]>(initialPenPresets)
  const [penThicknesses, setPenThicknesses] = useState<PenThicknessPreset[]>(loadPenThicknesses)
  const [highlighterPreset, setHighlighterPreset] = useState<InkPreset>(initialHighlighterPreset)
  const [size, setSize] = useState<TLDefaultSizeStyle>(penThicknesses[0].size)
  const [opacity, setOpacity] = useState(100)
  const [isInkPanelOpen, setInkPanelOpen] = useState(false)
  const [isToolbarVisible, setToolbarVisible] = useState(true)
  const [isPenSettingsOpen, setPenSettingsOpen] = useState(false)
  const [isEraserPanelOpen, setEraserPanelOpen] = useState(false)
  const [isShapesOpen, setShapesOpen] = useState(false)
  const [isReactionsOpen, setReactionsOpen] = useState(false)
  const [isMoreOpen, setMoreOpen] = useState(false)
  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [isBackgroundOpen, setBackgroundOpen] = useState(false)
  const [isRulerVisible, setRulerVisible] = useState(false)
  const [isFocusMode, setFocusMode] = useState(false)
  const [isTimerOpen, setTimerOpen] = useState(false)
  const [isTimerRunning, setTimerRunning] = useState(false)
  const [timerBaseSeconds, setTimerBaseSeconds] = useState(5 * 60)
  const [timerSeconds, setTimerSeconds] = useState(5 * 60)
  const [pdfPage, setPdfPage] = useState(0)
  const [pdfStatus, setPdfStatus] = useState('')
  const [rulerAngle, setRulerAngle] = useState(0)
  const [rulerPosition, setRulerPosition] = useState(() => ({
    x: typeof window === 'undefined' ? 500 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 350 : window.innerHeight * 0.47,
  }))

  useEffect(() => {
    if (!isTimerRunning) return
    const interval = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [isTimerRunning])

  const adjustTimer = (minutes: number) => {
    const delta = minutes * 60
    setTimerBaseSeconds((current) => Math.max(60, Math.min(60 * 60, current + delta)))
    setTimerSeconds((current) => Math.max(60, Math.min(60 * 60, current + delta)))
  }

  const resetTimer = () => {
    setTimerRunning(false)
    setTimerSeconds(timerBaseSeconds)
  }

  const timerLabel = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`

  useEffect(() => {
    if (didInitializePenThickness.current) return
    didInitializePenThickness.current = true
    const initialThickness = penThicknesses[0]
    setInkScale(initialThickness.scale)
    editor.setStyleForNextShapes(DefaultSizeStyle, initialThickness.size)
  }, [editor, penThicknesses, setInkScale])

  useEffect(() => {
    const container = editor.getContainer()
    const ownerDocument = container.ownerDocument
    const ownerWindow = ownerDocument.defaultView ?? window
    let lastEmptyRightPress: { at: number; x: number; y: number; pointerType: string } | null = null
    let spacePreviousTool: string | null = null
    let suppressShortcutContextMenu = false

    const showEraser = () => {
      editor.setCurrentTool('eraser')
      setToolbarVisible(true)
      setInkPanelOpen(true)
      setPenSettingsOpen(false)
      setEraserPanelOpen(false)
      setShapesOpen(false)
      setReactionsOpen(false)
      setMoreOpen(false)
    }

    const activateEraserOnDoubleRightPress = (event: PointerEvent) => {
      if (event.button !== 2 || !event.isPrimary) {
        lastEmptyRightPress = null
        return
      }

      const target = event.target
      if (!(target instanceof HTMLElement)) return
      const isUiTarget = Boolean(target.closest('button, input, aside, .floating-toolbar, .ink-panel, .undo-pod, .zoom-pod, .board-title-pill, .canvas-ruler, .selection-actions, .pdf-navigation'))
      if (isUiTarget) {
        lastEmptyRightPress = null
        return
      }

      const previous = lastEmptyRightPress
      const isDoublePress = Boolean(
        previous &&
        previous.pointerType === event.pointerType &&
        event.timeStamp - previous.at <= 360 &&
        Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 14,
      )

      if (isDoublePress) {
        lastEmptyRightPress = null
        suppressShortcutContextMenu = true
        showEraser()
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }

      const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY })
      const isEmptyCanvas = editor.getShapesAtPoint(pagePoint, { hitInside: true, margin: 4 / editor.getZoomLevel() }).length === 0
      lastEmptyRightPress = isEmptyCanvas
        ? { at: event.timeStamp, x: event.clientX, y: event.clientY, pointerType: event.pointerType }
        : null
    }

    const preventShortcutMenu = (event: MouseEvent) => {
      if (!suppressShortcutContextMenu) return
      suppressShortcutContextMenu = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const activateTemporarySpaceEraser = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || spacePreviousTool !== null) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, select, button, [contenteditable="true"]')) return
      spacePreviousTool = editor.getCurrentToolId()
      showEraser()
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const restoreToolAfterSpace = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      if (spacePreviousTool === null) return
      const previousTool = spacePreviousTool
      spacePreviousTool = null
      editor.setCurrentTool(previousTool)
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const restoreToolAfterWindowBlur = () => {
      if (spacePreviousTool === null) return
      const previousTool = spacePreviousTool
      spacePreviousTool = null
      editor.setCurrentTool(previousTool)
    }

    ownerDocument.addEventListener('pointerdown', activateEraserOnDoubleRightPress, true)
    ownerDocument.addEventListener('contextmenu', preventShortcutMenu, true)
    ownerDocument.addEventListener('keydown', activateTemporarySpaceEraser, true)
    ownerDocument.addEventListener('keyup', restoreToolAfterSpace, true)
    ownerWindow.addEventListener('blur', restoreToolAfterWindowBlur)
    return () => {
      ownerDocument.removeEventListener('pointerdown', activateEraserOnDoubleRightPress, true)
      ownerDocument.removeEventListener('contextmenu', preventShortcutMenu, true)
      ownerDocument.removeEventListener('keydown', activateTemporarySpaceEraser, true)
      ownerDocument.removeEventListener('keyup', restoreToolAfterSpace, true)
      ownerWindow.removeEventListener('blur', restoreToolAfterWindowBlur)
    }
  }, [editor])

  const chooseInk = (mode: 'draw' | 'highlight') => {
    const preset = mode === 'highlight' ? highlighterPreset : penPresets[activePenIndex]
    const thickness = mode === 'draw' ? penThicknesses[activePenIndex] : { size, scale: inkScale }
    const nextColor = preset.color
    setInkMode(mode)
    setColor(nextColor)
    setSelectedColorId(preset.colorId)
    setSize(thickness.size)
    setInkColor(nextColor)
    setInkScale(thickness.scale)
    editor.setStyleForNextShapes(DefaultColorStyle, nextColor)
    editor.setStyleForNextShapes(DefaultSizeStyle, mode === 'highlight' && thickness.size === 's' ? 'l' : thickness.size)
    editor.setCurrentTool(mode)
    setInkPanelOpen(true)
    setPenSettingsOpen(false)
    setEraserPanelOpen(false)
    setShapesOpen(false)
    setReactionsOpen(false)
    setMoreOpen(false)
  }

  const chooseColor = (nextColor: TLDefaultColorStyle, colorId: string = nextColor) => {
    const presetOption = expandedPenColors.find((option) => option.id === colorId)
      ?? [...penColors, ...highlighterColors].map((option) => ({ ...option, id: option.value, fill: option.hex })).find((option) => option.id === colorId)
    const nextPreset = { color: nextColor, colorId, fill: presetOption?.fill ?? '#202124' }
    setColor(nextColor)
    setSelectedColorId(colorId)
    if (inkMode === 'draw') {
      setPenPresets((current) => current.map((preset, index) => index === activePenIndex ? nextPreset : preset))
    } else {
      setHighlighterPreset(nextPreset)
    }
    setInkColor(nextColor)
    editor.setStyleForNextShapes(DefaultColorStyle, nextColor)
    editor.setStyleForSelectedShapes(DefaultColorStyle, nextColor)
    editor.setCurrentTool(inkMode)
    setEraserPanelOpen(false)
  }

  const chooseOpacity = (nextOpacity: number) => {
    const boundedOpacity = Math.max(1, Math.min(100, nextOpacity))
    setOpacity(boundedOpacity)
    editor.setOpacityForNextShapes(boundedOpacity / 100)
    editor.setOpacityForSelectedShapes(boundedOpacity / 100)
    editor.setCurrentTool(inkMode)
  }

  const chooseSize = (nextSize: TLDefaultSizeStyle, nextScale: number) => {
    setSize(nextSize)
    if (inkMode === 'draw') {
      setPenThicknesses((current) => {
        const next = current.map((preset, index) => index === activePenIndex ? { size: nextSize, scale: nextScale } : preset)
        savePenThicknesses(next)
        return next
      })
    }
    setInkScale(nextScale)
    editor.setStyleForNextShapes(DefaultSizeStyle, nextSize)
    editor.setStyleForSelectedShapes(DefaultSizeStyle, nextSize)
    editor.updateShapes(editor.getSelectedShapes()
      .filter((shape) => shape.type === 'draw' || shape.type === 'highlight')
      .map((shape) => ({ id: shape.id, type: shape.type, props: { scale: nextScale } })) as never)
    editor.setCurrentTool(inkMode)
    setEraserPanelOpen(false)
  }

  const chooseSimpleTool = (toolId: string) => {
    editor.setCurrentTool(toolId)
    setInkPanelOpen(false)
    setPenSettingsOpen(false)
    setShapesOpen(false)
    setReactionsOpen(false)
    setMoreOpen(false)
    if (toolId !== 'eraser') setEraserPanelOpen(false)
  }

  const chooseEraser = (mode: 'partial' | 'stroke') => {
    setEraserMode(mode)
    editor.setCurrentTool('eraser')
    setPenSettingsOpen(false)
    setEraserPanelOpen(false)
  }

  const chooseGeo = (geo: 'ellipse' | 'rectangle') => {
    editor.setStyleForNextShapes(GeoShapeGeoStyle, geo)
    editor.setStyleForNextShapes(DefaultFillStyle, 'none')
    editor.setCurrentTool('geo')
    setShapesOpen(false)
  }

  const insertReaction = (emoji: string) => {
    const center = editor.getViewportPageBounds().center
    const id = createShapeId()
    editor.markHistoryStoppingPoint('add reaction')
    editor.createShape({
      id,
      type: 'text',
      x: center.x - 40,
      y: center.y - 40,
      props: { richText: toRichText(emoji), size: 'xl', autoSize: true, w: 80, textAlign: 'middle' },
    })
    editor.select(id)
    editor.setCurrentTool('select')
    setReactionsOpen(false)
  }

  const startRulerRotation = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (event.shiftKey) {
      const startX = event.clientX
      const startY = event.clientY
      const startPosition = rulerPosition
      const handleMove = (moveEvent: PointerEvent) => {
        setRulerPosition({
          x: startPosition.x + moveEvent.clientX - startX,
          y: startPosition.y + moveEvent.clientY - startY,
        })
      }
      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
        window.removeEventListener('pointercancel', handleUp)
      }
      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointercancel', handleUp)
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const centerX = bounds.left + bounds.width / 2
    const centerY = bounds.top + bounds.height / 2
    const startPointerAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI
    const startRulerAngle = rulerAngle
    const handleMove = (moveEvent: PointerEvent) => {
      const pointerAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * 180 / Math.PI
      const delta = ((pointerAngle - startPointerAngle + 540) % 360) - 180
      setRulerAngle(Math.round(startRulerAngle + delta))
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }

  const applyPenPreset = (index: number) => {
    const preset = penPresets[index]
    const thickness = penThicknesses[index]
    const isAlreadySelected = activeTool === 'draw' && inkMode === 'draw' && activePenIndex === index
    setActivePenIndex(index)
    setInkMode('draw')
    setColor(preset.color)
    setSelectedColorId(preset.colorId)
    setSize(thickness.size)
    setInkColor(preset.color)
    setInkScale(thickness.scale)
    editor.setStyleForNextShapes(DefaultColorStyle, preset.color)
    editor.setStyleForNextShapes(DefaultSizeStyle, thickness.size)
    editor.setCurrentTool('draw')
    setInkPanelOpen(true)
    setPenSettingsOpen(isAlreadySelected)
    setEraserPanelOpen(false)
    setShapesOpen(false)
    setReactionsOpen(false)
    setMoreOpen(false)
  }

  const applyHighlighterPreset = () => {
    const isAlreadySelected = activeTool === 'highlight' && inkMode === 'highlight'
    setInkMode('highlight')
    setColor(highlighterPreset.color)
    setSelectedColorId(highlighterPreset.colorId)
    setInkColor(highlighterPreset.color)
    setInkScale(1)
    editor.setStyleForNextShapes(DefaultColorStyle, highlighterPreset.color)
    editor.setStyleForNextShapes(DefaultSizeStyle, size === 's' ? 'l' : size)
    editor.setCurrentTool('highlight')
    setInkPanelOpen(true)
    setPenSettingsOpen(isAlreadySelected)
    setEraserPanelOpen(false)
    setShapesOpen(false)
    setReactionsOpen(false)
    setMoreOpen(false)
  }

  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    editor.markHistoryStoppingPoint('add image')
    void editor.putExternalContent({ type: 'files', files, point: editor.getViewportPageBounds().center })
    event.target.value = ''
    setMoreOpen(false)
  }

  const addPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setMoreOpen(false)
    setPdfStatus('Opening PDF…')
    try {
      await importPdf(editor, file, setPdfStatus)
      setPdfPage(0)
      setPdfStatus('')
    } catch (error) {
      setPdfStatus(`PDF import failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    event.target.value = ''
  }

  const goToPdfPage = (nextPage: number) => {
    const bounded = Math.max(0, Math.min(nextPage, pdfPageIds.length - 1))
    const bounds = editor.getShapePageBounds(pdfPageIds[bounded])
    if (bounds) editor.zoomToBounds(bounds, { inset: 72, animation: { duration: 220 } })
    setPdfPage(bounded)
  }

  const toggleFocusMode = () => {
    const next = !isFocusMode
    setFocusMode(next)
    editor.getContainer().classList.toggle('focus-mode', next)
    setMoreOpen(false)
  }

  const toggleToolbarVisibility = () => {
    setToolbarVisible((visible) => {
      if (visible) {
        setInkPanelOpen(false)
        setPenSettingsOpen(false)
        setEraserPanelOpen(false)
        setShapesOpen(false)
        setReactionsOpen(false)
        setMoreOpen(false)
      }
      return !visible
    })
  }

  return (
    <>
      <input ref={imageInputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={addImages} />
      <input ref={pdfInputRef} className="visually-hidden" type="file" accept="application/pdf" onChange={addPdf} />
      {pdfStatus && <div className="save-toast" role="status">{pdfStatus}</div>}
      {isFocusMode && <button className="focus-exit" type="button" onClick={toggleFocusMode}>Exit focus mode</button>}
      <header className="whiteboard-topbar">
      <button className="board-title-pill" type="button" onClick={openBoardManager} title="Open board manager">
        <Home className="board-home-icon" size={21} />
        <span className="board-title-divider" aria-hidden="true" />
        <strong>{boardName}</strong>
        <ChevronDown className="board-title-chevron" size={20} />
        <small>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved'}</small>
      </button>

      <div className="top-right-controls">
        <div className="timer-anchor">
          <button className="timer-toggle" data-active={isTimerOpen || isTimerRunning} type="button" aria-label="Timer" title="Timer" onClick={() => { setTimerOpen((value) => !value); setSettingsOpen(false) }}>
            <Timer size={20} />
            {isTimerRunning && <span>{timerLabel}</span>}
          </button>
          {isTimerOpen && (
            <div className="timer-panel" role="dialog" aria-label="Countdown timer">
              <div className="timer-face" data-finished={timerSeconds === 0}><strong>{timerLabel}</strong></div>
              <div className="timer-controls">
                <button type="button" aria-label="Reset timer" title="Reset" onClick={resetTimer}>■</button>
                <button type="button" aria-label="Subtract one minute" title="Subtract one minute" onClick={() => adjustTimer(-1)}><Minus size={20} /></button>
                <button type="button" aria-label="Add one minute" title="Add one minute" onClick={() => adjustTimer(1)}><Plus size={20} /></button>
                <button className="timer-play" type="button" aria-label={isTimerRunning ? 'Pause timer' : 'Start timer'} onClick={() => { if (timerSeconds === 0) setTimerSeconds(timerBaseSeconds); setTimerRunning((value) => !value) }}>
                  {isTimerRunning ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="settings-anchor">
          <button className="settings-toggle" data-active={isSettingsOpen} type="button" aria-label="Settings" title="Settings" onClick={() => { setSettingsOpen((value) => !value); setTimerOpen(false) }}>
            <Settings size={21} />
          </button>
          {isSettingsOpen && (
            <div className="mini-popover settings-popover" role="menu" aria-label="Settings menu">
              <button type="button" onClick={() => { setBackgroundOpen(true); setSettingsOpen(false) }}><PaintBucket size={18} /> Format background</button>
              <button type="button" onClick={() => { void exportBoard(editor, boardName, 'pdf'); setSettingsOpen(false) }}><FileText size={18} /> Export as PDF</button>
              <button className="settings-pressure-toggle" type="button" role="menuitemcheckbox" aria-checked={pressureEnabled} onClick={() => setPressureEnabled(!pressureEnabled)}>
                <Gauge size={18} />
                <span className="settings-pressure-label">Pen pressure</span>
                <span className="settings-pressure-switch" data-active={pressureEnabled} aria-hidden="true"><i /></span>
              </button>
            </div>
          )}
        </div>
      </div>
      </header>

      {isRulerVisible && (
        <div
          className="canvas-ruler"
          style={{ left: rulerPosition.x, top: rulerPosition.y, transform: `translate(-50%, -50%) rotate(${rulerAngle}deg)` }}
          onPointerDown={startRulerRotation}
          title="Left-drag to rotate in 1° steps; Shift+left-drag to move"
          role="group"
          aria-label="Movable ruler guide"
        >
          <div className="ruler-marks" aria-hidden="true" />
          <span className="ruler-angle">{rulerAngle}°</span>
          <div className="ruler-actions">
            <button type="button" aria-label="Rotate ruler left" onClick={() => setRulerAngle((value) => value - 1)}>−</button>
            <button type="button" aria-label="Rotate ruler right" onClick={() => setRulerAngle((value) => value + 1)}>+</button>
            <button type="button" aria-label="Hide ruler" onClick={() => setRulerVisible(false)}><X size={14} /></button>
          </div>
        </div>
      )}

      {isBackgroundOpen && (
        <aside className="background-panel" aria-label="Format background">
          <header>
            <div>
              <p>CANVAS</p>
              <h2>Format background</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Close background settings" onClick={() => setBackgroundOpen(false)}><X size={22} /></button>
          </header>
          <h3>Color</h3>
          <div className="background-colors">
            {backgroundColors.map((colorValue) => (
              <button
                key={colorValue}
                type="button"
                aria-label={`Background color ${colorValue}`}
                data-active={background.color === colorValue}
                onClick={() => setBackground({ ...background, color: colorValue })}
              ><span style={{ background: colorValue }} /></button>
            ))}
          </div>
          <h3>Grid</h3>
          <div className="background-patterns">
            {backgroundPatterns.map(([pattern, label]) => (
              <button
                key={pattern}
                type="button"
                data-active={background.pattern === pattern}
                onClick={() => setBackground({ ...background, pattern })}
              >
                <span className="pattern-preview" data-pattern={pattern} style={{ backgroundColor: background.color }} />
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="undo-pod" role="group" aria-label="History">
        <button className="tool-button" type="button" aria-label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => editor.undo()}>
          <Undo2 size={23} />
        </button>
        <button className="tool-button" type="button" aria-label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => editor.redo()}>
          <Redo2 size={21} />
        </button>
      </div>

      {isToolbarVisible && isInkPanelOpen && (
        <div className="ink-panel ink-panel--ms" role="toolbar" aria-label="Ink settings">
          <div className="ink-toolbar-surface">
            {penPresets.map((preset, index) => (
              <button
                className="ink-visual-button ink-visual-button--pen"
                data-active={activeTool === 'draw' && activePenIndex === index}
                data-hovered={hoveredPenIndex === index}
                key={index}
                type="button"
                title={`Pen ${index + 1}`}
                aria-label={`Pen ${index + 1} settings`}
                onPointerEnter={() => setHoveredPenIndex(index)}
                onPointerLeave={() => setHoveredPenIndex((current) => current === index ? null : current)}
                onClick={() => applyPenPreset(index)}
              >
                <span className="ink-pen-visual" style={{ '--ink-color': preset.fill } as CSSProperties} aria-hidden="true">
                  <span className="ink-pen-tip" />
                  <span className="ink-pen-body"><span className="ink-pen-grip" /></span>
                </span>
              </button>
            ))}
            <button className="ink-visual-button" data-active={activeTool === 'highlight'} type="button" title="Highlighter" aria-label="Highlighter settings" onClick={applyHighlighterPreset}>
              <span className="ink-highlighter-visual" style={{ '--ink-color': highlighterPreset.fill } as CSSProperties} aria-hidden="true"><span /></span>
            </button>
            <button className="ink-visual-button" data-active={activeTool === 'eraser'} type="button" aria-label="Eraser options" title="Eraser" onClick={() => { editor.setCurrentTool('eraser'); setPenSettingsOpen(false); setEraserPanelOpen((value) => !value) }}>
              <span className="ink-eraser-visual" aria-hidden="true"><span /></span>
            </button>
            <button className="ink-visual-button ink-visual-button--ruler" data-active={isRulerVisible} type="button" aria-label="Ruler" title="Ruler guide" onClick={() => setRulerVisible((value) => !value)}>
              <span className="ink-ruler-visual" aria-hidden="true" />
            </button>
            <button className="ink-visual-button ink-visual-button--lasso" type="button" aria-label="Lasso select" title="Lasso select" onClick={() => chooseSimpleTool('select')}>
              <span className="ink-lasso-visual" aria-hidden="true" />
            </button>
            <button className="ink-visual-button ink-visual-button--close" type="button" aria-label="Close ink settings" onClick={() => setInkPanelOpen(false)}><X size={40} strokeWidth={1.6} /></button>
          </div>
          {isPenSettingsOpen && (
            <div className="pen-settings-popover" role="dialog" aria-label={`${inkMode === 'highlight' ? 'Highlighter' : 'Pen'} settings`}>
              <div className="pen-control-row">
                <input
                  className="pen-range pen-range--thickness"
                  type="range"
                  min="0"
                  max={sizes.length - 1}
                  step="1"
                  value={Math.max(0, sizes.findIndex((option) => option.value === size && option.scale === inkScale))}
                  aria-label="Pen thickness"
                  onChange={(event) => {
                    const option = sizes[Number(event.target.value)]
                    chooseSize(option.value, option.scale)
                  }}
                />
                <output aria-label="Current pen thickness">{Math.max(1, Math.round(sizes[Math.max(0, sizes.findIndex((option) => option.value === size && option.scale === inkScale))].width))}</output>
              </div>
              <div className="pen-control-row">
                <input
                  className="pen-range pen-range--opacity"
                  type="range"
                  min="1"
                  max="100"
                  value={opacity}
                  aria-label="Pen opacity"
                  onChange={(event) => chooseOpacity(Number(event.target.value))}
                />
                <input className="pen-number" type="number" min="1" max="100" value={opacity} aria-label="Pen opacity percentage" onChange={(event) => chooseOpacity(Number(event.target.value))} />
              </div>

              <div className="pen-favorite-colors" aria-label="Favorite ink colors">
                <button className="pen-add-color" type="button" title="More colors" aria-label="More colors"><Plus size={22} /></button>
                {(inkMode === 'highlight' ? highlighterColors.slice(0, 3) : penColors.filter((option) => option.value !== 'blue')).map((option) => (
                  <button
                    className="pen-color-swatch"
                    data-active={color === option.value}
                    key={option.value}
                    type="button"
                    title={option.name}
                    aria-label={option.name}
                    onClick={() => chooseColor(option.value, option.value)}
                  >
                    <span style={{ background: option.hex }} />
                  </button>
                ))}
              </div>

              <div className="pen-palette-grid" aria-label="Ink color palette">
                {expandedPenColors.map((option) => (
                  <button
                    className="pen-color-swatch"
                    data-active={selectedColorId === option.id}
                    key={option.id}
                    type="button"
                    title={option.name}
                    aria-label={option.name}
                    onClick={() => chooseColor(option.value, option.id)}
                  >
                    <span style={{ background: option.fill }} />
                  </button>
                ))}
              </div>

              <div className="pen-ending-options" aria-label="Ink ending style">
                <button className="pen-ending-option" data-active="true" type="button" title="Regular ink" aria-label="Regular ink">⊘</button>
                <button className="pen-ending-option" type="button" title="Single arrow" aria-label="Single arrow">↗</button>
                <button className="pen-ending-option" type="button" title="Double arrow" aria-label="Double arrow">↙↗</button>
              </div>
            </div>
          )}
          {isEraserPanelOpen && (
            <div className="mini-popover eraser-popover ms-eraser-popover" role="menu" aria-label="Eraser mode">
              <button type="button" data-active={eraserMode === 'partial'} onClick={() => chooseEraser('partial')}><span className="eraser-check" aria-hidden="true">✓</span>Erase partial stroke</button>
              <button type="button" data-active={eraserMode === 'stroke'} onClick={() => chooseEraser('stroke')}><span className="eraser-check" aria-hidden="true">✓</span>Erase entire stroke</button>
            </div>
          )}
        </div>
      )}

      {isToolbarVisible && <div className="floating-toolbar floating-toolbar--ms-main" role="toolbar" aria-label="Whiteboard tools">
        <div
          className="ms-main-toolbar-art"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}ms-main-toolbar.png)` }}
          aria-hidden="true"
        />
        <button className="ms-main-hit ms-main-hit--select" type="button" aria-label="Select" onClick={() => chooseSimpleTool('select')} />
        <button className="ms-main-hit ms-main-hit--hand" type="button" aria-label="Pan canvas" onClick={() => chooseSimpleTool('hand')} />
        <button className="ms-main-hit ms-main-hit--ink" type="button" aria-label="Ink tools" onClick={() => {
          if (activeTool === 'draw' || activeTool === 'highlight') {
            setInkPanelOpen((value) => !value)
            setPenSettingsOpen(false)
          } else chooseInk('draw')
        }} />
        <button className="ms-main-hit ms-main-hit--note" type="button" aria-label="Sticky note" onClick={() => chooseSimpleTool('note')} />
        <button className="ms-main-hit ms-main-hit--reactions" type="button" aria-label="Reactions" onClick={() => { setReactionsOpen((value) => !value); setShapesOpen(false); setMoreOpen(false) }} />
        {isReactionsOpen && (
          <div className="mini-popover reactions-popover ms-main-reactions" role="menu" aria-label="Add reaction">
            {['❤️', '👍', '😂', '⭐', '🎉', '❓'].map((emoji) => (
              <button key={emoji} type="button" aria-label={`Add ${emoji} reaction`} onClick={() => insertReaction(emoji)}>{emoji}</button>
            ))}
          </div>
        )}
        <button className="ms-main-hit ms-main-hit--text" type="button" aria-label="Text" onClick={() => chooseSimpleTool('text')} />
        <button className="ms-main-hit ms-main-hit--shapes" type="button" aria-label="Shapes" onClick={() => { setShapesOpen((value) => !value); setReactionsOpen(false); setMoreOpen(false) }} />
        {isShapesOpen && (
          <div className="mini-popover shapes-popover ms-main-shapes" role="menu">
            <button type="button" onClick={() => chooseGeo('rectangle')}><RectangleHorizontal size={20} /> Rectangle</button>
            <button type="button" onClick={() => chooseGeo('ellipse')}><Circle size={20} /> Ellipse</button>
            <button type="button" onClick={() => chooseSimpleTool('arrow')}><ArrowUpRight size={20} /> Arrow</button>
          </div>
        )}
        <button className="ms-main-hit ms-main-hit--boards" type="button" aria-label="Boards" onClick={openBoardManager} />
        <button className="ms-main-hit ms-main-hit--more" type="button" aria-label="More options" onClick={() => { setMoreOpen((value) => !value); setShapesOpen(false); setReactionsOpen(false) }} />
        {isMoreOpen && (
          <div className="mini-popover more-popover ms-main-more" role="menu">
            <button type="button" onClick={openBoardManager}><FolderOpen size={18} /> Boards</button>
            <button type="button" onClick={() => imageInputRef.current?.click()}><ImagePlus size={18} /> Add image from device</button>
            <button type="button" onClick={() => pdfInputRef.current?.click()}><BookOpen size={18} /> Import PDF</button>
            <button type="button" onClick={() => { void exportBoard(editor, boardName, 'png'); setMoreOpen(false) }}><FileImage size={18} /> Export visible area as PNG</button>
            {pdfPageIds.length > 0 && <button type="button" onClick={() => { void exportAnnotatedPdf(editor, boardName, pdfPageIds); setMoreOpen(false) }}><FileText size={18} /> Export annotated PDF</button>}
            <button type="button" onClick={() => setRulerVisible((value) => !value)}><Ruler size={18} /> {isRulerVisible ? 'Hide ruler' : 'Show ruler'}</button>
            <button type="button" onClick={toggleFocusMode}><Focus size={18} /> Focus mode</button>
            <span><Download size={16} /> Files save to Downloads</span>
          </div>
        )}
      </div>}

      {selectedIds.length > 0 && (
        <div className="selection-actions" role="toolbar" aria-label="Selection actions">
          <button type="button" onClick={() => editor.duplicateShapes(selectedIds, { x: 24, y: 24 })}><Copy size={16} /> Duplicate</button>
          <button type="button" onClick={() => editor.deleteShapes(selectedIds)}><Trash2 size={16} /> Delete</button>
          <span>Ctrl+C / Ctrl+V to copy and paste</span>
        </div>
      )}

      {pdfPageIds.length > 0 && (
        <div className="pdf-navigation" role="group" aria-label="PDF page navigation">
          <button type="button" aria-label="Previous PDF page" disabled={pdfPage <= 0} onClick={() => goToPdfPage(pdfPage - 1)}><ChevronLeft size={17} /></button>
          <span>Page {Math.min(pdfPage + 1, pdfPageIds.length)} of {pdfPageIds.length}</span>
          <button type="button" aria-label="Next PDF page" disabled={pdfPage >= pdfPageIds.length - 1} onClick={() => goToPdfPage(pdfPage + 1)}><ChevronRight size={17} /></button>
        </div>
      )}

      <div className="zoom-pod" role="group" aria-label="Zoom controls">
        <button className="toolbar-visibility-toggle" type="button" aria-label={isToolbarVisible ? 'Hide tools toolbar' : 'Show tools toolbar'} title={isToolbarVisible ? 'Hide tools for screenshot' : 'Show tools'} onClick={toggleToolbarVisibility}>
          {isToolbarVisible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => editor.zoomOut(editor.getViewportScreenCenter(), { animation: { duration: 140 } })}>
          <Minus size={18} />
        </button>
        <button className="zoom-value" type="button" aria-label="Reset zoom" title="Reset to 100%" onClick={() => editor.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 160 } })}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" onClick={() => editor.zoomIn(editor.getViewportScreenCenter(), { animation: { duration: 140 } })}>
          <Plus size={18} />
        </button>
      </div>
    </>
  )
}
