import { defineManifest } from '@crxjs/vite-plugin'

// The backend origin is injected at build time from .env (VITE_API_URL).
// Never hardcode it: host_permissions must match the deployed API.
const apiUrl = process.env.VITE_API_URL ?? 'http://localhost:8000'
const apiOrigin = new URL(apiUrl).origin + '/*'

export default defineManifest({
  manifest_version: 3,
  name: 'Minigotchi',
  version: '0.1.0',
  description: 'Un petit Tamagotchi qui vit dans votre navigateur.',
  action: {
    default_popup: 'index.html',
    default_icon: {
      16: 'public/assets/icons/app-16.png',
      48: 'public/assets/icons/app-48.png',
      128: 'public/assets/icons/app-128.png',
    },
  },
  icons: {
    16: 'public/assets/icons/app-16.png',
    48: 'public/assets/icons/app-48.png',
    128: 'public/assets/icons/app-128.png',
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['identity', 'storage', 'alarms', 'notifications'],
  host_permissions: [apiOrigin],
})
