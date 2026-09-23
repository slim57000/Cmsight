#!/usr/bin/env bash
# Génère et configure le projet iOS natif (exécuté par GitHub Actions sur macOS depuis game/)
set -euo pipefail
if [ -z "${GOOGLE_SERVICE_INFO_PLIST:-}" ]; then
  echo "::error::Secret GOOGLE_SERVICE_INFO_PLIST manquant (GoogleService-Info.plist encodé en base64). Sans lui, l'app plante au démarrage."; exit 1
fi
rm -rf ios
npx cap add ios --packagemanager CocoaPods
npx capacitor-assets generate --ios --iconBackgroundColor '#1b1830' --splashBackgroundColor '#1b1830'
echo "$GOOGLE_SERVICE_INFO_PLIST" | base64 -d > ios/App/App/GoogleService-Info.plist

# Info.plist : textes et clés exigés par Apple et AdMob
PL=ios/App/App/Info.plist
pb() { /usr/libexec/PlistBuddy -c "$1" "$PL"; }
pb "Add :NSUserTrackingUsageDescription string 'This identifier is only used to show you more relevant ads.'"
pb "Add :ITSAppUsesNonExemptEncryption bool false"
pb "Add :GADApplicationIdentifier string ${ADMOB_APP_ID_IOS:-ca-app-pub-3940256099942544~1458002511}"
pb "Add :SKAdNetworkItems array"
pb "Add :SKAdNetworkItems:0 dict"
pb "Add :SKAdNetworkItems:0:SKAdNetworkIdentifier string cstr6suwn9.skadnetwork"

# Capacité Game Center
cat > ios/App/App/App.entitlements <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>com.apple.developer.game-center</key><true/></dict></plist>
PLIST

# Projet Xcode : fichier Firebase, iPhone uniquement, entitlements, numéros de version
ruby -e 'require "xcodeproj"' 2>/dev/null || sudo gem install xcodeproj --no-document
APP_VERSION=$(node -p "require('./package.json').version") ruby <<'RB'
require 'xcodeproj'
p = Xcodeproj::Project.open('ios/App/App.xcodeproj')
t = p.targets.find { |x| x.name == 'App' }
g = p.main_group.find_subpath('App', false)
unless g.files.any? { |f| f.path == 'GoogleService-Info.plist' }
  t.resources_build_phase.add_file_reference(g.new_reference('GoogleService-Info.plist'))
end
t.build_configurations.each do |c|
  c.build_settings['TARGETED_DEVICE_FAMILY'] = '1'
  c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
  c.build_settings['CURRENT_PROJECT_VERSION'] = ENV['RUN_NUMBER'] || '1'
  c.build_settings['MARKETING_VERSION'] = ENV['APP_VERSION']
end
p.save
RB
npx cap sync ios
