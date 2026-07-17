import type { PersonalityTrait, PetState } from './types'

export const TRAIT_LABELS: Record<PersonalityTrait, string> = {
  playful: 'Joueur',
  grumpy: 'Grognon',
  glutton: 'Gourmand',
  tidy: 'Soigné',
  sleepy: 'Dormeur',
}

/** The trait shaped the most by the owner's behaviour, if any stands out. */
export function dominantTrait(pet: PetState): PersonalityTrait | null {
  const entries = Object.entries(pet.personality) as [PersonalityTrait, number][]
  const [best, second] = [...entries].sort((a, b) => b[1] - a[1])
  if (best[1] < 5 || best[1] - second[1] < 2) return null
  return best[0]
}

export type Mood = 'happy' | 'neutral' | 'sad' | 'sick' | 'sleeping' | 'hungry' | 'dirty'

/** Visual mood used to pick the pet's expression. Priority matters. */
export function currentMood(pet: PetState): Mood {
  if (pet.sleeping) return 'sleeping'
  if (pet.sick) return 'sick'
  if (pet.stats.hunger < 25) return 'hungry'
  if (pet.stats.hygiene < 25) return 'dirty'
  if (pet.stats.happiness < 30) return 'sad'
  if (pet.stats.happiness > 70) return 'happy'
  return 'neutral'
}
