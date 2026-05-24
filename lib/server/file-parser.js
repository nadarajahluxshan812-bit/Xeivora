const fs = require("node:fs/promises");
const { normalizeText } = require("./file-chunker");

let mammothModulePromise;
let pdfParseModulePromise;
let xlsxModulePromise;

function truncate(value = "", max = 420) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max).trimEnd()}…`;
}

function buildSummary(kind, text, fileName) {
  const normalized = normalizeText(text);

  if (!normalized) {
    if (kind === "image") {
      return `${fileName} is ready for image analysis.`;
    }

    return `${fileName} was uploaded and is ready for analysis.`;
  }

  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  return truncate(firstSentence, 180);
}

function previewStructuredRows(rows = [], maxRows = 10) {
  return rows
    .slice(0, maxRows)
    .map((row) => row.map((cell) => `${cell ?? ""}`).join(" | "))
    .join("\n");
}

async function extractTextFromPdf(buffer) {
  pdfParseModulePromise ||= import("pdf-parse");
  const pdfParse = (await pdfParseModulePromise).default;
  const result = await pdfParse(buffer);
  return normalizeText(result.text || "");
}

async function extractTextFromDocx(buffer) {
  mammothModulePromise ||= import("mammoth");
  const mammoth = await mammothModulePromise;
  const result = await mammoth.extractRawText({ buffer });
  return normalizeText(result.value || "");
}

async function extractTextFromSpreadsheet(buffer) {
  xlsxModulePromise ||= import("xlsx");
  const xlsx = await xlsxModulePromise;
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sections = workbook.SheetNames.slice(0, 4).map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
    return [`Sheet: ${sheetName}`, previewStructuredRows(rows, 14)].filter(Boolean).join("\n");
  });
  return normalizeText(sections.join("\n\n"));
}

async function extractTextFromCsv(buffer) {
  xlsxModulePromise ||= import("xlsx");
  const xlsx = await xlsxModulePromise;
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
  return normalizeText(previewStructuredRows(rows, 18));
}

function extractTextFromJson(buffer) {
  try {
    const parsed = JSON.parse(buffer.toString("utf8"));
    return normalizeText(JSON.stringify(parsed, null, 2));
  } catch {
    return normalizeText(buffer.toString("utf8"));
  }
}

function extractTextFromPlain(buffer) {
  return normalizeText(buffer.toString("utf8"));
}

async function parseFileRecord(fileRecord) {
  const absolutePath = fileRecord.storagePath.startsWith("/")
    ? fileRecord.storagePath
    : `${process.cwd()}/${fileRecord.storagePath}`;
  const buffer = await fs.readFile(absolutePath);
  const kind = fileRecord.kind;
  let extractedText = "";

  if (kind === "pdf") {
    extractedText = await extractTextFromPdf(buffer);
  } else if (kind === "docx") {
    extractedText = await extractTextFromDocx(buffer);
  } else if (kind === "csv") {
    extractedText = await extractTextFromCsv(buffer);
  } else if (kind === "xlsx") {
    extractedText = await extractTextFromSpreadsheet(buffer);
  } else if (kind === "json") {
    extractedText = extractTextFromJson(buffer);
  } else if (kind === "markdown" || kind === "txt" || kind === "unknown") {
    extractedText = extractTextFromPlain(buffer);
  } else if (kind === "image") {
    extractedText = normalizeText(
      `${fileRecord.name} is an uploaded image. Vision analysis is available through Xeivora image understanding.`
    );
  }

  const previewText = truncate(extractedText || "", kind === "image" ? 180 : 520);
  const summary = buildSummary(kind, extractedText, fileRecord.name);

  return {
    extractedText,
    previewText,
    summary
  };
}

module.exports = {
  parseFileRecord
};
