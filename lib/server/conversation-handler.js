function normalizePrompt(prompt) {
  return prompt.replace(/\s+/g, " ").trim();
}

function canHandleConversation(prompt) {
  const lower = normalizePrompt(prompt).toLowerCase();

  return (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(lower) ||
    /\b(what do you do|who are you)\b/.test(lower) ||
    /\b(my name is|call me)\b/.test(lower) ||
    /\b(what's my name|what is my name)\b/.test(lower) ||
    /\b(thanks|thank you|appreciate it)\b/.test(lower) ||
    /\b(how are you)\b/.test(lower) ||
    /\b(can you help|help me)\b/.test(lower)
  );
}

function getConversationResponse({ prompt, memorySnapshot, rememberedMemory }) {
  const trimmedPrompt = normalizePrompt(prompt);
  const lower = trimmedPrompt.toLowerCase();
  const userName = memorySnapshot?.userName;

  if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(lower)) {
    return userName ? `Hey ${userName} 👋 How can I help today?` : "Hey 👋 How can I help today?";
  }

  if (/\b(what do you do|who are you)\b/.test(lower)) {
    return "I’m Xeivora — an AI continuity platform designed to keep workflows running across multiple AI systems without losing context or progress.";
  }

  if (rememberedMemory?.userName) {
    return `Nice to meet you, ${rememberedMemory.userName}. I’ll remember that for this workspace.`;
  }

  if (rememberedMemory?.preferences?.length) {
    const preference = rememberedMemory.preferences[0];

    if (preference.key === "responseStyle" && preference.value === "concise") {
      return "Noted. I’ll keep replies concise in this workspace.";
    }

    if (preference.key === "responseStyle" && preference.value === "detailed") {
      return "Noted. I’ll go a bit deeper when the topic needs it.";
    }

    if (preference.key === "markdown" && preference.value === "enabled") {
      return "Noted. I’ll use markdown when structure helps.";
    }

    if (preference.key === "markdown" && preference.value === "disabled") {
      return "Noted. I’ll keep formatting plain unless structure really helps.";
    }
  }

  if (rememberedMemory?.workspaceFocus) {
    return "Got it. I’ll keep that workspace context in mind.";
  }

  if (/\b(what's my name|what is my name)\b/.test(lower)) {
    return userName ? `Your name is ${userName}.` : "You haven't told me your name yet.";
  }

  if (/\b(how are you)\b/.test(lower)) {
    return "Doing well and ready to help. What are we working on?";
  }

  if (/\b(thanks|thank you|appreciate it)\b/.test(lower)) {
    return "Anytime. What would you like to do next?";
  }

  if (/\b(can you help|help me)\b/.test(lower)) {
    return "Absolutely. Ask me a question, hand me a task, or tell me what you're trying to get done.";
  }

  return null;
}

module.exports = {
  canHandleConversation,
  getConversationResponse
};
