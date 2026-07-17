import { useState } from 'react'
import { useGame } from '../store'
import { PetSprite } from '../components/Pet'
import { StatsBars } from '../components/StatsBar'
import { ActionBar, type ActionDef } from '../components/ActionBar'
import { isNightAt } from '../../game/engine'
import { formById } from '../../game/evolution'
import { shopItemById } from '../../game/economy'
import { dominantTrait, TRAIT_LABELS } from '../../game/personality'
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
    { id: 'feed', label: 'Nourrir', icon: 'feed', disabled: isEgg || pet.sleeping, onClick: () => setFeedOpen((v) => !v) },
    { id: 'play', label: 'Jouer', icon: 'play', disabled: isEgg || pet.sleeping || pet.stats.energy < 10, onClick: () => dispatch({ type: 'play' }) },
    { id: 'clean', label: 'Laver', icon: 'clean', disabled: isEgg, badge: pet.poops.length > 0, onClick: () => dispatch({ type: 'clean' }) },
    pet.sleeping
      ? { id: 'wake', label: 'Réveiller', icon: 'wake', onClick: () => dispatch({ type: 'wake' }) }
      : { id: 'sleep', label: 'Dodo', icon: 'sleep', disabled: isEgg, onClick: () => dispatch({ type: 'sleep' }) },
    { id: 'medicine', label: 'Soigner', icon: 'medicine', disabled: isEgg || !pet.sick, badge: pet.sick, onClick: () => dispatch({ type: 'medicine' }) },
    { id: 'scold', label: 'Gronder', icon: 'scold', disabled: isEgg, badge: pet.attentionCall !== null, onClick: () => dispatch({ type: 'scold' }) },
    { id: 'praise', label: 'Féliciter', icon: 'praise', disabled: isEgg, onClick: () => dispatch({ type: 'praise' }) },
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
            <img src="/assets/icons/attention.svg" alt="!" width={22} height={22} />
          </div>
        )}
        <PetSprite pet={pet} accessory={save.equipped.accessory} eating={eating} />
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
