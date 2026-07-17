import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
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
