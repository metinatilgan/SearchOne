const baseConfig = require("./app.json");

const ADMOB_TEST_IDS = {
  iosAppId: "ca-app-pub-3940256099942544~1458002511",
  androidAppId: "ca-app-pub-3940256099942544~3347511713",
  iosBannerAdUnitId: "ca-app-pub-3940256099942544/2435281174",
  androidBannerAdUnitId: "ca-app-pub-3940256099942544/9214589741"
};

const TRACKING_PERMISSION_COPY =
  "SearchOne, izin verirseniz size daha alakalı reklamlar göstermek ve reklam performansını ölçmek için cihaz reklam tanımlayıcısını kullanabilir.";

module.exports = () => {
  const expo = baseConfig.expo;
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || expo.extra.apiBaseUrl;
  const isReleaseBuild = process.env.EAS_BUILD_PROFILE === "production" || process.env.SEARCHONE_RELEASE_BUILD === "true";
  const adsEnabled = parseBoolean(process.env.EXPO_PUBLIC_ADS_ENABLED, expo.extra.adsEnabled ?? true);
  const adsPersonalized = parseBoolean(process.env.EXPO_PUBLIC_ADS_PERSONALIZED, expo.extra.adsPersonalized ?? false);
  const adsRequestNonPersonalizedOnly = parseBoolean(
    process.env.EXPO_PUBLIC_ADS_NON_PERSONALIZED_ONLY,
    expo.extra.adsRequestNonPersonalizedOnly ?? !adsPersonalized
  );
  const admobIosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || expo.extra.admobIosAppId || ADMOB_TEST_IDS.iosAppId;
  const admobAndroidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || expo.extra.admobAndroidAppId || ADMOB_TEST_IDS.androidAppId;
  const admobIosBannerAdUnitId =
    process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID || expo.extra.admobIosBannerAdUnitId || ADMOB_TEST_IDS.iosBannerAdUnitId;
  const admobAndroidBannerAdUnitId =
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_AD_UNIT_ID ||
    expo.extra.admobAndroidBannerAdUnitId ||
    ADMOB_TEST_IDS.androidBannerAdUnitId;

  if (isReleaseBuild) {
    assertProductionUrl("EXPO_PUBLIC_API_BASE_URL", apiBaseUrl);

    if (adsEnabled) {
      assertProductionAdMobId("EXPO_PUBLIC_ADMOB_IOS_APP_ID", admobIosAppId, "~");
      assertProductionAdMobId("EXPO_PUBLIC_ADMOB_IOS_BANNER_AD_UNIT_ID", admobIosBannerAdUnitId, "/");
    }
  }

  const plugins = adsEnabled
    ? [
        ...(expo.plugins || []),
        [
          "react-native-google-mobile-ads",
          {
            iosAppId: admobIosAppId,
            androidAppId: admobAndroidAppId,
            delayAppMeasurementInit: true,
            optimizeInitialization: true,
            optimizeAdLoading: true,
            userTrackingUsageDescription: TRACKING_PERMISSION_COPY
          }
        ],
        [
          "expo-tracking-transparency",
          {
            userTrackingPermission: TRACKING_PERMISSION_COPY
          }
        ]
      ]
    : expo.plugins || [];

  const privacyManifests = {
    ...expo.ios?.privacyManifests,
    NSPrivacyTracking: adsPersonalized,
    NSPrivacyTrackingDomains: expo.ios?.privacyManifests?.NSPrivacyTrackingDomains || []
  };

  return {
    ...expo,
    plugins,
    ios: {
      ...expo.ios,
      infoPlist: {
        ...expo.ios?.infoPlist,
        NSUserTrackingUsageDescription: TRACKING_PERMISSION_COPY
      },
      privacyManifests
    },
    extra: {
      ...expo.extra,
      apiBaseUrl,
      privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || expo.extra.privacyPolicyUrl,
      privacyChoicesUrl: process.env.EXPO_PUBLIC_PRIVACY_CHOICES_URL || expo.extra.privacyChoicesUrl,
      termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || expo.extra.termsUrl,
      eulaUrl: process.env.EXPO_PUBLIC_EULA_URL || expo.extra.eulaUrl,
      subscriptionTermsUrl: process.env.EXPO_PUBLIC_SUBSCRIPTION_TERMS_URL || expo.extra.subscriptionTermsUrl,
      supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL || expo.extra.supportUrl,
      reportIssueUrl: process.env.EXPO_PUBLIC_REPORT_ISSUE_URL || expo.extra.reportIssueUrl,
      apiTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || expo.extra.apiTimeoutMs || 12_000),
      adProvider: adsEnabled ? "admob" : "none",
      adsEnabled,
      adsPersonalized,
      adsRequestNonPersonalizedOnly,
      admobIosAppId,
      admobAndroidAppId,
      admobIosBannerAdUnitId,
      admobAndroidBannerAdUnitId
    }
  };
};

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return Boolean(fallback);
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function assertProductionUrl(name, value) {
  const url = String(value || "");
  if (!url || /^http:\/\/localhost(?::|\/|$)/.test(url) || /^http:\/\/127\.0\.0\.1(?::|\/|$)/.test(url)) {
    throw new Error(`${name} must be a public HTTPS backend URL for production/TestFlight builds.`);
  }

  if (!url.startsWith("https://")) {
    throw new Error(`${name} must use HTTPS for production/TestFlight builds.`);
  }
}

function assertProductionAdMobId(name, value, separator) {
  const id = String(value || "");
  if (!id) {
    throw new Error(`${name} must be set for production/TestFlight builds when ads are enabled.`);
  }

  if (id.includes("3940256099942544")) {
    throw new Error(`${name} is a Google sample ad ID. Use your real AdMob ID for production/TestFlight builds.`);
  }

  if (!id.startsWith("ca-app-pub-") || !id.includes(separator)) {
    throw new Error(`${name} must be a valid AdMob ID.`);
  }
}
