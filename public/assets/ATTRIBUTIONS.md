# Attributions des assets

Tous les assets graphiques de Minigotchi sont **des créations originales** réalisées
pour ce projet (SVG dessinés à la main + icônes PNG générées par script). Aucun
sprite n'est issu d'une œuvre sous copyright (Tamagotchi, Digimon, Pokémon, etc.).

Conformément aux consignes du projet : aucune banque d'assets externe n'ayant pu
être vérifiée hors-ligne pour sa licence au moment du développement, des SVG
simples et originaux ont été créés à la place (plutôt que des emojis). Ils sont
libres d'être remplacés par des packs CC0 (Kenney.nl, OpenGameArt) — il suffit de
déposer les fichiers dans `public/assets/` et de mettre à jour ce document.

| Fichier(s) | Auteur | Source | Licence |
|---|---|---|---|
| `icons/*.svg` (icônes d'action, stats, boutique, mini-jeux, navigation, logo, crotte, pièce, tombe…) | Projet Minigotchi | Créés pour ce dépôt | CC0 / domaine public |
| `icons/app-16.png`, `icons/app-48.png`, `icons/app-128.png` | Projet Minigotchi | Générés par script (blob original) | CC0 / domaine public |
| Sprites du pet (formes `egg`, `blobby`, `roundy`, `spiky`, `flutter`, `bricky`, `aureli`, `midori`, `grumbo`, `chonko`, `sagey`, `creaky`) | Projet Minigotchi | SVG inline dans `src/popup/components/Pet.tsx` | CC0 / domaine public |
| Sons | — | Synthèse WebAudio à l'exécution (`src/shared/sound.ts`), aucun fichier audio | n/a |

Les logos Google et Microsoft (`icons/provider-google.svg`, `icons/provider-microsoft.svg`)
sont des reproductions simplifiées utilisées uniquement pour identifier les boutons
de connexion OAuth conformément aux chartes d'usage des boutons de connexion de ces
fournisseurs. Ils restent la propriété de leurs marques respectives.
