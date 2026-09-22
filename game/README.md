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

## Boutique et achats intégrés (cordova-plugin-purchase)
Créez ces produits avec les mêmes IDs dans App Store Connect et dans la Play Console :

| ID | Type | Prix conseillé | Contenu |
|---|---|---|---|
| `stacksnap_starter` | non consommable | 4,99 € | 1000 🪙 + 5 🔨 + 5 ↩️ |
| `stacksnap_noads` | non consommable | 3,99 € | Supprime les pubs |
| `stacksnap_coins_500` | consommable | 0,99 € | 500 🪙 |
| `stacksnap_coins_1500` | consommable | 2,99 € | 1500 🪙 |
| `stacksnap_coins_5000` | consommable | 7,99 € | 5000 🪙 |

Les prix affichés dans l'app sont ceux du store, dans la devise du joueur. Sur le web, les achats sont simulés.

1. Le produit « Sans pub » :
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
