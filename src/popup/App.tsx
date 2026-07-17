import { useEffect } from 'react'
import { useGame, startPopupTicker, type Screen } from './store'
import { LoginScreen } from './screens/Login'
import { NurseryScreen } from './screens/Nursery'
import { GameScreen } from './screens/Game'
import { ShopScreen } from './screens/Shop'
import { MiniGamesScreen } from './screens/MiniGames'
import { DexScreen } from './screens/Dex'
import { SettingsScreen } from './screens/Settings'
import { CoinCounter, SyncIndicator, Toasts } from './components/Hud'

// Kenney "Game Icons" (CC0) for the bottom navigation.
const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'game', label: 'Pet', icon: 'home' },
  { id: 'shop', label: 'Boutique', icon: 'shoppingCart' },
  { id: 'minigames', label: 'Jeux', icon: 'gamepad' },
  { id: 'dex', label: 'Dex', icon: 'menuList' },
  { id: 'settings', label: 'Réglages', icon: 'gear' },
]

export default function App() {
  const { ready, save, screen, setScreen, syncStatus, init, showLogin } = useGame()

  useEffect(() => {
    void init()
    return startPopupTicker()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) {
    return (
      <div className="app app-loading">
        <img src="/assets/icons/logo.svg" alt="" width={64} height={64} />
      </div>
    )
  }

  if (showLogin) {
    return (
      <div className="app">
        <LoginScreen />
        <Toasts />
      </div>
    )
  }

  const noLivingPet = !save?.pet || !save.pet.alive

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar-title">Minigotchi</span>
        <SyncIndicator status={syncStatus} />
        {save && <CoinCounter coins={save.coins} />}
      </header>

      <main className="content">
        {noLivingPet ? (
          <NurseryScreen />
        ) : screen === 'game' ? (
          <GameScreen />
        ) : screen === 'shop' ? (
          <ShopScreen />
        ) : screen === 'minigames' ? (
          <MiniGamesScreen />
        ) : screen === 'dex' ? (
          <DexScreen />
        ) : (
          <SettingsScreen />
        )}
      </main>

      {!noLivingPet && (
        <nav className="bottomnav">
          {NAV.map((n) => {
            const active = screen === n.id
            return (
              <button
                key={n.id}
                className={active ? 'nav-active' : ''}
                onClick={() => setScreen(n.id)}
                title={n.label}
              >
                <span className="nav-chip">
                  <img
                    src={`/assets/ui/icons/${n.icon}-${active ? 'white' : 'black'}.png`}
                    alt={n.label}
                    width={18}
                    height={18}
                    className="nav-icon"
                  />
                </span>
                <span>{n.label}</span>
              </button>
            )
          })}
        </nav>
      )}
      <Toasts />
    </div>
  )
}
