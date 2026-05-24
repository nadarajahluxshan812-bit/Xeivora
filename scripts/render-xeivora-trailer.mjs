import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const width = 1280;
const height = 720;
const fps = 12;
const durationSeconds = 30;
const totalFrames = fps * durationSeconds;

const root = "/Users/nadarajahluxshan/Documents/Xeivora";
const artifactsDir = path.join(root, "artifacts", "xeivora-trailer");
const framesDir = path.join(artifactsDir, "frames");
const heroPath = "/Users/nadarajahluxshan/Desktop/c9efa30f-2138-4f56-93c2-39beb32b720e.png";

await fs.rm(artifactsDir, { recursive: true, force: true });
await fs.mkdir(framesDir, { recursive: true });

const heroImage = sharp(heroPath);
const heroMeta = await heroImage.metadata();
const heroAspect = (heroMeta.width || 1) / (heroMeta.height || 1);

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - clamp(x), 3);
}

function easeInOutCubic(x) {
  const v = clamp(x);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sceneProgress(t, start, end) {
  return clamp((t - start) / (end - start));
}

function formatFrame(index) {
  return `frame-${String(index).padStart(5, "0")}.jpg`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function esc(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wordmarkSvg({ x = 0, y = 0, scale = 1, opacity = 1 }) {
  return `
    <g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
      <rect x="0" y="4" width="44" height="12" rx="6" fill="url(#logoGradA)" transform="rotate(45 22 10)" />
      <rect x="0" y="28" width="44" height="12" rx="6" fill="url(#logoGradB)" transform="rotate(-45 22 34)" />
      <text x="54" y="34" fill="white" font-size="36" font-weight="700" letter-spacing="-1.2">Xeivora</text>
    </g>
  `;
}

function overlayText({
  x,
  y,
  lines,
  size = 62,
  weight = 700,
  fill = "#ffffff",
  lineHeight = 1.05,
  align = "middle",
  opacity = 1,
  gradient = false
}) {
  const anchor = align === "middle" ? "middle" : align === "end" ? "end" : "start";
  return `
    <text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" font-weight="${weight}" letter-spacing="-1.5" opacity="${opacity}">
      ${lines
        .map((line, index) => {
          const dy = index === 0 ? 0 : size * lineHeight;
          const lineFill = gradient && index === lines.length - 1 ? "url(#headlineGrad)" : fill;
          return `<tspan x="${x}" dy="${dy}" fill="${lineFill}">${esc(line)}</tspan>`;
        })
        .join("")}
    </text>
  `;
}

function paragraphSvg({ x, y, widthPx, text, size = 18, fill = "rgba(255,255,255,0.7)", opacity = 1 }) {
  return `
    <foreignObject x="${x}" y="${y}" width="${widthPx}" height="160" opacity="${opacity}">
      <div xmlns="http://www.w3.org/1999/xhtml"
        style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:${size}px;line-height:1.7;color:${fill};text-align:center;">
        ${esc(text)}
      </div>
    </foreignObject>
  `;
}

function pillButton({ x, y, w, h, label, primary = false, opacity = 1 }) {
  return `
    <g transform="translate(${x} ${y})" opacity="${opacity}">
      <rect width="${w}" height="${h}" rx="${h / 2}" fill="${primary ? "url(#ctaGrad)" : "rgba(255,255,255,0.03)"}" stroke="${primary ? "none" : "rgba(255,255,255,0.12)"}" />
      <text x="${w / 2}" y="${h / 2 + 7}" text-anchor="middle" fill="white" font-size="18" font-weight="650">${esc(label)}</text>
    </g>
  `;
}

function badgeSvg({ x, y, label, opacity = 1 }) {
  return `
    <g transform="translate(${x} ${y})" opacity="${opacity}">
      <rect width="292" height="42" rx="21" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.1)" />
      <circle cx="28" cy="21" r="10" fill="url(#ctaGrad)" />
      <circle cx="262" cy="21" r="4" fill="#8b5cf6" />
      <text x="46" y="27" fill="white" font-size="15" font-weight="600">${esc(label)}</text>
    </g>
  `;
}

function cardSvg({ x, y, title, body, icon, opacity = 1, widthPx = 250, heightPx = 104 }) {
  return `
    <g transform="translate(${x} ${y})" opacity="${opacity}">
      <rect width="${widthPx}" height="${heightPx}" rx="20" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.10)" />
      <circle cx="48" cy="36" r="20" fill="url(#iconGrad)" />
      <text x="48" y="42" text-anchor="middle" fill="white" font-size="16">${esc(icon)}</text>
      <text x="95" y="32" fill="white" font-size="18" font-weight="700">${esc(title)}</text>
      <foreignObject x="95" y="42" width="${widthPx - 112}" height="${heightPx - 48}">
        <div xmlns="http://www.w3.org/1999/xhtml"
          style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.45;color:rgba(255,255,255,0.62);">
          ${esc(body)}
        </div>
      </foreignObject>
    </g>
  `;
}

function statSvg({ x, y, value, label, icon, opacity = 1 }) {
  return `
    <g transform="translate(${x} ${y})" opacity="${opacity}">
      <circle cx="28" cy="28" r="28" fill="rgba(124,58,237,0.35)" />
      <text x="28" y="35" text-anchor="middle" fill="white" font-size="22">${esc(icon)}</text>
      <text x="72" y="24" fill="white" font-size="28" font-weight="700">${esc(value)}</text>
      <text x="72" y="52" fill="rgba(255,255,255,0.62)" font-size="14">${esc(label)}</text>
    </g>
  `;
}

function quickWindowSvg({ x, y, w, h, title, body, accent = "#8b5cf6", opacity = 1, scale = 1 }) {
  return `
    <g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
      <rect width="${w}" height="${h}" rx="18" fill="rgba(20,20,24,0.94)" stroke="rgba(255,255,255,0.08)" />
      <rect x="0" y="0" width="${w}" height="28" rx="18" fill="rgba(255,255,255,0.04)" />
      <circle cx="18" cy="14" r="4" fill="${accent}" />
      <circle cx="32" cy="14" r="4" fill="rgba(255,255,255,0.18)" />
      <circle cx="46" cy="14" r="4" fill="rgba(255,255,255,0.18)" />
      <text x="64" y="18" fill="white" font-size="13" font-weight="700">${esc(title)}</text>
      <foreignObject x="18" y="46" width="${w - 36}" height="${h - 56}">
        <div xmlns="http://www.w3.org/1999/xhtml"
          style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;line-height:1.5;color:rgba(255,255,255,0.72);">
          ${esc(body)}
        </div>
      </foreignObject>
    </g>
  `;
}

function backgroundSvg(t) {
  const glowShift = Math.sin(t * 0.7) * 18;
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#020205" />
          <stop offset="60%" stop-color="#070713" />
          <stop offset="100%" stop-color="#030305" />
        </linearGradient>
        <linearGradient id="headlineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#7c3aed" />
          <stop offset="55%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#e9a8ff" />
        </linearGradient>
        <linearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#5b34f7" />
          <stop offset="55%" stop-color="#7c3aed" />
          <stop offset="100%" stop-color="#cf63ff" />
        </linearGradient>
        <linearGradient id="logoGradA" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#7c3aed" />
          <stop offset="100%" stop-color="#c084fc" />
        </linearGradient>
        <linearGradient id="logoGradB" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#5b34f7" />
          <stop offset="100%" stop-color="#d946ef" />
        </linearGradient>
        <radialGradient id="purpleGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(124,58,237,0.55)" />
          <stop offset="65%" stop-color="rgba(124,58,237,0.12)" />
          <stop offset="100%" stop-color="rgba(124,58,237,0)" />
        </radialGradient>
        <linearGradient id="iconGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5b34f7" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
      <ellipse cx="${640 + glowShift}" cy="610" rx="520" ry="220" fill="url(#purpleGlow)" opacity="0.9" />
      <ellipse cx="980" cy="240" rx="240" ry="160" fill="${rgba("#38bdf8", 0.08)}" />
      <ellipse cx="330" cy="180" rx="280" ry="180" fill="${rgba("#7c3aed", 0.08)}" />
      <rect width="${width}" height="64" fill="rgba(0,0,0,0.28)" />
      <rect width="${width}" height="48" y="0" fill="rgba(0,0,0,0.62)" />
      <rect width="${width}" height="92" y="${height - 92}" fill="rgba(0,0,0,0.36)" />
    </svg>
  `;
}

function heroOverlaySvg(t, phase) {
  const pulse = 0.7 + Math.sin(t * 1.3) * 0.08;
  const uiFade = phase === "end" ? 0.85 : 1;
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="groundGlow" cx="50%" cy="52%" r="48%">
          <stop offset="0%" stop-color="rgba(124,58,237,0.28)" />
          <stop offset="60%" stop-color="rgba(124,58,237,0.10)" />
          <stop offset="100%" stop-color="rgba(124,58,237,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="640" cy="518" rx="470" ry="170" fill="url(#groundGlow)" opacity="${pulse}" />
      <ellipse cx="640" cy="540" rx="430" ry="138" fill="none" stroke="rgba(124,58,237,0.22)" />
      <ellipse cx="640" cy="540" rx="350" ry="112" fill="none" stroke="rgba(124,58,237,0.14)" />
      <ellipse cx="640" cy="540" rx="280" ry="90" fill="none" stroke="rgba(124,58,237,0.10)" />
      <path d="M196 430 C270 462, 312 496, 318 560" fill="none" stroke="rgba(167,139,250,0.55)" stroke-width="1.8" />
      <path d="M1084 430 C1010 462, 968 496, 962 560" fill="none" stroke="rgba(167,139,250,0.55)" stroke-width="1.8" />
      <circle cx="310" cy="548" r="6" fill="white" opacity="0.95" />
      <circle cx="968" cy="548" r="6" fill="white" opacity="0.95" />
      <circle cx="430" cy="512" r="6" fill="white" opacity="0.92" />
      <circle cx="850" cy="512" r="6" fill="white" opacity="0.92" />
      <g opacity="${uiFade}">
        ${cardSvg({ x: 54, y: 148, title: "Smart Conversations", body: "Contextual, natural, deeply intelligent responses.", icon: "💬" })}
        ${cardSvg({ x: 54, y: 270, title: "Memory & Continuity", body: "Remembers what matters. Always stays in context.", icon: "🧠" })}
        ${cardSvg({ x: 54, y: 392, title: "Code & Build", body: "Write, debug, and build with powerful AI.", icon: "</>" })}
        ${cardSvg({ x: 54, y: 514, title: "Real-World Tools", body: "Search, analyze, automate, create, and more.", icon: "◎" })}
        ${cardSvg({ x: 976, y: 148, title: "Enterprise Secure", body: "Your data is private, encrypted, and protected.", icon: "🛡" })}
        ${cardSvg({ x: 976, y: 270, title: "Collaborate & Share", body: "Work together with teams and AI agents.", icon: "👥" })}
        ${cardSvg({ x: 976, y: 392, title: "Files & Knowledge", body: "Upload, analyze, extract insights instantly.", icon: "📄" })}
        ${cardSvg({ x: 976, y: 514, title: "Agents & Workflows", body: "Automate tasks with smart AI agents.", icon: "🚀" })}
      </g>
    </svg>
  `;
}

async function heroScreenshotLayer(scale, centerY = 330, opacity = 1) {
  const resizedWidth = Math.round(width * scale);
  const resizedHeight = Math.round(resizedWidth / heroAspect);
  const top = Math.round(centerY - resizedHeight / 2);
  const left = Math.round((width - resizedWidth) / 2);
  const input = await sharp(heroPath).resize(resizedWidth).png().toBuffer();
  return { input, left, top, opacity, blend: "over" };
}

function endCardSvg(t) {
  const fade = easeInOutCubic(sceneProgress(t, 24, 30));
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="rgba(0,0,0,${lerp(0.18, 0.72, fade)})" />
      <g opacity="${fade}">
        ${wordmarkSvg({ x: 474, y: 220, scale: 1.2 })}
        <text x="640" y="388" text-anchor="middle" fill="white" font-size="58" font-weight="750" letter-spacing="-1.5">This is Xeivora.</text>
        <text x="640" y="462" text-anchor="middle" fill="rgba(255,255,255,0.82)" font-size="28" font-weight="500">Xeivora.com</text>
        ${pillButton({ x: 530, y: 520, w: 220, h: 62, label: "Get Started", primary: true, opacity: 1 })}
      </g>
    </svg>
  `;
}

async function buildFrame(frameIndex) {
  const t = frameIndex / fps;
  const composites = [{ input: Buffer.from(backgroundSvg(t)) }];

  if (t < 4) {
    const p = easeInOutCubic(sceneProgress(t, 0, 4));
    const p2 = easeOutCubic(sceneProgress(t, 1.4, 4));
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${wordmarkSvg({ x: 455, y: 238, scale: lerp(0.82, 1, p), opacity: p })}
        ${overlayText({ x: width / 2, y: 396, lines: ["AI changed how we work."], size: 54, weight: 720, opacity: p2 })}
      </svg>
    `;
    composites.push({ input: Buffer.from(svg) });
  } else if (t < 10) {
    const p = sceneProgress(t, 4, 10);
    const pText = easeOutCubic(sceneProgress(t, 7.2, 10));
    const cutA = 1 - clamp(Math.abs(t - 4.9) / 1.8);
    const cutB = 1 - clamp(Math.abs(t - 6.0) / 1.8);
    const cutC = 1 - clamp(Math.abs(t - 7.1) / 1.8);
    const windowsSvg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${quickWindowSvg({ x: 110, y: 132, w: 340, h: 188, title: "ChatGPT", body: "Write a launch checklist for a product release.", accent: "#8b5cf6", opacity: cutA })}
        ${quickWindowSvg({ x: 470, y: 96, w: 320, h: 176, title: "Claude", body: "Rewrite this for a founder announcement email.", accent: "#38bdf8", opacity: cutB })}
        ${quickWindowSvg({ x: 798, y: 164, w: 360, h: 190, title: "Code", body: "Fix the auth bug and regenerate the UI route.", accent: "#c084fc", opacity: cutC })}
        <g opacity="${lerp(0.18, 0.65, p)}">
          <text x="640" y="426" text-anchor="middle" fill="rgba(255,255,255,0.82)" font-size="36" font-weight="700">Switching models. Copy-pasting prompts. Re-explaining context.</text>
          <text x="640" y="520" text-anchor="middle" fill="rgba(255,255,255,0.86)" font-size="52" font-weight="760">But something still feels broken.</text>
        </g>
        <g opacity="${pText}">
          <text x="640" y="600" text-anchor="middle" fill="white" font-size="26" font-weight="700">Different models. Lost context. Fragmented workflows.</text>
        </g>
      </svg>
    `;
    composites.push({ input: Buffer.from(windowsSvg) });
  } else if (t < 15) {
    const p = easeInOutCubic(sceneProgress(t, 10, 15));
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <path d="M320 486 C470 410, 814 410, 960 486" fill="none" stroke="rgba(124,58,237,${lerp(0.15, 0.78, p)})" stroke-width="3" />
        <circle cx="320" cy="486" r="${lerp(2, 6, p)}" fill="white" />
        <circle cx="960" cy="486" r="${lerp(2, 6, p)}" fill="white" />
        ${overlayText({ x: width / 2, y: 230, lines: ["What if AI felt like one", "continuous intelligence layer?"], size: 48, weight: 700, opacity: p })}
        ${overlayText({ x: width / 2, y: 404, lines: ["One Intelligence.", "Infinite Possibilities."], size: 64, weight: 760, opacity: p, gradient: true })}
      </svg>
    `;
    composites.push({ input: Buffer.from(svg) });
  } else if (t < 24) {
    const p = sceneProgress(t, 15, 24);
    const scale = lerp(0.78, 0.9, easeInOutCubic(p));
    composites.push(await heroScreenshotLayer(scale, 340, 0.95));
    composites.push({ input: Buffer.from(heroOverlaySvg(t, "main")) });
    const uiText = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${badgeSvg({ x: 494, y: 92, label: "Unified AI Intelligence Platform", opacity: 0.96 })}
        ${overlayText({ x: width / 2, y: 176, lines: ["One Intelligence.", "Infinite Possibilities."], size: 72, weight: 760, opacity: 0.98, gradient: true })}
        ${paragraphSvg({ x: 334, y: 304, widthPx: 612, text: "Xeivora brings together the world’s best AI models, memory, agents, tools, and workflows into one seamless experience.", opacity: 0.92 })}
        ${pillButton({ x: 452, y: 394, w: 194, h: 56, label: "Start Chatting", primary: true })}
        ${pillButton({ x: 664, y: 394, w: 210, h: 56, label: "Explore Platform" })}
      </svg>
    `;
    composites.push({ input: Buffer.from(uiText) });

    const chipsOpacity = easeOutCubic(sceneProgress(t, 17, 23));
    const chipsSvg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${chipsOpacity}">
          ${pillButton({ x: 390, y: 92, w: 120, h: 34, label: "OpenAI", primary: true, opacity: 0.88 })}
          ${pillButton({ x: 520, y: 92, w: 112, h: 34, label: "Claude", opacity: 0.86 })}
          ${pillButton({ x: 642, y: 92, w: 118, h: 34, label: "Gemini", opacity: 0.86 })}
          ${pillButton({ x: 770, y: 92, w: 122, h: 34, label: "Local AI", opacity: 0.86 })}
        </g>
      </svg>
    `;
    composites.push({ input: Buffer.from(chipsSvg) });
  } else {
    const p = sceneProgress(t, 24, 30);
    const scale = lerp(0.88, 0.97, easeInOutCubic(p));
    composites.push(await heroScreenshotLayer(scale, 330, lerp(0.98, 0.8, p)));
    composites.push({ input: Buffer.from(heroOverlaySvg(t, "end")) });
    const useCases = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <g opacity="${1 - sceneProgress(t, 28, 30)}">
          <text x="220" y="560" fill="white" font-size="24" font-weight="700">Writing</text>
          <text x="340" y="520" fill="white" font-size="24" font-weight="700">Coding</text>
          <text x="868" y="520" fill="white" font-size="24" font-weight="700">Research</text>
          <text x="964" y="560" fill="white" font-size="24" font-weight="700">Automation</text>
          ${overlayText({ x: width / 2, y: 152, lines: ["Build.", "Think.", "Create.", "Continue."], size: 48, weight: 760, opacity: 0.94 })}
        </g>
      </svg>
    `;
    composites.push({ input: Buffer.from(useCases) });
    composites.push({ input: Buffer.from(endCardSvg(t)) });
  }

  const base = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 2, g: 2, b: 5, alpha: 1 }
    }
  });

  await base.composite(composites).jpeg({ quality: 92 }).toFile(path.join(framesDir, formatFrame(frameIndex)));
}

for (let i = 0; i < totalFrames; i += 1) {
  if (i % 24 === 0) {
    console.log(`Rendering frame ${i + 1}/${totalFrames}`);
  }
  await buildFrame(i);
}

const manifest = {
  width,
  height,
  fps,
  durationSeconds,
  frames: totalFrames,
  pattern: path.join(framesDir, "frame-%05d.jpg"),
  outputMp4: path.join(artifactsDir, "Xeivora-Cinematic-Teaser.mp4")
};

await fs.writeFile(path.join(artifactsDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Frames rendered to ${framesDir}`);
