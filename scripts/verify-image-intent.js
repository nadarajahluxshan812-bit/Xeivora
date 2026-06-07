/**
 * Verifies that coding prompts are NOT routed to image generation and that genuine
 * image prompts still are. Tests the real routing decision via detectTools(), plus
 * the image-intent detector directly.
 *
 * Run: node scripts/verify-image-intent.js
 */
const { detectTools } = require("../lib/server/tool-executor");
const { parseImageIntent } = require("../lib/server/image-intent");

const EXPECT_CODE = [
  "Create a calculator in HTML",
  "Create a Python calculator",
  "Create a React todo app",
  "Create a REST API for todo app",
  "Create a SQL schema for users",
  "Make a todo app in React",
  "Generate a Node.js API"
];

const EXPECT_IMAGE = [
  "Generate a logo image",
  "Create an image of a cat",
  "Draw me a sunset",
  "Illustrate a futuristic dashboard",
  "/image a cyberpunk city"
];

function routesToImage(prompt) {
  return detectTools(prompt).includes("image_generation");
}

let failures = 0;

function check(prompt, expectImage) {
  const actual = routesToImage(prompt);
  const ok = actual === expectImage;
  if (!ok) {
    failures += 1;
  }
  const want = expectImage ? "IMAGE" : "CODE";
  const got = actual ? "IMAGE" : "CODE";
  console.log(`${ok ? "PASS" : "FAIL"}  want=${want.padEnd(5)} got=${got.padEnd(5)} | ${prompt}` +
    `  (isImageRequest=${parseImageIntent(prompt).isImageRequest})`);
}

console.log("— Expect CODE (must NOT route to image generation) —");
for (const p of EXPECT_CODE) check(p, false);

console.log("\n— Expect IMAGE (must route to image generation) —");
for (const p of EXPECT_IMAGE) check(p, true);

console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
