import type { PetState } from '../../game/types'

export interface ActionDef {
  id: string
  label: string
  icon: string
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
          className={`action-btn${a.badge ? ' action-badge' : ''}`}
          onClick={a.onClick}
          disabled={a.disabled}
          title={a.label}
        >
          <img src={`/assets/icons/action-${a.icon}.svg`} alt="" width={22} height={22} />
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  )
}

export function needsAttention(pet: PetState): boolean {
  return pet.attentionCall !== null
}
