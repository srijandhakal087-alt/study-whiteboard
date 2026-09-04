import { useMemo, useState } from 'react'
import { BoardManager } from './components/BoardManager'
import { Whiteboard } from './components/Whiteboard'
import { WhiteboardUiProvider, type BoardBackground, type EraserMode } from './components/WhiteboardUiContext'
import {
  createBoard,
  deleteBoard,
  duplicateBoard,
  getActiveBoardId,
  loadBoards,
  renameBoard,
  saveActiveBoardId,
  updateBoardBackground,
  type Board,
} from './storage/boardStorage'
import { deleteBoardSnapshot, duplicateBoardSnapshot } from './storage/boardPersistence'

export default function App() {
  const [boards, setBoards] = useState<Board[]>(() => loadBoards())
  const [activeBoardId, setActiveBoardId] = useState(() => getActiveBoardId(boards))
  const [isBoardManagerOpen, setBoardManagerOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved')
  const [eraserMode, setEraserMode] = useState<EraserMode>('stroke')
  const [inkColor, setInkColor] = useState('black')
  const [inkScale, setInkScale] = useState(1)

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? boards[0],
    [activeBoardId, boards],
  )

  const openBoard = (boardId: string) => {
    saveActiveBoardId(boardId)
    setActiveBoardId(boardId)
    setBoardManagerOpen(false)
  }

  const addBoard = () => {
    const next = createBoard(boards)
    setBoards(next.boards)
    openBoard(next.board.id)
  }

  const updateBoardName = (boardId: string, name: string) => {
    setBoards((current) => renameBoard(current, boardId, name))
  }

  const removeBoard = async (boardId: string) => {
    const next = deleteBoard(boards, boardId)
    await deleteBoardSnapshot(boardId)
    setBoards(next)
    if (boardId === activeBoardId) {
      openBoard(next[0].id)
    }
  }

  const copyBoard = async (boardId: string) => {
    const next = duplicateBoard(boards, boardId)
    await duplicateBoardSnapshot(boardId, next.board.id)
    setBoards(next.boards)
  }

  if (!activeBoard) return null

  const background = (activeBoard.background ?? { color: '#fbfbfa', pattern: 'wide-rule' }) as BoardBackground

  return (
    <main className="app-shell">
      <WhiteboardUiProvider
        value={{
          boardName: activeBoard.name,
          background,
          eraserMode,
          inkColor,
          inkScale,
          openBoardManager: () => setBoardManagerOpen(true),
          saveStatus,
          setBackground: (nextBackground) => setBoards((current) => updateBoardBackground(current, activeBoard.id, nextBackground)),
          setEraserMode,
          setInkColor,
          setInkScale,
          setSaveStatus,
        }}
      >
        <Whiteboard key={activeBoard.id} boardId={activeBoard.id} />
      </WhiteboardUiProvider>

      <BoardManager
        activeBoardId={activeBoard.id}
        boards={boards}
        isOpen={isBoardManagerOpen}
        onClose={() => setBoardManagerOpen(false)}
        onCreate={addBoard}
        onDelete={removeBoard}
        onDuplicate={copyBoard}
        onOpen={openBoard}
        onRename={updateBoardName}
      />
    </main>
  )
}
