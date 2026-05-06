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
npm run build:ios
```

## App Store hazırlığı

1. `mobile/app.json` içindeki `ios.bundleIdentifier` değerini Apple Developer hesabınızdaki benzersiz ID ile değiştirin.
2. `expo.extra.apiBaseUrl` değerini canlı HTTPS API adresi yapın.
3. `expo.extra.privacyPolicyUrl`, `termsUrl`, `eulaUrl`, `subscriptionTermsUrl` ve `privacyChoicesUrl` değerlerini gerçek, herkese açık HTTPS sayfalarınızla değiştirin.
4. Uygulama ücretsiz ve reklam destekli yayınlanacaksa reklam SDK'sının topladığı verileri App Store Connect App Privacy yanıtlarına ekleyin.
5. Reklam sağlayıcı kullanıcıyı uygulamalar ve web siteleri arasında takip ediyorsa App Tracking Transparency izin metnini ve uygulama içi izin akışını ekleyin.
6. App Store Connect'te App Privacy sorularını, backend, reklam SDK'sı ve üçüncü taraf arama API'leri dahil gerçek veri akışına göre doldurun.
7. EAS projesini bağlayın:

```bash
cd mobile
npx eas init
```

8. iOS production build alın:

```bash
npm run build:ios
```

9. App Store Connect'e gönderin:

```bash
npm run submit:ios
```

Yayın öncesi kök dizinde sıkı kontrol çalıştırın:

```bash
npm run preflight:release
```

## Ürün sınırları

Şahıs aramalarında özel telefon, kişisel e-posta ve ev adresi çıkarılmamalı. Bu sınır hem backend'de hem de App Store açıklamasında açıkça korunmalı.
