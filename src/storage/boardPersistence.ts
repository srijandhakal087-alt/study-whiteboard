import type { TLEditorSnapshot } from 'tldraw'

const DB_NAME = 'study-whiteboard-v3'
const STORE_NAME = 'boards'

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function accessStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = action(transaction.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

export function loadBoardSnapshot(boardId: string) {
  return accessStore<TLEditorSnapshot | undefined>('readonly', (store) => store.get(boardId))
}

export function saveBoardSnapshot(boardId: string, snapshot: TLEditorSnapshot) {
  return accessStore<IDBValidKey>('readwrite', (store) => store.put(snapshot, boardId))
}

export function deleteBoardSnapshot(boardId: string) {
  return accessStore<undefined>('readwrite', (store) => store.delete(boardId))
}

export async function duplicateBoardSnapshot(sourceId: string, targetId: string) {
  const snapshot = await loadBoardSnapshot(sourceId)
  if (snapshot) await saveBoardSnapshot(targetId, snapshot)
}
