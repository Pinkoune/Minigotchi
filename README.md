# Minigotchi

Une petite extension web ludique qui égaiera vos journées !

Minigotchi est une extension de navigateur (Chrome/Edge, Manifest V3) qui
héberge un petit Tamagotchi original. Connectez-vous avec Google ou
Microsoft et retrouvez la progression de votre pet sur tous vos appareils.

**Aucun serveur à héberger** : la save vit sur **Firebase** (Firestore),
`chrome.storage` n'est qu'un cache local. Il suffit de builder l'extension et
de la charger — pas de backend à lancer, pas de conteneur à faire tourner.

## Fonctionnalités

- **Mécaniques Tamagotchi complètes** : faim, bonheur, énergie, hygiène, santé
  (décroissance en temps réel), repas/snacks, jeu, bain, sommeil calé sur le
  cycle jour/nuit réel, maladie et médicament, crottes, discipline (gronder /
  féliciter, faux appels), poids et surpoids, vieillissement Œuf → Bébé →
  Enfant → Ado → Adulte → Senior, **évolutions branchées** selon la qualité
  des soins, mort (négligence, maladie, vieillesse) et nouvelle éclosion.
- **Le pet vit popup fermé** : décroissance basée sur les timestamps +
  `chrome.alarms` dans le service worker, badge `!` sur l'icône en cas de
  besoin urgent, notifications (throttlées et désactivables).
- **Extensions** : personnalité émergente, Dex/encyclopédie des formes,
  succès, streak de soins quotidiens, mini-jeux (pierre-feuille-ciseaux,
  memory, attrape-tout) pour gagner des pièces, boutique (nourriture,
  accessoires cosmétiques, fonds), lignée/cimetière avec héritage,
  saisons visuelles, sons synthétisés (toggle dans les réglages).
- **Sync multi-appareil** : Firestore comme source de vérité, concurrence
  optimiste par `rev` dans une transaction (conflit → fusion + re-push),
  cache local `chrome.storage` pour le hors-ligne, indicateur de statut.

## Arborescence

```
├── manifest.config.ts     # manifest MV3 (permissions minimales)
├── firebase.json          # config Firebase CLI (déploiement des règles)
├── firestore.rules        # isolation stricte par utilisateur
├── src/
│   ├── popup/             # UI React (écrans + composants)
│   ├── background/        # service worker : alarms, badge, notifications
│   ├── game/               # logique PURE, testée sans navigateur
│   ├── auth/               # OAuth PKCE Google + Microsoft -> Firebase Auth
│   ├── firebase/           # init Firebase (app, auth, firestore)
│   ├── storage/            # cache chrome.storage (save + dirty flag)
│   ├── sync/               # réconciliation local <-> Firestore
│   └── shared/             # sons WebAudio, saisons
├── public/assets/          # icônes/sprites originaux + ATTRIBUTIONS.md
└── tests/                  # tests Vitest du moteur de jeu
```

## Prérequis

- Node.js ≥ 20, npm
- Un compte Google (pour créer un projet Firebase — gratuit sur le plan Spark)

## Build & chargement

```bash
cp .env.example .env        # renseigner les client IDs OAuth + la config Firebase
npm install
npm run build                # tsc + vite build -> dist/
```

Puis dans Chrome/Edge : `chrome://extensions` → activer le **mode développeur**
→ **« Charger l'extension non empaquetée »** → sélectionner le dossier `dist/`.

Mode dev avec rechargement à chaud : `npm run dev` (charger `dist/` de la même façon).

Tests du moteur de jeu : `npm test`.

> Sans configuration Firebase/OAuth, le bouton « Jouer sans compte » permet
> de tester tout le jeu avec une progression locale uniquement — pratique
> pour essayer l'extension avant de configurer quoi que ce soit.

## Configuration Firebase + Google (guide pas-à-pas, une seule fois)

> **À savoir avant de commencer** : l'ID de l'extension est **fixé** par une
> clé dans le manifest. Il est toujours `hohchkjjnffpcalkfkljcjhddgdfhdlc`,
> sur toutes les machines. L'URL de redirection OAuth à utiliser partout est
> donc exactement :
>
> ```
> https://hohchkjjnffpcalkfkljcjhddgdfhdlc.chromiumapp.org/
> ```
>
> Copiez-la telle quelle quand une étape la demande. Rien à « récupérer »
> après un premier chargement, rien qui change si vous re-buildez.

Vous remplissez un seul fichier : `.env` (créé avec `cp .env.example .env`).
Il y a **5 valeurs** à coller (4 Firebase + 1 Google). Microsoft est
**optionnel** (le bouton n'apparaît que si configuré — voir l'annexe).

### Étape 1 — Projet Firebase *(déjà fait si vous avez suivi jusqu'ici)*

[console.firebase.google.com](https://console.firebase.google.com) →
« Ajouter un projet ». Le plan gratuit **Spark** suffit.

### Étape 2 — Firestore + règles *(déjà fait aussi)*

Console du projet → **Firestore Database** → « Créer une base de données »
(mode production), puis onglet **Règles** → collez le contenu de
`firestore.rules` → « Publier ».

### Étape 3 — Activer la connexion Google (2 minutes)

1. Console Firebase → **Authentication** → « Commencer » → onglet
   **Sign-in method** → **Google** → activer → enregistrer.
2. Toujours sur ce provider Google, dépliez **« Configuration du SDK Web »** :
   un **ID client Web** y est affiché (il finit par
   `.apps.googleusercontent.com`) — Firebase l'a créé pour vous.
   → collez-le dans `.env` : `VITE_GOOGLE_CLIENT_ID=...`
3. Il faut autoriser l'extension à utiliser ce client :
   [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
   (sélectionnez **le même projet** que Firebase en haut) → dans la liste,
   cliquez sur le client OAuth créé par Firebase (« Web client (auto created
   by Google Service) ») → section **URI de redirection autorisés** →
   « Ajouter un URI » → collez :
   `https://hohchkjjnffpcalkfkljcjhddgdfhdlc.chromiumapp.org/` → Enregistrer.

### Étape 4 — Récupérer la config web Firebase (1 minute)

Console Firebase → ⚙️ **Paramètres du projet** → onglet **Général** →
section « Vos applications » → si aucune appli n'existe, cliquez sur
l'icône **`</>`** (Web) et donnez-lui un nom quelconque. Firebase affiche un
bloc `firebaseConfig = { ... }` : recopiez 4 valeurs dans `.env` :

| Dans le bloc affiché | Dans `.env` |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

(Ces valeurs ne sont pas des secrets : l'accès aux données est verrouillé
par `firestore.rules`, pas par leur confidentialité.)

### Étape 5 — Builder et charger

```bash
npm run build
```

`chrome://extensions` → mode développeur → « Charger l'extension non
empaquetée » → dossier `dist/`. Cliquez sur l'icône, « Continuer avec
Google » — c'est fini. Rebuildez après toute modification de `.env`.

### Annexe — Microsoft (optionnel)

Sans configuration, le bouton Microsoft est simplement masqué. Pour
l'activer : [portal.azure.com](https://portal.azure.com) → Entra ID →
App registrations → « New registration » (comptes personnels **et**
professionnels), plateforme **« Single-page application (SPA) »**, URI de
redirection `https://hohchkjjnffpcalkfkljcjhddgdfhdlc.chromiumapp.org/`.
Copiez l'Application (client) ID dans `.env` (`VITE_MICROSOFT_CLIENT_ID`),
puis dans Firebase → Authentication → Sign-in method → ajoutez **Microsoft**
avec ce même ID (le « secret client » demandé par le formulaire Firebase se
génère dans Azure AD → Certificates & secrets ; le flow PKCE de l'extension
ne s'en sert pas). Rebuildez.

## Partager le jeu (sans npm pour le destinataire)

```bash
npm run package     # -> minigotchi-extension.zip
```

Envoyez `minigotchi-extension.zip` à qui vous voulez. De son côté :

1. Dézipper le fichier (n'importe où).
2. `chrome://extensions` → activer le **mode développeur** (interrupteur en
   haut à droite).
3. **« Charger l'extension non empaquetée »** → choisir le dossier dézippé.

C'est tout — pas de npm, pas de build, pas de compte Firebase à créer :
votre configuration est embarquée dans le zip, et comme l'ID d'extension est
fixe, la connexion Google fonctionne aussi chez eux. Chaque personne a sa
propre save (isolée par les règles Firestore).

> Pour aller plus loin : publier sur le **Chrome Web Store** (frais uniques
> de 5 $) rend l'installation aussi simple qu'un clic sur un lien, sans mode
> développeur. Le zip produit par `npm run package` est directement
> uploadable sur le dashboard développeur du Web Store.

## Synchronisation : comment ça marche

- La save est un objet **versionné** (`schemaVersion`, `migrate()` côté
  client) contenant pet, inventaire, pièces, dex, succès, réglages,
  `lastTick`, `rev` — stocké tel quel dans le document Firestore `saves/{uid}`.
- La décroissance est une **fonction pure du temps écoulé** depuis `lastTick`
  (plafonnée à 12 h pour ne pas tuer le pet après une longue absence) — elle
  n'est jamais appliquée deux fois.
- Au démarrage : adoption de la save Firestore (ou de la plus récente en cas
  de cache local), décroissance offline, push.
- Après chaque action : écriture immédiate dans `chrome.storage.local` puis
  push **débounced** vers Firestore.
- **Conflit de `rev`** : la lecture-vérification-écriture se fait dans une
  transaction Firestore ; en cas d'écart de révision, la save serveur est
  adoptée, les actions locales en attente sont rejouées par-dessus, puis
  l'écriture est retentée — une évolution faite sur un autre appareil n'est
  jamais silencieusement écrasée.
- Hors-ligne : le jeu continue sur le cache (marqué « dirty ») ; la
  resynchronisation se fait à la prochaine ouverture du popup.

## Assets

Tous les sprites, icônes et sons sont **originaux** (SVG créés pour le projet,
sons synthétisés WebAudio) — voir `public/assets/ATTRIBUTIONS.md`. Aucun emoji
dans le rendu final, aucun asset sous copyright.

## Hors scope

Pas de store en ligne, pas de multijoueur, pas de paiement réel.
