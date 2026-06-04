#!/usr/bin/env node
/**
 * Builds index.html and section preview pages from sections/*.html
 * Run: node tools/assemble-landing.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sectionsDir = path.join(root, 'sections');

const VERSIONS = {
  base: 21,
  hero: 32,
  sections: 16,
  hiw: 20,
  blog: '20260601-squeezy',
  sectionsJs: 3,
  hiwJs: 6,
};

function readSection(name) {
  return fs.readFileSync(path.join(sectionsDir, `${name}.html`), 'utf8').trim();
}

function renderChainsSection({ preview = false } = {}) {
  const chains = JSON.parse(
    fs.readFileSync(path.join(sectionsDir, 'chains.json'), 'utf8')
  );
  const visible = preview ? ' is-visible' : '';
  const logos = chains
    .map(
      (c) =>
        `          <div class="chains-strip__logo"><img src="assets/figma-export/chains/${c.slug}.png" alt="${c.name}" width="${c.width}" height="${c.height}"></div>`
    )
    .join('\n');
  const track = `${logos}\n\n${logos}`;

  return `<section class="chains-strip${visible}" id="chains" aria-labelledby="chains-desc">
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

function pageShell({ title, stylesheets, bodyMain, scripts = [] }) {
  const links = stylesheets
    .map((href) => `  <link rel="stylesheet" href="${href}">`)
    .join('\n');
  const scriptTags = scripts
    .map(({ src, defer = false }) =>
      defer
        ? `  <script src="${src}" defer></script>`
        : `  <script src="${src}"></script>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
${links}
</head>
<body>
  <main class="page">
${bodyMain}
  </main>
${scriptTags}
</body>
</html>
`;
}

function indentBlock(html, spaces = 4) {
  const pad = ' '.repeat(spaces);
  return html
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n');
}

const hero = readSection('hero');
const chains = renderChainsSection();
const hiw = readSection('hiw');
const blog = readSection('blog');
const faq = readSection('faq');
const footer = readSection('footer');

const fullStyles = [
  `base.css?v=${VERSIONS.base}`,
  `hero.css?v=${VERSIONS.hero}`,
  `sections.css?v=${VERSIONS.sections}`,
  `hiw.css?v=${VERSIONS.hiw}`,
  `blog.css?v=${VERSIONS.blog}`,
];

const fullMain = [
  hero,
  chains,
  hiw,
  blog,
  faq,
  footer,
]
  .map((block) => indentBlock(block))
  .join('\n\n');

const indexHtml = pageShell({
  title: 'FastBridge',
  stylesheets: fullStyles,
  bodyMain: fullMain,
  scripts: [
    { src: `sections.js?v=${VERSIONS.sectionsJs}` },
    { src: `hiw.js?v=${VERSIONS.hiwJs}` },
    { src: `blog-squeezy-canvas.js?v=${VERSIONS.blog}`, defer: true },
    { src: `blog.js?v=${VERSIONS.blog}`, defer: true },
  ],
});

fs.writeFileSync(path.join(root, 'index.html'), indexHtml);

const previews = [
  {
    file: 'chains.html',
    title: 'Chains — FastBridge',
    stylesheets: [`base.css?v=${VERSIONS.base}`, `sections.css?v=${VERSIONS.sections}`],
    bodyMain: indentBlock(renderChainsSection({ preview: true })),
    scripts: [{ src: `sections.js?v=${VERSIONS.sectionsJs}` }],
  },
  {
    file: 'hiw.html',
    title: 'How FastBridge Works — FastBridge',
    stylesheets: [`base.css?v=${VERSIONS.base}`, `hiw.css?v=${VERSIONS.hiw}`],
    bodyMain: indentBlock(hiw),
    scripts: [{ src: `hiw.js?v=${VERSIONS.hiwJs}` }],
  },
  {
    file: 'blog.html',
    title: 'Blog — FastBridge',
    stylesheets: [`base.css?v=${VERSIONS.base}`, `blog.css?v=${VERSIONS.blog}`],
    bodyMain: indentBlock(blog),
    scripts: [
      { src: `blog-squeezy-canvas.js?v=${VERSIONS.blog}`, defer: true },
      { src: `blog.js?v=${VERSIONS.blog}`, defer: true },
    ],
  },
  {
    file: 'faq.html',
    title: 'FAQ — FastBridge',
    stylesheets: [`base.css?v=${VERSIONS.base}`, `sections.css?v=${VERSIONS.sections}`],
    bodyMain: indentBlock(faq.replace('class="faq"', 'class="faq is-visible"')),
    scripts: [{ src: `sections.js?v=${VERSIONS.sectionsJs}`, defer: true }],
  },
  {
    file: 'footer.html',
    title: 'Footer — FastBridge',
    stylesheets: [`base.css?v=${VERSIONS.base}`, `sections.css?v=${VERSIONS.sections}`],
    bodyMain: indentBlock(
      footer
        .replace('href="#faq"', 'href="faq.html"')
        .replace('class="site-footer"', 'class="site-footer is-visible"')
    ),
    scripts: [{ src: `sections.js?v=${VERSIONS.sectionsJs}`, defer: true }],
  },
];

for (const preview of previews) {
  fs.writeFileSync(
    path.join(root, preview.file),
    pageShell(preview)
  );
}

console.log('Built from sections/:');
console.log('  index.html');
for (const p of previews) {
  console.log(`  ${p.file}`);
}
