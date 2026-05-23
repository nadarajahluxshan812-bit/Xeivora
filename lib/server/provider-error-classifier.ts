export type ProviderErrorType =
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "PROVIDER_DOWN"
  | "INVALID_RESPONSE"
  | "AUTH_ERROR";

export type ProviderErrorClassification = {
  type: ProviderErrorType;
  retryable: boolean;
  cooldownMs: number;
  rawMessage: string;
  provider?: string;
  statusCode?: number | null;
};

const classifier = require("./provider-error-classifier.js") as {
  PROVIDER_ERROR_TYPES: Record<ProviderErrorType, ProviderErrorType>;
  classifyProviderError: (input: {
    error?: unknown;
    provider?: string;
  }) => ProviderErrorClassification;
};

export const PROVIDER_ERROR_TYPES = classifier.PROVIDER_ERROR_TYPES;
export const classifyProviderError = classifier.classifyProviderError;
