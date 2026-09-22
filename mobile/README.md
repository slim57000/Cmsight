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

## Meta (Facebook) App Events

The app reports install/launch events to Meta via
[`facebook_app_events`](https://pub.dev/packages/facebook_app_events), for ad
attribution in Meta Ads Manager. This is wired up but disabled until you
supply real credentials:

1. Create/select an app at [developers.facebook.com](https://developers.facebook.com/apps/)
   and grab its **App ID** and **Client Token** (Settings > Advanced >
   Client Token).
2. Replace `REPLACE_WITH_FACEBOOK_APP_ID` / `REPLACE_WITH_FACEBOOK_CLIENT_TOKEN` in:
   - `android/app/src/main/res/values/strings.xml`
   - `ios/Runner/Info.plist` (`FacebookAppID`, `FacebookClientToken`, and the
     `fb<APP_ID>` URL scheme under `CFBundleURLTypes`)
3. On Android, add your app's key hash (debug and release keystores) to the
   Facebook app's Android settings — see
   [Get Started with the Facebook SDK for Android](https://developers.facebook.com/docs/android/getting-started).
4. On iOS, no extra Xcode changes are needed beyond `Info.plist`: the plugin
   registers itself for both the legacy `UIApplicationDelegate` and the
   `UIScene` lifecycle.

Without real values, `activateApp()` (called on startup in `lib/main.dart`)
is a no-op and no events reach Meta.
