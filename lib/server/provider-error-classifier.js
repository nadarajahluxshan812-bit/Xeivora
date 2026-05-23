const PROVIDER_ERROR_TYPES = {
  RATE_LIMIT: "RATE_LIMIT",
  TIMEOUT: "TIMEOUT",
  PROVIDER_DOWN: "PROVIDER_DOWN",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  AUTH_ERROR: "AUTH_ERROR"
};

function normalizeMessage(value) {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function getStatusCode(error) {
  return Number.isFinite(error?.statusCode) ? error.statusCode : Number.isFinite(error?.status) ? error.status : null;
}

function buildClassification(type, rawMessage, extras = {}) {
  const defaults = {
    RATE_LIMIT: {
      retryable: true,
      cooldownMs: 5 * 60 * 1000
    },
    TIMEOUT: {
      retryable: true,
      cooldownMs: 90 * 1000
    },
    PROVIDER_DOWN: {
      retryable: true,
      cooldownMs: 2 * 60 * 1000
    },
    INVALID_RESPONSE: {
      retryable: true,
      cooldownMs: 60 * 1000
    },
    AUTH_ERROR: {
      retryable: false,
      cooldownMs: 30 * 60 * 1000
    }
  };

  return {
    type,
    retryable: defaults[type].retryable,
    cooldownMs: defaults[type].cooldownMs,
    rawMessage,
    ...extras
  };
}

function classifyProviderError({ error, provider = "unknown" } = {}) {
  const statusCode = getStatusCode(error);
  const rawMessage = normalizeMessage(error instanceof Error ? error.message : error);
  const lower = rawMessage.toLowerCase();

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    /\b(unauthorized|invalid api key|invalid x-api-key|permission denied|forbidden|authentication|auth error)\b/.test(lower)
  ) {
    return buildClassification(PROVIDER_ERROR_TYPES.AUTH_ERROR, rawMessage, {
      provider,
      statusCode
    });
  }

  if (
    statusCode === 429 ||
    /\b(429|quota|rate limit|resource_exhausted|too many requests|insufficient_quota)\b/.test(lower)
  ) {
    return buildClassification(PROVIDER_ERROR_TYPES.RATE_LIMIT, rawMessage, {
      provider,
      statusCode
    });
  }

  if (
    error?.code === "PROVIDER_TIMEOUT" ||
    /\b(timed out|timeout|aborterror|socket hang up)\b/.test(lower)
  ) {
    return buildClassification(PROVIDER_ERROR_TYPES.TIMEOUT, rawMessage, {
      provider,
      statusCode
    });
  }

  if (
    /\b(unexpected end of json|unexpected token|malformed|invalid json|empty response|streaming response body is unavailable|stream ended early|stream finished without content)\b/.test(
      lower
    )
  ) {
    return buildClassification(PROVIDER_ERROR_TYPES.INVALID_RESPONSE, rawMessage, {
      provider,
      statusCode
    });
  }

  if (
    (statusCode && statusCode >= 500) ||
    /\b(unavailable|overloaded|internal server error|connection refused|connection reset|econnreset|econnrefused|enotfound|service unavailable)\b/.test(
      lower
    )
  ) {
    return buildClassification(PROVIDER_ERROR_TYPES.PROVIDER_DOWN, rawMessage, {
      provider,
      statusCode
    });
  }

  return buildClassification(PROVIDER_ERROR_TYPES.PROVIDER_DOWN, rawMessage || `${provider} request failed.`, {
    provider,
    statusCode
  });
}

module.exports = {
  PROVIDER_ERROR_TYPES,
  classifyProviderError
};
