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

## Prochaines étapes
Sons, pubs récompensées « continuer » (AdMob via `@capacitor-community/admob`), achat « sans pub », skins, classement (Game Center / Play Games).
