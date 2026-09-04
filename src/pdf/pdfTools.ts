import { jsPDF } from 'jspdf'
import type { Editor, TLShapeId } from 'tldraw'

const pdfAssetUrl = (path: string) => new URL(`pdfjs/${path}`, window.location.href).href
const PDFJS_URL = pdfAssetUrl('build/pdf.min.mjs')
const PDFJS_WORKER_URL = pdfAssetUrl('build/pdf.worker.min.mjs')

export async function importPdf(editor: Editor, file: File, onProgress: (label: string) => void) {
  const pdfjs = await import(/* @vite-ignore */ PDFJS_URL) as any
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
  const pdfDocument = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: pdfAssetUrl('cmaps/'),
    cMapPacked: true,
    standardFontDataUrl: pdfAssetUrl('standard_fonts/'),
    wasmUrl: pdfAssetUrl('wasm/'),
  }).promise
  const created: TLShapeId[] = []
  let y = 0

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    onProgress(`Importing page ${pageNumber} of ${pdfDocument.numPages}…`)
    const page = await pdfDocument.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('PDF rendering is unavailable')
    await page.render({ canvasContext: context, viewport }).promise
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PDF page rendering failed')), 'image/png'))
    const pageFile = new File([blob], `[PDF] ${file.name} – page ${pageNumber}.png`, { type: 'image/png' })
    const before = new Set(editor.getCurrentPageShapeIds())
    await editor.putExternalContent({ type: 'files', files: [pageFile], point: { x: 0, y: y + viewport.height / 2 } })
    const pageShape = editor.getCurrentPageShapes().find((shape) => !before.has(shape.id) && shape.type === 'image')
    if (pageShape) {
      created.push(pageShape.id)
      editor.updateShape({ id: pageShape.id, type: 'image', isLocked: true, meta: { ...pageShape.meta, pdfPage: pageNumber, pdfName: file.name } })
    }
    y += viewport.height + 180
  }

  if (created[0]) {
    const bounds = editor.getShapePageBounds(created[0])
    if (bounds) editor.zoomToBounds(bounds, { inset: 72, animation: { duration: 240 } })
  }
  return created
}

export function getPdfPageIds(editor: Editor) {
  return editor.getCurrentPageShapes()
    .filter((shape) => shape.type === 'image' && typeof shape.meta.pdfPage === 'number')
    .sort((a, b) => Number(a.meta.pdfPage) - Number(b.meta.pdfPage))
    .map((shape) => shape.id)
}

export async function exportAnnotatedPdf(editor: Editor, boardName: string, pageIds: TLShapeId[]) {
  if (!pageIds.length) throw new Error('No imported PDF pages found')
  const allShapeIds = [...editor.getCurrentPageShapeIds()]
  let pdf: jsPDF | null = null

  for (const pageId of pageIds) {
    const bounds = editor.getShapePageBounds(pageId)
    if (!bounds) continue
    const pageShapeIds = allShapeIds.filter((shapeId) => {
      const shapeBounds = editor.getShapePageBounds(shapeId)
      return shapeBounds
        && shapeBounds.x < bounds.x + bounds.w
        && shapeBounds.x + shapeBounds.w > bounds.x
        && shapeBounds.y < bounds.y + bounds.h
        && shapeBounds.y + shapeBounds.h > bounds.y
    })
    const result = await editor.toImage(pageShapeIds, { bounds, format: 'png', background: true, padding: 0, pixelRatio: 1.5 })
    const imageUrl = URL.createObjectURL(result.blob)
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('PDF export rendering failed')); image.src = imageUrl })
    const orientation = bounds.w >= bounds.h ? 'landscape' : 'portrait'
    if (!pdf) pdf = new jsPDF({ orientation, unit: 'px', format: [bounds.w, bounds.h], hotfixes: ['px_scaling'] })
    else pdf.addPage([bounds.w, bounds.h], orientation)
    pdf.addImage(image, 'PNG', 0, 0, bounds.w, bounds.h)
    URL.revokeObjectURL(imageUrl)
  }

  pdf?.save(`${boardName.replace(/[^a-z0-9-_]+/gi, '-') || 'annotated'}.pdf`)
}
