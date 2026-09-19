import { useEditor, useValue } from 'tldraw'
import type { CSSProperties } from 'react'
import { useWhiteboardUi } from '../components/WhiteboardUiContext'

const RULE_SPACING = 80
const NOTEBOOK_SPACING = 108

export function RuledBackground() {
  const editor = useEditor()
  const { background } = useWhiteboardUi()
  const camera = useValue('ruled paper camera', () => editor.getCamera(), [editor])
  const spacing = (background.pattern === 'notebook-page' ? NOTEBOOK_SPACING : RULE_SPACING) * camera.z
  const offsetX = ((camera.x * camera.z) % spacing + spacing) % spacing
  const offsetY = ((camera.y * camera.z) % spacing + spacing) % spacing
  const notebookWidth = spacing * 9
  const notebookHeight = spacing * 13
  const notebookOffsetX = ((camera.x * camera.z) % notebookWidth + notebookWidth) % notebookWidth
  const notebookOffsetY = ((camera.y * camera.z) % notebookHeight + notebookHeight) % notebookHeight

  return (
    <div
      className="ruled-background"
      data-pattern={background.pattern}
      style={{
        backgroundColor: background.color,
        '--grid-size': `${spacing}px`,
        '--grid-half': `${spacing / 2}px`,
        '--notebook-width': `${notebookWidth}px`,
        '--notebook-height': `${notebookHeight}px`,
        '--notebook-margin': `${spacing * 0.9}px`,
        '--notebook-offset-x': `${notebookOffsetX}px`,
        '--notebook-offset-y': `${notebookOffsetY}px`,
        '--grid-offset-y': `${offsetY}px`,
        backgroundPosition: background.pattern === 'notebook-page' ? undefined : `${offsetX}px ${offsetY}px`,
      } as CSSProperties}
      aria-hidden="true"
    />
  )
}
