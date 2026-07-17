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

## Configuration Firebase + OAuth (étapes manuelles, une seule fois)

L'extension utilise `chrome.identity.launchWebAuthFlow` avec **PKCE** pour
dialoguer directement avec Google/Microsoft (aucun secret client embarqué),
puis passe l'ID token obtenu à **Firebase Auth** (`signInWithCredential`) qui
le vérifie et ouvre une session. Firestore stocke ensuite la save, protégée
par des règles qui n'autorisent chaque utilisateur qu'à lire/écrire son
propre document.

1. **Créer le projet Firebase** : [console.firebase.google.com](https://console.firebase.google.com)
   → « Ajouter un projet ». Le plan gratuit **Spark** suffit largement.

2. **Activer Firestore** : dans la console du projet → « Firestore Database »
   → « Créer une base de données » → mode production (les règles ci-dessous
   verrouillent déjà l'accès). Déployez `firestore.rules` :
   ```bash
   npm install -g firebase-tools     # une fois
   firebase login
   firebase deploy --only firestore:rules --project <votre-projet>
   ```
   (ou collez le contenu de `firestore.rules` directement dans l'onglet
   « Règles » de la console Firestore).

3. **Récupérer l'ID d'extension** : après un premier chargement de `dist/`
   dans `chrome://extensions`, copiez l'ID (ex. `abcdefghijklmnopabcdefghijklmnop`).
   Le redirect URI OAuth est `https://<EXTENSION_ID>.chromiumapp.org/`.
   ⚠️ L'ID change si vous rechargez l'extension depuis un autre dossier ;
   fixez une clé `key` dans le manifest pour un ID stable si besoin.

4. **Google** — le projet Firebase est un projet Google Cloud comme un autre :
   ([console.cloud.google.com](https://console.cloud.google.com), sélectionnez
   le même projet que Firebase) :
   - « APIs & Services » → « Credentials » → « Create credentials » →
     **OAuth client ID** → type **Web application**.
   - Ajoutez `https://<EXTENSION_ID>.chromiumapp.org/` dans
     **Authorized redirect URIs**.
   - Configurez l'écran de consentement (scopes `openid email profile`).
   - Copiez le **client ID** dans `.env` (`VITE_GOOGLE_CLIENT_ID`).
   - Dans la console Firebase → « Authentication » → « Sign-in method » →
     activez **Google**.

5. **Microsoft** ([portal.azure.com](https://portal.azure.com) → Azure AD /
   Entra ID → App registrations) :
   - « New registration », comptes **personnels et professionnels** (common).
   - Plateforme **« Single-page application (SPA) »** (client public PKCE),
     redirect URI `https://<EXTENSION_ID>.chromiumapp.org/`.
   - Copiez l'**Application (client) ID** dans `.env`
     (`VITE_MICROSOFT_CLIENT_ID`).
   - Dans la console Firebase → « Authentication » → « Sign-in method » →
     ajoutez le provider **Microsoft** et renseignez ce même Application ID
     (Firebase demande aussi un secret client : générez-en un dans Azure AD
     → « Certificates & secrets », il n'est utilisé que pour satisfaire ce
     formulaire, pas par le flow PKCE de l'extension).

6. **Config web Firebase** : console Firebase → icône ⚙️ → « Paramètres du
   projet » → onglet « Général » → « Vos applications » → ajoutez une appli
   **Web** (</> icon) → copiez `apiKey`, `authDomain`, `projectId`, `appId`
   dans `.env` (`VITE_FIREBASE_*`). Ces valeurs ne sont pas des secrets —
   l'accès aux données est protégé par `firestore.rules`, pas par leur
   confidentialité.

7. Rebuildez l'extension (`npm run build`) après toute modification de `.env`.

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
