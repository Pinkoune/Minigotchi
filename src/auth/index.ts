import { challengeFromVerifier, randomState, randomVerifier } from './pkce'
import type { AuthSession } from '../storage'
import { storeSession, clearSession } from '../storage'
import { postSession } from '../sync/api'

export type Provider = 'google' | 'microsoft'

interface ProviderConfig {
  authEndpoint: string
  tokenEndpoint: string
  clientId: string
  scopes: string
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  google: {
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
    scopes: 'openid email profile',
  },
  microsoft: {
    authEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? '',
    scopes: 'openid email profile User.Read',
  },
}

export class AuthCancelledError extends Error {
  constructor() {
    super('Connexion annulée')
  }
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const payload = jwt.split('.')[1]
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(json) as Record<string, unknown>
}

/**
 * Full OAuth 2.0 authorization-code + PKCE flow via launchWebAuthFlow.
 * Exchanges the provider ID token for a backend session JWT.
 */
export async function login(provider: Provider): Promise<AuthSession> {
  const cfg = PROVIDERS[provider]
  if (!cfg.clientId) {
    throw new Error(
      `Client ID ${provider} manquant : configurez VITE_${provider.toUpperCase()}_CLIENT_ID dans .env`,
    )
  }
  const redirectUri = chrome.identity.getRedirectURL()
  const verifier = randomVerifier()
  const challenge = await challengeFromVerifier(verifier)
  const state = randomState()

  const authUrl = new URL(cfg.authEndpoint)
  authUrl.searchParams.set('client_id', cfg.clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', cfg.scopes)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  if (provider === 'google') authUrl.searchParams.set('prompt', 'select_account')

  const responseUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (url) => {
        if (chrome.runtime.lastError || !url) reject(new AuthCancelledError())
        else resolve(url)
      },
    )
  })

  const params = new URL(responseUrl).searchParams
  if (params.get('state') !== state) throw new Error('State OAuth invalide')
  const error = params.get('error')
  if (error === 'access_denied') throw new AuthCancelledError()
  if (error) throw new Error(`Erreur OAuth: ${error}`)
  const code = params.get('code')
  if (!code) throw new AuthCancelledError()

  // Code -> tokens (PKCE, public client: no secret involved).
  const tokenRes = await fetch(cfg.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })
  if (!tokenRes.ok) throw new Error(`Échange de code échoué (${tokenRes.status})`)
  const tokens = (await tokenRes.json()) as { id_token?: string }
  if (!tokens.id_token) throw new Error('Pas de id_token dans la réponse du provider')

  // The backend verifies the ID token against the provider JWKS and issues
  // our own session JWT — /api/* never depends on provider token lifetime.
  const backend = await postSession(provider, tokens.id_token)

  const claims = decodeJwtPayload(tokens.id_token)
  const session: AuthSession = {
    userId: backend.user_id,
    provider,
    email: (claims.email as string) ?? '',
    name: (claims.name as string) ?? (claims.email as string) ?? 'Joueur',
    avatar: (claims.picture as string | undefined) ?? null,
    backendToken: backend.token,
    backendTokenExp: backend.expires_at * 1000,
  }
  await storeSession(session)
  return session
}

export async function logout(): Promise<void> {
  await clearSession()
}

export const isSessionExpired = (session: AuthSession, now = Date.now()): boolean =>
  now >= session.backendTokenExp
