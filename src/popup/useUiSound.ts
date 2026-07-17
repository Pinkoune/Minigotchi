import { useGame } from './store'
import { playClick, playToggle } from '../shared/sound'

/** Returns UI-sound triggers that respect the player's sound setting. */
export function useUiSound() {
  const enabled = useGame((s) => s.save?.settings.sound ?? true)
  return {
    click: () => {
      if (enabled) playClick()
    },
    toggle: () => {
      if (enabled) playToggle()
    },
  }
}
