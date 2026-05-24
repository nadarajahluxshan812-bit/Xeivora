const buckets = new Map();

function getClientKey(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function enforceRateLimit(request, config = {}) {
  const windowMs = Number(config.windowMs || 60_000);
  const max = Number(config.max || 30);
  const key = `${config.scope || "default"}:${getClientKey(request)}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return { allowed: true };
  }

  if (current.count >= max) {
    return {
      allowed: false,
      retryAfterMs: current.resetAt - now
    };
  }

  current.count += 1;
  return { allowed: true };
}

module.exports = {
  enforceRateLimit
};
