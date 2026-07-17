import type { SaveData } from '../game/types'
import { migrate } from '../game/save'

// chrome.storage.local is an offline cache only — the backend owns the truth.

const SAVE_KEY = 'minigotchi.save'
const DIRTY_KEY = 'minigotchi.dirty'
const SESSION_KEY = 'minigotchi.session'
const LAST_NOTIFIED_KEY = 'minigotchi.lastNotifiedAt'

export interface AuthSession {
  userId: string // "provider:sub"
  provider: 'google' | 'microsoft'
  email: string
  name: string
  avatar: string | null
  /** backend session JWT used for /api/* calls */
  backendToken: string
  /** ms timestamp after which backendToken is expired */
  backendTokenExp: number
}

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

export async function loadSession(): Promise<AuthSession | null> {
  const data = await chrome.storage.local.get(SESSION_KEY)
  return (data[SESSION_KEY] as AuthSession | undefined) ?? null
}

export async function storeSession(session: AuthSession): Promise<void> {
  await chrome.storage.local.set({ [SESSION_KEY]: session })
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(SESSION_KEY)
}

export async function getLastNotifiedAt(): Promise<number> {
  const data = await chrome.storage.local.get(LAST_NOTIFIED_KEY)
  return (data[LAST_NOTIFIED_KEY] as number | undefined) ?? 0
}

export async function setLastNotifiedAt(t: number): Promise<void> {
  await chrome.storage.local.set({ [LAST_NOTIFIED_KEY]: t })
}
