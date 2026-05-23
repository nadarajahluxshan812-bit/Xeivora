export type FactualResponse =
  | "Xeivora is an AI continuity platform that keeps context, progress, and workflow state intact while tasks move across models, tools, and multi-step systems."
  | "Today is Friday, 22 May 2026."
  | "It’s 10:30 BST right now.";

export type WeatherResponseShape = {
  locationLabel: string;
  summary: string;
  highCelsius?: number;
  lowCelsius?: number;
  rainChance?: number;
};

// Runtime implementation lives in `factual-response-handler.js` because the
// local Express server currently runs in CommonJS without a TypeScript loader.
