# Sunset mobile app

A thin native wrapper (Flutter + `webview_flutter`) that loads
`https://www.app.sunset-app.fr/web` inside a full-screen WebView, so the
existing web app can ship as an iOS and Android app.

All the app logic lives at `lib/main.dart`. It:

- Loads `kAppUrl` on launch, with a top loading bar while the page fetches.
- Routes the Android hardware/gesture back button to the WebView's own
  history (`goBack()`) instead of closing the app, until there's nothing
  left to go back to.
- Shows a retry screen if the main frame fails to load (e.g. no network).

## Running locally

```bash
cd mobile
flutter pub get
flutter run            # needs a connected device/simulator or emulator
```

## Building for release

```bash
# Android (App Bundle for Play Store)
flutter build appbundle --release

# iOS (requires macOS + Xcode + an Apple Developer signing setup)
flutter build ipa --release
```

Before submitting to the stores, replace the placeholder launcher icons
(`android/app/src/main/res/mipmap-*` and `ios/Runner/Assets.xcassets`) and
set a real signing configuration:

- Android: `android/app/build.gradle.kts` (`signingConfigs`) + a keystore.
- iOS: set the Team/Bundle Identifier in Xcode (`ios/Runner.xcworkspace`)
  and configure signing in App Store Connect.

To point the app at a different URL (e.g. staging), change `kAppUrl` in
`lib/main.dart`.
