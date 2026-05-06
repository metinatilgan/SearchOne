const {
  contactsAllowedFor,
  getPrivacyNotice,
  isPersonalEmail,
  normalizeTargetType,
  redactUnsafeContacts
} = require("./privacy");

const SOCIAL_PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", hostPatterns: ["linkedin.com"] },
  { id: "instagram", label: "Instagram", hostPatterns: ["instagram.com"] },
  { id: "facebook", label: "Facebook", hostPatterns: ["facebook.com", "fb.com"] },
  { id: "x", label: "X / Twitter", hostPatterns: ["x.com", "twitter.com"] },
  { id: "youtube", label: "YouTube", hostPatterns: ["youtube.com", "youtu.be"] },
  { id: "tiktok", label: "TikTok", hostPatterns: ["tiktok.com"] },
  { id: "github", label: "GitHub", hostPatterns: ["github.com"] },
  { id: "medium", label: "Medium", hostPatterns: ["medium.com"] },
  { id: "crunchbase", label: "Crunchbase", hostPatterns: ["crunchbase.com"] }
];

const DIRECTORY_HOSTS = [
  "google.",
  "bing.",
  "yandex.",
  "yellowpages",
  "tripadvisor.",
  "yelp.",
  "foursquare.",
  "sikayetvar.",
  "maps.apple.",
  "mapcarta."
];

const INSTITUTIONAL_HOST_PATTERNS = [
  ".gov.tr",
  ".bel.tr",
  ".edu.tr",
  ".k12.tr",
  ".org.tr"
];

function buildSearchQuery({ query, targetType, location }) {
  const normalizedType = normalizeTargetType(targetType);
  const parts = [query.trim()];

  if (location?.trim()) {
    parts.push(location.trim());
  }

  if (contactsAllowedFor(normalizedType)) {
    parts.push("(resmi site OR iletisim OR telefon OR adres OR email)");
  } else {
    parts.push("(resmi profil OR LinkedIn OR Instagram OR X OR haber)");
  }

  return parts.join(" ");
}

function analyzeResults({ query, targetType, location, provider, mode, results }) {
  const normalizedType = normalizeTargetType(targetType);
  const cleanedResults = dedupeResults(results)
    .slice(0, 12)
    .map((result, index) => sanitizeResult(result, normalizedType, index));

  const socialProfiles = extractSocialProfiles(cleanedResults);
  const officialSources = extractOfficialSources(cleanedResults);
  const contacts = contactsAllowedFor(normalizedType) ? extractBusinessContacts(cleanedResults) : [];
  const summary = buildSummary({ query, normalizedType, location, cleanedResults, socialProfiles, contacts });

  return {
    query,
    targetType: normalizedType,
    location: location || "",
    provider,
    mode,
    privacyNotice: getPrivacyNotice(normalizedType),
    confidence: scoreConfidence({ cleanedResults, socialProfiles, officialSources, contacts }),
    summary,
    contacts,
    socialProfiles,
    officialSources,
    sources: cleanedResults
  };
}

function sanitizeResult(result, targetType, index = 0) {
  const url = sanitizeUrl(result.url || "");
  const host = getHost(url);
  const sourceMeta = classifySource({ host, title: result.title || "", snippet: result.snippet || "" });

  return {
    rank: index + 1,
    title: redactUnsafeContacts(result.title || "", targetType),
    url,
    snippet: redactUnsafeContacts(result.snippet || "", targetType),
    host,
    sourceType: sourceMeta.type,
    sourceLabel: sourceMeta.label,
    sourceTrust: sourceMeta.trust,
    sourceNote: sourceMeta.note
  };
}

function dedupeResults(results) {
  const seen = new Set();
  const output = [];

  for (const result of results || []) {
    if (!result?.url || seen.has(result.url)) {
      continue;
    }
    seen.add(result.url);
    output.push(result);
  }

  return output;
}

function extractSocialProfiles(results) {
  const found = new Map();

  for (const result of results) {
    const host = result.host;
    const platform = SOCIAL_PLATFORMS.find((candidate) =>
      candidate.hostPatterns.some((pattern) => hostMatchesDomain(host, pattern))
    );

    if (!platform || found.has(platform.id)) {
      continue;
    }

    found.set(platform.id, {
      platform: platform.label,
      url: result.url,
      title: result.title,
      sourceHost: host,
      confidence: confidenceFromRank(results.indexOf(result))
    });
  }

  return Array.from(found.values());
}

function extractOfficialSources(results) {
  return results
    .filter((result) => {
      const host = result.host;
      if (!host || SOCIAL_PLATFORMS.some((platform) => platform.hostPatterns.some((pattern) => hostMatchesDomain(host, pattern)))) {
        return false;
      }
      return !DIRECTORY_HOSTS.some((directoryHost) => host.includes(directoryHost));
    })
    .slice(0, 4)
    .map((result, index) => ({
      title: result.title,
      url: result.url,
      host: result.host,
      confidence: confidenceFromRank(index),
      sourceLabel: result.sourceLabel,
      sourceTrust: result.sourceTrust
    }));
}

function extractBusinessContacts(results) {
  const emailMatches = new Map();
  const phoneMatches = new Map();
  const addressMatches = new Map();

  for (const result of results) {
    const text = `${result.title} ${result.snippet}`;

    for (const email of matchEmails(text)) {
      if (!isPersonalEmail(email)) {
        emailMatches.set(email.toLowerCase(), {
          type: "email",
          value: email,
          sourceUrl: result.url,
          sourceHost: result.host
        });
      }
    }

    for (const phone of matchPhones(text)) {
      phoneMatches.set(normalizePhone(phone), {
        type: "phone",
        value: phone.trim(),
        sourceUrl: result.url,
        sourceHost: result.host
      });
    }

    for (const address of matchLikelyAddresses(text)) {
      addressMatches.set(address.toLowerCase(), {
        type: "address",
        value: address,
        sourceUrl: result.url,
        sourceHost: result.host
      });
    }
  }

  return [...emailMatches.values(), ...phoneMatches.values(), ...addressMatches.values()].slice(0, 8);
}

function buildSummary({ query, normalizedType, location, cleanedResults, socialProfiles, contacts }) {
  const typeLabel = normalizedType === "person" ? "şahıs/profesyonel profil" : "işletme/kurum";
  const locationText = location ? ` ${location} konumu ile daraltıldı.` : "";
  const sourceCount = cleanedResults.length;
  const socialText = socialProfiles.length ? `${socialProfiles.length} sosyal/profesyonel profil adayı bulundu.` : "Sosyal profil adayı bulunamadı.";
  const contactText = contactsAllowedFor(normalizedType)
    ? contacts.length
      ? `${contacts.length} kamuya açık iletişim kaydı çıkarıldı.`
      : "İletişim kaydı için resmi kaynak bulunamadı."
    : "Şahıs aramasında özel iletişim bilgileri filtrelendi.";

  return `${query} için ${typeLabel} araması yapıldı.${locationText} ${sourceCount} kaynak değerlendirildi. ${socialText} ${contactText}`;
}

function scoreConfidence({ cleanedResults, socialProfiles, officialSources, contacts }) {
  let score = 20;
  score += Math.min(cleanedResults.length, 10) * 4;
  score += Math.min(socialProfiles.length, 3) * 8;
  score += Math.min(officialSources.length, 2) * 12;
  score += Math.min(contacts.length, 2) * 8;
  score += cleanedResults.some((result) => result.sourceTrust === "high") ? 8 : 0;
  return Math.max(0, Math.min(100, score));
}

function confidenceFromRank(index) {
  if (index <= 1) return "high";
  if (index <= 4) return "medium";
  return "low";
}

function matchEmails(text) {
  return String(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
}

function matchPhones(text) {
  return String(text).match(/(?:\+?\d[\s().-]?){8,}\d/g) || [];
}

function normalizePhone(phone) {
  return String(phone).replace(/[^\d+]/g, "");
}

function matchLikelyAddresses(text) {
  const matches = [];
  const pattern = /([A-ZÇĞİÖŞÜa-zçğıöşü0-9\s.'-]{4,80}\b(?:Mah\.|Mahallesi|Cad\.|Caddesi|Sok\.|Sokak|Blv\.|Bulvarı|No:?\s*\d+)[A-ZÇĞİÖŞÜa-zçğıöşü0-9\s.,'/-]{0,80})/g;
  let match;

  while ((match = pattern.exec(String(text))) !== null) {
    matches.push(match[1].replace(/\s+/g, " ").trim());
  }

  return matches;
}

function getHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hostMatchesDomain(host, domain) {
  const normalizedHost = String(host || "").replace(/^www\./, "").toLowerCase();
  const normalizedDomain = String(domain || "").replace(/^www\./, "").toLowerCase();
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function classifySource({ host, title, snippet }) {
  const haystack = `${host} ${title} ${snippet}`.toLowerCase();

  const socialPlatform = SOCIAL_PLATFORMS.find((platform) =>
    platform.hostPatterns.some((pattern) => hostMatchesDomain(host, pattern))
  );

  if (socialPlatform) {
    return {
      type: "social",
      label: "Sosyal/profil",
      trust: "medium",
      note: `${socialPlatform.label} sonucu; hesap sahibinin doğrulanması gerekir.`
    };
  }

  if (INSTITUTIONAL_HOST_PATTERNS.some((pattern) => host.endsWith(pattern) || host.includes(pattern))) {
    return {
      type: "institutional",
      label: "Kamu/kurum",
      trust: "high",
      note: "Kurumsal alan adı nedeniyle daha güvenilir kaynak adayı."
    };
  }

  if (DIRECTORY_HOSTS.some((directoryHost) => host.includes(directoryHost))) {
    return {
      type: "directory",
      label: "Dizin/harita",
      trust: "medium",
      note: "Dizin kaydı; resmi web sitesiyle doğrulamak gerekir."
    };
  }

  if (/\b(haber|news|gazete|dergi|press|basin)\b/.test(haystack)) {
    return {
      type: "news",
      label: "Haber/basın",
      trust: "medium",
      note: "Basın kaynağı; güncellik ve bağlam kontrol edilmeli."
    };
  }

  return {
    type: "web",
    label: "Web kaynağı",
    trust: "low",
    note: "Genel web sonucu; resmi bağlantı olup olmadığı ayrıca kontrol edilmeli."
  };
}

module.exports = {
  analyzeResults,
  buildSearchQuery,
  classifySource,
  contactsAllowedFor,
  dedupeResults,
  extractBusinessContacts,
  extractOfficialSources,
  extractSocialProfiles,
  getHost,
  hostMatchesDomain,
  matchEmails,
  matchPhones,
  normalizeTargetType,
  sanitizeUrl
};
