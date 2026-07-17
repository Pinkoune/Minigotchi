import { describe, expect, it } from 'vitest'
import {
  applyAction,
  applyDecay,
  hasUrgentNeed,
  isNightAt,
} from '../src/game/engine'
import { newEgg, newSave, migrate, SCHEMA_VERSION } from '../src/game/save'
import { NEGLECT_DEATH_MISTAKES, STAGE_DURATION } from '../src/game/config'
import type { SaveData } from '../src/game/types'

const HOUR = 3_600_000

// A fixed daytime reference (a Monday at 10:00 local time).
const DAY_T0 = new Date(2026, 0, 5, 10, 0, 0).getTime()

/** rng that never triggers random events, for deterministic tests */
const noLuck = () => 0.999999

function babySave(now = DAY_T0): SaveData {
  const save = newSave(now)
  const pet = newEgg('Testy', now - STAGE_DURATION.egg)
  return {
    ...save,
    pet: { ...pet, stage: 'baby', formId: 'blobby', stageStartedAt: now },
    lastTick: now,
  }
}

describe('applyDecay', () => {
  it('does nothing when no time has passed', () => {
    const save = babySave()
    const { save: out } = applyDecay(save, DAY_T0, noLuck)
    expect(out.pet?.stats).toEqual(save.pet?.stats)
  })

  it('decays stats over time while awake', () => {
    const save = babySave()
    const { save: out } = applyDecay(save, DAY_T0 + 2 * HOUR, noLuck)
    expect(out.pet!.stats.hunger).toBeLessThan(save.pet!.stats.hunger)
    expect(out.pet!.stats.energy).toBeLessThan(save.pet!.stats.energy)
    expect(out.lastTick).toBe(DAY_T0 + 2 * HOUR)
  })

  it('never applies decay twice for the same period', () => {
    const save = babySave()
    const once = applyDecay(save, DAY_T0 + 2 * HOUR, noLuck).save
    const twice = applyDecay(once, DAY_T0 + 2 * HOUR, noLuck).save
    expect(twice.pet?.stats).toEqual(once.pet?.stats)
  })

  it('caps offline decay so a long absence does not kill the pet', () => {
    const save = babySave()
    const week = 7 * 24 * HOUR
    const { save: out } = applyDecay(save, DAY_T0 + week, noLuck)
    expect(out.pet?.alive).toBe(true)
    expect(out.lastTick).toBe(DAY_T0 + week)
    // At most MAX_OFFLINE_DECAY_MS of decay was applied: the pet is hungry
    // and dirty but never starved to death by a long absence alone.
    expect(out.pet!.stats.hunger).toBeGreaterThan(0)
    expect(out.pet!.careMistakes).toBeLessThan(NEGLECT_DEATH_MISTAKES)
  })

  it('hatches the egg after the egg stage duration', () => {
    const now = DAY_T0
    const save: SaveData = { ...newSave(now), pet: newEgg('Testy', now), lastTick: now }
    const { save: out, events } = applyDecay(save, now + STAGE_DURATION.egg + 60_000, noLuck)
    expect(out.pet?.stage).toBe('baby')
    expect(out.pet?.formId).toBe('blobby')
    expect(events.some((e) => e.type === 'hatched')).toBe(true)
    expect(out.dex).toContain('blobby')
  })

  it('regenerates energy while sleeping', () => {
    const save = babySave()
    save.pet = { ...save.pet!, sleeping: true, stats: { ...save.pet!.stats, energy: 20 } }
    const { save: out } = applyDecay(save, DAY_T0 + 2 * HOUR, noLuck)
    expect(out.pet!.stats.energy).toBeGreaterThan(20)
  })

  it('spawns a poop some time after a meal', () => {
    const save = babySave()
    const fed = applyAction(save, { type: 'feed', food: 'meal' }, DAY_T0, noLuck).save
    const { save: out, events } = applyDecay(fed, DAY_T0 + 3 * HOUR, noLuck)
    expect(out.pet!.poops.length).toBe(1)
    expect(events.some((e) => e.type === 'pooped')).toBe(true)
  })

  it('kills the pet when care mistakes accumulate', () => {
    const save = babySave()
    save.pet = { ...save.pet!, careMistakes: NEGLECT_DEATH_MISTAKES }
    const { save: out, events } = applyDecay(save, DAY_T0 + 10 * 60_000, noLuck)
    expect(out.pet!.alive).toBe(false)
    expect(out.pet!.deathCause).toBe('neglect')
    expect(out.lineage).toHaveLength(1)
    expect(events.some((e) => e.type === 'died')).toBe(true)
  })

  it('kills an untreated sick pet after too long', () => {
    const save = babySave()
    save.pet = { ...save.pet!, sick: true, sickSince: DAY_T0 - 25 * HOUR }
    const { save: out } = applyDecay(save, DAY_T0 + HOUR, noLuck)
    expect(out.pet!.alive).toBe(false)
    expect(out.pet!.deathCause).toBe('sickness')
  })

  it('senior pets die of old age at the end of their stage', () => {
    const save = babySave()
    save.pet = {
      ...save.pet!,
      stage: 'senior',
      formId: 'sagey',
      stageStartedAt: DAY_T0 - STAGE_DURATION.senior + 60_000,
    }
    const { save: out } = applyDecay(save, DAY_T0 + 2 * 60_000, noLuck)
    expect(out.pet!.alive).toBe(false)
    expect(out.pet!.deathCause).toBe('old_age')
  })
})

describe('stage transitions', () => {
  it('evolves baby -> child with the right branch for good care', () => {
    const save = babySave()
    save.pet = { ...save.pet!, stageStartedAt: DAY_T0 - STAGE_DURATION.baby }
    const { save: out, events } = applyDecay(save, DAY_T0 + 60_000, noLuck)
    expect(out.pet!.stage).toBe('child')
    expect(out.pet!.formId).toBe('roundy')
    expect(events.some((e) => e.type === 'evolved')).toBe(true)
  })

  it('poor care leads to the spiky child', () => {
    const save = babySave()
    save.pet = {
      ...save.pet!,
      careMistakes: 8,
      stageStartedAt: DAY_T0 - STAGE_DURATION.baby,
    }
    const { save: out } = applyDecay(save, DAY_T0 + 60_000, noLuck)
    expect(out.pet!.formId).toBe('spiky')
  })

  it('overweight teens evolve into chonko', () => {
    const save = babySave()
    save.pet = {
      ...save.pet!,
      stage: 'teen',
      formId: 'flutter',
      weight: 26,
      stageStartedAt: DAY_T0 - STAGE_DURATION.teen,
    }
    const { save: out } = applyDecay(save, DAY_T0 + 60_000, noLuck)
    expect(out.pet!.stage).toBe('adult')
    expect(out.pet!.formId).toBe('chonko')
  })
})

describe('actions', () => {
  it('feeding a meal restores hunger and adds weight', () => {
    const save = babySave()
    save.pet = { ...save.pet!, stats: { ...save.pet!.stats, hunger: 40 } }
    const { save: out, events } = applyAction(save, { type: 'feed', food: 'meal' }, DAY_T0, noLuck)
    expect(out.pet!.stats.hunger).toBe(80)
    expect(out.pet!.weight).toBe(save.pet!.weight + 2)
    expect(events.some((e) => e.type === 'fed')).toBe(true)
  })

  it('refuses a meal when not hungry', () => {
    const save = babySave()
    save.pet = { ...save.pet!, stats: { ...save.pet!.stats, hunger: 98 } }
    const { events } = applyAction(save, { type: 'feed', food: 'meal' }, DAY_T0, noLuck)
    expect(events.some((e) => e.type === 'refused')).toBe(true)
  })

  it('cleaning removes poops and restores hygiene', () => {
    const save = babySave()
    save.pet = { ...save.pet!, poops: [DAY_T0 - HOUR], stats: { ...save.pet!.stats, hygiene: 10 } }
    const { save: out } = applyAction(save, { type: 'clean' }, DAY_T0, noLuck)
    expect(out.pet!.poops).toHaveLength(0)
    expect(out.pet!.stats.hygiene).toBe(100)
  })

  it('medicine cures sickness, and is refused otherwise', () => {
    const save = babySave()
    save.pet = { ...save.pet!, sick: true, sickSince: DAY_T0 - HOUR }
    const { save: out } = applyAction(save, { type: 'medicine' }, DAY_T0, noLuck)
    expect(out.pet!.sick).toBe(false)
    const { events } = applyAction(out, { type: 'medicine' }, DAY_T0, noLuck)
    expect(events.some((e) => e.type === 'refused')).toBe(true)
  })

  it('scolding a false call raises discipline without sadness', () => {
    const save = babySave()
    save.pet = { ...save.pet!, attentionCall: { kind: 'false', since: DAY_T0 }, discipline: 50 }
    const { save: out, events } = applyAction(save, { type: 'scold' }, DAY_T0, noLuck)
    expect(out.pet!.discipline).toBe(60)
    expect(out.pet!.attentionCall).toBeNull()
    expect(events.find((e) => e.type === 'scolded')).toMatchObject({ deserved: true })
  })

  it('scolding without reason lowers happiness', () => {
    const save = babySave()
    const before = save.pet!.stats.happiness
    const { save: out } = applyAction(save, { type: 'scold' }, DAY_T0, noLuck)
    expect(out.pet!.stats.happiness).toBeLessThan(before)
  })

  it('cannot play when exhausted', () => {
    const save = babySave()
    save.pet = { ...save.pet!, stats: { ...save.pet!.stats, energy: 5 } }
    const { events } = applyAction(save, { type: 'play' }, DAY_T0, noLuck)
    expect(events.some((e) => e.type === 'refused')).toBe(true)
  })

  it('restart after death grants a heritage bonus', () => {
    const save = babySave()
    save.pet = { ...save.pet!, alive: false, deathCause: 'neglect' }
    save.lineage = [
      { name: 'Old', formId: 'grumbo', stage: 'adult', bornAt: 0, diedAt: 1, cause: 'neglect' },
    ]
    const coins = save.coins
    const { save: out } = applyAction(save, { type: 'restart', name: 'Neo' }, DAY_T0, noLuck)
    expect(out.pet!.stage).toBe('egg')
    expect(out.pet!.alive).toBe(true)
    expect(out.coins).toBeGreaterThan(coins)
  })
})

describe('economy', () => {
  it('buys food into the inventory and spends coins', () => {
    const save = { ...babySave(), coins: 100 }
    const { save: out } = applyAction(save, { type: 'buy', itemId: 'berry' }, DAY_T0, noLuck)
    expect(out.coins).toBe(95)
    expect(out.inventory.food.berry).toBe(1)
  })

  it('refuses purchase without enough coins', () => {
    const save = { ...babySave(), coins: 1 }
    const { events } = applyAction(save, { type: 'buy', itemId: 'hat-crown' }, DAY_T0, noLuck)
    expect(events.some((e) => e.type === 'refused')).toBe(true)
  })

  it('feeding shop food consumes inventory', () => {
    let save = { ...babySave(), coins: 100 }
    save.pet = { ...save.pet!, stats: { ...save.pet!.stats, hunger: 40 } }
    save = applyAction(save, { type: 'buy', itemId: 'veggie' }, DAY_T0, noLuck).save
    const { save: out } = applyAction(save, { type: 'feed', food: 'veggie' }, DAY_T0, noLuck)
    expect(out.inventory.food.veggie).toBe(0)
    expect(out.pet!.stats.hunger).toBe(65)
  })

  it('earnCoins adds coins', () => {
    const save = babySave()
    const { save: out } = applyAction(save, { type: 'earnCoins', amount: 10, source: 'rps' }, DAY_T0, noLuck)
    expect(out.coins).toBe(save.coins + 10)
  })
})

describe('misc', () => {
  it('hasUrgentNeed flags a sick or starving pet', () => {
    const save = babySave()
    expect(hasUrgentNeed(save)).toBe(false)
    save.pet = { ...save.pet!, sick: true }
    expect(hasUrgentNeed(save)).toBe(true)
  })

  it('isNightAt matches the configured window', () => {
    expect(isNightAt(new Date(2026, 0, 5, 23, 0).getTime())).toBe(true)
    expect(isNightAt(new Date(2026, 0, 5, 12, 0).getTime())).toBe(false)
  })

  it('migrate stamps the current schema version', () => {
    const save = newSave(DAY_T0)
    const migrated = migrate({ ...save, schemaVersion: 0 })
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
  })
})
