import type { LifeStage, Stats } from './types'

export const clamp = (v: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, v))

export const clampStats = (s: Stats): Stats => ({
  hunger: clamp(s.hunger),
  happiness: clamp(s.happiness),
  energy: clamp(s.energy),
  hygiene: clamp(s.hygiene),
  health: clamp(s.health),
})

export const freshStats = (): Stats => ({
  hunger: 80,
  happiness: 80,
  energy: 90,
  hygiene: 100,
  health: 100,
})

/** Decay rates in points per hour, while awake. */
export const DECAY_PER_HOUR: Stats = {
  hunger: 6,
  happiness: 4,
  energy: 5,
  hygiene: 3,
  health: 0, // health only drops through consequences (poop, sickness, hunger at 0)
}

/** Stat under which a need is considered urgent (badge / notifications). */
export const URGENT_THRESHOLD = 20

export const CRITICAL_STATS: (keyof Stats)[] = ['hunger', 'hygiene', 'health']

export interface WeightRange {
  min: number
  ideal: number
  max: number
}

export const WEIGHT_BY_STAGE: Record<LifeStage, WeightRange> = {
  egg: { min: 1, ideal: 1, max: 1 },
  baby: { min: 1, ideal: 3, max: 8 },
  child: { min: 3, ideal: 8, max: 16 },
  teen: { min: 6, ideal: 14, max: 26 },
  adult: { min: 10, ideal: 20, max: 40 },
  senior: { min: 10, ideal: 18, max: 40 },
}

export const isOverweight = (stage: LifeStage, weight: number): boolean =>
  weight > WEIGHT_BY_STAGE[stage].ideal * 1.5

export const isUnderweight = (stage: LifeStage, weight: number): boolean =>
  weight < WEIGHT_BY_STAGE[stage].min
