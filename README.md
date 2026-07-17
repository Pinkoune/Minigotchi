# Minigotchi

Une petite extension web ludique qui égaiera vos journées !

Minigotchi est une extension de navigateur (Chrome/Edge, Manifest V3) qui
héberge un petit Tamagotchi original. Connectez-vous avec Google ou
Microsoft et retrouvez la progression de votre pet sur tous vos appareils —
la save vit sur le serveur, le navigateur n'est qu'un cache.

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
- **Sync multi-appareil** : backend FastAPI source de vérité, concurrence
  optimiste par `rev` (409 + fusion + re-push), cache local `chrome.storage`
  pour le hors-ligne, indicateur de statut de sync.

## Arborescence

```
├── manifest.config.ts     # manifest MV3 (permissions minimales)
├── src/
│   ├── popup/             # UI React (écrans + composants)
│   ├── background/        # service worker : alarms, badge, notifications
│   ├── game/              # logique PURE, testée sans navigateur
│   ├── auth/              # OAuth PKCE Google + Microsoft
│   ├── storage/           # cache chrome.storage + sessions
│   ├── sync/              # client API + réconciliation local<->serveur
│   └── shared/            # sons WebAudio, saisons
├── public/assets/         # icônes/sprites originaux + ATTRIBUTIONS.md
├── backend/               # API FastAPI (source de vérité de la save)
└── tests/                 # tests Vitest du moteur de jeu
```

## Prérequis

- Node.js ≥ 20, npm
- Python ≥ 3.11 (ou Docker) pour le backend

## Extension : build & chargement

```bash
cp .env.example .env        # renseigner VITE_API_URL et les client IDs OAuth
npm install
npm run build               # tsc + vite build -> dist/
```

Puis dans Chrome/Edge : `chrome://extensions` → activer le **mode développeur**
→ **« Charger l'extension non empaquetée »** → sélectionner le dossier `dist/`.

Mode dev avec rechargement à chaud : `npm run dev` (charger `dist/` de la même façon).

Tests du moteur de jeu : `npm test`.

> Sans configuration OAuth, le bouton « Jouer sans compte » permet de tester
> tout le jeu avec une progression locale uniquement.

## Backend : lancement

Avec Docker (recommandé) :

```bash
cp backend/.env.example backend/.env   # SESSION_SECRET + client IDs
docker compose up --build
```

Ou en local :

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload          # http://localhost:8000
pytest                                  # tests
```

SQLite est utilisé par défaut (fichier local). Pour Postgres, définissez
`DATABASE_URL` (voir `backend/.env.example` et `docker-compose.yml`) — aucun
changement de code n'est nécessaire. L'API est self-hostable derrière un
reverse proxy.

### Routes

| Route | Description |
|---|---|
| `POST /auth/session` | Vérifie l'ID token Google/Microsoft (JWKS) et renvoie un JWT de session |
| `POST /auth/refresh` | Ré-émet un JWT de session encore valide |
| `GET /api/save` | Save serveur + `rev` (404 si aucune → le client crée un œuf) |
| `PUT /api/save` | Écriture avec `base_rev` ; **409 Conflict** + save serveur si `rev` périmé |
| `GET /health` | Sonde |

Toutes les routes `/api/*` exigent `Authorization: Bearer <jwt>` ; le
`user_id` est toujours déduit du token, jamais du corps de la requête.

## Configuration OAuth (étapes manuelles)

L'extension utilise `chrome.identity.launchWebAuthFlow` avec **PKCE** — aucun
secret client n'est embarqué. Le redirect URI est
`https://<EXTENSION_ID>.chromiumapp.org/`.

1. **Récupérer l'ID d'extension** : après un premier chargement de `dist/`
   dans `chrome://extensions`, copiez l'ID (ex. `abcdefghijklmnopabcdefghijklmnop`).
   Le redirect URI complet est alors `https://<ID>.chromiumapp.org/`.
   ⚠️ L'ID change si vous rechargez l'extension depuis un autre dossier ;
   fixez une clé `key` dans le manifest pour un ID stable si besoin.

2. **Google** ([console.cloud.google.com](https://console.cloud.google.com)) :
   - Créez un projet → « APIs & Services » → « Credentials » →
     « Create credentials » → **OAuth client ID** → type **Web application**.
   - Ajoutez `https://<EXTENSION_ID>.chromiumapp.org/` dans
     **Authorized redirect URIs**.
   - Configurez l'écran de consentement (scopes `openid email profile`).
   - Copiez le **client ID** dans `.env` (`VITE_GOOGLE_CLIENT_ID`) **et**
     `backend/.env` (`GOOGLE_CLIENT_ID`).

3. **Microsoft** ([portal.azure.com](https://portal.azure.com) → Azure AD /
   Entra ID → App registrations) :
   - « New registration », comptes **personnels et professionnels** (common).
   - Plateforme **« Single-page application (SPA) »** (client public PKCE),
     redirect URI `https://<EXTENSION_ID>.chromiumapp.org/`.
   - Copiez l'**Application (client) ID** dans `.env`
     (`VITE_MICROSOFT_CLIENT_ID`) **et** `backend/.env` (`MICROSOFT_CLIENT_ID`).

4. **Backend** : générez un `SESSION_SECRET`
   (`python -c "import secrets; print(secrets.token_urlsafe(48))"`) dans
   `backend/.env`. Ne commitez jamais les fichiers `.env`.

5. Rebuildez l'extension (`npm run build`) après toute modification de `.env`
   (les variables `VITE_*` sont injectées au build, y compris
   `host_permissions` pour l'URL du backend).

## Synchronisation : comment ça marche

- La save est un objet **versionné** (`schemaVersion`, `migrate()` côté client)
  contenant pet, inventaire, pièces, dex, succès, réglages, `lastTick`, `rev`.
- La décroissance est une **fonction pure du temps écoulé** depuis `lastTick`
  (plafonnée à 12 h pour ne pas tuer le pet après une longue absence) — elle
  n'est jamais appliquée deux fois.
- Au démarrage : adoption de la save serveur (ou de la plus récente en cas de
  cache local), décroissance offline, push.
- Après chaque action : écriture immédiate dans `chrome.storage.local` puis
  push **débounced** vers `PUT /api/save`.
- **409** : re-fetch de la save serveur, ré-application des actions en attente,
  nouveau PUT — une évolution faite sur un autre appareil n'est jamais écrasée.
- Hors-ligne : le jeu continue sur le cache (marqué « dirty ») et le service
  worker re-synchronise au retour du réseau.

## Assets

Tous les sprites, icônes et sons sont **originaux** (SVG créés pour le projet,
sons synthétisés WebAudio) — voir `public/assets/ATTRIBUTIONS.md`. Aucun emoji
dans le rendu final, aucun asset sous copyright.

## Hors scope

Pas de store en ligne, pas de multijoueur, pas de paiement réel. Backend
volontairement minimal (auth de session + stockage/sync de la save).
