const baseConfig = require("./app.json");

module.exports = () => {
  const expo = baseConfig.expo;
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || expo.extra.apiBaseUrl;
  const isReleaseBuild = process.env.EAS_BUILD_PROFILE === "production" || process.env.SEARCHONE_RELEASE_BUILD === "true";

  if (isReleaseBuild) {
    assertProductionUrl("EXPO_PUBLIC_API_BASE_URL", apiBaseUrl);
  }

  return {
    ...expo,
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
      apiTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || expo.extra.apiTimeoutMs || 12_000)
    }
  };
};

function assertProductionUrl(name, value) {
  const url = String(value || "");
  if (!url || /^http:\/\/localhost(?::|\/|$)/.test(url) || /^http:\/\/127\.0\.0\.1(?::|\/|$)/.test(url)) {
    throw new Error(`${name} must be a public HTTPS backend URL for production/TestFlight builds.`);
  }

  if (!url.startsWith("https://")) {
    throw new Error(`${name} must use HTTPS for production/TestFlight builds.`);
  }
}
