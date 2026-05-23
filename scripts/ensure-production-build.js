const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const distDir = process.env.XEIVORA_NEXT_DIST || ".next-prod";
const buildIdPath = path.join(projectRoot, distDir, "BUILD_ID");
const chatSourceCandidates = [
  path.join(projectRoot, "app", "chat", "page.tsx"),
  path.join(projectRoot, "app", "chat", "page.jsx"),
  path.join(projectRoot, "app", "chat", "page.ts"),
  path.join(projectRoot, "app", "chat", "page.js")
];
const chatArtifactPath = path.join(projectRoot, distDir, "server", "app", "chat", "page.js");

function fail(message) {
  console.error(`[Xeivora] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(buildIdPath)) {
  fail(`Production build not found in ${distDir}. Run "npm run build" before "npm run start".`);
}

const hasChatSource = chatSourceCandidates.some((candidate) => fs.existsSync(candidate));

if (hasChatSource && !fs.existsSync(chatArtifactPath)) {
  fail(
    `Production build in ${distDir} is incomplete for /chat. Re-run "npm run build" to regenerate the missing artifact.`
  );
}
