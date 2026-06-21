// Headless recorder for the PREMIUM reel (split-screen head + glass beats + captions).
// One clean real-time pass: loads the page in NORMAL mode, clicks the Tap-to-play
// overlay (which starts the Ivanna <audio> + the lip-synced head and drives the beats),
// records 1080x1920, prints RAW_WEBM=<path> for render_premium.sh to mux + transcode.
//
// Usage: node capture_premium.js <html-path> <seconds> <out-dir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const htmlPath = path.resolve(process.argv[2] || 'api_premium_DRAFT.html');
  const seconds = Number(process.argv[3] || 92);     // Ivanna track ~91.4s + buffer
  const outDir = path.resolve(process.argv[4] || '.');
  const tmp = path.join(outDir, '_cap_premium');
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

  // NORMAL mode (no ?capture) so the real talking head stays visible and the intro
  // caption shows. The page waits on the Tap-to-play overlay; we click it once.
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});

  // Smoothness: add the `cap` class (lightens the GPU-heavy backdrop-blur so the page
  // paints ~25fps instead of ~7fps). We are NOT in ?capture query mode, so the head
  // stays visible and the intro caption still shows — only the blur is lightened.
  // The look is effectively unchanged on screen.
  await page.evaluate(() => document.documentElement.classList.add('cap')).catch(() => {});

  await page.waitForTimeout(500);                     // settle layout + decode first head frame

  await page.evaluate(() => {
    const p = document.getElementById('play');
    if (p) p.click();                                 // -> start(): plays vo (Ivanna) + head, runs loop()
  }).catch(() => {});

  await page.waitForTimeout(seconds * 1000);

  const video = page.video();
  await context.close();                              // finalizes the .webm
  await browser.close();
  console.log('RAW_WEBM=' + await video.path());
})().catch((e) => { console.error(e); process.exit(1); });
