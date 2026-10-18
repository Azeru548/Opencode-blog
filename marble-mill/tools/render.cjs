// Render the loop to a numbered PNG sequence.
//
//   node tools/render.cjs [fps] [outDir]
//
// Frames are captured from the composition's own seek(t), so the output is
// exactly what the source draws — no real-time capture, no dropped frames.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

(async () => {
  const fps = parseInt(process.argv[2] || '30', 10);
  const outDir = path.join(ROOT, process.argv[3] || 'out/frames');

  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.png')) fs.unlinkSync(path.join(outDir, f));

  const browser = await chromium.launch({ args: ['--disable-gpu', '--force-device-scale-factor=1'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });

  const meta = await page.evaluate(() => ({ dur: window.MARBLE_MILL.DUR, w: window.MARBLE_MILL.W, h: window.MARBLE_MILL.H }));
  const total = Math.round(meta.dur * fps);

  console.log(`rendering ${total} frames @ ${fps}fps  (${meta.w}x${meta.h}, ${meta.dur}s)`);
  const t0 = Date.now();

  for (let i = 0; i < total; i++) {
    await page.evaluate((tt) => window.seek(tt), i / fps);
    await page.screenshot({ path: path.join(outDir, 'f' + String(i).padStart(4, '0') + '.png') });
    if (i % 30 === 0 || i === total - 1) {
      const el = (Date.now() - t0) / 1000;
      const rate = (i + 1) / el;
      console.log(`  ${String(i + 1).padStart(4)}/${total}   ${el.toFixed(1)}s   ${rate.toFixed(1)} fps-render   eta ${(((total - i - 1) / rate)).toFixed(0)}s`);
    }
  }

  const el = (Date.now() - t0) / 1000;
  const bytes = fs.readdirSync(outDir).reduce((a, f) => a + fs.statSync(path.join(outDir, f)).size, 0);
  console.log(`done: ${total} frames in ${el.toFixed(1)}s (${(total / el).toFixed(1)}/s), ${(bytes / 1048576).toFixed(0)} MB`);
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
