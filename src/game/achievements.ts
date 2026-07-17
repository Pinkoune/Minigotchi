import type { SaveData } from './types'

export interface AchievementDef {
  id: string
  name: string
  description: string
  check: (save: SaveData) => boolean
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-hatch',
    name: 'Première éclosion',
    description: 'Faire éclore votre premier œuf.',
    check: (s) => s.pet !== null && s.pet.stage !== 'egg',
  },
  {
    id: 'adult',
    name: "L'âge adulte",
    description: 'Amener un pet au stade adulte.',
    check: (s) => s.pet !== null && (s.pet.stage === 'adult' || s.pet.stage === 'senior'),
  },
  {
    id: 'perfect-care',
    name: 'Soins parfaits',
    description: 'Atteindre le stade adulte avec la forme Aureli.',
    check: (s) => s.dex.includes('aureli'),
  },
  {
    id: 'rich',
    name: 'Petit magot',
    description: 'Posséder 200 pièces.',
    check: (s) => s.coins >= 200,
  },
  {
    id: 'collector',
    name: 'Collectionneur',
    description: 'Débloquer 6 formes dans le Dex.',
    check: (s) => s.dex.length >= 6,
  },
  {
    id: 'streak-7',
    name: 'Semaine assidue',
    description: "Prendre soin de son pet 7 jours d'affilée.",
    check: (s) => s.streak.count >= 7,
  },
  {
    id: 'gourmet',
    name: 'Fin gourmet',
    description: 'Servir 50 repas au total.',
    check: (s) => s.pet !== null && s.pet.totalMeals >= 50,
  },
  {
    id: 'lineage',
    name: 'Lignée',
    description: 'Avoir un ancêtre au cimetière.',
    check: (s) => s.lineage.length >= 1,
  },
]

/** Returns newly unlocked achievement ids (pure — does not mutate). */
export function newlyUnlocked(save: SaveData): string[] {
  return ACHIEVEMENTS.filter(
    (a) => !save.achievements.includes(a.id) && a.check(save),
  ).map((a) => a.id)
}
