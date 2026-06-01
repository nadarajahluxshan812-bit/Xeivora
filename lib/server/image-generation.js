const OPENAI_IMAGE_MODELS = [
  {
    model: "gpt-image-1",
    body: {
      size: "1024x1024",
      quality: "medium"
    }
  },
  {
    model: "dall-e-3",
    body: {
      size: "1024x1024",
      quality: "standard",
      n: 1
    }
  },
  {
    model: "dall-e-2",
    body: {
      size: "1024x1024",
      n: 1
    }
  }
];

function sanitizeProviderError(payload = "", status = 500) {
  let message = `${payload}`.trim();

  try {
    const parsed = JSON.parse(message);
    message = parsed?.error?.message || parsed?.message || message;
  } catch {
    // Keep raw text fallback when the provider did not return JSON.
  }

  if (!message) {
    message = "Image generation failed.";
  }

  if (status === 401) {
    return "The image provider rejected the API key.";
  }

  if (status === 403) {
    return "The image provider blocked this request for the current project.";
  }

  if (status === 429) {
    return "The image provider is rate limiting image generation right now.";
  }

  if (message.length > 220) {
    return `${message.slice(0, 217)}...`;
  }

  return message;
}

async function requestOpenAiImages(prompt, config) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      ...config.body
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    const error = new Error(sanitizeProviderError(payload, response.status));
    error.status = response.status;
    error.rawPayload = payload;
    throw error;
  }

  const payload = await response.json();

  return (payload?.data || [])
    .map((item, index) => ({
      id: `${config.model}-${index + 1}`,
      revisedPrompt: item?.revised_prompt || prompt,
      url: item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url || null
    }))
    .filter((item) => Boolean(item.url));
}

async function generateImages({ prompt }) {
  const cleanPrompt = `${prompt || ""}`.trim();

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

  if (!process.env.OPENAI_API_KEY) {
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

  for (const config of OPENAI_IMAGE_MODELS) {
    try {
      const images = await requestOpenAiImages(cleanPrompt, config);
      if (images.length) {
        return {
          connected: true,
          images,
          provider: "openai",
          model: config.model,
          attempts
        };
      }

      attempts.push({
        model: config.model,
        error: "The provider returned no images."
      });
    } catch (error) {
      attempts.push({
        model: config.model,
        error: error instanceof Error ? error.message : "Image generation failed."
      });
    }
  }

  return {
    connected: false,
    images: [],
    message: attempts[0]?.error || "Xeivora could not generate the image right now.",
    provider: "openai",
    model: null,
    attempts
  };
}

module.exports = {
  generateImages
};
