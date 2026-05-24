function normalizeText(value = "") {
  return `${value}`.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function chunkText(text, options = {}) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const maxChars = Math.max(400, Number(options.maxChars || 1800));
  const overlap = Math.max(0, Number(options.overlap || 200));
  const chunks = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const targetEnd = Math.min(normalized.length, cursor + maxChars);
    let end = targetEnd;

    if (targetEnd < normalized.length) {
      const breakIndex = normalized.lastIndexOf("\n", targetEnd);
      const sentenceIndex = normalized.lastIndexOf(". ", targetEnd);
      end = Math.max(breakIndex, sentenceIndex, cursor + Math.floor(maxChars * 0.55));
    }

    const content = normalized.slice(cursor, end).trim();
    if (content) {
      chunks.push({
        index: chunks.length,
        content,
        charCount: content.length
      });
    }

    if (end >= normalized.length) {
      break;
    }

    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks;
}

module.exports = {
  chunkText,
  normalizeText
};
