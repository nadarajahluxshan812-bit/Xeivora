const OpenAI = require("openai");

const { addDailyImageUsage, getDailyImageUsage } = require("./image-usage-store");

const DEFAULT_IMAGE_MODELS = ["gpt-image-1"];

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

function getImageModelCandidates() {
  const configured = `${process.env.OPENAI_IMAGE_MODELS || process.env.OPENAI_IMAGE_MODEL || ""}`
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const candidates = configured.length ? configured : DEFAULT_IMAGE_MODELS;
  return Array.from(new Set(candidates));
}

function buildImageRequest({ model, prompt }) {
  if (model === "dall-e-3") {
    return {
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    };
  }

  if (model === "dall-e-2") {
    return {
      model,
      prompt,
      n: 1,
      size: "1024x1024"
    };
  }

  return {
    model: model || "gpt-image-1",
    prompt,
    size: "1024x1024",
    quality: "medium"
  };
}

function sanitizeProviderError(error) {
  const status = error?.status || error?.statusCode || error?.code || null;
  const message = `${error?.error?.message || error?.message || ""}`.trim();
  const lower = message.toLowerCase();

  if (status === 401) {
    return "The image provider rejected the API key.";
  }

  if (status === 403 || lower.includes("permission") || lower.includes("access denied")) {
    return "Image generation is not enabled for this workspace yet.";
  }

  if (
    status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("billing hard limit") ||
    lower.includes("insufficient_quota") ||
    lower.includes("quota")
  ) {
    return "Image generation temporarily unavailable. Try again in a moment.";
  }

  if (
    lower.includes("does not exist") ||
    lower.includes("unsupported") ||
    lower.includes("unknown parameter") ||
    lower.includes("invalid model")
  ) {
    return "The configured image model is unavailable for this workspace.";
  }

  return "Xeivora could not generate the image right now.";
}

function getImageLimitForPlan(plan = "Starter") {
  const normalized = `${plan || "Starter"}`.trim().toLowerCase();

  if (normalized === "pro") {
    return 50;
  }

  if (normalized.includes("team") || normalized.includes("enterprise")) {
    return Number.POSITIVE_INFINITY;
  }

  return 5;
}

function buildLimitMessage({ plan = "Starter", limit = 5 }) {
  if (`${plan}`.trim().toLowerCase() === "pro") {
    return `You've used your ${limit} Pro images today. Try again tomorrow or contact support if you need a higher limit.`;
  }

  return `You've used your ${limit} free images today. Upgrade to Pro for 50 images/day.`;
}

async function requestOpenAiImages(client, prompt, model) {
  const response = await client.images.generate(buildImageRequest({ model, prompt }));

  return (response?.data || [])
    .map((item, index) => ({
      id: `${model}-${index + 1}`,
      revisedPrompt: item?.revised_prompt || prompt,
      url: item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url || null
    }))
    .filter((item) => Boolean(item.url));
}

function buildFinalFailureMessage(attempts = []) {
  const lowerErrors = attempts.map((attempt) => `${attempt?.error || ""}`.toLowerCase());

  if (lowerErrors.some((message) => message.includes("billing hard limit") || message.includes("quota"))) {
    return "Image generation temporarily unavailable. Try again in a moment.";
  }

  if (
    lowerErrors.some(
      (message) =>
        message.includes("does not exist") ||
        message.includes("invalid model") ||
        message.includes("unsupported") ||
        message.includes("not enabled")
    )
  ) {
    return "Image generation is not enabled for this workspace yet.";
  }

  return "Xeivora could not generate the image right now.";
}

async function generateImages({ prompt, count = 1, viewerId = null, viewerPlan = "Starter" }) {
  const cleanPrompt = `${prompt || ""}`.trim();
  const requestedCount = Math.min(4, Math.max(1, Number.parseInt(`${count || 1}`, 10) || 1));

  if (!cleanPrompt) {
    return {
      connected: false,
      images: [],
      message: "An image prompt is required.",
      provider: "openai",
      model: null,
      attempts: []
    };
  }

  const dailyLimit = getImageLimitForPlan(viewerPlan);
  if (viewerId && Number.isFinite(dailyLimit)) {
    const usedToday = await getDailyImageUsage(viewerId);

    if (usedToday + requestedCount > dailyLimit) {
      return {
        connected: false,
        images: [],
        message: buildLimitMessage({
          plan: viewerPlan,
          limit: dailyLimit
        }),
        provider: "openai",
        model: null,
        attempts: [],
        remaining: Math.max(0, dailyLimit - usedToday),
        dailyLimit,
        usedToday
      };
    }
  }

  const client = getOpenAiClient();
  if (!client) {
    return {
      connected: false,
      images: [],
      message: "Image generation architecture is ready, but no image provider is connected yet.",
      provider: "openai",
      model: null,
      attempts: []
    };
  }

  const attempts = [];
  const modelCandidates = getImageModelCandidates();

  for (const model of modelCandidates) {
    try {
      const batches = await Promise.all(
        Array.from({ length: requestedCount }, () => requestOpenAiImages(client, cleanPrompt, model))
      );
      const images = batches.flat();

      if (images.length) {
        if (viewerId) {
          await addDailyImageUsage(viewerId, images.length);
        }

        return {
          connected: true,
          images,
          provider: "openai",
          model,
          modelLabel:
            model === "gpt-image-1"
              ? "GPT Image 1"
              : model === "dall-e-3"
                ? "DALL-E 3"
                : model === "dall-e-2"
                  ? "DALL-E 2"
                  : model,
          attempts,
          count: images.length
        };
      }

      attempts.push({
        model,
        error: "The provider returned no images."
      });
    } catch (error) {
      console.error("Image generation error:", {
        model,
        message: error instanceof Error ? error.message : "Unknown image generation error."
      });
      attempts.push({
        model,
        error: error instanceof Error ? error.message : "Image generation failed."
      });
    }
  }

  return {
    connected: false,
    images: [],
    message: buildFinalFailureMessage(attempts),
    provider: "openai",
    model: null,
    attempts,
    count: 0
  };
}

module.exports = {
  generateImages,
  getImageModelCandidates
};
