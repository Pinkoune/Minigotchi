import type { LifeStage, PetState } from './types'
import { STAGE_DURATION } from './config'
import { isOverweight } from './stats'

export interface FormDef {
  id: string
  name: string
  stage: LifeStage
  description: string
}

/**
 * Original creature line ("Minis"). All art is original SVG — see
 * public/assets/ATTRIBUTIONS.md.
 */
export const FORMS: FormDef[] = [
  { id: 'egg', name: 'Œuf', stage: 'egg', description: 'Un œuf tacheté qui frémit doucement.' },
  { id: 'blobby', name: 'Blobby', stage: 'baby', description: 'Une petite goutte curieuse à peine éclose.' },
  { id: 'roundy', name: 'Roundy', stage: 'child', description: 'Un enfant rond et enjoué.' },
  { id: 'spiky', name: 'Spiky', stage: 'child', description: 'Un enfant piquant, un peu turbulent.' },
  { id: 'flutter', name: 'Flutter', stage: 'teen', description: 'Un ado léger qui rêve de voler.' },
  { id: 'bricky', name: 'Bricky', stage: 'teen', description: 'Un ado costaud et têtu.' },
  { id: 'aureli', name: 'Aureli', stage: 'adult', description: "L'adulte doré des soins parfaits." },
  { id: 'midori', name: 'Midori', stage: 'adult', description: 'Un adulte équilibré et serein.' },
  { id: 'grumbo', name: 'Grumbo', stage: 'adult', description: "L'adulte grognon né de la négligence." },
  { id: 'chonko', name: 'Chonko', stage: 'adult', description: 'Un adulte très (trop) bien nourri.' },
  { id: 'sagey', name: 'Sagey', stage: 'senior', description: 'Un vieux sage à la longue moustache.' },
  { id: 'creaky', name: 'Creaky', stage: 'senior', description: 'Un senior fatigué mais attachant.' },
]

export const formById = (id: string): FormDef => {
  const f = FORMS.find((f) => f.id === id)
  if (!f) throw new Error(`Unknown form: ${id}`)
  return f
}

export const NEXT_STAGE: Partial<Record<LifeStage, LifeStage>> = {
  egg: 'baby',
  baby: 'child',
  child: 'teen',
  teen: 'adult',
  adult: 'senior',
}

export const stageDuration = (stage: LifeStage): number => STAGE_DURATION[stage]

/**
 * Care quality is derived from accumulated care mistakes and discipline.
 * It decides which branch of the tree the pet takes.
 */
export function careQuality(pet: PetState): 'great' | 'good' | 'poor' {
  if (pet.careMistakes <= 2 && pet.discipline >= 60) return 'great'
  if (pet.careMistakes <= 6) return 'good'
  return 'poor'
}

/** Pick the form for the next stage based on how the pet was raised. */
export function nextForm(pet: PetState, nextStage: LifeStage): string {
  switch (nextStage) {
    case 'baby':
      return 'blobby'
    case 'child':
      return careQuality(pet) === 'poor' ? 'spiky' : 'roundy'
    case 'teen':
      return pet.personality.playful >= pet.personality.grumpy ? 'flutter' : 'bricky'
    case 'adult': {
      if (isOverweight(pet.stage, pet.weight)) return 'chonko'
      const q = careQuality(pet)
      if (q === 'great') return 'aureli'
      if (q === 'good') return 'midori'
      return 'grumbo'
    }
    case 'senior':
      return careQuality(pet) === 'poor' ? 'creaky' : 'sagey'
    default:
      return pet.formId
  }
}
