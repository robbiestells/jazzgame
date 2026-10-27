const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const run = async (name, opts, shots, wait, vp) => {
    const p = await b.newPage({ viewport: vp || { width: 1280, height: 720 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(500);
    await p.evaluate(o => __nz.begin(o), opts);
    let t = 0;
    for (const [at, f] of shots) { await p.waitForTimeout((at - t) * 1000); t = at; await p.screenshot({ path: require('path').resolve(__dirname, '..', 'shots') + `/${name}_${f}.png` }); }
    await p.waitForTimeout((wait - t) * 1000);
    console.log(name, JSON.stringify(await p.evaluate(() => ({ ph: __nz.phase, beat: +__nz.beat.toFixed(1), c: __nz.counts, rank: +__nz.rank.toFixed(2), solo: __nz.soloOn }))), errs.join('|') || 'noerr');
    await p.close();
  };
  // New timeline (start=-8, c0=-4): count(4) + perfA(8) + perfB(8) + comp(16) + perfA2(8) + perfB2(8) + solo(32) + headA(8) + headB(8) + tag(4) = 104 beats
  // SPB=0.577s; screenshots in seconds from page.evaluate(begin).
  // beat 24 = mid-comp (16+8=beat20@ctx+28b=16.2s); beat 52 = mid-solo (48+4=beat52); beat 82=head
  await run('club', { club: true, bot: 'perfect', start: -8 }, [[10,'perf'],[20,'comp'],[37,'solo_start'],[55,'mid_solo'],[78,'head']], 95);
  await run('tap', { club: true, bot: 'tap' }, [[7,'tapnotes']], 12);
  await run('endpoor', { club: true, bot: 'none', start: -8 }, [], 70);
  await b.close();
})();
