#!/usr/bin/env bash
# Génère et configure le projet Android natif (exécuté par GitHub Actions depuis game/)
set -euo pipefail
FIREBASE=1
if [ -z "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "::warning::Secret GOOGLE_SERVICES_JSON absent : build SANS Firebase (sauvegarde locale uniquement, pas de cloud/classement/statistiques)."
  FIREBASE=0
  npm uninstall --no-audit --no-fund @capacitor-firebase/analytics @capacitor-firebase/authentication @capacitor-firebase/firestore firebase
fi
rm -rf android
npx cap add android
npx capacitor-assets generate --android --iconBackgroundColor '#1b1830' --splashBackgroundColor '#1b1830'
[ "$FIREBASE" = 1 ] && echo "$GOOGLE_SERVICES_JSON" | base64 -d > android/app/google-services.json
# AdMob : identifiant d'application (ID de test Google par défaut)
ADMOB="${ADMOB_APP_ID_ANDROID:-ca-app-pub-3940256099942544~3347511713}"
sed -i "s#</application>#    <meta-data android:name=\"com.google.android.gms.ads.APPLICATION_ID\" android:value=\"$ADMOB\"/>\n    </application>#" android/app/src/main/AndroidManifest.xml
# Connexion Play Jeux (Firebase Auth)
sed -i 's/^ext {/ext {\n    rgcfaIncludeGoogle = true/' android/variables.gradle
# Numéros de version : versionCode = numéro de build GitHub
VERSION=$(node -p "require('./package.json').version")
sed -i -E "s/versionCode [0-9]+/versionCode ${RUN_NUMBER:-1}/; s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" android/app/build.gradle
npx cap sync android
