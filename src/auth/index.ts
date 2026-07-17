import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from 'firebase/auth'
import { challengeFromVerifier, randomState, randomVerifier } from './pkce'
import { firebaseAuth } from '../firebase/config'

export type Provider = 'google' | 'microsoft'

export interface UserProfile {
  userId: string // Firebase uid
  provider: Provider
  email: string
  name: string
  avatar: string | null
}

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

function toProfile(user: User, provider: Provider): UserProfile {
  return {
    userId: user.uid,
    provider,
    email: user.email ?? '',
    name: user.displayName ?? user.email ?? 'Joueur',
    avatar: user.photoURL,
  }
}

/**
 * Full OAuth 2.0 authorization-code + PKCE flow via launchWebAuthFlow,
 * followed by handing the provider ID token to Firebase Auth so it becomes
 * our session (Firebase verifies it against the provider's own keys and
 * mints a Firebase user + auto-refreshing ID token — no backend needed).
 */
export async function login(provider: Provider): Promise<UserProfile> {
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

  const credential =
    provider === 'google'
      ? GoogleAuthProvider.credential(tokens.id_token)
      : new OAuthProvider('microsoft.com').credential({ idToken: tokens.id_token })
  const userCred = await signInWithCredential(firebaseAuth(), credential)
  return toProfile(userCred.user, provider)
}

export async function logout(): Promise<void> {
  await signOut(firebaseAuth())
}

/** Resolves once Firebase Auth's persisted session has loaded (or null). */
export function waitForInitialUser(): Promise<UserProfile | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth(), (user) => {
      unsubscribe()
      resolve(user ? toProfile(user, guessProvider(user)) : null)
    })
  })
}

function guessProvider(user: User): Provider {
  const id = user.providerData[0]?.providerId ?? ''
  return id.includes('microsoft') ? 'microsoft' : 'google'
}
