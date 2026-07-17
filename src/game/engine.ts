import type {
  ActionResult,
  GameAction,
  GameEvent,
  PetState,
  Rng,
  SaveData,
} from './types'
import {
  DAILY_STREAK_BONUS,
  FALSE_CALL_CHANCE_PER_HOUR,
  HERITAGE_COINS,
  MAX_OFFLINE_DECAY_MS,
  NEGLECT_DEATH_MISTAKES,
  NIGHT_END_HOUR,
  NIGHT_START_HOUR,
  POOP_DELAY_MS,
  RANDOM_SICK_CHANCE_PER_HOUR,
  SICKNESS_DEATH_MS,
  SLEEP_REGEN_PER_HOUR,
  STAGE_DURATION,
} from './config'
import { clampStats, DECAY_PER_HOUR, isOverweight, WEIGHT_BY_STAGE } from './stats'
import { NEXT_STAGE, nextForm } from './evolution'
import { shopItemById } from './economy'
import { newEgg } from './save'
import { newlyUnlocked } from './achievements'
import { mulberry32 } from './rng'

const HOUR = 3_600_000
const SIM_STEP_MS = 5 * 60_000

export const isNightAt = (timestamp: number): boolean => {
  const h = new Date(timestamp).getHours()
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR
}

const dayKey = (timestamp: number): string => {
  const d = new Date(timestamp)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function addDex(save: SaveData, formId: string): SaveData {
  if (save.dex.includes(formId)) return save
  return { ...save, dex: [...save.dex, formId] }
}

function collectAchievements(save: SaveData, events: GameEvent[]): SaveData {
  const unlocked = newlyUnlocked(save)
  if (unlocked.length === 0) return save
  for (const id of unlocked) events.push({ type: 'achievement', id })
  return { ...save, achievements: [...save.achievements, ...unlocked] }
}

function killPet(save: SaveData, pet: PetState, cause: PetState['deathCause'] & string, now: number, events: GameEvent[]): SaveData {
  events.push({ type: 'died', cause })
  return {
    ...save,
    pet: { ...pet, alive: false, deathCause: cause, sleeping: false, attentionCall: null },
    lineage: [
      ...save.lineage,
      { name: pet.name, formId: pet.formId, stage: pet.stage, bornAt: pet.bornAt, diedAt: now, cause },
    ],
  }
}

/**
 * Advance the simulation from save.lastTick to `now`, applying stat decay,
 * poops, sickness, attention calls, evolution and death.
 *
 * Pure: same inputs (including rng seed) => same output. The applied decay is
 * capped at MAX_OFFLINE_DECAY_MS so long absences don't kill the pet outright,
 * but lastTick always ends at `now` so decay is never applied twice.
 */
export function applyDecay(save: SaveData, now: number, rng?: Rng): ActionResult {
  const events: GameEvent[] = []
  if (now <= save.lastTick) {
    return { save: { ...save, lastTick: Math.max(save.lastTick, now) }, events }
  }
  const random = rng ?? mulberry32(save.lastTick % 2147483647)
  const elapsed = Math.min(now - save.lastTick, MAX_OFFLINE_DECAY_MS)
  let next: SaveData = { ...save, lastTick: now }
  if (!save.pet || !save.pet.alive) return { save: next, events }

  let pet: PetState = { ...save.pet, stats: { ...save.pet.stats }, poops: [...save.pet.poops] }
  let t = now - elapsed
  let zeroMs = 0

  while (t < now && pet.alive) {
    const step = Math.min(SIM_STEP_MS, now - t)
    const stepEnd = t + step
    const hours = step / HOUR

    // --- Life stage progression -------------------------------------------
    const stageDur = STAGE_DURATION[pet.stage]
    if (stepEnd - pet.stageStartedAt >= stageDur) {
      const upcoming = NEXT_STAGE[pet.stage]
      if (upcoming) {
        const from = pet.formId
        const to = nextForm(pet, upcoming)
        pet = { ...pet, stage: upcoming, formId: to, stageStartedAt: pet.stageStartedAt + stageDur }
        next = addDex({ ...next }, to)
        events.push(pet.stage === 'baby' ? { type: 'hatched', formId: to } : { type: 'evolved', from, to })
      } else {
        // Senior reaching the end of its days.
        next = killPet(next, pet, 'old_age', stepEnd, events)
        pet = next.pet as PetState
        break
      }
    }

    if (pet.stage === 'egg') {
      t = stepEnd
      continue
    }

    // --- Sleep transitions on night boundary crossings ---------------------
    const wasNight = isNightAt(t)
    const nowNight = isNightAt(stepEnd)
    if (!wasNight && nowNight && !pet.sleeping) {
      pet = { ...pet, sleeping: true }
      events.push({ type: 'slept' })
    } else if (wasNight && !nowNight && pet.sleeping) {
      pet = { ...pet, sleeping: false }
      events.push({ type: 'woke' })
    } else if (!pet.sleeping && pet.stats.energy <= 2 && !nowNight) {
      pet = { ...pet, sleeping: true } // exhausted nap
      events.push({ type: 'slept' })
    }

    // --- Stat decay ---------------------------------------------------------
    const s = { ...pet.stats }
    const awakeFactor = pet.sleeping ? 0.4 : 1
    s.hunger -= DECAY_PER_HOUR.hunger * hours * awakeFactor
    s.happiness -= DECAY_PER_HOUR.happiness * hours * awakeFactor * (pet.sick ? 1.5 : 1)
    s.hygiene -= (DECAY_PER_HOUR.hygiene + pet.poops.length * 2) * hours
    s.energy += pet.sleeping
      ? SLEEP_REGEN_PER_HOUR * hours
      : -DECAY_PER_HOUR.energy * hours * (nowNight ? 1.6 : 1)

    // Health only degrades through consequences.
    if (s.hunger <= 0) s.health -= 3 * hours
    if (s.hygiene <= 0) s.health -= 2 * hours
    if (pet.sick) s.health -= 4 * hours
    if (isOverweight(pet.stage, pet.weight)) s.health -= 0.5 * hours
    pet = { ...pet, stats: clampStats(s) }

    // --- Poop schedule (a meal produces a dropping later) -------------------
    if (
      !pet.sleeping &&
      pet.lastMealAt + POOP_DELAY_MS > t &&
      pet.lastMealAt + POOP_DELAY_MS <= stepEnd
    ) {
      pet = { ...pet, poops: [...pet.poops, stepEnd] }
      events.push({ type: 'pooped' })
    }

    // --- Sickness -----------------------------------------------------------
    if (!pet.sick) {
      let chance = RANDOM_SICK_CHANCE_PER_HOUR * hours
      if (pet.stats.hygiene < 20) chance *= 4
      if (pet.poops.length >= 3) chance *= 3
      if (pet.stats.health < 30) chance *= 2
      if (random() < chance) {
        pet = { ...pet, sick: true, sickSince: stepEnd }
        events.push({ type: 'gotSick' })
      }
    } else if (pet.sickSince !== null && stepEnd - pet.sickSince >= SICKNESS_DEATH_MS) {
      next = killPet(next, pet, 'sickness', stepEnd, events)
      pet = next.pet as PetState
      break
    }

    // --- Attention calls ----------------------------------------------------
    if (!pet.attentionCall && !pet.sleeping) {
      const urgent = pet.stats.hunger < 15 || pet.stats.hygiene < 15 || pet.stats.happiness < 15
      if (urgent) {
        pet = { ...pet, attentionCall: { kind: 'real', since: stepEnd } }
      } else if (random() < FALSE_CALL_CHANCE_PER_HOUR * hours) {
        pet = { ...pet, attentionCall: { kind: 'false', since: stepEnd } }
      }
    } else if (pet.attentionCall && stepEnd - pet.attentionCall.since > HOUR) {
      // Ignored call expires; a real one counts as a care mistake.
      const mistake = pet.attentionCall.kind === 'real' ? 1 : 0
      pet = { ...pet, attentionCall: null, careMistakes: pet.careMistakes + mistake }
    }

    // --- Neglect accounting --------------------------------------------------
    if (pet.stats.hunger <= 0 || pet.stats.hygiene <= 0 || pet.stats.health <= 20) {
      zeroMs += step
      if (zeroMs >= HOUR) {
        pet = { ...pet, careMistakes: pet.careMistakes + Math.floor(zeroMs / HOUR) }
        zeroMs = zeroMs % HOUR
      }
    }

    if (pet.stats.health <= 0 || pet.careMistakes >= NEGLECT_DEATH_MISTAKES) {
      next = killPet(next, pet, pet.sick ? 'sickness' : 'neglect', stepEnd, events)
      pet = next.pet as PetState
      break
    }

    t = stepEnd
  }

  if (pet.alive) next = { ...next, pet }
  next = collectAchievements(next, events)
  return { save: next, events }
}

/** Update the daily-care streak; returns the updated save (+ bonus coins). */
function touchStreak(save: SaveData, now: number, events: GameEvent[]): SaveData {
  const today = dayKey(now)
  if (save.streak.lastCareDay === today) return save
  const yesterday = dayKey(now - 24 * HOUR)
  const count = save.streak.lastCareDay === yesterday ? save.streak.count + 1 : 1
  let coins = save.coins
  if (count > 1) {
    const bonus = DAILY_STREAK_BONUS
    coins += bonus
    events.push({ type: 'streak', count, bonus })
  }
  return { ...save, coins, streak: { lastCareDay: today, count } }
}

const refused = (save: SaveData, reason: string): ActionResult => ({
  save,
  events: [{ type: 'refused', reason }],
})

/**
 * Apply a user action. Always runs applyDecay first so the state acted upon
 * is current. Pure.
 */
export function applyAction(save: SaveData, action: GameAction, now: number, rng?: Rng): ActionResult {
  const decayed = applyDecay(save, now, rng)
  let current = decayed.save
  const events = [...decayed.events]

  // Actions that don't need a living pet.
  if (action.type === 'hatch' || action.type === 'restart') {
    if (current.pet?.alive) return refused(current, 'Un pet vit déjà ici.')
    const heritage = action.type === 'restart' && current.lineage.length > 0 ? HERITAGE_COINS : 0
    if (heritage > 0) events.push({ type: 'coins', amount: heritage })
    const save2 = collectAchievements(
      { ...current, pet: newEgg(action.name.trim() || 'Mini', now), coins: current.coins + heritage },
      events,
    )
    return { save: save2, events }
  }
  if (action.type === 'earnCoins') {
    const amount = Math.max(0, Math.floor(action.amount))
    events.push({ type: 'coins', amount })
    const save2 = collectAchievements({ ...current, coins: current.coins + amount }, events)
    return { save: save2, events }
  }
  if (action.type === 'buy') {
    const item = shopItemById(action.itemId)
    if (!item) return refused(current, 'Article inconnu.')
    if (current.coins < item.price) return refused(current, 'Pas assez de pièces.')
    const inv = { ...current.inventory, food: { ...current.inventory.food } }
    if (item.category === 'food') {
      inv.food[item.id] = (inv.food[item.id] ?? 0) + 1
    } else if (item.category === 'accessory') {
      if (inv.accessories.includes(item.id)) return refused(current, 'Déjà possédé.')
      inv.accessories = [...inv.accessories, item.id]
    } else {
      if (inv.backgrounds.includes(item.id)) return refused(current, 'Déjà possédé.')
      inv.backgrounds = [...inv.backgrounds, item.id]
    }
    events.push({ type: 'bought', itemId: item.id })
    const save2 = collectAchievements(
      { ...current, coins: current.coins - item.price, inventory: inv },
      events,
    )
    return { save: save2, events }
  }
  if (action.type === 'equip') {
    const { slot, itemId } = action
    if (slot === 'accessory') {
      if (itemId !== null && !current.inventory.accessories.includes(itemId))
        return refused(current, 'Accessoire non possédé.')
      return { save: { ...current, equipped: { ...current.equipped, accessory: itemId } }, events }
    }
    const bg = itemId ?? 'bg-room'
    if (bg !== 'bg-room' && !current.inventory.backgrounds.includes(bg))
      return refused(current, 'Fond non possédé.')
    return { save: { ...current, equipped: { ...current.equipped, background: bg } }, events }
  }

  const pet = current.pet
  if (!pet || !pet.alive) return refused(current, "Il n'y a pas de pet à soigner.")
  if (pet.stage === 'egg') return refused(current, "L'œuf n'a pas encore éclos…")

  const range = WEIGHT_BY_STAGE[pet.stage]
  let updated: PetState | null = null

  switch (action.type) {
    case 'feed': {
      if (pet.sleeping) return refused(current, 'Chut, il dort.')
      if (action.food === 'meal') {
        if (pet.stats.hunger >= 95) return refused(current, "Il n'a pas faim.")
        updated = {
          ...pet,
          stats: clampStats({ ...pet.stats, hunger: pet.stats.hunger + 40 }),
          weight: Math.min(range.max, pet.weight + 2),
          lastMealAt: now,
          totalMeals: pet.totalMeals + 1,
        }
        events.push({ type: 'fed', food: 'meal' })
      } else if (action.food === 'snack') {
        updated = {
          ...pet,
          stats: clampStats({ ...pet.stats, hunger: pet.stats.hunger + 10, happiness: pet.stats.happiness + 8 }),
          weight: Math.min(range.max, pet.weight + 1),
          lastMealAt: now,
          totalSnacks: pet.totalSnacks + 1,
          personality: { ...pet.personality, glutton: pet.personality.glutton + 1 },
        }
        events.push({ type: 'fed', food: 'snack' })
      } else {
        const item = shopItemById(action.food)
        const qty = current.inventory.food[action.food] ?? 0
        if (!item || item.category !== 'food') return refused(current, 'Nourriture inconnue.')
        if (qty <= 0) return refused(current, 'Stock épuisé — passez à la boutique.')
        const fx = item.effects ?? {}
        updated = {
          ...pet,
          stats: clampStats({
            ...pet.stats,
            hunger: pet.stats.hunger + (fx.hunger ?? 0),
            happiness: pet.stats.happiness + (fx.happiness ?? 0),
            health: pet.stats.health + (fx.health ?? 0),
          }),
          weight: Math.min(range.max, Math.max(range.min, pet.weight + (fx.weight ?? 0))),
          lastMealAt: now,
          totalMeals: pet.totalMeals + 1,
        }
        current = {
          ...current,
          inventory: {
            ...current.inventory,
            food: { ...current.inventory.food, [action.food]: qty - 1 },
          },
        }
        events.push({ type: 'fed', food: item.id })
      }
      break
    }
    case 'play': {
      if (pet.sleeping) return refused(current, 'Chut, il dort.')
      if (pet.stats.energy < 10) return refused(current, 'Trop fatigué pour jouer.')
      const bonus = Math.min(5, Math.floor(pet.personality.playful / 5))
      updated = {
        ...pet,
        stats: clampStats({
          ...pet.stats,
          happiness: pet.stats.happiness + 15 + bonus,
          energy: pet.stats.energy - 10,
        }),
        weight: Math.max(range.min, pet.weight - 1),
        totalPlays: pet.totalPlays + 1,
        personality: { ...pet.personality, playful: pet.personality.playful + 1 },
        attentionCall: pet.attentionCall?.kind === 'real' ? null : pet.attentionCall,
      }
      events.push({ type: 'played', happiness: 15 + bonus })
      break
    }
    case 'clean': {
      updated = {
        ...pet,
        poops: [],
        stats: clampStats({ ...pet.stats, hygiene: 100 }),
        personality: { ...pet.personality, tidy: pet.personality.tidy + 1 },
        attentionCall: pet.attentionCall?.kind === 'real' ? null : pet.attentionCall,
      }
      events.push({ type: 'cleaned' })
      break
    }
    case 'sleep': {
      if (pet.sleeping) return refused(current, 'Il dort déjà.')
      updated = {
        ...pet,
        sleeping: true,
        personality: { ...pet.personality, sleepy: pet.personality.sleepy + 1 },
      }
      events.push({ type: 'slept' })
      break
    }
    case 'wake': {
      if (!pet.sleeping) return refused(current, 'Il est déjà réveillé.')
      const grumpyWake = isNightAt(now)
      updated = {
        ...pet,
        sleeping: false,
        stats: clampStats({ ...pet.stats, happiness: pet.stats.happiness - (grumpyWake ? 8 : 0) }),
        personality: grumpyWake
          ? { ...pet.personality, grumpy: pet.personality.grumpy + 1 }
          : pet.personality,
      }
      events.push({ type: 'woke' })
      break
    }
    case 'medicine': {
      if (!pet.sick) return refused(current, "Il n'est pas malade.")
      updated = {
        ...pet,
        sick: false,
        sickSince: null,
        stats: clampStats({ ...pet.stats, health: pet.stats.health + 30 }),
      }
      events.push({ type: 'healed' })
      break
    }
    case 'scold': {
      const call = pet.attentionCall
      const deserved = call?.kind === 'false'
      updated = deserved
        ? {
            ...pet,
            attentionCall: null,
            discipline: Math.min(100, pet.discipline + 10),
          }
        : {
            ...pet,
            attentionCall: call?.kind === 'real' ? call : null,
            discipline: Math.min(100, pet.discipline + 2),
            stats: clampStats({ ...pet.stats, happiness: pet.stats.happiness - 10 }),
            personality: { ...pet.personality, grumpy: pet.personality.grumpy + 1 },
          }
      events.push({ type: 'scolded', deserved })
      break
    }
    case 'praise': {
      const wrongCall = pet.attentionCall?.kind === 'false'
      updated = {
        ...pet,
        attentionCall: wrongCall ? null : pet.attentionCall,
        discipline: wrongCall ? Math.max(0, pet.discipline - 5) : pet.discipline,
        stats: clampStats({ ...pet.stats, happiness: pet.stats.happiness + 8 }),
      }
      events.push({ type: 'praised' })
      break
    }
  }

  if (!updated) return { save: current, events }
  let result: SaveData = { ...current, pet: updated }
  result = touchStreak(result, now, events)
  result = collectAchievements(result, events)
  return { save: result, events }
}

/** True if any critical need is urgent (used for badge + notifications). */
export function hasUrgentNeed(save: SaveData): boolean {
  const pet = save.pet
  if (!pet || !pet.alive || pet.stage === 'egg') return false
  return (
    pet.sick ||
    pet.attentionCall !== null ||
    pet.stats.hunger < 20 ||
    pet.stats.hygiene < 20 ||
    pet.stats.health < 30 ||
    pet.poops.length >= 3
  )
}
