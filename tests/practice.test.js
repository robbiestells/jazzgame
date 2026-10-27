const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(800);
  await p.screenshot({ path: require('path').resolve(__dirname, '..', 'shots') + '/n0.png' });
  await p.evaluate(() => window.__nz.begin({ bot: 'perfect' }));
  for (let i = 0; i < 9; i++) {
    await p.waitForTimeout(8000);
    const s = await p.evaluate(() => ({ ph: __nz.phase, beat: +__nz.beat.toFixed(1), sc: __nz.sceneNow, clean: __nz.clean, round: __nz.round, c: __nz.counts, rank: +__nz.rank.toFixed(2) }));
    console.log(JSON.stringify(s));
    if (i === 1) await p.screenshot({ path: require('path').resolve(__dirname, '..', 'shots') + '/n1.png' });
    if (i === 4) await p.screenshot({ path: require('path').resolve(__dirname, '..', 'shots') + '/n2.png' });
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
