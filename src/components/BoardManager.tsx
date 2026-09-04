import { useEffect, useState } from 'react'
import { Check, Copy, FilePlus2, Pencil, Trash2, X } from 'lucide-react'
import type { Board } from '../storage/boardStorage'

interface BoardManagerProps {
  activeBoardId: string
  boards: Board[]
  isOpen: boolean
  onClose: () => void
  onCreate: () => void
  onDelete: (boardId: string) => void
  onDuplicate: (boardId: string) => void
  onOpen: (boardId: string) => void
  onRename: (boardId: string, name: string) => void
}

export function BoardManager({
  activeBoardId,
  boards,
  isOpen,
  onClose,
  onCreate,
  onDelete,
  onDuplicate,
  onOpen,
  onRename,
}: BoardManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  useEffect(() => {
    if (!isOpen) setEditingId(null)
  }, [isOpen])

  if (!isOpen) return null

  const startRename = (board: Board) => {
    setEditingId(board.id)
    setDraftName(board.name)
  }

  const finishRename = () => {
    if (!editingId) return
    onRename(editingId, draftName)
    setEditingId(null)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="board-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="boards-heading"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="board-manager__header">
          <div>
            <p className="eyebrow">LOCAL NOTEBOOKS</p>
            <h1 id="boards-heading">Your boards</h1>
          </div>
          <button className="icon-button" type="button" aria-label="Close boards" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <button className="new-board-button" type="button" onClick={onCreate}>
          <FilePlus2 size={19} />
          New board
        </button>

        <div className="board-list">
          {boards.map((board) => (
            <article className="board-row" data-active={board.id === activeBoardId} key={board.id}>
              <button className="board-row__open" type="button" onClick={() => onOpen(board.id)}>
                <span className="board-thumbnail" aria-hidden="true" />
                <span>
                  {editingId === board.id ? (
                    <input
                      autoFocus
                      className="board-name-input"
                      value={draftName}
                      aria-label="Board name"
                      onChange={(event) => setDraftName(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') finishRename()
                        if (event.key === 'Escape') setEditingId(null)
                      }}
                    />
                  ) : (
                    <strong>{board.name}</strong>
                  )}
                  <small>{board.id === activeBoardId ? 'Open now' : 'Saved locally'}</small>
                </span>
              </button>

              <div className="board-row__actions">
                {editingId === board.id ? (
                  <button className="icon-button" type="button" aria-label="Save name" onClick={finishRename}>
                    <Check size={17} />
                  </button>
                ) : (
                  <button className="icon-button" type="button" aria-label={`Rename ${board.name}`} onClick={() => startRename(board)}>
                    <Pencil size={16} />
                  </button>
                )}
                <button className="icon-button" type="button" aria-label={`Duplicate ${board.name}`} onClick={() => onDuplicate(board.id)}>
                  <Copy size={16} />
                </button>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  aria-label={`Delete ${board.name}`}
                  disabled={boards.length === 1}
                  onClick={() => onDelete(board.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
