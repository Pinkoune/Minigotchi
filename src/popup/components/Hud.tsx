import type { SyncStatus } from '../../sync'
import { useGame } from '../store'

const SYNC_LABEL: Record<SyncStatus, { text: string; className: string }> = {
  'local-only': { text: 'Local', className: 'sync-local' },
  synced: { text: 'Synchronisé', className: 'sync-ok' },
  syncing: { text: 'Sync…', className: 'sync-busy' },
  offline: { text: 'Hors-ligne', className: 'sync-off' },
  'conflict-resolved': { text: 'Conflit résolu', className: 'sync-ok' },
}

export function SyncIndicator({ status }: { status: SyncStatus }) {
  const { text, className } = SYNC_LABEL[status]
  return (
    <span className={`sync-dot ${className}`} title={`Statut de synchronisation : ${text}`}>
      {text}
    </span>
  )
}

export function CoinCounter({ coins }: { coins: number }) {
  return (
    <span className="coins" title={`${coins} pièces`}>
      <img src="/assets/icons/coin.svg" alt="pièces" width={16} height={16} />
      {coins}
    </span>
  )
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  const dismiss = useGame((s) => s.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
