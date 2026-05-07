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

The current binary does not include an advertising SDK. If an ad SDK is added before submission, update:

- App Store Connect App Privacy answers.
- The iOS privacy manifest if the SDK collects additional data.
- ATT consent flow if the ad SDK tracks users across apps or websites.
- Review notes with the in-app path for reporting inappropriate ads.

## Metadata Suggestions

- Privacy Policy URL: `https://metinatilgan.github.io/SearchOne/privacy.html`
- User Privacy Choices URL: `https://metinatilgan.github.io/SearchOne/privacy-choices.html`
- Support URL: `https://metinatilgan.github.io/SearchOne/support.html`
- EULA URL: `https://metinatilgan.github.io/SearchOne/eula.html`
