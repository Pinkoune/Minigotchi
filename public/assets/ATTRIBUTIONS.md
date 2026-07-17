# Attributions des assets

## Kenney.nl (licence CC0 / domaine public)

Tous les assets ci-dessous proviennent de [Kenney.nl](https://kenney.nl),
licence **Creative Commons Zero (CC0)** — utilisables librement, attribution
non requise mais fournie ici par courtoisie. Auteur : **Kenney** (kenney.nl).

| Fichiers | Pack | Source |
|---|---|---|
| `pets/animal-*.glb`, `pets/Textures/colormap.png`, `pets/previews/animal-*.png` | Cube Pets 1.0 (modèles 3D animés + rendus) | https://kenney.nl/assets/cube-pets |
| `ui/buttons/*.png` (boutons 9-slice), `ui/slide-track.png`, `ui/divider.png` | UI Pack | https://kenney.nl/assets/ui-pack |
| `ui/icons/*-black.png`, `ui/icons/*-white.png` | Game Icons | https://kenney.nl/assets/game-icons |
| `sounds/*.ogg` (clics, confirmations, erreurs, carillons d'évolution/succès…) | Interface Sounds | https://kenney.nl/assets/interface-sounds |

Note : `ui/buttons/square-orange.png`, `square-purple.png` et `rect-orange.png`
sont dérivés des boutons CC0 du UI Pack par simple rotation de teinte (le pack
ne fournit pas ces deux couleurs) — restent CC0.

Mapping des sons → événements du jeu : voir `src/shared/sound.ts`.

Correspondance formes du jeu → animaux Cube Pets : voir
`src/popup/petAnimals.ts` (chick, bunny, hog, bee, beaver, lion, panda,
crab, pig, elephant, polar).

## Créations originales du projet (CC0)

Réalisées pour ce dépôt, aucune œuvre sous copyright :

| Fichiers | Description |
|---|---|
| `icons/*.svg` | Icônes complémentaires : œuf, crotte, pièce, tombe, logo, actions (nourrir, laver, dodo, réveil, soigner), stats, nourriture/objets de la boutique, mini-jeux (pierre-feuille-ciseaux, memory, attrape-tout) |
| `icons/app-16/48/128.png` | Icônes de l'application (générées par script) |
| Accessoires cosmétiques (chapeaux, nœud, lunettes) | SVG inline dans `src/popup/components/AccessoryOverlay.tsx` |

Les logos Google et Microsoft (`icons/provider-google.svg`,
`icons/provider-microsoft.svg`) sont des reproductions simplifiées utilisées
uniquement pour identifier les boutons de connexion OAuth conformément aux
chartes de ces fournisseurs. Ils restent la propriété de leurs marques.
