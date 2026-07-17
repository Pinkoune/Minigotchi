// Service worker: the pet lives on while the popup is closed.
// A periodic alarm applies time-based decay, updates the toolbar badge and
// sends (throttled) notifications when the pet urgently needs care.

import { applyDecay, hasUrgentNeed } from '../game/engine'
import { getLastNotifiedAt, loadLocalSave, setLastNotifiedAt, storeLocalSave } from '../storage'

const TICK_ALARM = 'minigotchi-tick'
const TICK_MINUTES = 2
const NOTIFY_COOLDOWN_MS = 30 * 60_000

chrome.runtime.onInstalled.addListener(() => void ensureAlarm())
chrome.runtime.onStartup.addListener(() => void ensureAlarm())

async function ensureAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(TICK_ALARM)
  if (!existing) {
    await chrome.alarms.create(TICK_ALARM, { periodInMinutes: TICK_MINUTES })
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === TICK_ALARM) void tick()
})

async function tick(): Promise<void> {
  const save = await loadLocalSave()
  if (!save) {
    await chrome.action.setBadgeText({ text: '' })
    return
  }

  const now = Date.now()
  const { save: next, events } = applyDecay(save, now)
  await storeLocalSave(next)

  await updateBadge(hasUrgentNeed(next))

  const died = events.some((e) => e.type === 'died')
  if (next.settings.notifications && (hasUrgentNeed(next) || died)) {
    await maybeNotify(next, died, now)
  }

  // No network sync from the service worker: Firestore push happens from the
  // popup (debounced after actions, and once unconditionally on open), which
  // also covers flushing any writes made while offline.
}

async function updateBadge(urgent: boolean): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color: '#e5484d' })
  await chrome.action.setBadgeText({ text: urgent ? '!' : '' })
}

async function maybeNotify(
  save: NonNullable<Awaited<ReturnType<typeof loadLocalSave>>>,
  died: boolean,
  now: number,
): Promise<void> {
  const last = await getLastNotifiedAt()
  if (!died && now - last < NOTIFY_COOLDOWN_MS) return

  const pet = save.pet
  if (!pet) return
  let message: string
  if (died) message = `${pet.name} nous a quittés… Ouvrez Minigotchi pour lui dire adieu.`
  else if (pet.sick) message = `${pet.name} est malade et a besoin de soins !`
  else if (pet.stats.hunger < 20) message = `${pet.name} meurt de faim !`
  else if (pet.stats.hygiene < 20 || pet.poops.length >= 3) message = `${pet.name} a besoin d'un bon bain.`
  else if (pet.stats.health < 30) message = `${pet.name} ne se sent pas très bien…`
  else message = `${pet.name} réclame votre attention !`

  await chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icons/app-128.png'),
    title: 'Minigotchi',
    message,
    priority: 1,
  })
  await setLastNotifiedAt(now)
}
