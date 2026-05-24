const { chunkText } = require("./file-chunker");

function truncate(value = "", max = 1800) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max).trimEnd()}…`;
}

function buildFileAnalysisPrompt({ prompt, files }) {
  const sections = files
    .map((file) => {
      const chunks = chunkText(file.extractedText || file.previewText || "", {
        maxChars: 1200,
        overlap: 120
      }).slice(0, 3);

      return [
        `File: ${file.name}`,
        `Type: ${file.kind}`,
        file.summary ? `Summary: ${file.summary}` : null,
        chunks.length
          ? chunks
              .map((chunk, index) => `Chunk ${index + 1}:\n${truncate(chunk.content, 1200)}`)
              .join("\n\n")
          : "No extracted text is available yet."
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  return [
    "Workspace files are attached to this conversation.",
    `User request: ${prompt}`,
    "Use the file context below when answering. If information is missing, say so clearly.",
    sections
  ].join("\n\n");
}

module.exports = {
  buildFileAnalysisPrompt
};
