const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const { analyzeResults, buildSearchQuery, normalizeTargetType } = require("./analyze");
const { createRateLimiter } = require("./rateLimit");
const { getProviderStatus, searchWeb } = require("./searchProviders");

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const MAX_BODY_BYTES = 16_384;

loadLocalEnv();

const PORT = Number(process.env.PORT || 5173);
const searchRateLimit = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 30)
});

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/api/health") {
      const providerStatus = getProviderStatus();
      return sendJson(response, 200, {
        ok: true,
        providerConfigured: providerStatus.configured,
        provider: providerStatus.provider,
        mode: providerStatus.mode,
        requireLiveSearch: providerStatus.requireLiveSearch,
        privacy: "Public source discovery only; private person contact harvesting is disabled."
      });
    }

    if (request.method === "POST" && request.url === "/api/search") {
      return await handleSearch(request, response);
    }

    if (request.method === "GET") {
      return serveStatic(request, response);
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`SearchOne running at http://localhost:${PORT}`);
});

async function handleSearch(request, response) {
  const rateLimit = searchRateLimit(getClientIp(request));
  if (!rateLimit.allowed) {
    return sendJson(response, 429, {
      error: "Çok fazla arama isteği gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.",
      retryAfterSeconds: rateLimit.retryAfterSeconds
    }, {
      "Retry-After": String(rateLimit.retryAfterSeconds)
    });
  }

  const body = await readJsonBody(request);
  const query = String(body.query || "").trim();
  const targetType = normalizeTargetType(body.targetType);
  const location = String(body.location || "").trim();

  if (query.length < 2) {
    return sendJson(response, 400, { error: "Arama terimi en az 2 karakter olmalı." });
  }

  if (query.length > 120 || location.length > 80) {
    return sendJson(response, 400, { error: "Arama terimi çok uzun." });
  }

  const providerQuery = buildSearchQuery({ query, targetType, location });
  const searchResult = await searchWeb({ query: providerQuery, displayQuery: query, count: 10 });
  const analysis = analyzeResults({
    query,
    targetType,
    location,
    provider: searchResult.provider,
    mode: searchResult.mode,
    results: searchResult.results
  });

  sendJson(response, 200, analysis, {
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000))
  });
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const staticAliases = {
    "/": "/index.html",
    "/privacy": "/privacy.html",
    "/privacy-choices": "/privacy-choices.html",
    "/terms": "/terms.html",
    "/eula": "/eula.html",
    "/subscription-terms": "/subscription-terms.html"
  };
  const safePath = staticAliases[pathname] || pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(response, 403, { error: "Forbidden" });
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      return sendJson(response, 404, { error: "Not found" });
    }

    response.writeHead(200, {
      ...securityHeaders(),
      "Content-Type": getContentType(filePath),
      "Cache-Control": "no-store"
    });
    response.end(content);
  });
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    ...securityHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  response.end(JSON.stringify(payload, null, 2));
}

function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'"
  };
}

function getClientIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.socket.remoteAddress || "unknown";
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml"
  };

  return types[extension] || "application/octet-stream";
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
