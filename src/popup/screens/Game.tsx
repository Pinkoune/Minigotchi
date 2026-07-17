import { useState } from 'react'
import { useGame } from '../store'
import { Pet3D } from '../components/Pet3D'
import { AccessoryOverlay } from '../components/AccessoryOverlay'
import { StatsBars } from '../components/StatsBar'
import { ActionBar, type ActionDef } from '../components/ActionBar'
import { isNightAt } from '../../game/engine'
import { formById } from '../../game/evolution'
import { shopItemById } from '../../game/economy'
import { currentMood, dominantTrait, TRAIT_LABELS } from '../../game/personality'
import { isOverweight } from '../../game/stats'
import { currentSeason } from '../../shared/season'

const STAGE_LABEL: Record<string, string> = {
  egg: 'Œuf',
  baby: 'Bébé',
  child: 'Enfant',
  teen: 'Ado',
  adult: 'Adulte',
  senior: 'Senior',
}

export function GameScreen() {
  const save = useGame((s) => s.save)
  const dispatch = useGame((s) => s.dispatch)
  const [feedOpen, setFeedOpen] = useState(false)
  const [eating, setEating] = useState(false)
  if (!save?.pet) return null
  const pet = save.pet
  const night = isNightAt(Date.now())
  const season = currentSeason()
  const trait = dominantTrait(pet)
  const ageDays = Math.floor((Date.now() - pet.bornAt) / 86_400_000)

  const feed = (food: string) => {
    setFeedOpen(false)
    dispatch({ type: 'feed', food })
    setEating(true)
    setTimeout(() => setEating(false), 1200)
  }

  const isEgg = pet.stage === 'egg'
  const actions: ActionDef[] = [
    { id: 'feed', label: 'Nourrir', iconSrc: '/assets/icons/action-feed.svg', disabled: isEgg || pet.sleeping, onClick: () => setFeedOpen((v) => !v) },
    { id: 'play', label: 'Jouer', iconSrc: '/assets/ui/icons/gamepad-black.png', disabled: isEgg || pet.sleeping || pet.stats.energy < 10, onClick: () => dispatch({ type: 'play' }) },
    { id: 'clean', label: 'Laver', iconSrc: '/assets/icons/action-clean.svg', disabled: isEgg, badge: pet.poops.length > 0, onClick: () => dispatch({ type: 'clean' }) },
    pet.sleeping
      ? { id: 'wake', label: 'Réveiller', iconSrc: '/assets/icons/action-wake.svg', onClick: () => dispatch({ type: 'wake' }) }
      : { id: 'sleep', label: 'Dodo', iconSrc: '/assets/icons/action-sleep.svg', disabled: isEgg, onClick: () => dispatch({ type: 'sleep' }) },
    { id: 'medicine', label: 'Soigner', iconSrc: '/assets/icons/action-medicine.svg', disabled: isEgg || !pet.sick, badge: pet.sick, onClick: () => dispatch({ type: 'medicine' }) },
    { id: 'scold', label: 'Gronder', iconSrc: '/assets/ui/icons/exclamation-black.png', disabled: isEgg, badge: pet.attentionCall !== null, onClick: () => dispatch({ type: 'scold' }) },
    { id: 'praise', label: 'Féliciter', iconSrc: '/assets/ui/icons/star-black.png', disabled: isEgg, onClick: () => dispatch({ type: 'praise' }) },
  ]

  return (
    <div className="game-screen">
      <div className="pet-header">
        <div>
          <strong>{pet.name}</strong>
          <span className="pet-meta">
            {STAGE_LABEL[pet.stage]} · {formById(pet.formId).name} · {ageDays} j
          </span>
        </div>
        <span className="pet-meta">
          {pet.weight} kg{isOverweight(pet.stage, pet.weight) ? ' (surpoids)' : ''} · discipline{' '}
          {Math.round(pet.discipline)}
          {trait ? ` · ${TRAIT_LABELS[trait]}` : ''}
        </span>
      </div>

      <div className={`room bg-${save.equipped.background} season-${season}${night ? ' room-night' : ''}`}>
        {pet.attentionCall && (
          <div className="attention-bubble" title="Il réclame de l'attention… à raison ?">
            <img src="/assets/ui/icons/warning-black.png" alt="!" width={22} height={22} />
          </div>
        )}
        {isEgg ? (
          <img src="/assets/icons/egg.svg" alt={pet.name} width={110} height={110} className="egg-sprite" />
        ) : (
          <div className="pet-wrap">
            <Pet3D formId={pet.formId} mood={currentMood(pet)} dead={!pet.alive} eating={eating} />
            {save.equipped.accessory && <AccessoryOverlay id={save.equipped.accessory} />}
            {pet.sleeping && (
              <svg viewBox="0 0 40 30" width={44} height={33} className="zzz-overlay">
                <g fill="none" stroke="#dfe8f4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 22 h12 l-12 6 h12" />
                  <path d="M24 6 h10 l-10 8 h10" />
                </g>
              </svg>
            )}
          </div>
        )}
        <div className="poops">
          {pet.poops.map((t, i) => (
            <img key={t + i} src="/assets/icons/poop.svg" alt="crotte" width={26} height={26} className="poop" style={{ left: `${12 + (i * 53) % 76}%` }} />
          ))}
        </div>
        {night && <div className="night-overlay" />}
      </div>

      {isEgg ? (
        <p className="egg-hint">L'œuf frémit… il éclora bientôt. Revenez vite !</p>
      ) : (
        <StatsBars stats={pet.stats} />
      )}

      {feedOpen && !isEgg && (
        <div className="feed-menu">
          <button onClick={() => feed('meal')}>
            <img src="/assets/icons/food-meal.svg" alt="" width={18} height={18} /> Repas
          </button>
          <button onClick={() => feed('snack')}>
            <img src="/assets/icons/food-snack.svg" alt="" width={18} height={18} /> Snack
          </button>
          {Object.entries(save.inventory.food)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => (
              <button key={id} onClick={() => feed(id)}>
                <img src={`/assets/icons/item-${id}.svg`} alt="" width={18} height={18} />
                {shopItemById(id)?.name} ×{qty}
              </button>
            ))}
        </div>
      )}

      <ActionBar actions={actions} />
    </div>
  )
}
