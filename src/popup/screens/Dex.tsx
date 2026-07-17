import { useGame } from '../store'
import { FORMS } from '../../game/evolution'
import { ACHIEVEMENTS } from '../../game/achievements'
import { animalPreviewUrl } from '../petAnimals'

const STAGE_ORDER = ['egg', 'baby', 'child', 'teen', 'adult', 'senior'] as const

export function DexScreen() {
  const save = useGame((s) => s.save)
  if (!save) return null

  return (
    <div className="dex">
      <h3>Encyclopédie</h3>
      <div className="dex-grid">
        {STAGE_ORDER.flatMap((stage) => FORMS.filter((f) => f.stage === stage)).map((form) => {
          const unlocked = save.dex.includes(form.id) || form.id === 'egg'
          const preview = form.id === 'egg' ? '/assets/icons/egg.svg' : animalPreviewUrl(form.id)
          return (
            <div key={form.id} className={`dex-entry${unlocked ? '' : ' dex-locked'}`} title={unlocked ? form.description : '???'}>
              {unlocked && preview ? (
                <img src={preview} alt={form.name} width={48} height={48} className="dex-preview" />
              ) : (
                <img src="/assets/ui/icons/question-black.png" alt="?" width={30} height={30} className="dex-unknown-icon" />
              )}
              <span>{unlocked ? form.name : '???'}</span>
            </div>
          )
        })}
      </div>

      <h3>Succès</h3>
      <ul className="achievements">
        {ACHIEVEMENTS.map((a) => {
          const done = save.achievements.includes(a.id)
          return (
            <li key={a.id} className={done ? 'ach-done' : 'ach-todo'}>
              <img
                src={`/assets/ui/icons/${done ? 'trophy' : 'locked'}-black.png`}
                alt=""
                width={20}
                height={20}
              />
              <div>
                <strong>{a.name}</strong>
                <span>{a.description}</span>
              </div>
            </li>
          )
        })}
      </ul>

      {save.lineage.length > 0 && (
        <>
          <h3>Cimetière</h3>
          <ul className="lineage">
            {save.lineage.map((l, i) => (
              <li key={i}>
                <img src="/assets/icons/grave.svg" alt="" width={18} height={18} />
                <span>
                  {l.name} — {new Date(l.bornAt).toLocaleDateString()} →{' '}
                  {new Date(l.diedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
