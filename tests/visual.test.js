// Visual check: practice trumpet, club trumpet, staff barlines, solo close-up.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
  await p.evaluate(() => __nz.begin({ bot: 'perfect', start: -4 }));
  await p.waitForTimeout(5200); await p.screenshot({ path: require('path').resolve(__dirname, '..', 'shots') + '/v7_practice.png' });
  await p.evaluate(() => __nz.begin({ club: true, bot: 'perfect', start: -8 }));
  await p.waitForTimeout(9000); await p.screenshot({ path: require('path').resolve(__dirname, '..', 'shots') + '/v7_club.png' });
  await p.waitForTimeout(25000);  // solo starts ~beat 48 => ~32s after begin; close-up ~1.1s later
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(700); const c = await p.evaluate(() => __nz.cut); if (c === 'full') break; }
  await p.screenshot({ path: require('path').resolve(__dirname, '..', 'shots') + '/v7_closeup.png' });
  console.log('cut', await p.evaluate(() => __nz.cut), 'seg', await p.evaluate(() => __nz.segKey), errs.join('|') || 'noerr');
  await b.close();
})();
