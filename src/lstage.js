/* ---------- layered 2D stage: painted room, posed bodies, hand sprites, animated faces ---------- */
const LS = { root: null, ch: {}, faces: {}, ready: false, last: {} };
const LSCFG = {   // design space 1600x900; body boxes are 1024-unit squares scaled to size S
  tomas: { cx: 250, bottom: 705, S: 560 },
  trump: { cx: 640, bottom: 790, S: 660 },
  ines:  { cx: 1010, bottom: 705, S: 560 },
  rafa:  { cx: 1350, bottom: 710, S: 560 }
};
function lsImg(cls, src) { const i = document.createElement('img'); i.className = cls; i.src = src; i.alt = ''; i.draggable = false; return i; }
function lsSprite(parent, d, spec) {   // spec: at:[x,y] (body units), w (body units), anchor:[ax,ay], rot, flip
  const i = lsImg('sp', d.src), a = spec.anchor || [.5, .5];
  i.style.cssText = `left:${spec.at[0] / 10.24}%;top:${spec.at[1] / 10.24}%;width:${spec.w / 10.24}%;transform-origin:${a[0] * 100}% ${a[1] * 100}%;transform:translate(${-a[0] * 100}%,${-a[1] * 100}%) rotate(${spec.rot || 0}deg) scaleX(${spec.flip ? -1 : 1})`;
  i._spec = spec; i._a = a; parent.appendChild(i); return i;
}
function lsSet(i, patch) { const s = Object.assign(i._spec, patch), a = i._a; i.style.left = s.at[0] / 10.24 + '%'; i.style.top = s.at[1] / 10.24 + '%'; i.style.transform = `translate(${-a[0] * 100}%,${-a[1] * 100}%) rotate(${s.rot || 0}deg) scaleX(${s.flip ? -1 : 1})`; }
function lsBuild() {
  const host = document.getElementById('wideHost'), root = document.createElement('div'); root.id = 'lsHost'; root.innerHTML = '<div class="lsr"></div>'; host.appendChild(root);
  const st = document.createElement('style'); st.textContent = `#lsHost{position:absolute;inset:0;overflow:hidden;display:none;background:#04071a}#lsHost .lsr{position:absolute;left:0;top:0;width:1600px;height:900px;transform-origin:0 0}
#lsHost img{position:absolute;display:block;user-select:none;-webkit-user-drag:none;pointer-events:none}#lsHost .full{left:0;top:0;width:1600px;height:900px}
#lsHost .ch{position:absolute}#lsHost .ch .bd{left:0;top:0;width:100%;height:100%}#lsHost .sp{height:auto}#lsHost .lf{transform:translate(-50%,-50%);height:auto}
#lsHost .beam{mix-blend-mode:screen;opacity:.0;transform-origin:50% 0}#lsHost .smoke{mix-blend-mode:screen;opacity:.22}#lsHost .sparks{mix-blend-mode:screen;opacity:0;transform:translate(-50%,-50%)}#lsHost .notes{opacity:0;transform:translate(-50%,-50%)}`;
  document.head.appendChild(st);
  const r = root.firstChild; LS.root = root; LS.r = r;
  r.appendChild(lsImg('full', STAGE.wall));
  const bm = (k, x, y, w, flip) => { const i = lsImg('beam', STAGE.fx[k].src); i.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:auto;` + (flip ? 'transform:scaleX(-1)' : ''); r.appendChild(i); return i; };
  LS.beamA = bm('amber', 40, -10, 560); LS.beamB = bm('blue', 1000, -10, 560, true);
  r.appendChild(lsImg('full', STAGE.floor));
  LS.smoke = lsImg('smoke', STAGE.fx.smoke.src); LS.smoke.style.cssText = 'left:900px;top:330px;width:760px;height:auto'; r.appendChild(LS.smoke);
  const order = ['tomas', 'ines', 'rafa', 'trump'];
  for (const w of order) {
    const c = LSCFG[w], B = STAGE.body[w], g = document.createElement('div'); g.className = 'ch'; g.style.cssText = `left:${c.cx - c.S / 2}px;top:${c.bottom - c.S}px;width:${c.S}px;height:${c.S}px`; r.appendChild(g);
    const body = document.createElement('div'); body.style.cssText = 'position:absolute;inset:0'; g.appendChild(body);
    body.appendChild(lsImg('bd', B.src));
    const f = document.createElement('div'); f.style.cssText = 'position:absolute;inset:0'; body.appendChild(f);
    const ent = LS.ch[w] = { g, body, f, c };
    // nose + eyes + mouth overlay, mapped from the face rig onto this body's blank face
    const k = B.k, bx = 512, by = B.ey, ex = B.ex || 512, rey = B.rey;
    ent.map = (o, wid) => ({ x: bx + (o.x / 100 * 1024 - ex) * k, y: by + (o.y / 100 * 1024 - rey) * k, w: (wid !== undefined ? wid : o.w) / 100 * 1024 * k });
    const mk = o => { const m = ent.map(o), i = lsImg('lf', o.src); i.style.left = m.x / 10.24 + '%'; i.style.top = m.y / 10.24 + '%'; i.style.width = m.w / 10.24 + '%'; f.appendChild(i); return i; };
    mk(B.nose); ent.fe = [lsImg('lf', STAGE.wall), lsImg('lf', STAGE.wall)]; ent.fm = lsImg('lf', STAGE.wall); ent.fe.forEach(i => f.appendChild(i)); f.appendChild(ent.fm);
    LS.faces[w] = ent;
  }
  // instruments + hands per character
  const T = LS.ch.tomas, I = LS.ch.ines, R = LS.ch.rafa, P = LS.ch.trump;
  T.bass = lsSprite(T.g, STAGE.bass, { at: [720, 560], w: 900 * STAGE.bass.w / STAGE.bass.h, anchor: [.5, .5] });
  T.h1 = lsSprite(T.g, STAGE.hand.bh1, { at: [620, 570], w: 440 }); T.h2 = lsSprite(T.g, STAGE.hand.bcond, { at: [700, 430], w: 250 }); T.h2.style.display = 'none';
  I.piano = lsSprite(I.g, STAGE.piano, { at: [512, 905], w: 1180 });
  I.h1 = lsSprite(I.g, STAGE.hand.ih1, { at: [512, 720], w: 520 }); I.h2 = lsSprite(I.g, STAGE.hand.ih2, { at: [512, 760], w: 560 }); I.h2.style.display = 'none';
  R.congas = lsSprite(R.g, STAGE.congas, { at: [512, 880], w: 720 });
  R.h1 = lsSprite(R.g, STAGE.hand.rrest, { at: [512, 740], w: 600 }); R.h2 = lsSprite(R.g, STAGE.hand.rh1, { at: [512, 700], w: 560 }); R.h2.style.display = 'none';
  P.trumpet = lsSprite(P.g, STAGE.trumpet, { at: [560, 590], w: 400, anchor: [.94, .09], rot: 50, flip: true });
  P.h1 = lsSprite(P.g, STAGE.hand.th2, { at: [512, 700], w: 460 }); P.h2 = lsSprite(P.g, STAGE.hand.th1, { at: [560, 560], w: 380 }); P.h2.style.display = 'none';
  // foreground
  LS.crowd = lsImg('full', STAGE.crowd); LS.crowd.style.top = '135px'; r.appendChild(LS.crowd);
  LS.notes = lsImg('notes', STAGE.fx.notes.src); LS.notes.style.cssText = 'left:640px;top:300px;width:420px;height:auto'; r.appendChild(LS.notes);
  LS.sparks = lsImg('sparks', STAGE.fx.sparks.src); LS.sparks.style.cssText = 'left:640px;top:330px;width:300px;height:auto'; r.appendChild(LS.sparks);
  const fit = () => { const s = document.getElementById('stage').clientWidth / 1600; r.style.transform = `scale(${s})`; }; new ResizeObserver(fit).observe(document.getElementById('stage')); fit();
  const ch = document.getElementById('closeHost'); LS.cu = lsImg('cuimg', RIGS.trump.play);
  const st2 = document.createElement('style'); st2.textContent = '#closeHost{position:relative;background:radial-gradient(circle at 40% 35%,#2f4fd0,#0d1440 75%)}#closeHost>svg{display:none}#closeHost .cuimg{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:35% 20%;transform-origin:40% 30%;user-select:none}'; document.head.appendChild(st2); ch.appendChild(LS.cu);
  LS.ready = true;
}
function lsFace(w, eye, mouth) {
  const e = LS.faces[w]; if (!e) return; const R = RIGS[w];
  [0, 1].forEach(k => { const o = R.eyes[eye * 2 + k], m = e.map(o), i = e.fe[k]; i.src = o.src; i.style.left = m.x / 10.24 + '%'; i.style.top = m.y / 10.24 + '%'; i.style.width = m.w / 10.24 + '%'; });
  const o = R.mouths[mouth], m = e.map(o), i = e.fm; i.src = o.src; i.style.left = m.x / 10.24 + '%'; i.style.top = m.y / 10.24 + '%'; i.style.width = m.w / 10.24 + '%';
}
function lsUpdate(tms, pos, sw, sw2, amp, lean, playing, hitEnv) {
  if (!LS.ready) return;
  const T = LS.ch.tomas, I = LS.ch.ines, R = LS.ch.rafa, P = LS.ch.trump, m = S.mood;
  const bob = (e, ph, a, rot) => { e.body.style.transform = `translateY(${(-Math.abs(Math.sin((S.beat || tms / 1000 / SPB) * Math.PI + ph)) * a * amp).toFixed(1)}px) rotate(${(rot).toFixed(2)}deg)`; e.body.style.transformOrigin = '50% 90%'; };
  bob(T, 0, 3, sw2 * amp * .5); bob(I, .7, 2, sw * amp * .5); bob(R, 1.4, 4, sw * amp * .7); bob(P, .3, 4, lean * .35 + (playing ? Math.sin(tms / 160) * .8 : 0));
  const pl = (e, k) => { const env = hitEnv(k); return env; };
  const pluck = hitEnv([1.5, 3, 3.5], .15) > .45, key = hitEnv([.5, 1, 2.5, 3, 3.5], .1) > .35, slap = hitEnv([.5, 1, 2, 2.5, 3, 3.5], .09) > .4;
  const solo = S.segK === 'solo';
  T.h1.style.display = solo ? 'none' : ''; T.h2.style.display = solo ? '' : 'none'; lsSet(T.h1, { at: [620, pluck ? 590 : 570] }); lsSet(T.h2, { rot: Math.sin(tms / 260) * 6 });
  I.h1.style.display = key ? 'none' : ''; I.h2.style.display = key ? '' : 'none';
  R.h1.style.display = slap ? 'none' : ''; R.h2.style.display = slap ? '' : 'none';
  P.h1.style.display = playing ? 'none' : ''; P.h2.style.display = playing ? '' : 'none';
  lsSet(P.trumpet, playing ? { at: [512, 292], rot: 6 + (S.playMidi ? -(S.playMidi - 60) * .6 : 0), flip: true } : { at: [540, 620], rot: 62, flip: true });
  const hot = S.heat > .6 || m === 'ecstatic';
  LS.beamA.style.opacity = (.25 + S.heat * .5 + (playing ? .15 : 0)).toFixed(2); LS.beamB.style.opacity = (.2 + S.heat * .45).toFixed(2);
  LS.beamA.style.transform = `rotate(${(Math.sin(tms / 1700) * 2).toFixed(2)}deg)`; LS.beamB.style.transform = `scaleX(-1) rotate(${(Math.sin(tms / 1900 + 1) * 2).toFixed(2)}deg)`;
  LS.smoke.style.transform = `translateX(${(Math.sin(tms / 4000) * 40).toFixed(0)}px)`;
  LS.crowd.style.transform = `translateY(${(-Math.abs(sw) * 5 * amp / 2).toFixed(1)}px)`;
  LS.notes.style.opacity = playing ? (.65 + .25 * Math.sin(tms / 120)).toFixed(2) : 0; LS.notes.style.transform = `translate(-50%,${(-((tms / 12) % 70)).toFixed(0)}px)`;
  if (LS.cu) LS.cu.style.transform = `scale(${(1.04 + (playing ? .03 * Math.abs(sw) : 0) + S.heat * .03).toFixed(3)}) rotate(${(sw2 * .4).toFixed(2)}deg)`;
  LS.sparks.style.opacity = hot ? (.55 + .35 * Math.sin(tms / 140)).toFixed(2) : 0;
}
