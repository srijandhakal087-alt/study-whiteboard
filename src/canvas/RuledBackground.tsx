import { useEditor, useValue } from 'tldraw'
import type { CSSProperties } from 'react'
import { useWhiteboardUi } from '../components/WhiteboardUiContext'

const RULE_SPACING = 80

export function RuledBackground() {
  const editor = useEditor()
  const { background } = useWhiteboardUi()
  const camera = useValue('ruled paper camera', () => editor.getCamera(), [editor])
  const spacing = RULE_SPACING * camera.z
  const offsetX = ((camera.x * camera.z) % spacing + spacing) % spacing
  const offsetY = ((camera.y * camera.z) % spacing + spacing) % spacing

  return (
    <div
      className="ruled-background"
      data-pattern={background.pattern}
      style={{
        backgroundColor: background.color,
        '--grid-size': `${spacing}px`,
        '--grid-half': `${spacing / 2}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      } as CSSProperties}
      aria-hidden="true"
    />
  )
}
