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
  const appConfig = readJson("mobile/app.json");
  if (!appConfig?.expo) {
    return;
  }

  const expo = appConfig.expo;
  const bundleIdentifier = expo.ios?.bundleIdentifier || "";
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || expo.extra?.apiBaseUrl || "";
  const privacyPolicyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || expo.extra?.privacyPolicyUrl || "";
  const privacyChoicesUrl = process.env.EXPO_PUBLIC_PRIVACY_CHOICES_URL || expo.extra?.privacyChoicesUrl || "";
  const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL || expo.extra?.termsUrl || "";
  const eulaUrl = process.env.EXPO_PUBLIC_EULA_URL || expo.extra?.eulaUrl || "";
  const subscriptionTermsUrl = process.env.EXPO_PUBLIC_SUBSCRIPTION_TERMS_URL || expo.extra?.subscriptionTermsUrl || "";
  const supportUrl = process.env.EXPO_PUBLIC_SUPPORT_URL || expo.extra?.supportUrl || "";
  const reportIssueUrl = process.env.EXPO_PUBLIC_REPORT_ISSUE_URL || expo.extra?.reportIssueUrl || "";

  requireValue("expo.name", expo.name);
  requireValue("expo.slug", expo.slug);
  requireValue("expo.icon", expo.icon);
  requireValue("expo.splash.image", expo.splash?.image);
  requireValue("expo.ios.bundleIdentifier", bundleIdentifier);
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

  checkPrivacyManifest(expo.ios?.privacyManifests);
}

function checkPrivacyManifest(manifest) {
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

  if (manifest.NSPrivacyTracking === false) {
    pass("privacy manifest tracking=false içeriyor.");
  } else {
    warnOrFail("privacy manifest NSPrivacyTracking=false içermiyor.");
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
