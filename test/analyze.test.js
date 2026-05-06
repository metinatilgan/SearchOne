const test = require("node:test");
const assert = require("node:assert/strict");

const { analyzeResults, buildSearchQuery, extractBusinessContacts, hostMatchesDomain } = require("../src/analyze");
const { classifySource } = require("../src/analyze");
const { createRateLimiter } = require("../src/rateLimit");
const { redactUnsafeContacts } = require("../src/privacy");
const { getConfiguredProvider, getProviderStatus, searchWeb } = require("../src/searchProviders");

test("buildSearchQuery adds contact intent for business searches", () => {
  const query = buildSearchQuery({
    query: "Acme Yazilim",
    targetType: "business",
    location: "Istanbul"
  });

  assert.match(query, /Acme Yazilim/);
  assert.match(query, /Istanbul/);
  assert.match(query, /telefon/);
});

test("person searches redact email and phone snippets", () => {
  const result = analyzeResults({
    query: "Ayse Yilmaz",
    targetType: "person",
    provider: "test",
    mode: "test",
    results: [
      {
        title: "Ayse Yilmaz personal page",
        url: "https://example.com/ayse",
        snippet: "Reach me at ayse@gmail.com or +90 555 111 22 33."
      },
      {
        title: "Ayse Yilmaz LinkedIn",
        url: "https://www.linkedin.com/in/ayse-yilmaz",
        snippet: "Professional profile."
      }
    ]
  });

  assert.equal(result.contacts.length, 0);
  assert.match(result.sources[0].snippet, /gizlendi/);
  assert.equal(result.socialProfiles[0].platform, "LinkedIn");
});

test("business contact extraction skips personal email domains", () => {
  const contacts = extractBusinessContacts([
    {
      title: "Acme iletisim",
      url: "https://acme.example/contact",
      host: "acme.example",
      snippet: "info@acme.example satis@acme.example owner@gmail.com +90 212 000 00 00"
    }
  ]);

  assert.deepEqual(
    contacts.filter((contact) => contact.type === "email").map((contact) => contact.value),
    ["info@acme.example", "satis@acme.example"]
  );
  assert.equal(contacts.some((contact) => contact.type === "phone"), true);
});

test("redactUnsafeContacts keeps business text intact", () => {
  const text = "info@example.com +90 212 000 00 00";
  assert.equal(redactUnsafeContacts(text, "business"), text);
});

test("analysis adds source classification metadata", () => {
  const result = analyzeResults({
    query: "Ankara Belediyesi",
    targetType: "business",
    provider: "test",
    mode: "test",
    results: [
      {
        title: "Ankara Belediyesi",
        url: "https://ankara.bel.tr",
        snippet: "Resmi belediye sitesi"
      },
      {
        title: "Ankara Belediyesi LinkedIn",
        url: "https://www.linkedin.com/company/ankara",
        snippet: "Profil"
      }
    ]
  });

  assert.equal(result.sources[0].sourceType, "institutional");
  assert.equal(result.sources[0].sourceTrust, "high");
  assert.equal(result.sources[1].sourceType, "social");
});

test("classifySource marks directory sources as verification-needed", () => {
  const source = classifySource({
    host: "tripadvisor.com",
    title: "Cafe",
    snippet: "Reviews"
  });

  assert.equal(source.type, "directory");
  assert.equal(source.trust, "medium");
});

test("social source matching does not confuse yandex with x.com", () => {
  assert.equal(hostMatchesDomain("x.com", "x.com"), true);
  assert.equal(hostMatchesDomain("mobile.twitter.com", "twitter.com"), true);
  assert.equal(hostMatchesDomain("yandex.com.tr", "x.com"), false);

  const result = analyzeResults({
    query: "Acme Teknoloji",
    targetType: "business",
    provider: "test",
    mode: "test",
    results: [
      {
        title: "Acme Teknoloji - Yandex Maps",
        url: "https://yandex.com.tr/maps/org/acme_teknoloji/231597313354/",
        snippet: "Harita kaydı"
      }
    ]
  });

  assert.equal(result.socialProfiles.length, 0);
  assert.equal(result.sources[0].sourceType, "directory");
});

test("rate limiter blocks after configured maximum", () => {
  const limiter = createRateLimiter({ windowMs: 1_000, max: 2 });

  assert.equal(limiter("ip", 100).allowed, true);
  assert.equal(limiter("ip", 200).allowed, true);

  const blocked = limiter("ip", 300);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);

  assert.equal(limiter("ip", 1_200).allowed, true);
});

test("provider status reports demo mode without API keys", () => {
  const status = getProviderStatus({});
  assert.equal(status.configured, false);
  assert.equal(status.mode, "demo");
});

test("provider selection honors requested provider", () => {
  assert.equal(getConfiguredProvider({
    SEARCH_PROVIDER: "brave",
    BRAVE_SEARCH_API_KEY: "key",
    BING_SEARCH_API_KEY: "other"
  }), "brave");
  assert.equal(getConfiguredProvider({
    SEARCH_PROVIDER: "brave",
    BING_SEARCH_API_KEY: "other"
  }), null);
  assert.equal(getConfiguredProvider({
    SEARCH_PROVIDER: "tavily",
    TAVILY_API_KEY: "key"
  }), "tavily");
});

test("live-required mode blocks demo fallback", async () => {
  await assert.rejects(
    searchWeb({
      query: "test",
      env: { REQUIRE_LIVE_SEARCH: "true" }
    }),
    /Canlı arama zorunlu/
  );
});

test("tavily provider normalizes live search results", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.tavily.com/search");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer test-key");

    const body = JSON.parse(options.body);
    assert.equal(body.query, "Acme Yazilim");
    assert.equal(body.max_results, 2);

    return {
      ok: true,
      async json() {
        return {
          results: [
            {
              title: "Acme Yazilim",
              url: "https://acme.example",
              content: "Official company page."
            }
          ]
        };
      }
    };
  };

  try {
    const result = await searchWeb({
      query: "Acme Yazilim",
      count: 2,
      env: {
        SEARCH_PROVIDER: "tavily",
        TAVILY_API_KEY: "test-key",
        TAVILY_SEARCH_DEPTH: "basic"
      }
    });

    assert.equal(result.provider, "Tavily Search");
    assert.equal(result.mode, "live");
    assert.deepEqual(result.results, [
      {
        title: "Acme Yazilim",
        url: "https://acme.example",
        snippet: "Official company page."
      }
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});
