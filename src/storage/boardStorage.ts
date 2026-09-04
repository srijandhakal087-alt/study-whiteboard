export interface Board {
  id: string
  name: string
  createdAt: number
  background?: { color: string; pattern: string }
}

const BOARDS_KEY = 'study-whiteboard:boards'
const ACTIVE_BOARD_KEY = 'study-whiteboard:active-board'

function makeBoard(name = 'Untitled board'): Board {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
  }
}

function saveBoards(boards: Board[]) {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards))
  return boards
}

export function loadBoards(): Board[] {
  try {
    const stored = JSON.parse(localStorage.getItem(BOARDS_KEY) ?? '[]') as Board[]
    if (stored.length) return stored
  } catch {
    // Ignore corrupt legacy metadata without touching valid board snapshots.
  }
  return saveBoards([makeBoard('Study notes')])
}

export function getActiveBoardId(boards: Board[]) {
  const stored = localStorage.getItem(ACTIVE_BOARD_KEY)
  return boards.some((board) => board.id === stored) ? stored! : boards[0].id
}

export function saveActiveBoardId(boardId: string) {
  localStorage.setItem(ACTIVE_BOARD_KEY, boardId)
}

export function duplicateBoard(boards: Board[], sourceId: string) {
  const source = boards.find((board) => board.id === sourceId)
  const board = { ...makeBoard(`${source?.name ?? 'Board'} copy`), background: source?.background }
  return { board, boards: saveBoards([board, ...boards]) }
}

export function createBoard(boards: Board[]) {
  const board = makeBoard(`Board ${boards.length + 1}`)
  return { board, boards: saveBoards([board, ...boards]) }
}

export function renameBoard(boards: Board[], boardId: string, name: string) {
  const cleanName = name.trim() || 'Untitled board'
  return saveBoards(boards.map((board) => (board.id === boardId ? { ...board, name: cleanName } : board)))
}

export function updateBoardBackground(boards: Board[], boardId: string, background: Board['background']) {
  return saveBoards(boards.map((board) => board.id === boardId ? { ...board, background } : board))
}

export function deleteBoard(boards: Board[], boardId: string) {
  if (boards.length === 1) return boards
  const next = saveBoards(boards.filter((board) => board.id !== boardId))
  return next
}
