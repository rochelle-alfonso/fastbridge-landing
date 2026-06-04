#!/usr/bin/env node
/**
 * Builds fastbridge-landing.html from individual section preview pages.
 * Uses exact markup from each source HTML file.
 * Run: node tools/assemble-from-pages.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sectionsDir = path.join(root, 'sections');

function read(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

function extractMainInner(html) {
  const match = html.match(/<main class="page">\s*([\s\S]*?)\s*<\/main>/);
  if (!match) throw new Error('No <main class="page"> found');
  return match[1].trimEnd();
}

function withMainIndent(html) {
  return html
    .split('\n')
    .map((line) => (line ? `    ${line}` : line))
    .join('\n');
}

function renderChainsSection() {
  const chains = JSON.parse(
    fs.readFileSync(path.join(sectionsDir, 'chains.json'), 'utf8')
  );
  const logos = chains
    .map(
      (c) =>
        `          <div class="chains-strip__logo"><img src="assets/figma-export/chains/${c.slug}.png" alt="${c.name}" width="${c.width}" height="${c.height}"></div>`
    )
    .join('\n');
  const track = `${logos}\n\n${logos}`;

  return `<section class="chains-strip" id="chains" aria-labelledby="chains-desc">
  <p class="chains-strip__desc" id="chains-desc">
    Aggregate and spend your stablecoins like USDC, USDT and others across all major EVM chains in seconds with no gas management.
  </p>

  <div class="chains-strip__logos" aria-hidden="true">
    <div class="chains-strip__track">
${track}
    </div>
  </div>
</section>`;
}

function extractHeroAndChains() {
  const main = extractMainInner(read('index.html'));
  const hiwStart = main.indexOf('\n\n    <section class="hiw"');
  if (hiwStart > 0) return main.slice(0, hiwStart);

  const hero = withMainIndent(
    fs.readFileSync(path.join(sectionsDir, 'hero.html'), 'utf8').trimEnd()
  );
  const chains = withMainIndent(renderChainsSection());
  return `${hero}\n\n${chains}`;
}

const heroAndChains = extractHeroAndChains();

const allBlocks = [
  heroAndChains,
  extractMainInner(read('hiw.html')),
  extractMainInner(read('blog.html')),
  extractMainInner(read('faq.html')),
  extractMainInner(read('footer.html')),
];

const bodyMain = allBlocks.join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FastBridge</title>
  <link rel="stylesheet" href="base.css?v=21">
  <link rel="stylesheet" href="hero.css?v=32">
  <link rel="stylesheet" href="sections.css?v=16">
  <link rel="stylesheet" href="hiw.css?v=20">
  <link rel="stylesheet" href="blog.css?v=20260601-squeezy">
</head>
<body>
  <main class="page">
${bodyMain}
  </main>
  <script src="sections.js?v=3"></script>
  <script src="hiw.js?v=6"></script>
  <script src="blog-squeezy-canvas.js?v=20260601-squeezy" defer></script>
  <script src="blog.js?v=20260601-squeezy" defer></script>
</body>
</html>
`;

fs.writeFileSync(path.join(root, 'fastbridge-landing.html'), html);

console.log('Built fastbridge-landing.html from:');
console.log('  index.html  → hero, chains-strip');
console.log('  hiw.html    → how-it-works');
console.log('  blog.html   → blog');
console.log('  faq.html    → faq');
console.log('  footer.html → footer');
