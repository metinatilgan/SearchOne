function createRateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  const buckets = new Map();

  return function checkRateLimit(key, now = Date.now()) {
    const bucketKey = key || "anonymous";
    const existing = buckets.get(bucketKey);

    if (!existing || now >= existing.resetAt) {
      const nextBucket = {
        count: 1,
        resetAt: now + windowMs
      };
      buckets.set(bucketKey, nextBucket);
      cleanupBuckets(buckets, now);
      return {
        allowed: true,
        remaining: max - 1,
        resetAt: nextBucket.resetAt
      };
    }

    if (existing.count >= max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: Math.max(0, max - existing.count),
      resetAt: existing.resetAt
    };
  };
}

function cleanupBuckets(buckets, now) {
  if (buckets.size < 500) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

module.exports = {
  createRateLimiter
};
