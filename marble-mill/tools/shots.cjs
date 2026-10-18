// Render chosen timeline moments to PNGs, so the composition can be checked
// by eye (and so frames never have to be guessed at).
//
//   node tools/shots.cjs 0.2 1.0 3.0:debug ...
//
// A ":debug" suffix draws the route overlay. Output -> out/shots/tNNN.png
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'out', 'shots');

(async () => {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('usage: shots.cjs <t>[:debug] ...'); process.exit(1); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--disable-gpu', '--force-device-scale-factor=1'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

  const wantsDebug = args.some(a => a.endsWith(':debug'));
  const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/') + (wantsDebug ? '#debug' : '');
  await page.goto(url, { waitUntil: 'load' });

  const ok = await page.evaluate(() => typeof window.seek === 'function');
  if (!ok) { console.error('seek() missing'); process.exit(1); }

  for (const a of args) {
    const [tStr, mode] = a.split(':');
    const t = parseFloat(tStr);
    await page.evaluate((tt) => window.seek(tt), t);
    const file = path.join(OUT, 't' + String(Math.round(t * 1000)).padStart(6, '0') + (mode ? '-debug' : '') + '.png');
    await page.screenshot({ path: file });
    console.log('  wrote', path.relative(ROOT, file));
  }
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
