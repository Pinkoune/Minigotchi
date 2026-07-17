// Pure game types. Nothing in src/game/ may touch chrome.* APIs.

export type StatKey = 'hunger' | 'happiness' | 'energy' | 'hygiene' | 'health'

export type Stats = Record<StatKey, number>

export type LifeStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult' | 'senior'

export type PersonalityTrait = 'playful' | 'grumpy' | 'glutton' | 'tidy' | 'sleepy'

export type AttentionCall = {
  kind: 'real' | 'false'
  since: number
}

export interface PetState {
  name: string
  formId: string
  stage: LifeStage
  bornAt: number
  stageStartedAt: number
  stats: Stats
  /** kg-ish abstract unit; healthy range depends on stage */
  weight: number
  sleeping: boolean
  sick: boolean
  sickSince: number | null
  /** timestamps of droppings currently on screen */
  poops: number[]
  /** 0-100 */
  discipline: number
  careMistakes: number
  attentionCall: AttentionCall | null
  personality: Record<PersonalityTrait, number>
  alive: boolean
  deathCause: DeathCause | null
  /** ms timestamp of last meal, drives poop schedule */
  lastMealAt: number
  totalSnacks: number
  totalMeals: number
  totalPlays: number
}

export type DeathCause = 'neglect' | 'sickness' | 'old_age'

export interface LineageEntry {
  name: string
  formId: string
  stage: LifeStage
  bornAt: number
  diedAt: number
  cause: DeathCause
}

export interface Inventory {
  /** item id -> quantity (consumables) */
  food: Record<string, number>
  accessories: string[]
  backgrounds: string[]
}

export interface Equipped {
  accessory: string | null
  background: string
}

export interface StreakState {
  /** YYYY-MM-DD of the last day the pet received care */
  lastCareDay: string | null
  count: number
}

export type MinigameId = 'rps' | 'memory' | 'catch'

export interface MinigamePlayState {
  /** YYYY-MM-DD of `count`'s day; a different day resets the count to 0. */
  day: string | null
  count: number
}

export interface Settings {
  sound: boolean
  notifications: boolean
}

export interface SaveData {
  schemaVersion: number
  userId: string | null
  pet: PetState | null
  coins: number
  inventory: Inventory
  equipped: Equipped
  /** form ids ever reached, for the encyclopedia */
  dex: string[]
  achievements: string[]
  lineage: LineageEntry[]
  streak: StreakState
  /** Daily play counters per mini-game, gating coin rewards (not the plays themselves). */
  minigamePlays: Record<MinigameId, MinigamePlayState>
  settings: Settings
  /** timestamp of the last simulation step */
  lastTick: number
  /** server revision, incremented by the backend on each write */
  rev: number
}

export type GameAction =
  | { type: 'feed'; food: 'meal' | 'snack' | string }
  | { type: 'play' }
  | { type: 'clean' }
  | { type: 'sleep' }
  | { type: 'wake' }
  | { type: 'medicine' }
  | { type: 'scold' }
  | { type: 'praise' }
  | { type: 'hatch'; name: string }
  | { type: 'restart'; name: string }
  | { type: 'earnCoins'; amount: number; source: MinigameId }
  | { type: 'buy'; itemId: string }
  | { type: 'equip'; slot: 'accessory' | 'background'; itemId: string | null }

export interface ActionResult {
  save: SaveData
  /** human-readable feedback events for the UI (toasts / sounds) */
  events: GameEvent[]
}

export type GameEvent =
  | { type: 'refused'; reason: string }
  | { type: 'fed'; food: string }
  | { type: 'played'; happiness: number }
  | { type: 'cleaned' }
  | { type: 'slept' }
  | { type: 'woke' }
  | { type: 'healed' }
  | { type: 'scolded'; deserved: boolean }
  | { type: 'praised' }
  | { type: 'hatched'; formId: string }
  | { type: 'evolved'; from: string; to: string }
  | { type: 'died'; cause: DeathCause }
  | { type: 'pooped' }
  | { type: 'gotSick' }
  | { type: 'coins'; amount: number }
  | { type: 'bought'; itemId: string }
  | { type: 'achievement'; id: string }
  | { type: 'streak'; count: number; bonus: number }

/** Deterministic RNG so the engine stays pure and testable. */
export type Rng = () => number
