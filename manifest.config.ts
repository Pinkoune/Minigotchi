import { defineManifest } from '@crxjs/vite-plugin'

// Public key pinning the extension ID to hohchkjjnffpcalkfkljcjhddgdfhdlc
// on every machine that loads it (dev, friends' browsers, Web Store zip).
// This keeps the OAuth redirect URI stable:
//   https://hohchkjjnffpcalkfkljcjhddgdfhdlc.chromiumapp.org/
// A public key is not a secret; committing it is standard practice.
const EXTENSION_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArksRy715/AYvTjZXVklIMKlwmG8EpI2KzCEXImt8h9gJegLTMIfG28Bsg19yiOjKkhnX/Sf5rsmgAHUg3Q3Alx8G5vatFsduRKyS59qsILxaWZNq6wpZ17HlMYP6YQAjjaDABEk5BVNE7b1aaVXNQsUxTSKCB3dWpnbEEO9tNdz3Ol6GyZV1wt+ekMQeDAld5V2+e+ZVT8Os9Nlmb/SbGlSLluJgiuMdLe8LHasPeyjZyFYvTDHma2ah9A+DyTKQmlsThl8a/iiLZFfXVn9YZWduPw/BKm7/B0zAqddV36BLDK2serLNgG6j9ZRxKeVV91srTQRf4XAqshexHDPlZwIDAQAB'

export default defineManifest({
  manifest_version: 3,
  key: EXTENSION_KEY,
  name: 'Minigotchi',
  version: '0.1.0',
  description: 'Un petit Tamagotchi qui vit dans votre navigateur.',
  action: {
    default_popup: 'index.html',
    default_icon: {
      16: 'assets/icons/app-16.png',
      48: 'assets/icons/app-48.png',
      128: 'assets/icons/app-128.png',
    },
  },
  icons: {
    16: 'assets/icons/app-16.png',
    48: 'assets/icons/app-48.png',
    128: 'assets/icons/app-128.png',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['identity', 'storage', 'alarms', 'notifications'],
  // Firebase Auth + Firestore + the OAuth PKCE token exchanges — all fixed
  // Google/Microsoft domains, no per-deployment backend to configure.
  host_permissions: [
    'https://oauth2.googleapis.com/*',
    'https://login.microsoftonline.com/*',
    'https://identitytoolkit.googleapis.com/*',
    'https://securetoken.googleapis.com/*',
    'https://firestore.googleapis.com/*',
  ],
})
