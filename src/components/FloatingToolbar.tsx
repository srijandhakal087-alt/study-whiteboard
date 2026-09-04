import { useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Eraser,
  FileImage,
  FileText,
  FolderOpen,
  Focus,
  Hand,
  Heart,
  Highlighter,
  ImagePlus,
  LassoSelect,
  Minus,
  MoreHorizontal,
  MousePointer2,
  PaintBucket,
  PenLine,
  Plus,
  RectangleHorizontal,
  Redo2,
  Ruler,
  Shapes,
  StickyNote,
  Type,
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

const sizes: Array<{ name: string; value: TLDefaultSizeStyle; width: number; scale: number }> = [
  { name: 'Hairline', value: 's', width: 1, scale: 0.35 },
  { name: 'Extra fine', value: 's', width: 1.5, scale: 0.55 },
  { name: 'Fine', value: 's', width: 2, scale: 0.75 },
  { name: 'Thin', value: 's', width: 2.5, scale: 1 },
  { name: 'Medium', value: 'm', width: 4, scale: 1 },
  { name: 'Thick', value: 'l', width: 7, scale: 1 },
  { name: 'Extra thick', value: 'xl', width: 11, scale: 1 },
]

export function FloatingToolbar() {
  const editor = useEditor()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const { background, boardName, eraserMode, inkScale, openBoardManager, saveStatus, setBackground, setEraserMode, setInkColor, setInkScale } = useWhiteboardUi()
  const activeTool = useValue('active tool', () => editor.getCurrentToolId(), [editor])
  const canUndo = useValue('can undo', () => editor.getCanUndo(), [editor])
  const canRedo = useValue('can redo', () => editor.getCanRedo(), [editor])
  const zoom = useValue('zoom level', () => editor.getZoomLevel(), [editor])
  const selectedIds = useValue('selected shapes', () => editor.getSelectedShapeIds(), [editor])
  const pdfPageIds = useValue('pdf pages', () => getPdfPageIds(editor), [editor])
  const [inkMode, setInkMode] = useState<'draw' | 'highlight'>('draw')
  const [color, setColor] = useState<TLDefaultColorStyle>('black')
  const [size, setSize] = useState<TLDefaultSizeStyle>('m')
  const [isInkPanelOpen, setInkPanelOpen] = useState(false)
  const [isEraserPanelOpen, setEraserPanelOpen] = useState(false)
  const [isShapesOpen, setShapesOpen] = useState(false)
  const [isMoreOpen, setMoreOpen] = useState(false)
  const [isBackgroundOpen, setBackgroundOpen] = useState(false)
  const [isRulerVisible, setRulerVisible] = useState(false)
  const [isFocusMode, setFocusMode] = useState(false)
  const [pdfPage, setPdfPage] = useState(0)
  const [pdfStatus, setPdfStatus] = useState('')
  const [rulerAngle, setRulerAngle] = useState(0)
  const [rulerPosition, setRulerPosition] = useState(() => ({
    x: typeof window === 'undefined' ? 500 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 350 : window.innerHeight * 0.47,
  }))

  const chooseInk = (mode: 'draw' | 'highlight') => {
    const nextColor = mode === 'highlight' && color === 'black' ? 'yellow' : color
    setInkMode(mode)
    setColor(nextColor)
    setInkColor(nextColor)
    editor.setStyleForNextShapes(DefaultColorStyle, nextColor)
    editor.setStyleForNextShapes(DefaultSizeStyle, mode === 'highlight' && size === 's' ? 'l' : size)
    editor.setCurrentTool(mode)
    setInkPanelOpen(true)
    setShapesOpen(false)
    setMoreOpen(false)
  }

  const chooseColor = (nextColor: TLDefaultColorStyle) => {
    setColor(nextColor)
    setInkColor(nextColor)
    editor.setStyleForNextShapes(DefaultColorStyle, nextColor)
    editor.setStyleForSelectedShapes(DefaultColorStyle, nextColor)
  }

  const chooseSize = (nextSize: TLDefaultSizeStyle, nextScale: number) => {
    setSize(nextSize)
    setInkScale(nextScale)
    editor.setStyleForNextShapes(DefaultSizeStyle, nextSize)
    editor.setStyleForSelectedShapes(DefaultSizeStyle, nextSize)
    editor.updateShapes(editor.getSelectedShapes()
      .filter((shape) => shape.type === 'draw' || shape.type === 'highlight')
      .map((shape) => ({ id: shape.id, type: shape.type, props: { scale: nextScale } })) as never)
  }

  const chooseSimpleTool = (toolId: string) => {
    editor.setCurrentTool(toolId)
    setInkPanelOpen(false)
    setShapesOpen(false)
    setMoreOpen(false)
    if (toolId !== 'eraser') setEraserPanelOpen(false)
  }

  const chooseEraser = (mode: 'partial' | 'stroke') => {
    setEraserMode(mode)
    editor.setCurrentTool('eraser')
    setEraserPanelOpen(false)
  }

  const chooseGeo = (geo: 'ellipse' | 'heart' | 'rectangle') => {
    editor.setStyleForNextShapes(GeoShapeGeoStyle, geo)
    if (geo === 'heart') {
      editor.setStyleForNextShapes(DefaultColorStyle, 'red')
      editor.setStyleForNextShapes(DefaultFillStyle, 'solid')
    } else {
      editor.setStyleForNextShapes(DefaultFillStyle, 'none')
    }
    editor.setCurrentTool('geo')
    setShapesOpen(false)
  }

  const startRulerDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX: rulerPosition.x,
      positionY: rulerPosition.y,
    }
    const handleMove = (moveEvent: PointerEvent) => {
      setRulerPosition({
        x: start.positionX + moveEvent.clientX - start.pointerX,
        y: start.positionY + moveEvent.clientY - start.pointerY,
      })
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const palette = inkMode === 'highlight' ? highlighterColors : penColors

  const applyPreset = (mode: 'draw' | 'highlight', presetColor: TLDefaultColorStyle, presetSize: TLDefaultSizeStyle) => {
    setInkMode(mode)
    setColor(presetColor)
    setSize(presetSize)
    setInkColor(presetColor)
    setInkScale(1)
    editor.setStyleForNextShapes(DefaultColorStyle, presetColor)
    editor.setStyleForNextShapes(DefaultSizeStyle, presetSize)
    editor.setCurrentTool(mode)
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

  return (
    <>
      <input ref={imageInputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={addImages} />
      <input ref={pdfInputRef} className="visually-hidden" type="file" accept="application/pdf" onChange={addPdf} />
      {pdfStatus && <div className="save-toast" role="status">{pdfStatus}</div>}
      {isFocusMode && <button className="focus-exit" type="button" onClick={toggleFocusMode}>Exit focus mode</button>}
      <button className="board-title-pill" type="button" onClick={openBoardManager} title="Open board manager">
        <FolderOpen size={17} />
        <span>{boardName}</span>
        <small>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved'}</small>
      </button>

      {isRulerVisible && (
        <div
          className="canvas-ruler"
          style={{ left: rulerPosition.x, top: rulerPosition.y, transform: `translate(-50%, -50%) rotate(${rulerAngle}deg)` }}
          onPointerDown={startRulerDrag}
          role="group"
          aria-label="Movable ruler guide"
        >
          <div className="ruler-marks" aria-hidden="true" />
          <span className="ruler-angle">{rulerAngle}°</span>
          <div className="ruler-actions">
            <button type="button" aria-label="Rotate ruler left" onClick={() => setRulerAngle((value) => value - 5)}>−</button>
            <button type="button" aria-label="Rotate ruler right" onClick={() => setRulerAngle((value) => value + 5)}>+</button>
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

      {isInkPanelOpen && (
        <div className="ink-panel" role="toolbar" aria-label="Ink settings">
          <div className="ink-mode-switcher">
            <button className="compact-tool" data-active={inkMode === 'draw'} type="button" onClick={() => chooseInk('draw')} aria-label="Pen">
              <PenLine size={20} />
            </button>
            <button className="compact-tool" data-active={inkMode === 'highlight'} type="button" onClick={() => chooseInk('highlight')} aria-label="Highlighter">
              <Highlighter size={20} />
            </button>
          </div>
          <div className="pen-presets" aria-label="Pen presets">
            <button type="button" title="Thin black pen" aria-label="Thin black pen preset" onClick={() => applyPreset('draw', 'black', 's')}><span style={{ background: '#1f2328' }} /></button>
            <button type="button" title="Thin blue pen" aria-label="Thin blue pen preset" onClick={() => applyPreset('draw', 'blue', 's')}><span style={{ background: '#2563eb' }} /></button>
            <button type="button" title="Red correction pen" aria-label="Red correction pen preset" onClick={() => applyPreset('draw', 'red', 'm')}><span style={{ background: '#dc3f45' }} /></button>
            <button type="button" title="Yellow highlighter" aria-label="Highlighter preset" onClick={() => applyPreset('highlight', 'yellow', 'l')}><span className="preset-highlighter" /></button>
          </div>
          <span className="toolbar-divider" />
          <div className="color-options" aria-label="Ink color">
            {palette.map((option) => (
              <button
                className="color-option"
                data-active={color === option.value}
                key={option.value}
                type="button"
                title={option.name}
                aria-label={option.name}
                onClick={() => chooseColor(option.value)}
              >
                <span style={{ background: option.hex }} />
              </button>
            ))}
          </div>
          <span className="toolbar-divider" />
          <div className="size-options" aria-label="Pen thickness">
            {sizes.map((option) => (
              <button
                className="size-option"
                data-active={size === option.value && inkScale === option.scale}
                key={`${option.value}-${option.scale}`}
                type="button"
                title={option.name}
                aria-label={`${option.name} stroke`}
                onClick={() => chooseSize(option.value, option.scale)}
              >
                <span style={{ width: option.width, height: option.width }} />
              </button>
            ))}
          </div>
          <span className="toolbar-divider" />
          <div className="popover-anchor">
            <button className="compact-tool" data-active={activeTool === 'eraser'} type="button" aria-label="Eraser options" title="Eraser" onClick={() => { editor.setCurrentTool('eraser'); setEraserPanelOpen((value) => !value) }}>
              <Eraser size={20} />
            </button>
            {isEraserPanelOpen && (
              <div className="mini-popover eraser-popover" role="menu" aria-label="Eraser mode">
                <button type="button" data-active={eraserMode === 'partial'} onClick={() => chooseEraser('partial')}>Erase partial stroke</button>
                <button type="button" data-active={eraserMode === 'stroke'} onClick={() => chooseEraser('stroke')}>Erase entire stroke</button>
              </div>
            )}
          </div>
          <button className="compact-tool" data-active={isRulerVisible} type="button" aria-label="Ruler" title="Ruler guide" onClick={() => setRulerVisible((value) => !value)}>
            <Ruler size={20} />
          </button>
          <button className="compact-tool" type="button" aria-label="Lasso select" title="Lasso select" onClick={() => chooseSimpleTool('select')}>
            <LassoSelect size={20} />
          </button>
          <button className="compact-tool" type="button" aria-label="Close ink settings" onClick={() => setInkPanelOpen(false)}>
            <X size={20} />
          </button>
        </div>
      )}

      <div className="floating-toolbar" role="toolbar" aria-label="Whiteboard tools">
        <button className="tool-button" data-active={activeTool === 'select'} type="button" aria-label="Select" onClick={() => chooseSimpleTool('select')}>
          <MousePointer2 size={25} fill={activeTool === 'select' ? 'currentColor' : 'none'} />
        </button>
        <button className="tool-button tool-button--relative" data-active={activeTool === 'hand'} type="button" aria-label="Pan canvas" onClick={() => chooseSimpleTool('hand')}>
          <Hand size={25} />
          <i className="presence-dot" aria-hidden="true" />
        </button>
        <button
          className="tool-button"
          data-active={activeTool === 'draw' || activeTool === 'highlight' || activeTool === 'eraser'}
          type="button"
          aria-label="Ink tools"
          onClick={() => {
            if (activeTool === 'draw' || activeTool === 'highlight') setInkPanelOpen((value) => !value)
            else chooseInk('draw')
          }}
        >
          <PenLine size={26} />
        </button>
        <button className="tool-button" data-active={activeTool === 'note'} type="button" aria-label="Sticky note" onClick={() => chooseSimpleTool('note')}>
          <StickyNote size={26} />
        </button>
        <button className="tool-button tool-button--heart" type="button" aria-label="Heart" onClick={() => chooseGeo('heart')}>
          <Heart size={27} fill="currentColor" />
        </button>
        <button className="tool-button" data-active={activeTool === 'text'} type="button" aria-label="Text" onClick={() => chooseSimpleTool('text')}>
          <Type size={27} />
        </button>

        <div className="popover-anchor">
          <button className="tool-button" data-active={activeTool === 'geo' || activeTool === 'arrow'} type="button" aria-label="Shapes" onClick={() => { setShapesOpen((value) => !value); setMoreOpen(false) }}>
            <Shapes size={26} />
          </button>
          {isShapesOpen && (
            <div className="mini-popover shapes-popover" role="menu">
              <button type="button" onClick={() => chooseGeo('rectangle')}><RectangleHorizontal size={20} /> Rectangle</button>
              <button type="button" onClick={() => chooseGeo('ellipse')}><Circle size={20} /> Ellipse</button>
              <button type="button" onClick={() => chooseSimpleTool('arrow')}><ArrowUpRight size={20} /> Arrow</button>
            </div>
          )}
        </div>

        <div className="popover-anchor">
          <button className="tool-button" type="button" aria-label="More options" onClick={() => { setMoreOpen((value) => !value); setShapesOpen(false) }}>
            <MoreHorizontal size={27} />
          </button>
          {isMoreOpen && (
            <div className="mini-popover more-popover" role="menu">
              <button type="button" onClick={openBoardManager}><FolderOpen size={18} /> Boards</button>
              <button type="button" onClick={() => imageInputRef.current?.click()}><ImagePlus size={18} /> Add image from device</button>
              <button type="button" onClick={() => pdfInputRef.current?.click()}><BookOpen size={18} /> Import PDF</button>
              <button type="button" onClick={() => { setBackgroundOpen(true); setMoreOpen(false) }}><PaintBucket size={18} /> Format background</button>
              <button type="button" onClick={() => exportBoard(editor, boardName, 'png')}><FileImage size={18} /> Export visible area as PNG</button>
              <button type="button" onClick={() => exportBoard(editor, boardName, 'pdf')}><FileText size={18} /> Export visible area as PDF</button>
              {pdfPageIds.length > 0 && <button type="button" onClick={() => void exportAnnotatedPdf(editor, boardName, pdfPageIds)}><FileText size={18} /> Export annotated PDF</button>}
              <button type="button" onClick={() => setRulerVisible((value) => !value)}><Ruler size={18} /> {isRulerVisible ? 'Hide ruler' : 'Show ruler'}</button>
              <button type="button" onClick={toggleFocusMode}><Focus size={18} /> Focus mode</button>
              <span><Download size={16} /> Files save to Downloads</span>
            </div>
          )}
        </div>
      </div>

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
