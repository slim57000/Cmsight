# Stack & Snap

Puzzle « drop & merge » jouable d'une main. Touchez une colonne pour lâcher la tuile. Les tuiles identiques qui se touchent fusionnent (2+2 → 4, trois 2 → 8…) et déclenchent des combos. Si une colonne dépasse la ligne rouge, la partie est perdue.

- **Modes** : Classique (aléatoire) et Défi du jour (même suite de tuiles pour tout le monde, record par jour).
- **Technique** : un seul fichier HTML5 Canvas (`www/index.html`), sans dépendance, 60 fps, avec vibrations et partage du score.

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
- Sons synthétisés (Web Audio), bouton muet
- Marteau (casser une tuile), « Continuer » et « Doubler les pièces » via pub récompensée
- Pièces 🪙, 4 skins à débloquer, 3 missions du jour (identiques pour tous)
- Fond qui change de couleur à chaque nouvelle tuile record

## Publicités (AdMob)
Le plugin `@capacitor-community/admob` est utilisé automatiquement dans l'app native ; sur le web, les pubs sont simulées.
1. Créez l'app sur admob.google.com et récupérez l'App ID et les IDs de blocs « Rewarded ».
2. Android : dans `android/app/src/main/AndroidManifest.xml`, sous `<application>` :
   `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-XXX~YYY"/>`
3. iOS : dans `ios/App/App/Info.plist`, ajoutez `GADApplicationIdentifier` = votre App ID.
4. Remplacez les IDs de test dans `AD_IDS` (`www/index.html`) par vos IDs de production.

## Achat « Sans pub » (cordova-plugin-purchase)
1. Créez un produit **non consommable** `stacksnap_noads` dans App Store Connect et dans la Play Console.
2. Il supprime les pubs interstitielles (1 toutes les 3 parties) et donne les récompenses sans regarder de pub.
3. Le bouton « Restaurer les achats » est obligatoire pour la validation Apple (déjà présent).

## Classement mondial (@openforge/capacitor-game-connect)
- iOS : activez Game Center dans Xcode et créez le classement `stacksnap.highscore` dans App Store Connect.
- Android : créez un classement dans Play Games Services, puis remplacez `REMPLACER_PAR_ID_PLAY_GAMES` dans `www/index.html`.
- Hors application native, le jeu affiche un top 10 local.

## Icône et écran de lancement
Les fichiers sources sont `assets/icon.svg`, `assets/icon-only.png` et `assets/splash.png`. Ensuite :
```
npm run assets && npm run sync
```

## Web / PWA
`manifest.json` et `sw.js` rendent la version web installable et jouable hors ligne.
