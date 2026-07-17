import type { SaveData } from '../game/types'

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface SessionResponse {
  token: string
  user_id: string
  /** unix seconds */
  expires_at: number
}

export interface SaveResponse {
  save: SaveData
  rev: number
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown = null,
  ) {
    super(message)
  }
}

export class ConflictError extends ApiError {
  constructor(public serverSave: SaveResponse) {
    super(409, 'Save conflict')
  }
}

async function request(path: string, init: RequestInit = {}, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${API_URL}${path}`, { ...init, headers })
}

/** Exchange a provider ID token for a backend session JWT. */
export async function postSession(provider: string, idToken: string): Promise<SessionResponse> {
  const res = await request('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ provider, id_token: idToken }),
  })
  if (!res.ok) throw new ApiError(res.status, `Session refusée (${res.status})`)
  return (await res.json()) as SessionResponse
}

/** Refresh a still-valid backend session token. */
export async function refreshSession(token: string): Promise<SessionResponse> {
  const res = await request('/auth/refresh', { method: 'POST' }, token)
  if (!res.ok) throw new ApiError(res.status, `Refresh refusé (${res.status})`)
  return (await res.json()) as SessionResponse
}

/** null means the user has no server save yet (fresh account). */
export async function getSave(token: string): Promise<SaveResponse | null> {
  const res = await request('/api/save', {}, token)
  if (res.status === 404) return null
  if (!res.ok) throw new ApiError(res.status, `GET /api/save: ${res.status}`)
  return (await res.json()) as SaveResponse
}

/**
 * Optimistic-concurrency write: `baseRev` is the revision our copy is based
 * on. On mismatch the server answers 409 with its current save, surfaced
 * here as ConflictError.
 */
export async function putSave(token: string, save: SaveData, baseRev: number): Promise<SaveResponse> {
  const res = await request(
    '/api/save',
    { method: 'PUT', body: JSON.stringify({ save, base_rev: baseRev }) },
    token,
  )
  if (res.status === 409) {
    throw new ConflictError((await res.json()) as SaveResponse)
  }
  if (!res.ok) throw new ApiError(res.status, `PUT /api/save: ${res.status}`)
  return (await res.json()) as SaveResponse
}
