const fs = require("node:fs");
const path = require("node:path");

const { analyzeResults, buildSearchQuery } = require("../src/analyze");
const { getProviderStatus, searchWeb } = require("../src/searchProviders");

const ROOT_DIR = path.resolve(__dirname, "..");

loadLocalEnv();

const query = process.argv.slice(2).join(" ").trim() || "SearchOne test";
const targetType = "business";
const location = process.env.SEARCH_TEST_LOCATION || "Istanbul";
const providerStatus = getProviderStatus();

if (!providerStatus.configured) {
  console.error("Canlı arama sağlayıcısı yapılandırılmamış.");
  console.error(".env dosyasına bir API anahtarı ekleyin, örn. SEARCH_PROVIDER=tavily ve TAVILY_API_KEY=...");
  process.exit(1);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function run() {
  const providerQuery = buildSearchQuery({ query, targetType, location });
  const searchResult = await searchWeb({
    query: providerQuery,
    displayQuery: query,
    count: 5,
    env: process.env
  });

  if (searchResult.mode !== "live") {
    throw new Error(`Canlı arama bekleniyordu, ancak ${searchResult.mode} modu döndü.`);
  }

  const analysis = analyzeResults({
    query,
    targetType,
    location,
    provider: searchResult.provider,
    mode: searchResult.mode,
    results: searchResult.results
  });

  console.log(`Provider: ${analysis.provider}`);
  console.log(`Mode: ${analysis.mode}`);
  console.log(`Sources: ${analysis.sources.length}`);
  console.log(`Confidence: ${analysis.confidence}/100`);
  console.log(analysis.summary);

  for (const source of analysis.sources.slice(0, 5)) {
    console.log(`- ${source.title} (${source.host})`);
    console.log(`  ${source.url}`);
  }
}

function loadLocalEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
