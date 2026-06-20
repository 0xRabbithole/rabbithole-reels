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
  // Load in CAPTURE mode (#capture) so the reel does NOT autoplay — it holds on a blank
  // first frame until we trigger a single clean pass below. This kills the old
  // "double intro / restart" glitch (the recorder used to catch the autoplay AND a replay).
  await page.goto('file://' + htmlPath + '#capture', { waitUntil: 'networkidle' });

  // hide the on-screen control bar / safe-zone overlays so they aren't in the video
  await page.addStyleTag({
    content: '#hint{display:none!important}#safe{display:none!important}#guide{display:none!important}',
  }).catch(() => {});

  // wait for webfonts so the first frame isn't a fallback font
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});

  // tiny settle so layout is ready, then start exactly ONE clean pass from beat 1
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    if (typeof window.__startReel === 'function') window.__startReel();
    else { const r = document.getElementById('replay'); if (r) r.click(); }  // fallback for older reels
  }).catch(() => {});

  await page.waitForTimeout(seconds * 1000);

  const video = page.video();
  await context.close();   // finalizes the .webm
  await browser.close();
  const webm = await video.path();
  console.log('RAW_WEBM=' + webm);
})().catch((e) => { console.error(e); process.exit(1); });
