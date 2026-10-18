// Render N evenly spaced moments of the loop as sequentially numbered frames,
// ready for ffmpeg to tile into one contact sheet.
//
//   node tools/sheet.cjs [count] [startSeconds]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'out', 'sheet');

(async () => {
  const count = parseInt(process.argv[2] || '12', 10);
  const start = parseFloat(process.argv[3] || '0');

  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

  const browser = await chromium.launch({ args: ['--disable-gpu', '--force-device-scale-factor=1'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/') + '#debug', { waitUntil: 'load' });

  const DUR = await page.evaluate(() => window.MARBLE_MILL.DUR);
  const times = [];
  for (let i = 0; i < count; i++) times.push(start + (i / count) * DUR);

  for (let i = 0; i < times.length; i++) {
    await page.evaluate((tt) => window.seek(tt), times[i]);
    await page.screenshot({ path: path.join(OUT, 'f' + String(i).padStart(3, '0') + '.png') });
  }
  await browser.close();
  console.log('rendered', count, 'frames ->', path.relative(ROOT, OUT));
  console.log('times:', times.map(t => t.toFixed(2)).join(' '));
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
