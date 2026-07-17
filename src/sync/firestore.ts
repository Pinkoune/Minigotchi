import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { firestoreDb } from '../firebase/config'
import type { SaveData } from '../game/types'

// Firestore is the source of truth, one document per user at saves/{uid}.
// Access is restricted to request.auth.uid == uid by firestore.rules.

export interface SaveResponse {
  save: SaveData
  rev: number
}

/** Thrown when a write's base_rev no longer matches the server: carries the
 * up-to-date server save so the caller can merge and retry. */
export class ConflictError extends Error {
  constructor(public serverSave: SaveResponse) {
    super('Save conflict')
  }
}

const saveRef = (uid: string) => doc(firestoreDb(), 'saves', uid)

/** null means the user has no save yet (fresh account). */
export async function getSave(uid: string): Promise<SaveResponse | null> {
  const snap = await getDoc(saveRef(uid))
  if (!snap.exists()) return null
  const data = snap.data() as SaveData
  return { save: data, rev: data.rev }
}

/**
 * Optimistic-concurrency write: `baseRev` is the revision our copy is based
 * on. The read-then-write happens inside a Firestore transaction, so a
 * concurrent write from another device is always detected — either as our
 * own rev mismatch check, or via Firestore's own transaction retry if the
 * document changes mid-transaction.
 */
export async function putSave(uid: string, save: SaveData, baseRev: number): Promise<SaveResponse> {
  const ref = saveRef(uid)
  return runTransaction(firestoreDb(), async (tx) => {
    const snap = await tx.get(ref)
    const currentRev = snap.exists() ? (snap.data() as SaveData).rev : 0
    if (snap.exists() && currentRev !== baseRev) {
      throw new ConflictError({ save: snap.data() as SaveData, rev: currentRev })
    }
    const written: SaveData = { ...save, rev: currentRev + 1 }
    tx.set(ref, written)
    return { save: written, rev: written.rev }
  })
}
