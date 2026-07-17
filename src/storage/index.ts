import type { SaveData } from '../game/types'
import { migrate } from '../game/save'

// chrome.storage.local is an offline cache only — Firestore owns the truth.
// Auth state itself is not stored here: Firebase Auth persists its own
// session (indexedDB) and is queried live via onAuthStateChanged.

const SAVE_KEY = 'minigotchi.save'
const DIRTY_KEY = 'minigotchi.dirty'
const LAST_NOTIFIED_KEY = 'minigotchi.lastNotifiedAt'

export async function loadLocalSave(): Promise<SaveData | null> {
  const data = await chrome.storage.local.get(SAVE_KEY)
  const raw = data[SAVE_KEY]
  if (!raw) return null
  try {
    return migrate(raw)
  } catch {
    return null
  }
}

export async function storeLocalSave(save: SaveData): Promise<void> {
  await chrome.storage.local.set({ [SAVE_KEY]: save })
}

export async function isDirty(): Promise<boolean> {
  const data = await chrome.storage.local.get(DIRTY_KEY)
  return Boolean(data[DIRTY_KEY])
}

export async function setDirty(dirty: boolean): Promise<void> {
  await chrome.storage.local.set({ [DIRTY_KEY]: dirty })
}

export async function getLastNotifiedAt(): Promise<number> {
  const data = await chrome.storage.local.get(LAST_NOTIFIED_KEY)
  return (data[LAST_NOTIFIED_KEY] as number | undefined) ?? 0
}

export async function setLastNotifiedAt(t: number): Promise<void> {
  await chrome.storage.local.set({ [LAST_NOTIFIED_KEY]: t })
}
