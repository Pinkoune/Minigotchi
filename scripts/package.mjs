// Zips dist/ into minigotchi-extension.zip, ready to share.
// The recipient unzips it and loads the folder via chrome://extensions
// ("Charger l'extension non empaquetée") — no npm, no build, nothing else.
import AdmZip from 'adm-zip'
import { existsSync } from 'node:fs'

if (!existsSync('dist/manifest.json')) {
  console.error('dist/ introuvable — lancez `npm run build` d’abord (ou utilisez `npm run package`).')
  process.exit(1)
}

const zip = new AdmZip()
zip.addLocalFolder('dist', '')
zip.writeZip('minigotchi-extension.zip')
console.log('✔ minigotchi-extension.zip créé — envoyez ce fichier tel quel.')
console.log('  Le destinataire : dézipper → chrome://extensions → mode développeur →')
console.log('  « Charger l’extension non empaquetée » → choisir le dossier dézippé.')
