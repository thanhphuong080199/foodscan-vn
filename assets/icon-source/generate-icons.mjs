// Generates all app icon PNGs from vector source.
// Concept: white leaf (midrib + veins) crossed by a bright scan line,
// on an emerald->teal gradient. Run: node assets/icon-source/generate-icons.mjs
// (requires the `sharp` devDependency).
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(HERE, '..');
const S = 1024;

// --- palette ---
const BG_TOP = '#12C08A';
const BG_BOTTOM = '#0C8C88';
const BG_SOLID = '#0FA98C'; // adaptive/legacy fallback background color

// Leaf + veins in local coords, centered at the origin, tilted -15deg.
function leaf({ mono = false } = {}) {
  const fill = mono ? '#FFFFFF' : 'url(#leafGrad)';
  const vein = mono ? 'none' : '#0FA98C';
  const veinOpacity = mono ? 0 : 0.5;
  return `
  <g transform="translate(512 512) rotate(-15)">
    <path d="M 0,-285 C 175,-165 175,175 0,300 C -175,175 -175,-165 0,-285 Z"
          fill="${fill}"/>
    <g stroke="${vein}" stroke-opacity="${veinOpacity}" stroke-linecap="round" fill="none">
      <path d="M 0,-250 C 6,-90 6,120 0,278" stroke-width="12"/>
      <path d="M 0,-150 Q 62,-176 122,-206" stroke-width="8"/>
      <path d="M 0,-150 Q -62,-176 -122,-206" stroke-width="8"/>
      <path d="M 0,-20 Q 74,-38 152,-58" stroke-width="8"/>
      <path d="M 0,-20 Q -74,-38 -152,-58" stroke-width="8"/>
      <path d="M 0,110 Q 62,96 120,66" stroke-width="8"/>
      <path d="M 0,110 Q -62,96 -120,66" stroke-width="8"/>
    </g>
  </g>`;
}

// Horizontal scan line across the center (absolute coords).
function scanLine({ mono = false } = {}) {
  if (mono) {
    return `
    <g stroke-linecap="round">
      <line x1="150" y1="512" x2="874" y2="512" stroke="#FFFFFF" stroke-width="26"/>
      <circle cx="150" cy="512" r="15" fill="#FFFFFF"/>
      <circle cx="874" cy="512" r="15" fill="#FFFFFF"/>
    </g>`;
  }
  return `
  <g stroke-linecap="round">
    <line x1="176" y1="512" x2="848" y2="512" stroke="#D7FFF4" stroke-opacity="0.30" stroke-width="46"/>
    <line x1="176" y1="512" x2="848" y2="512" stroke="#ECFFFA" stroke-opacity="0.65" stroke-width="24"/>
    <line x1="176" y1="512" x2="848" y2="512" stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="12"/>
    <circle cx="176" cy="512" r="14" fill="#FFFFFF"/>
    <circle cx="848" cy="512" r="14" fill="#FFFFFF"/>
  </g>`;
}

const defs = `
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BG_TOP}"/>
      <stop offset="1" stop-color="${BG_BOTTOM}"/>
    </linearGradient>
    <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#E7FBF1"/>
    </linearGradient>
  </defs>`;

// scale the mark about center (safe-zone padding for adaptive icons)
function mark({ scale = 0.9, mono = false } = {}) {
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${leaf({ mono })}
    ${scanLine({ mono })}
  </g>`;
}

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${defs}${inner}</svg>`;
}

const bgRect = `<rect width="${S}" height="${S}" fill="url(#bgGrad)"/>`;

const sources = {
  // Full app icon (iOS + web + fallback): background + mark.
  'icon.png': svg(bgRect + mark({ scale: 0.92 })),
  // Android adaptive layers.
  'android-icon-background.png': svg(bgRect),
  'android-icon-foreground.png': svg(mark({ scale: 0.66 })), // 66% safe zone
  'android-icon-monochrome.png': svg(mark({ scale: 0.66, mono: true })),
  // Splash logo (mark on transparent; splash bg color set in app.json).
  'splash-icon.png': svg(mark({ scale: 0.8 })),
};

for (const [name, src] of Object.entries(sources)) {
  const out = resolve(ASSETS, name);
  await sharp(Buffer.from(src)).png().toFile(out);
  console.log('wrote', name);
}

// Favicon: 48px version of the full icon.
await sharp(Buffer.from(sources['icon.png']))
  .resize(48, 48)
  .png()
  .toFile(resolve(ASSETS, 'favicon.png'));
console.log('wrote favicon.png (48px)');
