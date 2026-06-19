// Headless reel recorder — renders an animated reel .html to video, no screen recording.
// Usage: node capture_reel.js <html-path> <seconds> <out-dir>
// Outputs a .webm (Playwright) and prints RAW_WEBM=<path> for render.sh to transcode.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const args = process.argv.slice(2);
  const htmlPath = path.resolve(args[0] || 'mcp_reel_visual.html');
  const seconds = Number(args[1] || 89);          // one full loop ≈ 88.1s + buffer
  const outDir = path.resolve(args[2] || '.');
  const tmp = path.join(outDir, '_capture');
  fs.mkdirSync(tmp, { recursive: true });

  const browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
    recordVideo: { dir: tmp, size: { width: 1080, height: 1920 } },
  });
  const page = await context.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });

  // hide the on-screen control bar / safe-zone overlays so they aren't in the video
  await page.addStyleTag({
    content: '#hint{display:none!important}#safe{display:none!important}#guide{display:none!important}',
  }).catch(() => {});

  // wait for webfonts so the first frame isn't a fallback font
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});

  // restart the loop from beat 1 so we capture a clean pass
  await page.evaluate(() => { const r = document.getElementById('replay'); if (r) r.click(); }).catch(() => {});
  await page.waitForTimeout(300);
  await page.evaluate(() => { const r = document.getElementById('replay'); if (r) r.click(); }).catch(() => {});

  await page.waitForTimeout(seconds * 1000);

  const video = page.video();
  await context.close();   // finalizes the .webm
  await browser.close();
  const webm = await video.path();
  console.log('RAW_WEBM=' + webm);
})().catch((e) => { console.error(e); process.exit(1); });
