import { useGame } from '../store'

// Microsoft is opt-in: without a client ID configured the button is hidden,
// so a Google-only (or fully local) setup stays simple.
const MICROSOFT_ENABLED = Boolean(import.meta.env.VITE_MICROSOFT_CLIENT_ID)

export function LoginScreen() {
  const { login, playOffline, authBusy, authError } = useGame()
  return (
    <div className="login-screen">
      <img src="/assets/icons/logo.svg" alt="Minigotchi" width={96} height={96} />
      <h1>Minigotchi</h1>
      <p className="login-sub">
        Votre petit compagnon vit dans le navigateur. Connectez-vous pour retrouver sa
        progression sur tous vos appareils.
      </p>
      <div className="login-buttons">
        <button className="login-btn" onClick={() => login('google')} disabled={authBusy}>
          <img src="/assets/icons/provider-google.svg" alt="" width={18} height={18} />
          Continuer avec Google
        </button>
        {MICROSOFT_ENABLED && (
          <button className="login-btn" onClick={() => login('microsoft')} disabled={authBusy}>
            <img src="/assets/icons/provider-microsoft.svg" alt="" width={18} height={18} />
            Continuer avec Microsoft
          </button>
        )}
        <button className="login-skip" onClick={playOffline} disabled={authBusy}>
          Jouer sans compte (progression locale)
        </button>
      </div>
      {authBusy && <p className="login-status">Connexion en cours…</p>}
      {authError && <p className="login-error">{authError}</p>}
    </div>
  )
}
