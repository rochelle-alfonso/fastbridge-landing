const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const out = process.argv[2];
  const url = process.argv[3];
  const width = Number(process.argv[4] || 1024);
  const height = Number(process.argv[5] || 642);
  const dpr = Number(process.argv[6] || 3);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width, height } });
  console.log('saved', out, `${width * dpr}x${height * dpr}`);
  await browser.close();
})();
