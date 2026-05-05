import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const outDir = '/tmp/campaign-atlas-visuals';

async function canvasStats(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#flat-atlas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { ok: false, reason: 'missing 2d context' };
    const width = canvas.width;
    const height = canvas.height;
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let nonBlank = 0;
    let colored = 0;
    for (let i = 0; i < pixels.length; i += 80) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      if (a > 0 && (r > 4 || g > 4 || b > 4)) nonBlank += 1;
      if (Math.max(r, g, b) - Math.min(r, g, b) > 6) colored += 1;
    }
    return { ok: true, width, height, nonBlank, colored };
  });
}

async function verifyViewport(page, url, name, size) {
  await page.setViewportSize(size);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#flat-atlas');
  await page.waitForTimeout(1000);

  const stats = await canvasStats(page);
  assert.equal(stats.ok, true, stats.reason);
  assert.ok(stats.width >= size.width, `${name} flat canvas has expected width`);
  assert.ok(stats.nonBlank > 5000, `${name} flat canvas has rendered pixels: ${JSON.stringify(stats)}`);
  assert.ok(stats.colored > 1500, `${name} flat canvas has color variance: ${JSON.stringify(stats)}`);

  const appChildren = await page.evaluate(() => [...document.querySelector('#app').children].map((node) => node.id || node.tagName));
  assert.deepEqual(appChildren, ['flat-atlas']);

  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
}

await mkdir(outDir, { recursive: true });
const server = await createServer({
  server: { host: '127.0.0.1', port: 5179, strictPort: false },
  logLevel: 'error'
});
await server.listen();

const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await verifyViewport(page, url, 'desktop', { width: 1440, height: 960 });
  await verifyViewport(page, url, 'mobile', { width: 390, height: 844 });
  console.log(`Visual verification passed. Screenshots: ${outDir}`);
} finally {
  await browser.close();
  await server.close();
}
