import { type FirebaseApp, initializeApp } from 'firebase/app'
import { type Auth, indexedDBLocalPersistence, initializeAuth } from 'firebase/auth'
import { type Firestore, getFirestore } from 'firebase/firestore'

// The Firebase web config is not a secret (it's shipped in every client);
// access is controlled by Firestore security rules + provider allow-lists,
// not by hiding these values. Still injected via .env to keep per-project
// values out of source control and let CI/other builds target other projects.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null

export function firebaseApp(): FirebaseApp {
  app ??= initializeApp(firebaseConfig)
  return app
}

export function firebaseAuth(): Auth {
  // getAuth() lets the SDK auto-detect persistence, which falls back to
  // in-memory in an MV3 extension popup — the session then dies when the
  // popup closes. Pin indexedDB persistence so the session survives reopens.
  auth ??= initializeAuth(firebaseApp(), { persistence: indexedDBLocalPersistence })
  return auth
}

export function firestoreDb(): Firestore {
  db ??= getFirestore(firebaseApp())
  return db
}
