#!/usr/bin/env node
/**
 * Batch-export chain-themed ribbon PNGs for Paper artboards.
 * Usage: node tools/hero-gradient/export-chain-gradients.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildChainState,
  DEFAULT_MESH_PATH,
  gradientStopsFromPrimary,
  loadChainThemes,
  renderMeshGradient,
} from './mesh-renderer.mjs';

const NEUTRAL_CHAINS = new Set(['citrea', 'megaeth']);
const LOW_CHROMA_CHAINS = new Set(['scroll', 'bnb']);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const OUT_DIR = join(ROOT, 'assets/chain-gradients');
const WIDTH = 1440;
const HEIGHT = 1024;

const themes = loadChainThemes();
mkdirSync(OUT_DIR, { recursive: true });

const chainIds = Object.keys(themes.chains);
console.log(`Exporting ${chainIds.length} chain gradients → ${OUT_DIR}`);

for (const chainId of chainIds) {
  const chain = themes.chains[chainId];
  const state = buildChainState(themes, chainId);
  state.stops = gradientStopsFromPrimary(chain.primary, {
    neutral: NEUTRAL_CHAINS.has(chainId),
    lowChroma: LOW_CHROMA_CHAINS.has(chainId),
  });
  const png = await renderMeshGradient(state, WIDTH, HEIGHT, DEFAULT_MESH_PATH);
  const outPath = join(OUT_DIR, `${chainId}-ribbon.png`);
  writeFileSync(outPath, png);
  console.log(`  ✓ ${chainId}-ribbon.png (${themes.chains[chainId].label})`);
}

const manifest = {
  width: WIDTH,
  height: HEIGHT,
  chains: Object.fromEntries(
    chainIds.map((id) => [
      id,
      {
        label: themes.chains[id].label,
        primary: themes.chains[id].primary,
        png: `assets/chain-gradients/${id}-ribbon.png`,
        boxShadow: [
          '#FFFFFFE6 0px 1px 0px inset',
          '#FFFFFF8C 0px 0px 0px 14px',
          `${themes.chains[id].primary}${themes.chains[id].shadow.near} 0px 2px 4px`,
          `${themes.chains[id].primary}${themes.chains[id].shadow.mid} 0px 12px 24px`,
          `${themes.chains[id].primary}${themes.chains[id].shadow.far} 0px 32px 64px`,
        ].join(', '),
      },
    ]),
  ),
};

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Done. Manifest written to assets/chain-gradients/manifest.json');
