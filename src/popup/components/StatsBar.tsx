import type { Stats } from '../../game/types'

const STAT_META: { key: keyof Stats; label: string; icon: string; color: string }[] = [
  { key: 'hunger', label: 'Faim', icon: 'food', color: '#f2a65a' },
  { key: 'happiness', label: 'Bonheur', icon: 'heart', color: '#e5748c' },
  { key: 'energy', label: 'Énergie', icon: 'bolt', color: '#ffd66b' },
  { key: 'hygiene', label: 'Hygiène', icon: 'drop', color: '#8fd3f4' },
  { key: 'health', label: 'Santé', icon: 'cross', color: '#a8d8a8' },
]

export function StatsBars({ stats }: { stats: Stats }) {
  return (
    <div className="stats">
      {STAT_META.map(({ key, label, icon, color }) => {
        const value = Math.round(stats[key])
        return (
          <div className="stat" key={key} title={`${label}: ${value}/100`}>
            <img src={`/assets/icons/stat-${icon}.svg`} alt={label} width={16} height={16} />
            <div className="stat-track">
              <div
                className={`stat-fill${value < 20 ? ' stat-critical' : ''}`}
                style={{ width: `${value}%`, background: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
