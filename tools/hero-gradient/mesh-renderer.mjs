/**
 * Headless mesh ribbon renderer (lightSwap mode).
 * Port of drawMesh() from hero-gradient-tool.js for batch PNG export.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function luma(rgb) {
  return (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function colorAtStops(stops, t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.pos && t <= b.pos) {
      const u = (t - a.pos) / (b.pos - a.pos || 1);
      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      return {
        r: ca.r + (cb.r - ca.r) * u,
        g: ca.g + (cb.g - ca.g) * u,
        b: ca.b + (cb.b - ca.b) * u,
      };
    }
  }
  return hexToRgb(stops[stops.length - 1].color);
}

function recolorPixel(src, tint, amount) {
  const sl = Math.max(luma(src), 0.02);
  const tl = Math.max(luma(tint), 0.02);
  const scale = sl / tl;
  const r = tint.r * scale;
  const g = tint.g * scale;
  const b = tint.b * scale;
  return {
    r: lerp(src.r, Math.min(255, r), amount),
    g: lerp(src.g, Math.min(255, g), amount),
    b: lerp(src.b, Math.min(255, b), amount),
  };
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

function sampleBackground(state, nx, ny) {
  return hexToRgb(state.lightBg || '#f4f5f7');
}

function drawGrain(ctx, w, h, grain) {
  if (grain <= 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const amount = grain * 255;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

export function buildBoxShadow(chain) {
  const { primary, shadow } = chain;
  const { near, mid, far } = shadow;
  return [
    '#FFFFFFE6 0px 1px 0px inset',
    '#FFFFFF8C 0px 0px 0px 14px',
    `${primary}${near} 0px 2px 4px`,
    `${primary}${mid} 0px 12px 24px`,
    `${primary}${far} 0px 32px 64px`,
  ].join(', ');
}

export function buildChainState(chainThemes, chainId) {
  const chain = chainThemes.chains[chainId];
  if (!chain) throw new Error(`Unknown chain: ${chainId}`);
  return {
    ...chainThemes.lightSwapBase,
    stops: chain.gradientStops,
  };
}

export async function renderMeshGradient(state, width, height, meshPath) {
  const meshImage = await loadImage(meshPath);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const off = createCanvas(width, height);
  const octx = off.getContext('2d');
  octx.drawImage(meshImage, 0, 0, width, height);
  const src = octx.getImageData(0, 0, width, height).data;
  const out = ctx.createImageData(width, height);
  const d = out.data;

  const th = state.meshThreshold;
  const soft = state.meshSoftness;
  const tintAmt = state.tintStrength;
  const inten = state.meshIntensity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const nx = x / width;
      const bg = sampleBackground(state, nx, y / height);
      const srcRgb = { r: src[i], g: src[i + 1], b: src[i + 2] };
      const L = luma(srcRgb);
      const mask = smoothstep(th, th + soft, L) * inten;
      const tint = colorAtStops(state.stops, nx);

      let pixel;
      if (mask < 0.004) {
        pixel = bg;
      } else {
        const rec = recolorPixel(srcRgb, tint, tintAmt);
        pixel = {
          r: lerp(bg.r, rec.r, mask * 0.7),
          g: lerp(bg.g, rec.g, mask * 0.7),
          b: lerp(bg.b, rec.b, mask * 0.7),
        };
      }

      d[i] = pixel.r;
      d[i + 1] = pixel.g;
      d[i + 2] = pixel.b;
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  drawGrain(ctx, width, height, state.grain || 0);

  return canvas.toBuffer('image/png');
}

export function loadChainThemes(path = join(__dirname, 'chain-themes.json')) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export const DEFAULT_MESH_PATH = join(
  __dirname,
  '../../assets/figma-hero/hero-gradient-layer-light.png',
);

export function mixHex(a, b, t) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  return rgbToHex({
    r: Math.round(lerp(ar.r, br.r, t)),
    g: Math.round(lerp(ar.g, br.g, t)),
    b: Math.round(lerp(ar.b, br.b, t)),
  });
}

function rgbToHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Build ribbon gradient stops from a chain primary (lightSwap positions). */
export function gradientStopsFromPrimary(primary, { lowChroma = false, neutral = false } = {}) {
  const lightBg = '#f4f5f7';
  if (neutral) {
    return [
      { pos: 0.08, color: mixHex('#888888', lightBg, 0.35) },
      { pos: 0.16, color: mixHex('#999999', lightBg, 0.45) },
      { pos: 0.28, color: mixHex('#aaaaaa', lightBg, 0.55) },
      { pos: 0.55, color: mixHex('#bbbbbb', lightBg, 0.7) },
      { pos: 0.85, color: mixHex('#cccccc', lightBg, 0.85) },
    ];
  }
  const vivid = lowChroma ? 0.55 : 0.35;
  const mid = lowChroma ? 0.65 : 0.45;
  const soft = lowChroma ? 0.75 : 0.55;
  return [
    { pos: 0.08, color: mixHex(primary, '#ffffff', vivid) },
    { pos: 0.16, color: mixHex(primary, '#ffffff', mid) },
    { pos: 0.28, color: mixHex(primary, '#ffffff', soft) },
    { pos: 0.55, color: mixHex(primary, lightBg, 0.55) },
    { pos: 0.85, color: mixHex(primary, lightBg, 0.82) },
  ];
}
