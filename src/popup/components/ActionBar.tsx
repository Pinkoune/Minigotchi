import type { PetState } from '../../game/types'

export type ActionColor = 'orange' | 'green' | 'blue' | 'purple' | 'red' | 'grey' | 'yellow'

export interface ActionDef {
  id: string
  label: string
  /** Full image path — mixes Kenney game icons and original SVGs. */
  iconSrc: string
  /** Kenney UI-pack button colour (one per action, playful on purpose). */
  color: ActionColor
  disabled?: boolean
  badge?: boolean
  onClick: () => void
}

export function ActionBar({ actions }: { actions: ActionDef[] }) {
  return (
    <div className="action-bar">
      {actions.map((a) => (
        <button
          key={a.id}
          className={`action-btn action-${a.color}${a.badge ? ' action-badge' : ''}`}
          onClick={a.onClick}
          disabled={a.disabled}
          title={a.label}
        >
          <span className="action-icon">
            <img src={a.iconSrc} alt="" width={20} height={20} />
          </span>
          <span className="action-label">{a.label}</span>
        </button>
      ))}
    </div>
  )
}

export function needsAttention(pet: PetState): boolean {
  return pet.attentionCall !== null
}
