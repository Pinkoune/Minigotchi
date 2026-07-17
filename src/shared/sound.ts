// Tiny WebAudio synth: original chiptune-style blips, no audio files needed
// (keeps the extension fully offline and asset-license-free for sound).

import type { GameEvent } from '../game/types'

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    return ctx
  } catch {
    return null
  }
}

function blip(freqs: number[], duration = 0.09, type: OscillatorType = 'square', volume = 0.04): void {
  const ac = audioCtx()
  if (!ac) return
  let t = ac.currentTime
  for (const f of freqs) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.value = f
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + duration)
    t += duration * 0.9
  }
}

export function playEventSound(type: GameEvent['type']): void {
  switch (type) {
    case 'fed':
      blip([440, 550])
      break
    case 'played':
      blip([523, 659, 784])
      break
    case 'cleaned':
      blip([700, 900], 0.07, 'sine')
      break
    case 'healed':
      blip([392, 523, 659], 0.12, 'triangle')
      break
    case 'slept':
      blip([330, 262], 0.15, 'sine')
      break
    case 'woke':
      blip([262, 330, 392], 0.08, 'sine')
      break
    case 'evolved':
    case 'hatched':
      blip([523, 659, 784, 1046], 0.14, 'triangle', 0.05)
      break
    case 'coins':
    case 'streak':
    case 'bought':
      blip([880, 1175], 0.06)
      break
    case 'achievement':
      blip([659, 784, 988, 1319], 0.12, 'triangle', 0.05)
      break
    case 'refused':
    case 'scolded':
      blip([220, 180], 0.1, 'sawtooth', 0.03)
      break
    case 'died':
      blip([392, 330, 262, 196], 0.25, 'triangle', 0.05)
      break
    case 'gotSick':
    case 'pooped':
      blip([260, 200], 0.12, 'sawtooth', 0.03)
      break
    default:
      break
  }
}
