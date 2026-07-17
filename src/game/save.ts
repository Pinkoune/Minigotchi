import type { MinigamePlayState, PetState, SaveData } from './types'
import { freshStats } from './stats'

export const SCHEMA_VERSION = 2

export function newEgg(name: string, now: number): PetState {
  return {
    name,
    formId: 'egg',
    stage: 'egg',
    bornAt: now,
    stageStartedAt: now,
    stats: freshStats(),
    weight: 1,
    sleeping: false,
    sick: false,
    sickSince: null,
    poops: [],
    discipline: 50,
    careMistakes: 0,
    attentionCall: null,
    personality: { playful: 0, grumpy: 0, glutton: 0, tidy: 0, sleepy: 0 },
    alive: true,
    deathCause: null,
    lastMealAt: now,
    totalSnacks: 0,
    totalMeals: 0,
    totalPlays: 0,
  }
}

const freshMinigamePlays = (): SaveData['minigamePlays'] => {
  const empty: MinigamePlayState = { day: null, count: 0 }
  return { rps: { ...empty }, memory: { ...empty }, catch: { ...empty } }
}

export function newSave(now: number, userId: string | null = null): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    userId,
    pet: null,
    coins: 50,
    inventory: { food: {}, accessories: [], backgrounds: [] },
    equipped: { accessory: null, background: 'bg-room' },
    dex: [],
    achievements: [],
    lineage: [],
    streak: { lastCareDay: null, count: 0 },
    minigamePlays: freshMinigamePlays(),
    settings: { sound: true, notifications: true },
    lastTick: now,
    rev: 0,
  }
}

/**
 * Migrate a save of any older schema version to the current one.
 * Runs on both client and server side (the server keeps the JSON opaque but
 * the client always migrates after reading). Add a case per version bump.
 */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid save payload')
  }
  const save = raw as Partial<SaveData> & { schemaVersion?: number }
  const version = save.schemaVersion ?? 0

  if (version > SCHEMA_VERSION) {
    // Save written by a newer client: keep it untouched rather than corrupt it.
    return save as SaveData
  }

  let migrated: SaveData = save as SaveData
  if (version < 2) {
    // Daily mini-game reward cap introduced: saves from before it existed
    // start with a clean slate rather than being treated as already capped.
    migrated = { ...migrated, minigamePlays: freshMinigamePlays() }
  }
  migrated = { ...migrated, schemaVersion: SCHEMA_VERSION }
  return migrated
}
