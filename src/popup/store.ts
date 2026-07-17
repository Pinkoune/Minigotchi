import { create } from 'zustand'
import type { GameAction, GameEvent, SaveData } from '../game/types'
import { applyAction, applyDecay } from '../game/engine'
import { newSave } from '../game/save'
import type { AuthSession } from '../storage'
import { loadSession, storeLocalSave } from '../storage'
import { adoptInitialSave, debounce, pushSave, type SyncStatus } from '../sync'
import { login as oauthLogin, logout as oauthLogout, type Provider } from '../auth'
import { playEventSound } from '../shared/sound'

export type Screen = 'game' | 'shop' | 'minigames' | 'dex' | 'settings'

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'success' | 'warning'
}

interface GameStore {
  ready: boolean
  session: AuthSession | null
  save: SaveData | null
  syncStatus: SyncStatus
  screen: Screen
  toasts: Toast[]
  authError: string | null
  authBusy: boolean
  showLogin: boolean

  init: () => Promise<void>
  login: (provider: Provider) => Promise<void>
  logout: () => Promise<void>
  playOffline: () => void
  dispatch: (action: GameAction) => void
  updateSettings: (partial: Partial<SaveData['settings']>) => void
  setScreen: (screen: Screen) => void
  dismissToast: (id: number) => void
}

let toastSeq = 0
let pendingActions: GameAction[] = []

const EVENT_TEXT: Partial<Record<GameEvent['type'], (e: GameEvent) => string>> = {
  refused: (e) => (e.type === 'refused' ? e.reason : ''),
  evolved: () => 'Votre pet a évolué !',
  hatched: () => "L'œuf a éclos !",
  gotSick: () => 'Oh non, il est tombé malade…',
  pooped: () => 'Oups, un petit accident…',
  achievement: () => 'Succès débloqué !',
  streak: (e) => (e.type === 'streak' ? `Série de ${e.count} jours ! +${e.bonus} pièces` : ''),
  coins: (e) => (e.type === 'coins' ? `+${e.amount} pièces` : ''),
}

export const useGame = create<GameStore>((set, get) => {
  const pushToServer = debounce(async () => {
    const { session, save } = get()
    if (!session || !save) return
    set({ syncStatus: 'syncing' })
    const actions = pendingActions
    const status = await pushSave(session, save, actions)
    // Actions replayed (or persisted) by pushSave are no longer pending.
    pendingActions = pendingActions.slice(actions.length)
    if (status !== 'offline') {
      // pushSave stored the authoritative rev; reload it into the store.
      const { loadLocalSave } = await import('../storage')
      const fresh = await loadLocalSave()
      if (fresh) set({ save: fresh })
    }
    set({ syncStatus: status })
  }, 1500)

  const emitToasts = (events: GameEvent[], sound: boolean) => {
    const toasts = events
      .map((e) => {
        const fmt = EVENT_TEXT[e.type]
        const text = fmt ? fmt(e) : null
        if (!text) return null
        const kind: Toast['kind'] =
          e.type === 'refused' || e.type === 'gotSick' ? 'warning'
          : e.type === 'achievement' || e.type === 'coins' || e.type === 'streak' ? 'success'
          : 'info'
        return { id: ++toastSeq, text, kind }
      })
      .filter((t): t is Toast => t !== null)
    if (toasts.length > 0) {
      set((s) => ({ toasts: [...s.toasts, ...toasts].slice(-4) }))
      setTimeout(() => {
        const ids = toasts.map((t) => t.id)
        set((s) => ({ toasts: s.toasts.filter((t) => !ids.includes(t.id)) }))
      }, 3500)
    }
    if (sound) for (const e of events) playEventSound(e.type)
  }

  return {
    ready: false,
    session: null,
    save: null,
    syncStatus: 'local-only',
    screen: 'game',
    toasts: [],
    authError: null,
    authBusy: false,
    showLogin: true,

    init: async () => {
      // An expired backend token still identifies the user for offline play;
      // API pushes will simply fail until the next login.
      const session = await loadSession()
      const { save, status } = await adoptInitialSave(session, Date.now())
      set({ ready: true, session, save, syncStatus: status, showLogin: !session })
    },

    login: async (provider) => {
      set({ authBusy: true, authError: null })
      try {
        const session = await oauthLogin(provider)
        const { save, status } = await adoptInitialSave(session, Date.now())
        set({ session, save, syncStatus: status, authBusy: false, showLogin: false })
      } catch (err) {
        set({ authBusy: false, authError: err instanceof Error ? err.message : String(err) })
      }
    },

    logout: async () => {
      await oauthLogout()
      set({ session: null, syncStatus: 'local-only', showLogin: true, screen: 'game' })
    },

    playOffline: () => {
      const { save } = get()
      if (!save) {
        const fresh = newSave(Date.now())
        void storeLocalSave(fresh)
        set({ save: fresh, syncStatus: 'local-only', session: null })
      }
      set({ ready: true, showLogin: false })
    },

    dispatch: (action) => {
      const { save, session } = get()
      const base = save ?? newSave(Date.now())
      const { save: next, events } = applyAction(base, action, Date.now())
      // Write-through cache first (offline-safe), then debounced server push.
      void storeLocalSave(next)
      pendingActions = [...pendingActions, action].slice(-20)
      set({ save: next })
      emitToasts(events, next.settings.sound)
      if (session) pushToServer()
    },

    updateSettings: (partial) => {
      const { save, session } = get()
      if (!save) return
      const next = { ...save, settings: { ...save.settings, ...partial } }
      void storeLocalSave(next)
      set({ save: next })
      if (session) pushToServer()
    },

    setScreen: (screen) => set({ screen }),
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  }
})

/** Re-apply decay every 30s while the popup is open so the UI stays live. */
export function startPopupTicker(): () => void {
  const interval = setInterval(() => {
    const { save, session } = useGame.getState()
    if (!save) return
    const { save: next, events } = applyDecay(save, Date.now())
    void storeLocalSave(next)
    useGame.setState({ save: next })
    if (events.length > 0 && session) void pushSaveQuiet(session, next)
  }, 30_000)
  return () => clearInterval(interval)
}

async function pushSaveQuiet(session: AuthSession, save: SaveData): Promise<void> {
  const status = await pushSave(session, save, [])
  useGame.setState({ syncStatus: status })
}
