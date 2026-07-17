import { useState } from 'react'
import { useGame } from '../store'
import { formById } from '../../game/evolution'

/** Shown when there is no pet yet, or after a death (new egg / memorial). */
export function NurseryScreen() {
  const save = useGame((s) => s.save)
  const dispatch = useGame((s) => s.dispatch)
  const [name, setName] = useState('')
  const dead = save?.pet && !save.pet.alive ? save.pet : null

  const start = () => {
    dispatch({ type: dead || (save?.lineage.length ?? 0) > 0 ? 'restart' : 'hatch', name })
    setName('')
  }

  return (
    <div className="nursery">
      {dead ? (
        <>
          <h2>Adieu, {dead.name}…</h2>
          <p className="nursery-cause">
            {dead.deathCause === 'old_age'
              ? `${dead.name} s'est éteint paisiblement de vieillesse, sous sa forme ${formById(dead.formId).name}.`
              : dead.deathCause === 'sickness'
                ? `${dead.name} a succombé à la maladie. Un peu de médicament aurait aidé…`
                : `${dead.name} est parti par manque de soins. Prenez-en soin la prochaine fois…`}
          </p>
          <img src="/assets/icons/grave.svg" alt="" width={80} height={80} />
          {(save?.lineage.length ?? 0) > 0 && (
            <p className="nursery-heritage">Sa lignée vous laisse un petit héritage pour repartir.</p>
          )}
        </>
      ) : (
        <>
          <h2>Un nouvel œuf vous attend</h2>
          <img src="/assets/icons/egg.svg" alt="" width={90} height={90} />
        </>
      )}
      <label className="nursery-name">
        Nom du futur compagnon
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          placeholder="Mini"
          onKeyDown={(e) => e.key === 'Enter' && start()}
        />
      </label>
      <button className="primary" onClick={start}>
        {dead ? 'Adopter un nouvel œuf' : "Adopter l'œuf"}
      </button>
    </div>
  )
}
