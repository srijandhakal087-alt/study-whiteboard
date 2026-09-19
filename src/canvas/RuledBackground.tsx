import { useEditor, useValue } from 'tldraw'
import type { CSSProperties } from 'react'
import { useWhiteboardUi } from '../components/WhiteboardUiContext'

const RULE_SPACING = 80
export const NOTEBOOK_PAGE_WIDTH = 972
export const NOTEBOOK_PAGE_HEIGHT = 1404
const NOTEBOOK_LINE_SPACING = 54
const NOTEBOOK_MARGIN = 97

export function RuledBackground() {
  const editor = useEditor()
  const { background } = useWhiteboardUi()
  const camera = useValue('ruled paper camera', () => editor.getCamera(), [editor])
  const spacing = RULE_SPACING * camera.z
  const offsetX = ((camera.x * camera.z) % spacing + spacing) % spacing
  const offsetY = ((camera.y * camera.z) % spacing + spacing) % spacing
  const notebookOrigin = editor.pageToViewport({ x: 0, y: 0 })
  const isNotebookPage = background.pattern === 'notebook-page'

  return (
    <div
      className="ruled-background"
      data-pattern={background.pattern}
      style={{
        backgroundColor: isNotebookPage ? '#eef0f2' : background.color,
        '--grid-size': `${spacing}px`,
        '--grid-half': `${spacing / 2}px`,
        '--grid-offset-y': `${offsetY}px`,
        backgroundPosition: isNotebookPage ? undefined : `${offsetX}px ${offsetY}px`,
      } as CSSProperties}
      aria-hidden="true"
    >
      {isNotebookPage && (
        <div
          className="notebook-sheet"
          style={{
            left: `${notebookOrigin.x}px`,
            top: `${notebookOrigin.y}px`,
            width: `${NOTEBOOK_PAGE_WIDTH * camera.z}px`,
            height: `${NOTEBOOK_PAGE_HEIGHT * camera.z}px`,
            backgroundColor: background.color,
            '--notebook-line-spacing': `${NOTEBOOK_LINE_SPACING * camera.z}px`,
            '--notebook-margin': `${NOTEBOOK_MARGIN * camera.z}px`,
          } as CSSProperties}
        />
      )}
    </div>
  )
}
