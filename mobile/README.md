# SearchOne Mobile

Expo/React Native tabanlı iOS uygulaması. Mevcut SearchOne backend API'sini kullanır.

## Geliştirme

Önce kök dizinde backend'i çalıştırın:

```bash
npm run dev
```

Sonra mobil uygulama bağımlılıklarını kurup Expo'yu başlatın:

```bash
cd mobile
npm install
npm run start
```

iOS Simulator için:

```bash
npm run ios
```

## API adresi

Varsayılan geliştirme API adresi `http://localhost:5173`.

Gerçek cihazda test ederken `mobile/app.json` içindeki `expo.extra.apiBaseUrl` değerini Mac'in yerel ağ IP adresine veya yayınlanmış HTTPS backend adresine değiştirin.

App Store için backend mutlaka HTTPS üzerinden çalışmalı.

Production EAS build için URL'leri ortam değişkenleriyle verin:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.example.com \
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://metinatilgan.github.io/SearchOne/privacy.html \
EXPO_PUBLIC_PRIVACY_CHOICES_URL=https://metinatilgan.github.io/SearchOne/privacy-choices.html \
EXPO_PUBLIC_TERMS_URL=https://metinatilgan.github.io/SearchOne/terms.html \
EXPO_PUBLIC_EULA_URL=https://metinatilgan.github.io/SearchOne/eula.html \
EXPO_PUBLIC_SUBSCRIPTION_TERMS_URL=https://metinatilgan.github.io/SearchOne/subscription-terms.html \
EXPO_PUBLIC_SUPPORT_URL=https://metinatilgan.github.io/SearchOne/support.html \
EXPO_PUBLIC_REPORT_ISSUE_URL=https://metinatilgan.github.io/SearchOne/support.html#report \
EXPO_PUBLIC_ADS_ENABLED=true \
EXPO_PUBLIC_ADS_PERSONALIZED=false \
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy \
EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID=ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy \
npm run build:ios
```

## Reklam entegrasyonu

Uygulama Google AdMob banner reklamları için hazırlanmıştır. Geliştirme build'lerinde Google test ID'leri kullanılır; TestFlight ve App Store build'lerinde gerçek iOS AdMob App ID ve banner ad unit ID ortam değişkenleriyle verilmelidir. Varsayılan reklam isteği `non-personalized` çalışır. Personalized reklam açılacaksa `EXPO_PUBLIC_ADS_PERSONALIZED=true` kullanmadan önce App Store Connect privacy labels, ATT akışı ve privacy manifest cevapları yeniden doğrulanmalıdır.

## App Store hazırlığı

1. `mobile/app.json` içindeki `ios.bundleIdentifier` değerini Apple Developer hesabınızdaki benzersiz ID ile değiştirin.
2. `expo.extra.apiBaseUrl` değerini canlı HTTPS API adresi yapın.
3. `expo.extra.privacyPolicyUrl`, `termsUrl`, `eulaUrl`, `subscriptionTermsUrl`, `privacyChoicesUrl`, `supportUrl` ve `reportIssueUrl` değerlerini gerçek, herkese açık HTTPS sayfalarınızla değiştirin.
4. iOS privacy manifest `app.json` içinde tanımlıdır. Arama geçmişi, UserDefaults ve React Native/Expo runtime tarafından kullanılan required-reason API kategorileri App Store Connect cevaplarıyla tutarlı tutulmalıdır.
5. AdMob SDK'sının topladığı verileri App Store Connect App Privacy yanıtlarına ekleyin. Uygulama içindeki "Bildir" reklam destek bağlantısı destek sayfasına gider.
6. Reklam sağlayıcı kullanıcıyı uygulamalar ve web siteleri arasında takip edecek şekilde yapılandırılırsa App Tracking Transparency izin akışını ve `NSPrivacyTracking` beyanını buna göre güncelleyin.
7. App Store Connect'te App Privacy sorularını, backend, AdMob ve üçüncü taraf arama API'leri dahil gerçek veri akışına göre doldurun.
8. EAS projesini bağlayın:

```bash
cd mobile
npx eas init
```

9. iOS production build alın:

```bash
npm run build:ios
```

10. App Store Connect'e gönderin:

```bash
npm run submit:ios
```

Yayın öncesi kök dizinde sıkı kontrol çalıştırın:

```bash
npm run preflight:release
```

`preflight:release`, `EXPO_PUBLIC_API_BASE_URL` gerçek bir HTTPS backend olmadığı sürece başarısız olur. GitHub Pages yalnızca yasal/static sayfalar için uygundur; `/api/search` endpoint'i için Node backend'i Render, Fly.io, Railway, Vercel Functions veya benzeri bir servis üzerinde yayınlanmalıdır.

Heroku kullanılıyorsa API adresi şu formatta olur:

```bash
EXPO_PUBLIC_API_BASE_URL=https://<heroku-app-adiniz>.herokuapp.com
```

## Codemagic TestFlight build

Repo kökünde `codemagic.yaml` bulunur. Codemagic'te uygulamayı GitHub reposuna bağladıktan sonra `searchone_production` environment variable group'unu oluşturun ve şu değerleri ekleyin:

```bash
EXPO_PUBLIC_API_BASE_URL=https://searchone-43f3bf34623e.herokuapp.com
EXPO_PUBLIC_ADS_ENABLED=true
EXPO_PUBLIC_ADS_PERSONALIZED=false
EXPO_PUBLIC_ADS_NON_PERSONALIZED_ONLY=true
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy
EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID=ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy
```

Codemagic'te ayrıca App Store Connect integration adı `codemagic` olmalı, iOS code signing için `app_store` distribution profile/certificate `com.metinatilgan.searchone` bundle ID ile eşleşmelidir. Workflow adı: `iOS TestFlight`.

## Ürün sınırları

Şahıs aramalarında özel telefon, kişisel e-posta ve ev adresi çıkarılmamalı. Bu sınır hem backend'de hem de App Store açıklamasında açıkça korunmalı.
