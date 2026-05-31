"use client";

import { motion } from "framer-motion";

import type { ModelSwitch } from "@/lib/chat-types";

const modelColors: Record<string, string> = {
  claude: "#c96442",
  "claude-3.5": "#c96442",
  "gpt-4o": "#16a34a",
  gemini: "#2563eb",
  "gemini-2.5": "#2563eb",
  mistral: "#7c3aed",
  ollama: "#6b7280"
};

const modelNames: Record<string, string> = {
  claude: "Claude 3.5",
  "claude-3.5": "Claude 3.5",
  "gpt-4o": "GPT-4o",
  gemini: "Gemini 2.5",
  "gemini-2.5": "Gemini 2.5",
  mistral: "Mistral",
  ollama: "Ollama"
};

function getModelName(model: string) {
  return modelNames[model] || model;
}

function getModelColor(model: string, faded = false) {
  const color = modelColors[model] || "#999999";
  return faded ? `${color}80` : color;
}

export default function AutoSwitchBanner({ switchData }: { switchData: ModelSwitch }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="my-2 flex w-full max-w-[700px] items-center justify-between gap-4 rounded-r-[8px] rounded-l-none border border-[rgba(201,100,66,0.2)] border-l-[2px] border-l-[#c96442] bg-[rgba(201,100,66,0.05)] px-4 py-4"
      initial={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-[1px] text-[20px] leading-none text-[#c96442]">⇄</span>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#f0ead8]">Switched automatically</div>
          <div className="mt-0.5 text-[13px] text-[rgba(240,234,216,0.7)]">
            {switchData.reason} — continuing with {getModelName(switchData.toModel)}
          </div>
          <div className="mt-0.5 text-[12px] text-[rgba(240,234,216,0.55)]">
            {switchData.contextPreserved ? "Context preserved" : "Context adjusted"} · {switchData.decisionsRestored}{" "}
            decisions restored
          </div>
        </div>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-[5px] rounded-full border border-[rgba(201,100,66,0.18)] bg-[#1a1410] px-[10px] py-1 text-[11px] text-[rgba(240,234,216,0.7)]">
          <span
            className="h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: getModelColor(switchData.fromModel, true) }}
          />
          <span className="font-mono">{getModelName(switchData.fromModel)}</span>
        </div>

        <span className="text-[12px] text-[rgba(240,234,216,0.45)]">→</span>

        <div
          className="flex items-center gap-[5px] rounded-full border bg-[#1a1410] px-[10px] py-1 text-[11px] font-medium text-[#f0ead8]"
          style={{
            borderColor: `${getModelColor(switchData.toModel)}40`,
            backgroundColor: "#1a1410"
          }}
        >
          <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: getModelColor(switchData.toModel) }} />
          <span className="font-mono">{getModelName(switchData.toModel)}</span>
        </div>
      </div>
    </motion.div>
  );
}
