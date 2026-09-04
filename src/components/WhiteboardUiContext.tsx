import { createContext, useContext, type ReactNode } from 'react'

export type BackgroundPattern = 'solid' | 'dot' | 'square' | 'graph' | 'hybrid' | 'diamond' | 'wide-rule' | 'triangle' | 'narrow-rule'
export type EraserMode = 'partial' | 'stroke'

export interface BoardBackground {
  color: string
  pattern: BackgroundPattern
}

interface WhiteboardUiContextValue {
  boardName: string
  background: BoardBackground
  eraserMode: EraserMode
  inkColor: string
  inkScale: number
  openBoardManager: () => void
  saveStatus: 'saving' | 'saved' | 'error'
  setBackground: (background: BoardBackground) => void
  setEraserMode: (mode: EraserMode) => void
  setInkColor: (color: string) => void
  setInkScale: (scale: number) => void
  setSaveStatus: (status: 'saving' | 'saved' | 'error') => void
}

const WhiteboardUiContext = createContext<WhiteboardUiContextValue | null>(null)

export function WhiteboardUiProvider({
  children,
  value,
}: {
  children: ReactNode
  value: WhiteboardUiContextValue
}) {
  return <WhiteboardUiContext.Provider value={value}>{children}</WhiteboardUiContext.Provider>
}

export function useWhiteboardUi() {
  const value = useContext(WhiteboardUiContext)
  if (!value) throw new Error('useWhiteboardUi must be used inside WhiteboardUiProvider')
  return value
}
