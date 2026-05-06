const baseConfig = require("./app.json");

module.exports = () => {
  const expo = baseConfig.expo;

  return {
    ...expo,
    extra: {
      ...expo.extra,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || expo.extra.apiBaseUrl,
      privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || expo.extra.privacyPolicyUrl,
      privacyChoicesUrl: process.env.EXPO_PUBLIC_PRIVACY_CHOICES_URL || expo.extra.privacyChoicesUrl,
      termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || expo.extra.termsUrl,
      eulaUrl: process.env.EXPO_PUBLIC_EULA_URL || expo.extra.eulaUrl,
      subscriptionTermsUrl: process.env.EXPO_PUBLIC_SUBSCRIPTION_TERMS_URL || expo.extra.subscriptionTermsUrl,
      apiTimeoutMs: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || expo.extra.apiTimeoutMs || 12_000)
    }
  };
};
