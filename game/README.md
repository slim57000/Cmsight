# Stack & Snap

Puzzle « drop & merge » jouable d'une main. Touchez une colonne pour lâcher la tuile. Les tuiles identiques qui se touchent fusionnent (2+2 → 4, trois 2 → 8…) et déclenchent des combos. Si une colonne dépasse la ligne rouge, la partie est perdue.

- **Modes** : Classique (aléatoire) et Défi du jour (même suite de tuiles pour tout le monde, record par jour).
- **Technique** : HTML5 Canvas sans dépendance (`www/`), 60 fps, emballé en app native avec Capacitor.

## Tester dans le navigateur
```
npm run serve   # puis ouvrir http://localhost:8080
```

## Générer les apps iOS / Android (Capacitor)
```
npm install
npx cap add android      # nécessite Android Studio
npx cap add ios          # nécessite macOS + Xcode
npm run sync
npm run android          # ou: npm run ios
```
Publiez ensuite avec Android Studio (Play Console) ou Xcode (App Store Connect).

## Contenu
- **5 modes** : Classique, Défi du jour, Contre la montre (2 min), Zen (sans game over), Puzzle (50 niveaux, 3 étoiles)
- **Tuiles spéciales** : 💣 bombe (détruit un carré 3×3), 🌈 joker (copie la plus grande voisine), ❄️ glace (bloque 3 coups)
- **Bonus** : 🔨 marteau, ↩️ annuler, 🔀 mélanger, échange de tuile (toucher l'aperçu « Suivant »)
- **Rétention** : tutoriel interactif, coffre quotidien (7 jours), missions du jour, 22 succès, pass de saison (30 paliers gratuit + premium), rappels par notification
- **Monétisation** : pubs récompensées + interstitielles (AdMob), boutique (packs de pièces, pack de démarrage, sans pub, pass premium, offre flash 24 h), thèmes (fonds, sons, particules)
- **Social** : partage du score en image, lien « Défier un ami » (même partie via `?c=graine&s=score`), classement mondial
- **Technique** : 9 langues (FR, EN, ES, DE, PT, IT, JA, KO, TR), sauvegarde par code de transfert, Firebase Analytics, consentement RGPD/ATT, PWA hors ligne

## Structure
- `www/index.html` : interface et styles · `www/i18n.js` : traductions · `www/game.js` : logique du jeu
- `store/` : fiche store (`listing.md`) et captures d'écran

## Notifications, vibrations, statistiques
- `@capacitor/local-notifications` : rappel quotidien à 19 h et alerte de série à 21 h 30 (désactivables dans les options).
- `@capacitor/haptics` : retour haptique natif (iOS inclus).
- `@capacitor-firebase/analytics` : ajoutez `google-services.json` (Android, `android/app/`) et `GoogleService-Info.plist` (iOS, `ios/App/App/`) depuis la console Firebase. Événements envoyés : `app_open`, `game_start`, `game_over`, `tutorial_complete`, `level_complete`, `purchase`, `achievement`, `chest`, `shop_open`.

## RGPD et suivi publicitaire
Au premier lancement, le formulaire de consentement Google (UMP) s'affiche en Europe, puis la demande de suivi Apple (ATT) sur iOS. Le bouton « Confidentialité » des options permet de le rouvrir.
- Configurez le message RGPD dans AdMob → Confidentialité et messages.
- iOS : ajoutez `NSUserTrackingUsageDescription` dans `Info.plist`.
- Remplacez `PRIVACY_URL` et `GAME_URL` en haut de `www/game.js`.

## Firebase : pas à pas
1. **Créer le projet** sur https://console.firebase.google.com → « Ajouter un projet » (activez Google Analytics).
2. **Ajouter les apps** avec l'ID `com.stacksnap.game` :
   - Android → téléchargez `google-services.json` → `android/app/google-services.json`
   - iOS → téléchargez `GoogleService-Info.plist` → glissez-le dans Xcode sous `App/App`
3. **Authentication** → Méthodes de connexion → activez **Anonyme**, **Game Center** et **Play Jeux** (pour Play Jeux, collez l'ID client OAuth web et son secret depuis la Google Cloud Console).
4. **Firestore Database** → Créer une base (mode production, région `eur3` pour l'Europe).
5. **Règles de sécurité** : installez la CLI puis déployez les règles fournies :
   ```
   npm i -g firebase-tools && firebase login
   firebase use --add        # choisissez votre projet
   firebase deploy --only firestore:rules
   ```
6. **Brancher dans l'app** : `npm install && npx cap sync`. Sur iOS, ajoutez la capacité **Game Center** dans Xcode.
7. **Vérifier** : Analytics → DebugView (lancez l'app avec `-FIRDebugEnabled` sur iOS ou `adb shell setprop debug.firebase.analytics.app com.stacksnap.game` sur Android).

## Sauvegarde
- **Cloud automatique** (app native) : le joueur est connecté via Game Center / Play Jeux (ou en anonyme à défaut). Sa sauvegarde est stockée dans Firestore (`saves/{uid}`) et envoyée 4 s après chaque changement et à la mise en arrière-plan. Sur un nouvel appareil, elle est récupérée au lancement ; les achats, skins et succès ne sont jamais perdus lors d'une fusion.
- **Code de transfert** (toutes plateformes) : Options → « Copier mon code », puis « Restaurer » sur l'autre appareil.
- Règles Firestore : `firebase/firestore.rules` (chaque joueur n'accède qu'à sa propre sauvegarde).

## Publicités (AdMob)
Le plugin `@capacitor-community/admob` est utilisé automatiquement dans l'app native ; sur le web, les pubs sont simulées.
1. Créez l'app sur admob.google.com et récupérez l'App ID et les IDs de blocs « Rewarded ».
2. Android : dans `android/app/src/main/AndroidManifest.xml`, sous `<application>` :
   `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-XXX~YYY"/>`
3. iOS : dans `ios/App/App/Info.plist`, ajoutez `GADApplicationIdentifier` = votre App ID.
4. Remplacez les IDs de test dans `AD` (`www/game.js`) par vos IDs de production.

## Boutique et achats intégrés (cordova-plugin-purchase)
Créez ces produits avec les mêmes IDs dans App Store Connect et dans la Play Console :

| ID | Type | Prix conseillé | Contenu |
|---|---|---|---|
| `stacksnap_starter` | non consommable | 4,99 € | 1000 🪙 + 5 🔨 + 5 ↩️ |
| `stacksnap_noads` | non consommable | 3,99 € | Supprime les pubs |
| `stacksnap_coins_500` | consommable | 0,99 € | 500 🪙 |
| `stacksnap_coins_1500` | consommable | 2,99 € | 1500 🪙 |
| `stacksnap_coins_5000` | consommable | 7,99 € | 5000 🪙 |
| `stacksnap_pass_s1` | non consommable | 4,99 € | Pass premium saison 1 |
| `stacksnap_offer` | non consommable | 1,99 € | Offre flash : 2000 🪙 + 10 🔨 + 5 🔀 |

Les prix affichés dans l'app sont ceux du store, dans la devise du joueur. Sur le web, les achats sont simulés.

1. Le produit « Sans pub » :
2. Il supprime les pubs interstitielles (1 toutes les 3 parties) et donne les récompenses sans regarder de pub.
3. Le bouton « Restaurer les achats » est obligatoire pour la validation Apple (déjà présent).

## Classement mondial (@openforge/capacitor-game-connect)
- iOS : activez Game Center dans Xcode et créez le classement `stacksnap.highscore` dans App Store Connect.
- Android : créez un classement dans Play Games Services, puis remplacez `REMPLACER_PAR_ID_PLAY_GAMES` dans `www/game.js`.
- Hors application native, le jeu affiche un top 10 local.

## Icône et écran de lancement
Les fichiers sources sont `assets/icon.svg`, `assets/icon-only.png` et `assets/splash.png`. Ensuite :
```
npm run assets && npm run sync
```

## Web / PWA
`manifest.json` et `sw.js` rendent la version web installable et jouable hors ligne.
