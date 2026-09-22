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

## Prochaines étapes
Achat « sans pub », classement (Game Center / Play Games), icône et écran de lancement (`npx @capacitor/assets generate`).
