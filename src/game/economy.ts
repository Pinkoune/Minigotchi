export type ShopCategory = 'food' | 'accessory' | 'background'

export interface ShopItem {
  id: string
  name: string
  category: ShopCategory
  price: number
  description: string
  /** food only */
  effects?: { hunger?: number; happiness?: number; health?: number; weight?: number }
}

export const SHOP_ITEMS: ShopItem[] = [
  // Food (consumables)
  {
    id: 'berry',
    name: 'Baie sucrée',
    category: 'food',
    price: 5,
    description: 'Un petit en-cas qui rend heureux.',
    effects: { hunger: 10, happiness: 12, weight: 1 },
  },
  {
    id: 'super-meal',
    name: 'Super repas',
    category: 'food',
    price: 15,
    description: 'Un repas complet et équilibré.',
    effects: { hunger: 55, happiness: 5, weight: 2 },
  },
  {
    id: 'veggie',
    name: 'Légumes verts',
    category: 'food',
    price: 8,
    description: 'Nourrit sans faire grossir.',
    effects: { hunger: 25, weight: 0 },
  },
  {
    id: 'tonic',
    name: 'Tonique vital',
    category: 'food',
    price: 20,
    description: 'Redonne un peu de santé.',
    effects: { hunger: 5, health: 15 },
  },
  // Accessories (cosmetic only)
  { id: 'hat-party', name: 'Chapeau de fête', category: 'accessory', price: 40, description: 'Pour les grandes occasions.' },
  { id: 'hat-crown', name: 'Couronne', category: 'accessory', price: 80, description: 'Un port royal.' },
  { id: 'bow', name: 'Nœud papillon', category: 'accessory', price: 30, description: 'Très distingué.' },
  { id: 'glasses', name: 'Lunettes rondes', category: 'accessory', price: 35, description: 'Un air studieux.' },
  // Backgrounds (cosmetic only)
  { id: 'bg-meadow', name: 'Prairie', category: 'background', price: 50, description: 'Une prairie ensoleillée.' },
  { id: 'bg-beach', name: 'Plage', category: 'background', price: 50, description: 'Sable fin et vagues.' },
  { id: 'bg-space', name: 'Espace', category: 'background', price: 70, description: 'Parmi les étoiles.' },
]

export const shopItemById = (id: string): ShopItem | undefined =>
  SHOP_ITEMS.find((i) => i.id === id)

/**
 * Coin rewards for the mini-games, by outcome. Only the first
 * MINIGAME_DAILY_REWARDED_PLAYS plays of each game pay out per day (see
 * engine.ts), so these are tuned assuming ~3 rewarded rounds/day/game — a
 * full day of play nets roughly one mid-priced shop item, not the whole shop.
 */
export const MINIGAME_REWARDS = {
  rps: { win: 4, draw: 1, lose: 0 },
  memory: { perfect: 12, good: 8, ok: 4 },
  catch: (score: number): number => Math.min(15, Math.floor(score / 3)),
} as const
