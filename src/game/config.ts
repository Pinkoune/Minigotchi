import type { LifeStage } from './types'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Duration of each life stage, in ms. Tuned for a ~2 week full life. */
export const STAGE_DURATION: Record<LifeStage, number> = {
  egg: 10 * 60_000, // 10 minutes
  baby: 12 * HOUR,
  child: 2 * DAY,
  teen: 3 * DAY,
  adult: 6 * DAY,
  senior: 3 * DAY,
}

/**
 * Offline decay is capped so a few days away never kills the pet outright:
 * at most this much simulated time is applied in a single catch-up.
 */
export const MAX_OFFLINE_DECAY_MS = 12 * HOUR

/** Night window (local hours): the pet wants to sleep in this range. */
export const NIGHT_START_HOUR = 21
export const NIGHT_END_HOUR = 7

/** A meal produces a poop roughly this long after eating. */
export const POOP_DELAY_MS = 2 * HOUR

/** Chance per simulated hour of catching a random sickness (when healthy). */
export const RANDOM_SICK_CHANCE_PER_HOUR = 0.01

/** Chance per simulated hour of a false attention call (discipline training). */
export const FALSE_CALL_CHANCE_PER_HOUR = 0.05

/** After this many care mistakes the pet dies of neglect. */
export const NEGLECT_DEATH_MISTAKES = 12

/** Untreated sickness kills after this long. */
export const SICKNESS_DEATH_MS = 24 * HOUR

/** Energy regeneration per hour while sleeping. */
export const SLEEP_REGEN_PER_HOUR = 15

/** Small heritage bonus when restarting after a completed lineage. */
export const HERITAGE_COINS = 25

export const DAILY_STREAK_BONUS = 10
