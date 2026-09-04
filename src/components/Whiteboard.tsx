import { useCallback, useEffect, useRef, useState } from 'react'
import { Tldraw, iconTypes, inlineBase64AssetStore, type Editor, type TLUiAssetUrlOverrides } from 'tldraw'
import 'tldraw/tldraw.css'
import { erasePartialStrokeAtPoint } from '../canvas/partialStrokeEraser'
import { whiteboardComponents } from '../canvas/whiteboardConfig'
import { reportDiagnostic } from '../diagnostics'
import { loadBoardSnapshot, saveBoardSnapshot } from '../storage/boardPersistence'
import { useWhiteboardUi } from './WhiteboardUiContext'

interface WhiteboardProps {
  boardId: string
}

const localAsset = (path: string) => new URL(`tldraw-assets/${path}`, window.location.href).href

const inkCursorColors: Record<string, string> = {
  black: '#1f2328',
  blue: '#2563eb',
  red: '#dc3f45',
  green: '#16835a',
  yellow: '#e9d72f',
  'light-blue': '#78c7f0',
  'light-red': '#f3a5b5',
  'light-green': '#9bd7a5',
}

const localAssetUrls: TLUiAssetUrlOverrides = {
  fonts: {
    tldraw_mono: localAsset('fonts/IBMPlexMono-Medium.woff2'),
    tldraw_mono_italic: localAsset('fonts/IBMPlexMono-MediumItalic.woff2'),
    tldraw_mono_bold: localAsset('fonts/IBMPlexMono-Bold.woff2'),
    tldraw_mono_italic_bold: localAsset('fonts/IBMPlexMono-BoldItalic.woff2'),
    tldraw_serif: localAsset('fonts/IBMPlexSerif-Medium.woff2'),
    tldraw_serif_italic: localAsset('fonts/IBMPlexSerif-MediumItalic.woff2'),
    tldraw_serif_bold: localAsset('fonts/IBMPlexSerif-Bold.woff2'),
    tldraw_serif_italic_bold: localAsset('fonts/IBMPlexSerif-BoldItalic.woff2'),
    tldraw_sans: localAsset('fonts/IBMPlexSans-Medium.woff2'),
    tldraw_sans_italic: localAsset('fonts/IBMPlexSans-MediumItalic.woff2'),
    tldraw_sans_bold: localAsset('fonts/IBMPlexSans-Bold.woff2'),
    tldraw_sans_italic_bold: localAsset('fonts/IBMPlexSans-BoldItalic.woff2'),
    tldraw_draw: localAsset('fonts/Shantell_Sans-Informal_Regular.woff2'),
    tldraw_draw_italic: localAsset('fonts/Shantell_Sans-Informal_Regular_Italic.woff2'),
    tldraw_draw_bold: localAsset('fonts/Shantell_Sans-Informal_Bold.woff2'),
    tldraw_draw_italic_bold: localAsset('fonts/Shantell_Sans-Informal_Bold_Italic.woff2'),
  },
  translations: { en: localAsset('translations/en.json') },
  icons: Object.fromEntries(
    iconTypes.map((name) => [name, `${localAsset('icons/0_merged.svg')}#${name}`]),
  ),
}

export function Whiteboard({ boardId }: WhiteboardProps) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const stopSavingRef = useRef<(() => void) | null>(null)
  const { eraserMode, inkColor, inkScale, setSaveStatus } = useWhiteboardUi()

  const handleMount = useCallback(
    (mountedEditor: Editor) => {
      setEditor(mountedEditor)
      void (async () => {
        try {
          const snapshot = await loadBoardSnapshot(boardId)
          if (snapshot) mountedEditor.loadSnapshot(snapshot)
        } catch (error) {
          reportDiagnostic(`[WHITEBOARD] restore failed: ${String(error)}`)
        }

        stopSavingRef.current?.()
        stopSavingRef.current = mountedEditor.store.listen(() => {
          setSaveStatus('saving')
          if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
          saveTimerRef.current = window.setTimeout(async () => {
            try {
              await saveBoardSnapshot(boardId, mountedEditor.getSnapshot())
              setSaveStatus('saved')
            } catch (error) {
              setSaveStatus('error')
              reportDiagnostic(`[WHITEBOARD] save failed: ${String(error)}`)
            }
          }, 600)
        }, { source: 'user', scope: 'document' })
        reportDiagnostic(`[WHITEBOARD] editor mounted and board ${boardId} restored`)
      })()
    },
    [boardId, setSaveStatus],
  )

  useEffect(() => () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    stopSavingRef.current?.()
    if (editor) void saveBoardSnapshot(boardId, editor.getSnapshot())
  }, [boardId, editor])

  useEffect(() => {
    if (!editor) return
    const container = editor.getContainer()
    const inkCursor = document.createElement('div')
    inkCursor.className = 'ink-cursor-dot'
    inkCursor.style.backgroundColor = inkCursorColors[inkColor] ?? inkCursorColors.black
    inkCursor.hidden = true
    container.appendChild(inkCursor)
    let activePan: { pointerId: number; previousTool: string } | null = null
    let activeEraser: { pointerId: number; previousTool: string } | null = null
    let activePartialEraser: { pointerId: number } | null = null
    let lineAssist: { pointerId: number; points: Array<{ x: number; y: number }>; timer: number | null; active: boolean } | null = null
    let suppressNextContextMenu = false

    const hideInkCursor = () => {
      inkCursor.hidden = true
      container.classList.remove('has-ink-cursor')
    }

    const updateInkCursor = (event: PointerEvent) => {
      const tool = editor.getCurrentToolId()
      const isUiTarget = Boolean((event.target as HTMLElement).closest('button, input, aside, .floating-toolbar, .ink-panel, .undo-pod, .zoom-pod, .board-title-pill, .canvas-ruler'))
      if ((tool !== 'draw' && tool !== 'highlight') || event.pointerType === 'touch' || isUiTarget) {
        hideInkCursor()
        return
      }
      const bounds = container.getBoundingClientRect()
      inkCursor.hidden = false
      inkCursor.style.transform = `translate(${event.clientX - bounds.left}px, ${event.clientY - bounds.top}px)`
      container.classList.add('has-ink-cursor')
    }

    const stopFineScale = editor.store.listen(({ changes }) => {
      if (inkScale === 1) return
      for (const record of Object.values(changes.added)) {
        if (record.typeName !== 'shape' || (record.type !== 'draw' && record.type !== 'highlight') || record.props.scale === inkScale) continue
        editor.updateShape({ id: record.id, type: record.type, props: { scale: inkScale } } as never)
      }
    }, { source: 'user', scope: 'document' })

    const handlePointerDown = (event: PointerEvent) => {
      const isUiTarget = Boolean((event.target as HTMLElement).closest('button, input, aside, .floating-toolbar, .ink-panel, .undo-pod, .zoom-pod, .board-title-pill, .canvas-ruler'))
      if (event.pointerType === 'pen' && event.button === 5 && !activeEraser) {
        activeEraser = { pointerId: event.pointerId, previousTool: editor.getCurrentToolId() }
        editor.setCurrentTool('eraser')
        if (eraserMode === 'partial' && !isUiTarget) {
          activePartialEraser = { pointerId: event.pointerId }
          editor.markHistoryStoppingPoint('partial erase')
          erasePartialStrokeAtPoint(editor, editor.screenToPage({ x: event.clientX, y: event.clientY }), 18 / editor.getZoomLevel())
          event.preventDefault()
          event.stopImmediatePropagation()
        }
        return
      }
      if (event.button === 0 && eraserMode === 'partial' && editor.getCurrentToolId() === 'eraser' && !isUiTarget) {
        activePartialEraser = { pointerId: event.pointerId }
        editor.markHistoryStoppingPoint('partial erase')
        erasePartialStrokeAtPoint(editor, editor.screenToPage({ x: event.clientX, y: event.clientY }), 18 / editor.getZoomLevel())
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      if (event.button === 0 && editor.getCurrentToolId() === 'draw') {
        lineAssist = { pointerId: event.pointerId, points: [{ x: event.clientX, y: event.clientY }], timer: null, active: false }
      }
      if (event.button !== 2 || activePan) return
      if (isUiTarget) return

      const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY })
      if (editor.getShapesAtPoint(pagePoint).length > 0) return

      activePan = { pointerId: event.pointerId, previousTool: editor.getCurrentToolId() }
      suppressNextContextMenu = true
      editor.setCurrentTool('hand')
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateInkCursor(event)
      if (activePartialEraser && event.pointerId === activePartialEraser.pointerId) {
        erasePartialStrokeAtPoint(editor, editor.screenToPage({ x: event.clientX, y: event.clientY }), 18 / editor.getZoomLevel())
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      if (!lineAssist || event.pointerId !== lineAssist.pointerId || lineAssist.active) return
      lineAssist.points.push({ x: event.clientX, y: event.clientY })
      if (lineAssist.timer !== null) window.clearTimeout(lineAssist.timer)
      lineAssist.timer = window.setTimeout(() => {
        if (!lineAssist || lineAssist.points.length < 4) return
        const first = lineAssist.points[0]
        const last = lineAssist.points[lineAssist.points.length - 1]
        const length = Math.hypot(last.x - first.x, last.y - first.y)
        if (length < 60) return
        const deviation = Math.max(...lineAssist.points.map((point) => Math.abs((last.y - first.y) * point.x - (last.x - first.x) * point.y + last.x * first.y - last.y * first.x) / length))
        if (deviation > 7) return
        lineAssist.active = true
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true }))
      }, 480)
    }

    const finishPan = (event: PointerEvent) => {
      if (lineAssist && event.pointerId === lineAssist.pointerId) {
        if (lineAssist.timer !== null) window.clearTimeout(lineAssist.timer)
        if (lineAssist.active) container.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', bubbles: true }))
        lineAssist = null
      }
      if (activeEraser && event.pointerId === activeEraser.pointerId) {
        const { previousTool } = activeEraser
        activeEraser = null
        editor.setCurrentTool(previousTool)
      }
      if (!activePan || event.pointerId !== activePan.pointerId) return
      const { previousTool } = activePan
      activePan = null
      editor.setCurrentTool(previousTool)
    }

    const finishPartialErase = (event: PointerEvent) => {
      if (!activePartialEraser || event.pointerId !== activePartialEraser.pointerId) return
      activePartialEraser = null
      editor.markHistoryStoppingPoint('partial erase complete')
      if (activeEraser && activeEraser.pointerId === event.pointerId) {
        const { previousTool } = activeEraser
        activeEraser = null
        editor.setCurrentTool(previousTool)
      }
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const restoreTemporaryTools = () => {
      const previousTool = activeEraser?.previousTool ?? activePan?.previousTool
      if (lineAssist?.timer != null) window.clearTimeout(lineAssist.timer)
      if (lineAssist?.active) container.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', bubbles: true }))
      lineAssist = null
      activeEraser = null
      activePartialEraser = null
      activePan = null
      if (previousTool) editor.setCurrentTool(previousTool)
    }

    const preventPanContextMenu = (event: MouseEvent) => {
      if (!activePan && !suppressNextContextMenu) return
      event.preventDefault()
      suppressNextContextMenu = false
    }

    const insertImageFiles = (files: File[], point = editor.getViewportPageBounds().center) => {
      const images = files.filter((file) => ['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
      if (!images.length) return false
      editor.markHistoryStoppingPoint('insert images')
      void editor.putExternalContent({ type: 'files', files: images, point })
      return true
    }

    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (!insertImageFiles(files, editor.inputs.getCurrentPagePoint())) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const handleDragOver = (event: DragEvent) => {
      if (Array.from(event.dataTransfer?.items ?? []).some((item) => item.type.startsWith('image/'))) event.preventDefault()
    }

    const handleDrop = (event: DragEvent) => {
      const files = Array.from(event.dataTransfer?.files ?? [])
      const point = editor.screenToPage({ x: event.clientX, y: event.clientY })
      if (!insertImageFiles(files, point)) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    container.addEventListener('pointerdown', handlePointerDown, true)
    container.addEventListener('pointermove', handlePointerMove, true)
    container.addEventListener('pointerleave', hideInkCursor)
    container.addEventListener('pointerup', finishPartialErase, true)
    container.addEventListener('pointercancel', finishPartialErase, true)
    container.addEventListener('contextmenu', preventPanContextMenu)
    window.addEventListener('pointerup', finishPan)
    window.addEventListener('pointercancel', finishPan)
    window.addEventListener('blur', restoreTemporaryTools)
    container.addEventListener('paste', handlePaste, true)
    container.addEventListener('dragover', handleDragOver, true)
    container.addEventListener('drop', handleDrop, true)
    return () => {
      container.removeEventListener('pointerdown', handlePointerDown, true)
      container.removeEventListener('pointermove', handlePointerMove, true)
      container.removeEventListener('pointerleave', hideInkCursor)
      container.removeEventListener('pointerup', finishPartialErase, true)
      container.removeEventListener('pointercancel', finishPartialErase, true)
      container.removeEventListener('contextmenu', preventPanContextMenu)
      window.removeEventListener('pointerup', finishPan)
      window.removeEventListener('pointercancel', finishPan)
      window.removeEventListener('blur', restoreTemporaryTools)
      container.removeEventListener('paste', handlePaste, true)
      container.removeEventListener('dragover', handleDragOver, true)
      container.removeEventListener('drop', handleDrop, true)
      stopFineScale()
      inkCursor.remove()
      container.classList.remove('has-ink-cursor')
    }
  }, [editor, eraserMode, inkColor, inkScale])

  return (
    <section className="whiteboard" aria-label="Study whiteboard">
      <Tldraw
        assets={inlineBase64AssetStore}
        assetUrls={localAssetUrls}
        autoFocus
        hideUi
        initialState="select"
        onMount={handleMount}
        components={whiteboardComponents}
      />
    </section>
  )
}
