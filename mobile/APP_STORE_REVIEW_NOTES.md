# SearchOne App Review Notes

## Reviewer Access

SearchOne does not require login or a demo account. The reviewer can search for a public business or organization name directly from the first screen.

## Backend Requirement

The iOS binary must be built with `EXPO_PUBLIC_API_BASE_URL` pointing to a live HTTPS backend that serves:

- `GET /api/health`
- `POST /api/search`

The backend must remain available during TestFlight review and App Review. GitHub Pages is used only for public legal/support pages and cannot serve the API.

## Privacy Boundary

SearchOne is for public web/source discovery. Person searches redact private phone numbers and personal email addresses from result text, and the app does not display private person contact details. Business/organization searches may show publicly sourced business contact records.

## Ads

The app includes Google AdMob banner support through `react-native-google-mobile-ads`. Development builds use Google sample ad IDs. TestFlight/App Store builds must be created with real AdMob iOS values:

- `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
- `EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID`

The app requests non-personalized ads by default and initializes Google's consent flow before requesting ads. The in-app banner has a "Bildir" action that opens the support/report page for inappropriate ads. If personalized ads are enabled later, App Store Connect privacy answers, ATT consent behavior, and the iOS privacy manifest must be reviewed again.

## Metadata Suggestions

- Privacy Policy URL: `https://metinatilgan.github.io/SearchOne/privacy.html`
- User Privacy Choices URL: `https://metinatilgan.github.io/SearchOne/privacy-choices.html`
- Support URL: `https://metinatilgan.github.io/SearchOne/support.html`
- EULA URL: `https://metinatilgan.github.io/SearchOne/eula.html`
