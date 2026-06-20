// Cover-frame grabber — screenshots the reel's settled FIRST slide as a 1080x1920 PNG,
// so the Instagram/TikTok cover shows what the reel is about at a glance.
// Usage: node capture_cover.js <html-path> <out-png> [settleMs]
//
// Loads the reel in NORMAL mode (it autoplays), waits for the first beat to fully
// settle, then captures one clean still. No #capture flag here — we WANT the first
// slide rendered, not the blank hold the recorder uses.

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const htmlPath = path.resolve(process.argv[2] || 'mcp_reel_visual.html');
  const out = path.resolve(process.argv[3] || 'cover.png');
  const settle = Number(process.argv[4] || 3600);   // ms into beat 1 (settled, before it transitions)

  const browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: '#hint{display:none!important}#safe{display:none!important}#guide{display:none!important}',
  }).catch(() => {});
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {});
  await page.waitForTimeout(settle);
  await page.screenshot({ path: out });
  await browser.close();
  console.log('COVER=' + out);
})().catch((e) => { console.error(e); process.exit(1); });
