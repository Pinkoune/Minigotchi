import { useGame } from '../store'
import { SyncIndicator } from '../components/Hud'

export function SettingsScreen() {
  const { save, profile, syncStatus, updateSettings, logout } = useGame()
  if (!save) return null

  return (
    <div className="settings">
      <h3>Réglages</h3>

      <label className="setting-row">
        <span>Sons</span>
        <input
          type="checkbox"
          checked={save.settings.sound}
          onChange={(e) => updateSettings({ sound: e.target.checked })}
        />
      </label>
      <label className="setting-row">
        <span>Notifications</span>
        <input
          type="checkbox"
          checked={save.settings.notifications}
          onChange={(e) => updateSettings({ notifications: e.target.checked })}
        />
      </label>

      <h3>Compte</h3>
      {profile ? (
        <div className="account">
          {profile.avatar && <img src={profile.avatar} alt="" width={32} height={32} className="avatar" />}
          <div>
            <strong>{profile.name}</strong>
            <span>{profile.email}</span>
            <span className="account-provider">via {profile.provider === 'google' ? 'Google' : 'Microsoft'}</span>
          </div>
          <SyncIndicator status={syncStatus} />
          <button className="danger" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      ) : (
        <p className="account-hint">
          Non connecté — la progression reste sur cet appareil. Déconnectez-vous et reconnectez-vous
          depuis l'écran d'accueil pour la rattacher à un compte.
        </p>
      )}

      <p className="settings-footer">Minigotchi v0.1.0</p>
    </div>
  )
}
