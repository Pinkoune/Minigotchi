// Real UI sounds from Kenney's "Interface Sounds" pack (CC0 — see
// public/assets/ATTRIBUTIONS.md). Samples are fetched lazily and decoded
// into WebAudio buffers so rapid retriggers overlap cleanly. Popup-only:
// the service worker never plays audio.

import type { GameEvent } from '../game/types'

const SOUND_FILES = {
  click: 'click_001',
  play: 'select_001',
  praised: 'select_005',
  fed: 'confirmation_001',
  healed: 'confirmation_002',
  coins: 'confirmation_003',
  evolved: 'glass_001',
  achievement: 'glass_006',
  sick: 'error_001',
  refused: 'error_002',
  died: 'error_008',
  woke: 'maximize_001',
  slept: 'minimize_001',
  cleaned: 'drop_001',
  toggle: 'switch_001',
  scold: 'scratch_001',
} as const

type SoundName = keyof typeof SOUND_FILES

let ctx: AudioContext | null = null
const buffers = new Map<SoundName, AudioBuffer>()
const loading = new Map<SoundName, Promise<AudioBuffer | null>>()

function audioCtx(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    return ctx
  } catch {
    return null
  }
}

function assetUrl(file: string): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(`assets/sounds/${file}.ogg`)
    }
  } catch {
    /* not in an extension context (e.g. tests) */
  }
  return `/assets/sounds/${file}.ogg`
}

function load(name: SoundName): Promise<AudioBuffer | null> {
  const ac = audioCtx()
  if (!ac) return Promise.resolve(null)
  const cached = buffers.get(name)
  if (cached) return Promise.resolve(cached)
  const inflight = loading.get(name)
  if (inflight) return inflight
  const p = (async () => {
    try {
      const res = await fetch(assetUrl(SOUND_FILES[name]))
      const arr = await res.arrayBuffer()
      const buf = await ac.decodeAudioData(arr)
      buffers.set(name, buf)
      return buf
    } catch {
      return null
    }
  })()
  loading.set(name, p)
  return p
}

async function play(name: SoundName, volume: number): Promise<void> {
  const ac = audioCtx()
  if (!ac) return
  // Autoplay policies suspend the context until a user gesture; resume on play.
  if (ac.state === 'suspended') {
    try {
      await ac.resume()
    } catch {
      /* ignore */
    }
  }
  const buf = await load(name)
  if (!buf) return
  const src = ac.createBufferSource()
  const gain = ac.createGain()
  gain.gain.value = volume
  src.buffer = buf
  src.connect(gain).connect(ac.destination)
  src.start()
}

const EVENT_SOUND: Partial<Record<GameEvent['type'], SoundName>> = {
  fed: 'fed',
  played: 'play',
  cleaned: 'cleaned',
  healed: 'healed',
  slept: 'slept',
  woke: 'woke',
  evolved: 'evolved',
  hatched: 'evolved',
  coins: 'coins',
  bought: 'coins',
  streak: 'coins',
  achievement: 'achievement',
  refused: 'refused',
  scolded: 'scold',
  praised: 'praised',
  died: 'died',
  gotSick: 'sick',
  pooped: 'sick',
}

export function playEventSound(type: GameEvent['type']): void {
  const name = EVENT_SOUND[type]
  if (name) void play(name, 0.55)
}

/** Generic UI click, used on navigation and menu buttons. */
export function playClick(): void {
  void play('click', 0.35)
}

/** Confirmation blip when the user flips a setting on. */
export function playToggle(): void {
  void play('toggle', 0.45)
}
