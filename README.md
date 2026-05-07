# SearchOne

SearchOne, isim veya işletme aramasını resmi arama API'leri üzerinden yapıp sonuçları kaynaklı şekilde sınıflandıran bir MVP'dir. Amaç, işletme/kurum iletişim bilgilerini ve kamuya açık sosyal/profesyonel profil adaylarını tek ekranda göstermektir.

Şahıs aramalarında özel telefon, kişisel e-posta ve ev adresi çıkarılmaz. Uygulama yalnızca kamuya açık kaynak bağlantıları ve profesyonel/sosyal profil adaylarını gösterir.

## Çalıştırma

```bash
npm run dev
```

Arayüz: `http://localhost:5173`

API anahtarı yoksa uygulama demo modunda çalışır.

## Canlı arama ayarı

```bash
cp .env.example .env
```

`.env` içine sağlayıcılardan birini ekleyin:

```bash
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=...
```

Demo fallback kapansın ve eksik anahtar varsa hata versin istiyorsanız:

```bash
SEARCH_PROVIDER=tavily
REQUIRE_LIVE_SEARCH=true
```

Canlı sağlayıcıyı doğrulama:

```bash
npm run search:verify -- "Acme Yazılım"
```

Desteklenen sağlayıcılar:

- Tavily Search
- Brave Search API
- Bing Web Search API
- SerpAPI

## Heroku backend yayını

Heroku, bu repo için `Procfile` üzerinden `npm start` komutunu çalıştırır ve `PORT` değerini otomatik verir. Dashboard üzerinden deploy için:

1. Heroku'da yeni app oluşturun.
2. **Deploy** sekmesinde GitHub repo olarak `metinatilgan/SearchOne` bağlayın.
3. **Settings > Config Vars** bölümüne production değerlerini ekleyin:

```bash
SEARCH_PROVIDER=tavily
REQUIRE_LIVE_SEARCH=true
TAVILY_API_KEY=...
TAVILY_SEARCH_DEPTH=basic
TAVILY_TOPIC=general
TAVILY_COUNTRY=turkey
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30
SEARCH_TIMEOUT_MS=8000
SEARCH_COUNTRY=tr
SEARCH_LANG=tr
SEARCH_UI_LANG=tr-TR
SEARCH_SAFESEARCH=moderate
```

4. **Manual Deploy** ile `main` branch'ini deploy edin.
5. Deploy sonrası sağlık kontrolünü açın:

```bash
https://<heroku-app-adiniz>.herokuapp.com/api/health
```

Yanıt `providerConfigured: true` ve `mode: "live"` dönmelidir. Mobil TestFlight build sırasında `EXPO_PUBLIC_API_BASE_URL` bu Heroku HTTPS adresi olmalıdır.

Heroku CLI kullanacaksanız aynı işlem:

```bash
heroku login
heroku create searchone-api
heroku config:set SEARCH_PROVIDER=tavily REQUIRE_LIVE_SEARCH=true TAVILY_API_KEY=...
git push heroku main
```

## API

`POST /api/search`

```json
{
  "query": "Acme Yazılım",
  "targetType": "business",
  "location": "İstanbul"
}
```

`targetType` değerleri:

- `business`: işletme iletişim kayıtlarını kamuya açık kaynaklardan çıkarır.
- `organization`: kurum gibi davranır.
- `person`: özel iletişim bilgilerini filtreler, sosyal/profesyonel profil adaylarını gösterir.

## Mimari

- `public/`: bağımlılıksız HTML/CSS/JS arayüzü.
- `src/server.js`: statik dosya sunucusu ve JSON API.
- `src/searchProviders.js`: Tavily, Brave, Bing, SerpAPI ve demo sağlayıcı adaptörleri.
- `src/analyze.js`: sonuç tekilleştirme, sosyal profil, resmi kaynak ve iletişim çıkarımı.
- `src/privacy.js`: hedef türüne göre gizlilik politikası ve kişi araması redaksiyonu.
- `public/privacy.html`: App Store için herkese açık gizlilik politikası taslağı.
- `public/privacy-choices.html`: veri tercihleri ve kaldırma talebi taslağı.
- `public/terms.html`: kullanım şartları.
- `public/eula.html`: son kullanıcı lisans sözleşmesi.
- `public/subscription-terms.html`: ücretsiz/reklam destekli sürüm ve ileride abonelik eklenirse geçerli olacak açıklamalar.
- `mobile/assets/`: App Store build için ikon ve splash varlıkları.
- `scripts/generate_mobile_assets.py`: `mobile/assets/source-icon.png` dosyasından App Store ikonlarını yeniden üretir.
- `.github/workflows/pages.yml`: `public/` klasöründeki yasal sayfaları GitHub Pages'e yayınlar.

## Yasal sayfalar

GitHub Pages yayını etkinleştirildiğinde sayfalar şu adreslerden kullanılabilir:

- `https://metinatilgan.github.io/SearchOne/privacy.html`
- `https://metinatilgan.github.io/SearchOne/terms.html`
- `https://metinatilgan.github.io/SearchOne/eula.html`
- `https://metinatilgan.github.io/SearchOne/subscription-terms.html`
- `https://metinatilgan.github.io/SearchOne/privacy-choices.html`

App Store'a göndermeden önce gizlilik politikasındaki destek e-postası/veri sorumlusu bölümü gerçek bilgilerle doldurulmalıdır.

## Üretim notları

- Google sonuçlarını HTML olarak kazımak yerine resmi arama API'si kullanılmalı.
- Kişisel veriler için KVKK/GDPR uyumu, silme/itiraz mekanizması ve denetim kaydı eklenmeli.
- Yanlış eşleşmeleri azaltmak için sonraki adımda alan adı doğrulama, kaynak güven sıralaması ve manuel onay akışı eklenmeli.
- Reklam SDK'sı eklendiğinde App Store Connect App Privacy yanıtları ve gerekiyorsa iOS App Tracking Transparency izni gerçek veri akışına göre güncellenmeli.

## Mobil uygulama

Expo/React Native iOS uygulaması `mobile/` klasörüne eklendi.

```bash
npm run dev
cd mobile
npm install
npm run start
```

App Store build ve gönderim adımları için `mobile/README.md` dosyasına bakın.

Yayın öncesi kontrol:

```bash
npm run preflight
npm run preflight:release
```
