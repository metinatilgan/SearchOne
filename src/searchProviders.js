const { URLSearchParams } = require("node:url");

const DEFAULT_COUNT = 10;
const DEFAULT_TIMEOUT_MS = 8_000;
const PROVIDERS = {
  brave: "Brave Search",
  bing: "Bing Web Search",
  serpapi: "SerpAPI Google",
  tavily: "Tavily Search"
};

function hasProviderConfig(env = process.env) {
  return Boolean(getConfiguredProvider(env));
}

function getConfiguredProvider(env = process.env) {
  const requestedProvider = normalizeProvider(env.SEARCH_PROVIDER);

  if (requestedProvider) {
    return hasKeyForProvider(requestedProvider, env) ? requestedProvider : null;
  }

  if (env.BRAVE_SEARCH_API_KEY) return "brave";
  if (env.BING_SEARCH_API_KEY) return "bing";
  if (env.SERPAPI_API_KEY) return "serpapi";
  if (env.TAVILY_API_KEY) return "tavily";

  return null;
}

function getProviderStatus(env = process.env) {
  const requestedProvider = normalizeProvider(env.SEARCH_PROVIDER);
  const configuredProvider = getConfiguredProvider(env);

  return {
    configured: Boolean(configuredProvider),
    provider: configuredProvider ? PROVIDERS[configuredProvider] : null,
    requestedProvider: requestedProvider ? PROVIDERS[requestedProvider] : null,
    mode: configuredProvider ? "live" : "demo",
    requireLiveSearch: isLiveSearchRequired(env)
  };
}

async function searchWeb({ query, displayQuery = query, count = DEFAULT_COUNT, env = process.env }) {
  const provider = getConfiguredProvider(env);

  if (provider === "brave") {
    return searchBrave({ query, count, key: env.BRAVE_SEARCH_API_KEY, env });
  }

  if (provider === "bing") {
    return searchBing({ query, count, key: env.BING_SEARCH_API_KEY });
  }

  if (provider === "serpapi") {
    return searchSerpApi({ query, count, key: env.SERPAPI_API_KEY });
  }

  if (provider === "tavily") {
    return searchTavily({ query, count, key: env.TAVILY_API_KEY, env });
  }

  if (isLiveSearchRequired(env)) {
    throw new Error("Canlı arama zorunlu, ancak geçerli bir arama sağlayıcısı API anahtarı yapılandırılmamış.");
  }

  return demoResults(displayQuery);
}

async function searchBrave({ query, count, key, env = process.env }) {
  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(count, 20)),
    country: env.SEARCH_COUNTRY || "tr",
    search_lang: env.SEARCH_LANG || "tr",
    ui_lang: env.SEARCH_UI_LANG || "tr-TR",
    safesearch: env.SEARCH_SAFESEARCH || "moderate"
  });

  const response = await fetchWithTimeout(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": key
    }
  });

  if (!response.ok) {
    throw new Error(`Brave Search failed with ${response.status}`);
  }

  const data = await response.json();
  const webResults = data.web?.results || [];

  return {
    provider: "Brave Search",
    mode: "live",
    results: webResults.map((item) => ({
      title: stripHtml(item.title || ""),
      url: item.url,
      snippet: stripHtml(item.description || "")
    }))
  };
}

async function searchBing({ query, count, key }) {
  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(count, 20)),
    mkt: "tr-TR",
    safeSearch: "Moderate",
    responseFilter: "Webpages"
  });

  const response = await fetchWithTimeout(`https://api.bing.microsoft.com/v7.0/search?${params}`, {
    headers: {
      "Accept": "application/json",
      "Ocp-Apim-Subscription-Key": key
    }
  });

  if (!response.ok) {
    throw new Error(`Bing Search failed with ${response.status}`);
  }

  const data = await response.json();
  const webResults = data.webPages?.value || [];

  return {
    provider: "Bing Web Search",
    mode: "live",
    results: webResults.map((item) => ({
      title: stripHtml(item.name || ""),
      url: item.url,
      snippet: stripHtml(item.snippet || "")
    }))
  };
}

async function searchSerpApi({ query, count, key }) {
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    google_domain: "google.com.tr",
    gl: "tr",
    hl: "tr",
    num: String(Math.min(count, 10)),
    api_key: key
  });

  const response = await fetchWithTimeout(`https://serpapi.com/search.json?${params}`, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`SerpAPI failed with ${response.status}`);
  }

  const data = await response.json();
  const organicResults = data.organic_results || [];

  return {
    provider: "SerpAPI Google",
    mode: "live",
    results: organicResults.map((item) => ({
      title: stripHtml(item.title || ""),
      url: item.link,
      snippet: stripHtml(item.snippet || "")
    }))
  };
}

async function searchTavily({ query, count, key, env = process.env }) {
  const body = {
    query,
    search_depth: env.TAVILY_SEARCH_DEPTH || "basic",
    max_results: Math.min(count, 10),
    include_answer: false,
    include_raw_content: false,
    include_images: false,
    topic: env.TAVILY_TOPIC || "general"
  };

  if (env.TAVILY_COUNTRY) {
    body.country = env.TAVILY_COUNTRY;
  }

  const response = await fetchWithTimeout("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Tavily Search failed with ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];

  return {
    provider: "Tavily Search",
    mode: "live",
    results: results.map((item) => ({
      title: stripHtml(item.title || item.url || ""),
      url: item.url,
      snippet: stripHtml(item.content || item.snippet || "")
    }))
  };
}

function demoResults(query) {
  const encodedQuery = encodeURIComponent(query);
  return {
    provider: "Demo dataset",
    mode: "demo",
    results: [
      {
        title: `${query} - Resmi Web Sitesi`,
        url: `https://example.com/searchone-demo/${encodedQuery}`,
        snippet: `${query} ile ilgili resmi sayfa, hizmetler, adres bilgisi ve genel iletişim kanallarını içerir.`
      },
      {
        title: `${query} LinkedIn Profili`,
        url: `https://www.linkedin.com/search/results/all/?keywords=${encodedQuery}`,
        snippet: `${query} adını taşıyan kamuya açık LinkedIn sonuçları ve profesyonel profil bağlantıları.`
      },
      {
        title: `${query} Instagram`,
        url: `https://www.instagram.com/explore/search/keyword/?q=${encodedQuery}`,
        snippet: `${query} için sosyal medya arama sonucu.`
      },
      {
        title: `${query} iletisim`,
        url: `https://example.com/searchone-demo/${encodedQuery}/contact`,
        snippet: `Demo isletme sonucu: info@example.com, +90 212 000 00 00, Istanbul.`
      }
    ]
  };
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeProvider(provider) {
  const normalized = String(provider || "").trim().toLowerCase();
  if (normalized === "brave" || normalized === "bing" || normalized === "serpapi" || normalized === "tavily") {
    return normalized;
  }
  return "";
}

function hasKeyForProvider(provider, env) {
  if (provider === "brave") return Boolean(env.BRAVE_SEARCH_API_KEY);
  if (provider === "bing") return Boolean(env.BING_SEARCH_API_KEY);
  if (provider === "serpapi") return Boolean(env.SERPAPI_API_KEY);
  if (provider === "tavily") return Boolean(env.TAVILY_API_KEY);
  return false;
}

function isLiveSearchRequired(env = process.env) {
  return String(env.REQUIRE_LIVE_SEARCH || "").toLowerCase() === "true";
}

async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = Number(process.env.SEARCH_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Search provider timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  fetchWithTimeout,
  getConfiguredProvider,
  getProviderStatus,
  hasProviderConfig,
  isLiveSearchRequired,
  searchWeb,
  searchTavily,
  stripHtml
};
