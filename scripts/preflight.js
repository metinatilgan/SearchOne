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
  const apiBaseUrl = expo.extra?.apiBaseUrl || "";
  const privacyPolicyUrl = expo.extra?.privacyPolicyUrl || "";
  const privacyChoicesUrl = expo.extra?.privacyChoicesUrl || "";
  const termsUrl = expo.extra?.termsUrl || "";
  const eulaUrl = expo.extra?.eulaUrl || "";
  const subscriptionTermsUrl = expo.extra?.subscriptionTermsUrl || "";

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

  if (bundleIdentifier === "com.searchone.app") {
    warnOrFail("Bundle ID hala örnek değerde: com.searchone.app");
  }

  for (const [label, value] of [
    ["apiBaseUrl", apiBaseUrl],
    ["privacyPolicyUrl", privacyPolicyUrl],
    ["privacyChoicesUrl", privacyChoicesUrl],
    ["termsUrl", termsUrl],
    ["eulaUrl", eulaUrl],
    ["subscriptionTermsUrl", subscriptionTermsUrl]
  ]) {
    if (/^http:\/\/localhost/.test(value)) {
      warnOrFail(`${label} localhost kullanıyor; App Store için HTTPS canlı URL gerekli.`);
    }
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
