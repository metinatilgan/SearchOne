const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const strict = process.argv.includes("--strict");
const results = [];

checkJson("mobile/app.json");
checkJson("mobile/package.json");
checkJson("mobile/eas.json");
checkFile("mobile/assets/icon.png");
checkFile("mobile/assets/adaptive-icon.png");
checkFile("mobile/assets/splash-icon.png");
checkFile("public/privacy.html");
checkFile("public/privacy-choices.html");
checkFile("public/terms.html");
checkFile("public/eula.html");
checkFile("public/subscription-terms.html");
checkFile("public/support.html");
checkMobileDependencies();
checkAppConfig();

for (const result of results) {
  const label = result.level.padEnd(4);
  console.log(`${label} ${result.message}`);
}

const failures = results.filter((result) => result.level === "FAIL");
if (failures.length) {
  process.exitCode = 1;
}

function checkJson(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  try {
    JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    pass(`${relativePath} geçerli JSON.`);
  } catch (error) {
    fail(`${relativePath} okunamadı veya JSON değil: ${error.message}`);
  }
}

function checkFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`${relativePath} bulunamadı.`);
    return;
  }

  const size = fs.statSync(absolutePath).size;
  if (size <= 0) {
    fail(`${relativePath} boş.`);
    return;
  }

  pass(`${relativePath} mevcut.`);
}

function checkAppConfig() {
  const baseAppConfig = readJson("mobile/app.json");
  const expo = readExpoConfig() || baseAppConfig?.expo;
  if (!expo) {
    return;
  }

  const bundleIdentifier = expo.ios?.bundleIdentifier || "";
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || expo.extra?.apiBaseUrl || "";
  const privacyPolicyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || expo.extra?.privacyPolicyUrl || "";
  const privacyChoicesUrl = process.env.EXPO_PUBLIC_PRIVACY_CHOICES_URL || expo.extra?.privacyChoicesUrl || "";
  const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL || expo.extra?.termsUrl || "";
  const eulaUrl = process.env.EXPO_PUBLIC_EULA_URL || expo.extra?.eulaUrl || "";
  const subscriptionTermsUrl = process.env.EXPO_PUBLIC_SUBSCRIPTION_TERMS_URL || expo.extra?.subscriptionTermsUrl || "";
  const supportUrl = process.env.EXPO_PUBLIC_SUPPORT_URL || expo.extra?.supportUrl || "";
  const reportIssueUrl = process.env.EXPO_PUBLIC_REPORT_ISSUE_URL || expo.extra?.reportIssueUrl || "";
  const adsEnabled = expo.extra?.adsEnabled === true;
  const adsPersonalized = expo.extra?.adsPersonalized === true;

  requireValue("expo.name", expo.name);
  requireValue("expo.slug", expo.slug);
  requireValue("expo.icon", expo.icon);
  requireValue("expo.splash.image", expo.splash?.image);
  requireValue("expo.ios.bundleIdentifier", bundleIdentifier);
  requireValue("expo.android.package", expo.android?.package);
  requireValue("expo.extra.apiBaseUrl", apiBaseUrl);
  requireValue("expo.extra.privacyPolicyUrl", privacyPolicyUrl);
  requireValue("expo.extra.privacyChoicesUrl", privacyChoicesUrl);
  requireValue("expo.extra.termsUrl", termsUrl);
  requireValue("expo.extra.eulaUrl", eulaUrl);
  requireValue("expo.extra.subscriptionTermsUrl", subscriptionTermsUrl);
  requireValue("expo.extra.supportUrl", supportUrl);
  requireValue("expo.extra.reportIssueUrl", reportIssueUrl);
  requireValue("expo.ios.privacyManifests", expo.ios?.privacyManifests);

  if (bundleIdentifier === "com.searchone.app") {
    warnOrFail("Bundle ID hala örnek değerde: com.searchone.app");
  }

  if (expo.android?.package === "com.searchone.app") {
    warnOrFail("Android package hala örnek değerde: com.searchone.app");
  }

  for (const [label, value] of [
    ["apiBaseUrl", apiBaseUrl],
    ["privacyPolicyUrl", privacyPolicyUrl],
    ["privacyChoicesUrl", privacyChoicesUrl],
    ["termsUrl", termsUrl],
    ["eulaUrl", eulaUrl],
    ["subscriptionTermsUrl", subscriptionTermsUrl],
    ["supportUrl", supportUrl],
    ["reportIssueUrl", reportIssueUrl]
  ]) {
    if (/^http:\/\/localhost/.test(value)) {
      warnOrFail(`${label} localhost kullanıyor; App Store için HTTPS canlı URL gerekli.`);
    }

    if (strict && value && !value.startsWith("https://")) {
      fail(`${label} HTTPS kullanmalı: ${value}`);
    }
  }

  if (strict && apiBaseUrl.startsWith("https://metinatilgan.github.io/SearchOne")) {
    fail("apiBaseUrl GitHub Pages statik URL'si olamaz; /api/search destekleyen canlı backend URL gerekli.");
  }

  checkPrivacyManifest(expo.ios?.privacyManifests, adsPersonalized);
  checkAdsConfig(expo, adsEnabled);
}

function checkMobileDependencies() {
  const packageJson = readJson("mobile/package.json");
  if (!packageJson) {
    return;
  }

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  requireValue("mobile dependency react-native-google-mobile-ads", dependencies["react-native-google-mobile-ads"]);
  requireValue("mobile dependency expo-tracking-transparency", dependencies["expo-tracking-transparency"]);
  requireValue("mobile dependency @expo/config-plugins", dependencies["@expo/config-plugins"]);
}

function checkAdsConfig(expo, adsEnabled) {
  if (!adsEnabled) {
    warnOrFail("Reklamlar expo.extra.adsEnabled=false; App Store gelir modeli reklam olacaksa production build'de etkin olmalı.");
    return;
  }

  const plugins = expo.plugins || [];
  const extra = expo.extra || {};
  const iosInfoPlist = expo.ios?.infoPlist || {};

  if (hasPlugin(plugins, "react-native-google-mobile-ads")) {
    pass("react-native-google-mobile-ads config plugin tanımlı.");
  } else {
    fail("react-native-google-mobile-ads config plugin eksik.");
  }

  if (hasPlugin(plugins, "expo-tracking-transparency")) {
    pass("expo-tracking-transparency config plugin tanımlı.");
  } else {
    fail("expo-tracking-transparency config plugin eksik.");
  }

  requireValue("expo.extra.adProvider", extra.adProvider);
  requireValue("expo.extra.admobIosAppId", extra.admobIosAppId);
  requireValue("expo.extra.admobIosBannerAdUnitId", extra.admobIosBannerAdUnitId);
  requireValue("expo.ios.infoPlist.NSUserTrackingUsageDescription", iosInfoPlist.NSUserTrackingUsageDescription);

  if (extra.adsRequestNonPersonalizedOnly === true) {
    pass("reklam isteği varsayılan olarak non-personalized.");
  } else {
    warnOrFail("reklam isteği non-personalized değil; App Store privacy labels ve ATT akışı buna göre doğrulanmalı.");
  }

  for (const [label, value, separator] of [
    ["admobIosAppId", extra.admobIosAppId, "~"],
    ["admobIosBannerAdUnitId", extra.admobIosBannerAdUnitId, "/"]
  ]) {
    if (!value) {
      continue;
    }

    if (!String(value).startsWith("ca-app-pub-") || !String(value).includes(separator)) {
      warnOrFail(`${label} geçerli AdMob formatında değil.`);
    } else if (isGoogleSampleAdId(value)) {
      warnOrFail(`${label} Google test ID kullanıyor; TestFlight/production için gerçek AdMob ID gerekli.`);
    } else {
      pass(`${label} production formatında.`);
    }
  }
}

function checkPrivacyManifest(manifest, expectsTracking) {
  if (!manifest) {
    return;
  }

  const accessedTypes = manifest.NSPrivacyAccessedAPITypes || [];
  const collectedTypes = manifest.NSPrivacyCollectedDataTypes || [];

  const hasUserDefaults = accessedTypes.some((item) =>
    item.NSPrivacyAccessedAPIType === "NSPrivacyAccessedAPICategoryUserDefaults" &&
    item.NSPrivacyAccessedAPITypeReasons?.includes("CA92.1")
  );
  const hasSearchHistory = collectedTypes.some((item) =>
    item.NSPrivacyCollectedDataType === "NSPrivacyCollectedDataTypeSearchHistory" &&
    item.NSPrivacyCollectedDataTypePurposes?.includes("NSPrivacyCollectedDataTypePurposeAppFunctionality")
  );

  if (hasUserDefaults) {
    pass("privacy manifest UserDefaults gerekçesi içeriyor.");
  } else {
    warnOrFail("privacy manifest UserDefaults/CA92.1 gerekçesini içermiyor.");
  }

  if (hasSearchHistory) {
    pass("privacy manifest arama geçmişi veri tipini beyan ediyor.");
  } else {
    warnOrFail("privacy manifest SearchHistory/AppFunctionality beyanını içermiyor.");
  }

  if (expectsTracking && manifest.NSPrivacyTracking === true) {
    pass("privacy manifest tracking=true içeriyor.");
  } else if (!expectsTracking && manifest.NSPrivacyTracking === false) {
    pass("privacy manifest tracking=false içeriyor.");
  } else {
    warnOrFail(`privacy manifest NSPrivacyTracking=${expectsTracking ? "true" : "false"} içermiyor.`);
  }
}

function readExpoConfig() {
  try {
    const configFactory = require(path.join(ROOT, "mobile/app.config.js"));
    const config = typeof configFactory === "function" ? configFactory() : configFactory;
    return config?.expo || config || null;
  } catch (error) {
    fail(`mobile/app.config.js çözümlenemedi: ${error.message}`);
    return null;
  }
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function requireValue(label, value) {
  if (value) {
    pass(`${label} tanımlı.`);
    return;
  }
  fail(`${label} eksik.`);
}

function hasPlugin(plugins, name) {
  return plugins.some((plugin) => {
    if (typeof plugin === "string") {
      return plugin === name;
    }

    return Array.isArray(plugin) && plugin[0] === name;
  });
}

function isGoogleSampleAdId(value) {
  return String(value || "").includes("3940256099942544");
}

function warnOrFail(message) {
  if (strict) {
    fail(message);
  } else {
    warn(message);
  }
}

function pass(message) {
  results.push({ level: "OK", message });
}

function warn(message) {
  results.push({ level: "WARN", message });
}

function fail(message) {
  results.push({ level: "FAIL", message });
}
