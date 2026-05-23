function normalizePrompt(prompt) {
  return prompt.replace(/\s+/g, " ").trim();
}

function isWeatherPrompt(prompt) {
  return /\b(weather|forecast|temperature|rain|wether)\b/.test(normalizePrompt(prompt).toLowerCase());
}

function canHandleFactualPrompt(prompt) {
  const lower = normalizePrompt(prompt).toLowerCase();

  return (
    /\bprovider continuity\b/.test(lower) ||
    isWeatherPrompt(lower) ||
    /\b(what day is it|what's today's date|what is today's date|today's date|what time is it|current time)\b/.test(lower) ||
    /^(what is xeivora|explain xeivora)\b/.test(lower)
  );
}

function getRuntimeTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getDateResponse() {
  const now = new Date();
  const timeZone = getRuntimeTimeZone();
  const formatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone
  }).format(now);

  return `Today is ${formatted}.`;
}

function getTimeResponse() {
  const now = new Date();
  const timeZone = getRuntimeTimeZone();
  const formatted = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short"
  }).format(now);

  return `It’s ${formatted} right now.`;
}

function getXeivoraIdentityResponse() {
  return "Xeivora is an AI continuity platform that keeps context, progress, and workflow state intact while tasks move across models, tools, and multi-step systems.";
}

function hasLiveWeatherAccess() {
  return Boolean(
    process.env.WEATHER_PROVIDER ||
      process.env.WEATHER_API_KEY ||
      process.env.WEATHER_API_URL ||
      process.env.OPENWEATHER_API_KEY ||
      process.env.WEATHERAPI_API_KEY
  );
}

function getWeatherUnavailableResponse() {
  return "I don’t have live weather access yet, but I can answer if you tell me the city, or we can connect a weather API.";
}

async function getWeatherResponse() {
  if (!hasLiveWeatherAccess()) {
    return getWeatherUnavailableResponse();
  }

  return "I don’t have live weather access wired into this build yet, but I can answer if you tell me the city, or we can connect a weather API.";
}

async function getFactualResponse({ prompt }) {
  const lower = normalizePrompt(prompt).toLowerCase();

  if (/^(what is xeivora|explain xeivora)\b/.test(lower)) {
    return getXeivoraIdentityResponse();
  }

  if (/\bprovider continuity\b/.test(lower)) {
    return "Provider continuity means Xeivora can keep the working context, saved progress, and unfinished steps intact while a task moves between AI models, so the next model continues instead of restarting.";
  }

  if (isWeatherPrompt(lower)) {
    return getWeatherResponse(prompt);
  }

  if (/\b(what day is it|what's today's date|what is today's date|today's date)\b/.test(lower)) {
    return getDateResponse();
  }

  if (/\b(what time is it|current time)\b/.test(lower)) {
    return getTimeResponse();
  }

  return null;
}

module.exports = {
  canHandleFactualPrompt,
  getFactualResponse,
  getWeatherUnavailableResponse,
  hasLiveWeatherAccess,
  isWeatherPrompt
};
