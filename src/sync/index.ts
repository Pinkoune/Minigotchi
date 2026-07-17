import type { GameAction, SaveData } from '../game/types'
import { applyAction, applyDecay } from '../game/engine'
import { migrate } from '../game/save'
import type { AuthSession } from '../storage'
import { isDirty, loadLocalSave, setDirty, storeLocalSave } from '../storage'
import { ConflictError, getSave, putSave } from './api'

export type SyncStatus =
  | 'local-only' // not signed in: cache only
  | 'synced'
  | 'syncing'
  | 'offline'
  | 'conflict-resolved'

/**
 * Initial reconciliation between the local cache and the server save.
 * The server is the source of truth: on ambiguity it wins. Offline decay is
 * applied exactly once, from the adopted save's own lastTick.
 */
export async function adoptInitialSave(
  session: AuthSession | null,
  now: number,
): Promise<{ save: SaveData | null; status: SyncStatus }> {
  const local = await loadLocalSave()

  if (!session) {
    if (!local) return { save: null, status: 'local-only' }
    const { save } = applyDecay(local, now)
    await storeLocalSave(save)
    return { save, status: 'local-only' }
  }

  let server: Awaited<ReturnType<typeof getSave>>
  try {
    server = await getSave(session.backendToken)
  } catch {
    // API unreachable: keep playing on the cache, flag for later flush.
    if (!local) return { save: null, status: 'offline' }
    const { save } = applyDecay(local, now)
    await storeLocalSave(save)
    await setDirty(true)
    return { save, status: 'offline' }
  }

  let adopted: SaveData | null = null
  if (server && local) {
    // Prefer the highest server revision; on equal rev the freshest tick.
    adopted =
      server.rev > local.rev || (server.rev === local.rev && server.save.lastTick >= local.lastTick)
        ? migrate(server.save)
        : local
  } else if (server) {
    adopted = migrate(server.save)
  } else if (local) {
    adopted = local // fresh account on server: local progress is pushed below
  }

  if (!adopted) return { save: null, status: 'synced' }

  adopted = { ...adopted, userId: session.userId }
  const { save } = applyDecay(adopted, now)
  await storeLocalSave(save)
  const status = await pushSave(session, save, [])
  return { save, status }
}

/**
 * Push the save to the server. On 409 the server save is adopted, decayed
 * from its own lastTick, the still-pending user actions are replayed on top,
 * and the PUT is retried once — a change made on another device is never
 * silently overwritten.
 */
export async function pushSave(
  session: AuthSession,
  save: SaveData,
  pendingActions: GameAction[],
): Promise<SyncStatus> {
  try {
    const res = await putSave(session.backendToken, save, save.rev)
    await storeLocalSave({ ...save, rev: res.rev })
    await setDirty(false)
    return 'synced'
  } catch (err) {
    if (err instanceof ConflictError) {
      const now = Date.now()
      let merged = applyDecay(migrate(err.serverSave.save), now).save
      merged = { ...merged, rev: err.serverSave.rev }
      for (const action of pendingActions) {
        merged = applyAction(merged, action, now).save
      }
      try {
        const res = await putSave(session.backendToken, merged, merged.rev)
        await storeLocalSave({ ...merged, rev: res.rev })
        await setDirty(false)
        return 'conflict-resolved'
      } catch {
        await storeLocalSave(merged)
        await setDirty(true)
        return 'offline'
      }
    }
    await setDirty(true)
    return 'offline'
  }
}

/** Flush the cache to the server if it was written while offline. */
export async function flushIfDirty(session: AuthSession | null): Promise<void> {
  if (!session || Date.now() >= session.backendTokenExp) return
  if (!(await isDirty())) return
  const local = await loadLocalSave()
  if (!local) return
  await pushSave(session, local, [])
}

/** Debounce helper for the push-after-action pattern. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: A) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}
