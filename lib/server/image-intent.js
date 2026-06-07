const IMAGE_NOUN_PATTERN = /\b(images?|pictures?|photos?|posters?|illustrations?|graphics?|art(?:work)?|visuals?|logos?|icons?|banners?|thumbnails?|avatars?|wallpapers?|emojis?)\b/gi;
// Non-global variants for stateless detection (.test on a /g regex is stateful and unreliable).
const IMAGE_NOUN_RE = /\b(images?|pictures?|photos?|posters?|illustrations?|graphics?|art(?:work)?|visuals?|logos?|icons?|banners?|thumbnails?|avatars?|wallpapers?|emojis?)\b/i;
const VISUAL_VERB_RE = /\b(draw|illustrate|visuali[sz]e|sketch)\b/i;
const SLASH_IMAGE_RE = /^\/image\b/i;
const TRIGGER_PREFIX_PATTERN =
  /^(?:\/image\b|(?:please\s+)?(?:generate|create|make|show|draw|illustrate|visual(?:ise|ize)))(?:\s+me)?(?:\s+(?:an?|the|some))?(?:\s+\d+)?(?:\s+(?:different|multiple))?(?:\s+(?:images?|pictures?|photos?|posters?|illustrations?|graphics?|art(?:work)?|visuals?)\b)?(?:\s+(?:of|for|showing))?\s*/i;
const COMBO_TEXT_PATTERN =
  /\s*(?:,?\s*and\s+)(tell me about|tell me|explain|describe|write about|write me|give me|also tell me about|also explain|and then explain)\s+(.+)$/i;

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4
};

function normalizePrompt(prompt = "") {
  return `${prompt}`.replace(/\s+/g, " ").trim();
}

function hasImageNoun(prompt = "") {
  return IMAGE_NOUN_RE.test(normalizePrompt(prompt));
}

// An image request requires an EXPLICIT visual signal. A bare action verb
// ("create/make/generate/show ...") is NOT enough — that misrouted coding
// prompts ("Create a calculator in HTML") into image generation.
function isImageGenerationPrompt(prompt = "") {
  const normalized = normalizePrompt(prompt);
  if (!normalized) {
    return false;
  }

  // (a) /image slash command, (b) explicit image noun, (c) explicit visual verb.
  return SLASH_IMAGE_RE.test(normalized) || IMAGE_NOUN_RE.test(normalized) || VISUAL_VERB_RE.test(normalized);
}

function detectRequestedImageCount(prompt = "") {
  const normalized = normalizePrompt(prompt).toLowerCase();
  if (!normalized) {
    return 1;
  }

  const explicitNumber = normalized.match(/\b([2-4])\s+(?:different\s+|multiple\s+)?(?:images?|pictures?|versions?)\b/);
  if (explicitNumber?.[1]) {
    return Number.parseInt(explicitNumber[1], 10);
  }

  const wordNumber = normalized.match(/\b(one|two|three|four)\s+(?:different\s+|multiple\s+)?(?:images?|pictures?|versions?)\b/);
  if (wordNumber?.[1]) {
    return NUMBER_WORDS[wordNumber[1]] || 1;
  }

  if (/\b(different versions|different images|multiple versions|variations|variants)\b/.test(normalized)) {
    return 4;
  }

  return 1;
}

function extractTextFollowup(prompt = "") {
  const normalized = normalizePrompt(prompt);
  const comboMatch = normalized.match(COMBO_TEXT_PATTERN);

  if (!comboMatch?.[2]) {
    return null;
  }

  const lead = comboMatch[1].toLowerCase();
  const detail = comboMatch[2].trim().replace(/[.?!]+$/g, "");

  if (!detail) {
    return null;
  }

  if (lead.includes("tell")) {
    return `Tell me about ${detail}`;
  }

  if (lead.includes("explain")) {
    return `Explain ${detail}`;
  }

  if (lead.includes("describe")) {
    return `Describe ${detail}`;
  }

  if (lead.includes("write")) {
    return `Write about ${detail}`;
  }

  if (lead.includes("give")) {
    return `Give me ${detail}`;
  }

  return detail;
}

function extractImagePrompt(prompt = "") {
  const normalized = normalizePrompt(prompt);
  if (!normalized) {
    return "";
  }

  const comboMatch = normalized.match(COMBO_TEXT_PATTERN);
  const imageClause = comboMatch ? normalized.slice(0, comboMatch.index).trim() : normalized;

  let cleaned = imageClause
    .replace(TRIGGER_PREFIX_PATTERN, "")
    .replace(/\b(generate|create|make|show|draw|illustrate|visual(?:ise|ize))\b/gi, "")
    .replace(IMAGE_NOUN_PATTERN, "")
    .replace(/\b(?:of|for|showing)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned.replace(/^[,:-]+\s*/, "").replace(/[.?!]+$/g, "").trim();

  if (!cleaned) {
    return "";
  }

  if (/^(?:me\s+)?a\b/i.test(cleaned) || /^(?:me\s+)?an\b/i.test(cleaned) || /^(?:me\s+)?the\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/^me\s+/i, "");
  }

  return cleaned.trim();
}

function parseImageIntent(prompt = "") {
  const normalized = normalizePrompt(prompt);
  const isImageRequest = isImageGenerationPrompt(normalized);
  const imagePrompt = isImageRequest ? extractImagePrompt(normalized) : "";
  const textPrompt = isImageRequest ? extractTextFollowup(normalized) : null;
  const count = Math.min(4, Math.max(1, detectRequestedImageCount(normalized)));

  return {
    isImageRequest,
    imagePrompt,
    textPrompt,
    count,
    isImageOnly: Boolean(isImageRequest && imagePrompt && !textPrompt),
    isImageAndText: Boolean(isImageRequest && imagePrompt && textPrompt)
  };
}

module.exports = {
  detectRequestedImageCount,
  extractImagePrompt,
  hasImageNoun,
  parseImageIntent,
  isImageGenerationPrompt
};
