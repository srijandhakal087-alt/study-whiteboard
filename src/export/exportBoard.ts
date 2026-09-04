import { jsPDF } from 'jspdf'
import type { Editor } from 'tldraw'

const RULE_SPACING = 80
const MAX_EXPORT_EDGE = 4096

function safeFileName(name: string) {
  return name.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'study-board'
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function renderVisibleArea(editor: Editor) {
  const bounds = editor.getViewportPageBounds()
  const scale = Math.min(2, MAX_EXPORT_EDGE / Math.max(bounds.w, bounds.h))
  const width = Math.max(1, Math.round(bounds.w * scale))
  const height = Math.max(1, Math.round(bounds.h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas export is unavailable')

  context.fillStyle = '#faf9f5'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = 'rgba(113, 124, 137, 0.28)'
  context.lineWidth = Math.max(1, scale)
  const firstLine = Math.ceil(bounds.y / RULE_SPACING) * RULE_SPACING
  for (let y = firstLine; y <= bounds.y + bounds.h; y += RULE_SPACING) {
    const screenY = Math.round((y - bounds.y) * scale) + 0.5
    context.beginPath()
    context.moveTo(0, screenY)
    context.lineTo(width, screenY)
    context.stroke()
  }

  const shapeIds = [...editor.getCurrentPageShapeIds()]
  if (shapeIds.length) {
    const exported = await editor.toImage(shapeIds, {
      bounds,
      background: false,
      format: 'png',
      padding: 0,
      pixelRatio: scale,
    })
    const bitmap = await createImageBitmap(exported.blob)
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
  }

  return canvas
}

export async function exportBoard(editor: Editor, boardName: string, format: 'pdf' | 'png') {
  const canvas = await renderVisibleArea(editor)
  const fileBase = safeFileName(boardName)

  if (format === 'png') {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('PNG export failed')), 'image/png')
    })
    download(blob, `${fileBase}.png`)
    return
  }

  const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'px', format: [canvas.width, canvas.height], hotfixes: ['px_scaling'] })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height)
  pdf.save(`${fileBase}.pdf`)
}
