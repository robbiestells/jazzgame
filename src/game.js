'use strict';
(() => {
const $ = id => document.getElementById(id);
const BCOL = ['#e0566a', '#f2c94c', '#3fc1a5', '#9b7de6'];
const BKEY = ['D', 'F', 'J', 'K'];
const CODE2B = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };
const DIFF = {
  easy:   { w: [.09, .15, .22],  thr: .30 },
  medium: { w: [.075, .13, .19], thr: .40 },
  hard:   { w: [.06, .11, .16],  thr: .50 }
};
const NEED = { easy: .5, medium: .6, hard: .7 };      // fraction of a held note you must hold
const DELTA = { cool: .05, good: .025, bad: -.05, miss: -.07 };
const MOODS = { worried: '#ff7a8a', encourage: '#7aa5ff', groove: '#ffb84d', ecstatic: '#fff2a8' };
// Comp backing notes: [beatOffset, dur, step, acc] — 8 half-notes over 16 beats (Am7|Dm7|E7|Am7)
const COMP_LINE = [
  [0, 2, 5, 0], [2, 2, 7, 0],    // Am7: A4 (btn1), C5 (btn2)
  [4, 2, 1, 0], [6, 2, 5, 0],    // Dm7: F4 (btn0), A4 (btn1)
  [8, 2, 2, 0], [10, 2, 4, 0],   // E7:  G4 (btn0), B4 (btn0)
  [12, 2, 5, 0], [14, 2, 9, 0],  // Am7: A4 (btn1), E5 (btn3)
];
const SFX = { worried: '¡AY, AY!', encourage: '¡ÁNIMO!', groove: '¡SABROSO!', ecstatic: '¡CANDELA!' };
const GL = { black: '', half: '', whole: '', flagU: '', flagD: '', sharp: '', gclef: '', rq: '', r8: '', rh: '', rw: '' };
const tsGlyph = n => String.fromCharCode(0xE080 + n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const mod = (a, n) => ((a % n) + n) % n;

/* ---------- settings ---------- */
let cfg = { mode: 'easy', offset: 0, vol: 85, fx: !matchMedia('(prefers-reduced-motion: reduce)').matches };
try { Object.assign(cfg, JSON.parse(localStorage.getItem('nz.cfg') || '{}')); } catch (e) {}
const saveCfg = () => { try { localStorage.setItem('nz.cfg', JSON.stringify(cfg)); } catch (e) {} };
const L = () => cfg.offset / 1000;   // seconds between "scheduled" and "heard" (headphones)

/* ---------- state ---------- */
const S = window.__nz = {
  phase: 'title', t0: 0, ti: 0, beat: -4, ctxBeat: -4, now: 0, layout: [], events: [], targets: [], lead: [], leadI: 0, played: [],
  rank: .5, counts: { cool: 0, good: 0, bad: 0, miss: 0 }, streak: 0, soloOn: null, endBeat: 1e9, clean: 0, round: 0,
  heat: 0, heatSum: 0, soloT: 0, hist: [], stem: { bass: 1, keys: 1, perc: 1, horns: 0 }, mood: 'groove',
  down: [false, false, false, false], voices: [null, null, null, null], holds: [null, null, null, null], octKey: false, octLock: false, octDnKey: false, octDnLock: false,
  pops: [], hitFx: null, cut: '', cutUntil: 0, speed: 0, segKey: '', bot: null, lastSay: 0, lastReact: 0, lastNote: -9, playMidi: 69, fontReady: false, sceneNow: ''
};

/* ---------- DOM ---------- */
const stage = $('stage'), sc = { cv: $('score'), g: $('score').getContext('2d'), w: 0, h: 0 };
$('wideHost').innerHTML = wideSVG() + practiceSVG();
$('closeHost').innerHTML = closeSVG();
lsBuild();
FX.init($('fx'));
const el = {}; ['c-bass', 'bass-body', 'bass-head', 'bass-armR', 'bass-armL', 'c-piano', 'piano-torso', 'piano-head', 'piano-arm', 'c-perc', 'perc-body', 'perc-head', 'perc-armL', 'perc-armR',
  'c-trump', 'trump-body', 'trump-head', 'trump-arm', 'trump-horn', 'valves', 'bellGlow', 'neon', 'ribbons', 'crowd', 'crowd-hands',
  'c-ptrump', 'p-trump-head', 'p-trump-horn', 'p-valves', 'p-bellGlow', 'p-tomas-b',
  'cu-all', 'cu-flame', 'cu-glint', 'cu-head', 'cu-eye-open', 'cu-eye-shut', 'cu-brow', 'cu-cheek', 'cu-horn', 'cu-flare', 'pv0', 'pv1', 'pv2', 'sw0', 'sw1'].forEach(id => el[id] = $(id));
const T = (id, s) => el[id].setAttribute('transform', s);
const pads = [...document.querySelectorAll('.pad[data-b]')];
const facesEl = $('faces'), stemsEl = $('stems');
['tomas', 'ines', 'rafa'].forEach(w => { const d = document.createElement('div'); d.className = 'face'; d.id = 'face-' + w; d.innerHTML = '<div class="fx"></div><span>' + CAST[w].name + '</span>'; facesEl.appendChild(d); });
/* animated faces: base art + swappable eye / mouth layers, one rig per character */
const PORTRAITS = {};
for (const w of ['tomas', 'ines', 'rafa']) { const R = RIGS[w]; PORTRAITS[w] = { worried: { head: R.hold, tall: R.play }, encourage: { head: R.hold, tall: R.hold }, groove: { head: R.hold, tall: R.play }, ecstatic: { head: R.hold, tall: R.play } }; }
PORTRAITS.trump = { ecstatic: { head: RIGS.trump.hold, tall: RIGS.trump.play } };
const RG = {}, TALK = { who: '', until: 0 }, PL = { hitT: 0, hitR: '' };
function mkRig(fx, key, i) {
  fx.classList.add('pl'); fx.innerHTML = '<div class="rig"><img class="rb" alt="" draggable="false"><img class="re" alt="" draggable="false"><img class="re" alt="" draggable="false"><img class="rm" alt="" draggable="false"></div>';
  const root = fx.firstChild, k = root.children; k[0].src = RIGS[key].base;
  RG[key] = { root, im: [k[1], k[2], k[3]], key: '', blinkAt: 800 * i, blinkEnd: 0, ph: i * .37 };
}
['tomas', 'ines', 'rafa'].forEach((w, i) => mkRig($('face-' + w).firstChild, w, i + 1));
{ const d = document.createElement('div'); d.className = 'face'; d.id = 'face-player'; d.innerHTML = '<div class="fx"></div><span>You · Trumpet</span>'; facesEl.appendChild(d); mkRig(d.firstChild, 'trump', 0); }
function rigPlace(img, o) { img.src = o.src; img.style.left = o.x + '%'; img.style.top = o.y + '%'; img.style.width = o.w + '%'; }
function rigTick(ts) {
  if (S.phase === 'title') return;
  const m = S.mood || 'groove', baseEye = { worried: 1, encourage: 0, groove: 2, ecstatic: 4 }[m] || 0, idleMouth = { worried: 1, encourage: 0, groove: 0, ecstatic: 4 }[m] || 0;
  for (const w in RG) {
    const r = RG[w]; let eye = baseEye, mouth = idleMouth;
    if (ts > r.blinkAt) { r.blinkAt = ts + 2200 + Math.random() * 3200; r.blinkEnd = ts + 130; }
    if (ts < r.blinkEnd && eye !== 4) eye = 3;
    if (w === 'trump') { if (ts - PL.hitT < 320) { if (PL.hitR === 'bad') { mouth = 5; eye = 1; } else mouth = 3; } }
    else if (TALK.who === w && ts < TALK.until) { mouth = [1, 2, 3, 2, 1, 2, 0, 2][Math.floor(ts / 105) % 8]; if (m === 'ecstatic') eye = 4; }
    const key = eye + ',' + mouth; (S.faceKey || (S.faceKey = {}))[w] = key;
    if (key !== r.key) { r.key = key; const R = RIGS[w]; rigPlace(r.im[0], R.eyes[eye * 2]); rigPlace(r.im[1], R.eyes[eye * 2 + 1]); rigPlace(r.im[2], R.mouths[mouth]); lsFace(w, eye, mouth); }
    const bob = S.phase === 'play' ? Math.sin(((S.beat || 0) + r.ph) * Math.PI * 2) : 0;
    r.root.style.transform = 'translateY(' + (bob * 1.6).toFixed(2) + '%) rotate(' + (bob * (m === 'ecstatic' ? 2.2 : 1)).toFixed(2) + 'deg)';
  }
}
[['bass', 'Bass'], ['keys', 'Keys'], ['perc', 'Perc'], ['horns', 'Horns']].forEach(([k, n]) => { const d = document.createElement('div'); d.className = 'stem on'; d.id = 'stem-' + k; d.innerHTML = '<i></i>' + n; stemsEl.appendChild(d); });
const meterEl = document.querySelector('.hud.meter');

/* ---------- audio-clock helpers ---------- */
function evHeard(ts) {
  const c = synth.ctx; if (!c) return 0;
  if (c.state !== 'running') return c.currentTime;
  let o = null; try { o = c.getOutputTimestamp(); } catch (e) {}
  if (o && o.contextTime > 0 && o.performanceTime > 0) return o.contextTime + (ts - o.performanceTime) / 1000;
  return c.currentTime - (c.outputLatency || c.baseLatency || 0) - (performance.now() - ts) / 1000;
}
const heardNow = () => evHeard(performance.now());

/* ---------- timeline ---------- */
function resetSong(startBeat, club) {
  Object.assign(S, { layout: [], events: [], targets: [], lead: [], leadI: 0, pianoLine: [], pianoLineI: 0, played: [], rank: .5, counts: { cool: 0, good: 0, bad: 0, miss: 0 }, streak: 0, soloOn: null, soloDone: false, endBeat: 1e9,
    heat: 0, heatSum: 0, soloT: 0, hist: [], pops: [], hitFx: null, cut: '', cutUntil: 0, speed: 0, segKey: '', lastSay: 0, mood: 'groove', moodSet: false, startBeat,
    clean: 0, round: 0, roundStart: 0, roundDecided: true, clubC0: null, soloAt: 0, holds: [null, null, null, null], botG: -1, sceneNow: '', clubStarted: false, compDone: false });
  if (club) startClub(-4);
  else { addSeg({ k: 'count', a: -4, b: 0, cb: 0, scene: 'practice', card: true }); startRound(0); }
  updateTakes();
}
function startRound(R) {
  S.round++; S.roundStart = R; S.roundDecided = false;
  // Each call/resp pair shares the same harmonic start so the player echoes over identical chords.
  // Hook A starts on Am7 (bar 0); hook B starts on E7 (bar 2 = offset 8 beats from cb).
  addSeg({ k: 'call', a: R,      b: R + 8,  cb: R,      hook: 'A', scene: 'practice', round: S.round });
  addSeg({ k: 'resp', a: R + 8,  b: R + 16, cb: R + 8,  hook: 'A', scene: 'practice', round: S.round });
  addSeg({ k: 'call', a: R + 16, b: R + 24, cb: R + 8,  hook: 'B', scene: 'practice', round: S.round });
  addSeg({ k: 'resp', a: R + 24, b: R + 32, cb: R + 16, hook: 'B', scene: 'practice', round: S.round });
}
function startClub(c0) {
  S.clubC0 = c0; const cb = c0 + 4;
  addSeg({ k: 'count', a: c0,      b: c0 + 4,  cb, scene: 'club', card: true });
  // First hook
  addSeg({ k: 'perf',  a: c0 + 4,  b: c0 + 12, cb, hook: 'A', scene: 'club' });
  addSeg({ k: 'perf',  a: c0 + 12, b: c0 + 20, cb, hook: 'B', scene: 'club' });
  // Ensemble solo: Inés solos on piano, player comps backing chords (16 beats, bar 0 of cycle)
  addSeg({ k: 'comp',  a: c0 + 20, b: c0 + 36, cb, scene: 'club' });
  // Second hook — same harmony as first (mod 4 brings us back to bar 0 and 2)
  addSeg({ k: 'perf',  a: c0 + 36, b: c0 + 44, cb, hook: 'A', scene: 'club' });
  addSeg({ k: 'perf',  a: c0 + 44, b: c0 + 52, cb, hook: 'B', scene: 'club' });
  S.soloAt = c0 + 52;
}
function extendClub(solo) {
  const s = S.soloAt, cb = S.clubC0 + 4; let b = s;
  if (solo) { addSeg({ k: 'solo', a: s, b: s + 32, cb, scene: 'club' }); b = s + 32; }
  else { addSeg({ k: 'break', a: s, b: s + 16, cb, scene: 'club' }); b = s + 16; BREAK_LINE.forEach(n => S.lead.push({ beat: s + n[0], dur: n[1], midi: n[2] })); }
  addSeg({ k: 'head', a: b, b: b + 8, cb, hook: 'A', scene: 'club' }); addSeg({ k: 'head', a: b + 8, b: b + 16, cb, hook: 'B', scene: 'club' });
  addSeg({ k: 'tag', a: b + 16, b: b + 20, cb, scene: 'club' }); S.endBeat = b + 22;
}
function addSeg(s) {
  S.layout.push(s);
  if (s.k === 'comp') {
    // Generate player backing targets and queue the piano solo line
    COMP_LINE.forEach(n => {
      const [bo, dur, step, acc] = n;
      const o = { beat: s.a + bo, dur, step, acc: acc || 0, rest: false, kind: 'play', seg: s, state: null, round: s.round };
      o.midi = stepToMidi(step, acc || 0); o.button = stepToButton(step); o.hold = true;
      S.events.push(o); S.targets.push(o);
    });
    PIANO_SOLO_LINE.forEach(n => S.pianoLine.push({ beat: s.a + n[0], dur: n[1], midi: n[2] }));
    return;
  }
  if (!s.hook) return;
  const kind = s.k === 'call' ? 'call' : 'play', list = [];
  HOOKS[s.hook].forEach(n => {
    const rest = n[2] === R, o = { beat: s.a + n[0], dur: n[1], step: rest ? null : n[2], acc: n[3] || 0, rest, kind, seg: s, state: null, round: s.round };
    if (!rest) { o.midi = stepToMidi(o.step, o.acc); o.button = stepToButton(o.step); o.hold = o.dur >= 1; }
    list.push(o); S.events.push(o);
    if (kind === 'play' && !rest) S.targets.push(o);
    if (kind === 'call' && !rest) S.lead.push({ beat: o.beat, dur: o.dur, midi: o.midi });
  });
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1];
    if (!a.rest && !b.rest && a.dur === .5 && b.dur === .5 && (a.beat - s.a) % 1 === 0 && Math.abs(b.beat - a.beat - .5) < 1e-6) { a.beam = 1; b.beam = 2; a.pair = b; b.pair = a; }
  }
}
const segAt = b => { for (const s of S.layout) if (b >= s.a - 1e-9 && b < s.b - 1e-9) return s; return null; };
const chordFor = (b, seg) => { seg = seg || segAt(b) || S.layout[S.layout.length - 1]; const cb = seg ? seg.cb : 0; return CHORDS[mod(Math.floor((b - cb) / 4), 4)]; };
const rankBand = r => r < .25 ? 'Awful' : r < .5 ? 'Bad' : r < .75 ? 'Good' : 'Cool';
function updateTakes() { document.querySelectorAll('#takes i').forEach((e, i) => e.classList.toggle('on', i < S.clean)); }

/* ---------- scheduler ---------- */
function playTick(ti) {
  const b = ti / 4, t = S.t0 + b * SPB, seg = segAt(b); if (!seg) return;
  while (S.leadI < S.lead.length && S.lead[S.leadI].beat < b + .25 - 1e-6) {
    const n = S.lead[S.leadI++]; if (n.beat < b - 1e-6) continue;
    const tt = S.t0 + n.beat * SPB, h = synth.horn(tt, n.midi, .95, 'lead', { mute: true });
    h.release(tt + n.dur * SPB * .9, .1);
  }
  while (S.pianoLineI < S.pianoLine.length && S.pianoLine[S.pianoLineI].beat < b + .25 - 1e-6) {
    const n = S.pianoLine[S.pianoLineI++]; if (n.beat < b - 1e-6) continue;
    synth.epiano(S.t0 + n.beat * SPB, n.midi, n.dur * SPB * .88, 0.95);
  }
  if (seg.k === 'count') { if (Number.isInteger(b)) synth.click(t, Math.abs(b - seg.a) < 1e-6); return; }
  const rel = b - seg.cb, pos = mod(rel, 4), bar = mod(Math.floor(rel / 4), 4), ch = CHORDS[bar], nx = CHORDS[(bar + 1) % 4], st = S.stem, at = p => Math.abs(pos - p) < 1e-6;
  if (seg.k === 'tag') {
    if (Math.abs(b - seg.a) < 1e-6) {
      synth.bass(t, 33, 3, 1); synth.bass(t, 45, 3, .5);
      [57, 60, 64, 67, 71].forEach((m, i) => synth.epiano(t + i * .012, m, 3, .8));
      [72, 76, 79].forEach(m => synth.horn(t, m, .9, 'horns', { stab: true }).release(t + SPB * 1.4, .25));
      synth.clave(t, 1); synth.conga(t, 'open', 1);
    }
    return;
  }
  if (seg.k === 'gap') { if (at(0) && Math.abs(b - seg.a) < 1e-6) synth.bass(t, 33, SPB * 1.6, .8); return; }
  if (at(1.5)) synth.bass(t, ch.root, SPB * .8, .95);
  if (at(3)) synth.bass(t, ch.fifth, SPB * .8, .85);
  if (at(3.5)) synth.bass(t, nx.root, SPB * 1.2, .8);
  if (at(0) && seg.hook === 'A') { const pv = segAt(b - .25); if (pv && pv.k === 'count') synth.bass(t, ch.root, SPB * 1.2, .8); }
  if (st.keys > .04) {
    const K = { .5: [0, 2], 1: [1, 3], 2.5: [0, 2, 3], 3: [1, 2], 3.5: [0, 3] }, ks = K[pos];
    if (ks) ks.forEach((i, j) => synth.epiano(t + j * .008, ch.voice[i], SPB * .45, .75));
  }
  if (st.perc > .04) {
    const m = mod(rel, 8);
    if ([0, 1.5, 3, 5, 6].some(p => Math.abs(m - p) < 1e-6)) synth.clave(t, .85);
    const C = { .5: ['mute', .4], 1: ['slap', .9], 2: ['mute', .45], 2.5: ['open', .7], 3: ['open', .85], 3.5: ['mute', .4] };
    if (C[pos]) synth.conga(t, C[pos][0], C[pos][1]);
    if (pos % .5 === 0) synth.shaker(t, Math.abs(pos % 1) < 1e-6 ? .6 : 1);
    if (seg.k === 'solo' && S.heat > .6 && (at(3.75) || at(3.25))) synth.conga(t, 'slap', .55);
  }
  if (st.horns > .04 && (bar % 2 === 1) && (at(2.5) || at(3.5)))
    ch.voice.slice(1).forEach(m => synth.horn(t, m + 12, .8, 'horns', { stab: true }).release(t + SPB * .28, .08));
}
let schedTimer = 0;
function sched() {
  if (S.phase !== 'play') return;
  const c = synth.ctx;
  while (S.t0 + (S.ti / 4) * SPB < c.currentTime + .14 && S.ti / 4 < S.endBeat) { playTick(S.ti); S.ti++; }
}

/* ---------- stems, mood, reactions ---------- */
function stemTargets(seg) {
  const k = seg ? seg.k : 'count', r = S.rank; let bass = 1, keys = 1, perc = 1, horns = 0;
  if (k === 'count') { bass = 0; keys = 0; perc = 0; }
  else if (k === 'call' || k === 'gap') { keys = 0; perc = .55; }
  else if (k === 'resp') { keys = .5; perc = .8; }
  else if (k === 'perf' || k === 'head' || k === 'solo' || k === 'break') {
    keys = r < .2 ? 0 : r < .45 ? .45 : 1; perc = r < .12 ? .45 : 1;
    horns = (r >= .72 || k === 'break' || (k === 'solo' && S.heat > .55)) ? 1 : 0;
  }
  else if (k === 'comp') { keys = 1; perc = 1; horns = r >= .55 ? .6 : 0; }
  if (k === 'tag') { bass = keys = perc = horns = 1; }
  return { bass, keys, perc, horns };
}
function computeMood(seg) {
  const k = seg ? seg.k : '';
  if (k === 'solo') return S.heat > .62 ? 'ecstatic' : S.heat > .3 ? 'groove' : (S.rank < .3 ? 'worried' : 'encourage');
  if (k === 'comp') return 'ecstatic';
  if (k === 'break' || k === 'tag') return S.rank < .25 ? 'worried' : S.rank < .5 ? 'encourage' : 'groove';
  const r = S.rank; return r < .25 ? 'worried' : r < .5 ? 'encourage' : r < .75 ? 'groove' : 'ecstatic';
}
/* character portraits from the concept art; mood shows through color, pose tilt, sweat and sparkle */
const PBG = { tomas: ['#3a52b0', '#18255f'], ines: ['#a1478a', '#4a1f52'], rafa: ['#2aa28f', '#0f4a50'], trump: ['#2f4fd0', '#0d1440'] };
function portrait(who, mood, kind = 'head', bg = true) {
  const c = PBG[who], fx = mood === 'worried' ? '<i class="psw"></i>' : mood === 'ecstatic' ? '<i class="psp"></i><i class="psp b"></i>' : '';
  const set = PORTRAITS[who][mood] || PORTRAITS[who].groove || Object.values(PORTRAITS[who])[0];   // a drawn face per mood
  return `<div class="pf m-${mood}${bg ? '' : ' nobg'}" style="--b0:${c[0]};--b1:${c[1]}"><img src="${set[kind]}" alt="" draggable="false">${fx}</div>`;
}
let reactTimer = 0;
function showReact(m) {
  const now = performance.now(); if (now - S.lastReact < 3500 || !cfg.fx) return;
  if (S.cut || stage.classList.contains('cine') || $('panels').classList.contains('on')) return;   // never stack on another animation S.lastReact = now;
  const who = S.sceneNow === 'practice' ? 'tomas' : ['tomas', 'ines', 'rafa'][Math.floor(Math.random() * 3)], r = $('react');
  r.querySelector('.rface').innerHTML = portrait(who, m, 'tall', false); r.querySelector('.rsfx').textContent = SFX[m];
  r.className = 'hud react m-' + m; void r.offsetWidth; r.classList.add('on');
  clearTimeout(reactTimer); reactTimer = setTimeout(() => r.classList.remove('on'), 1700);
}
function setMood(m) {
  if (m === S.mood && S.moodSet) return; const first = !S.moodSet; S.mood = m; S.moodSet = true;
  ['tomas', 'ines', 'rafa'].forEach(w => $('face-' + w).style.setProperty('--ring', MOODS[m]));
  $('face-player').style.setProperty('--ring', MOODS[m]);
  if (S.phase === 'play' && !first) {
    showReact(m);
    const now = performance.now();
    if (now - S.lastSay > 4500) {
      const Ls = VOICE_MOOD[m];
      sayId(S.sceneNow === 'practice' ? VOICE_PRACTICE[m] : Ls[Math.floor(Math.random() * Ls.length)], 2600);
    }
  }
}
let sayTimer = 0, voiceEl = null;
const b64Buf = u => { const b = atob(u.slice(u.indexOf(',') + 1)), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a.buffer; };
function sayId(id, ms) {
  const l = VOICE_LINES[id]; say(l[0], l[1], ms); TALK.who = l[0]; TALK.until = performance.now() + Math.min(ms || 2600, 2200);
  if (cfg.voice === false || !synth.ctx || !VOICE_DATA[id]) return;
  const play = buf => {
    if (voiceEl) { try { voiceEl.stop(); } catch (e) {} }
    const s = synth.ctx.createBufferSource(), g = synth.ctx.createGain(); g.gain.value = 1.6; s.buffer = buf; s.connect(g); g.connect(synth.bus.voice); s.start(); voiceEl = s;
    TALK.until = performance.now() + buf.duration * 1000; synth.duckFor(buf.duration + .1); S.voicePlays = (S.voicePlays || 0) + 1;
  };
  synth.voiceBuf = synth.voiceBuf || {};
  if (synth.voiceBuf[id]) return play(synth.voiceBuf[id]);
  // decode without fetch() so a locked-down page can't block it; callback form works on older Safari too
  const done = buf => { synth.voiceBuf[id] = buf; play(buf); }, fail = e => { S.voiceErr = String(e && e.message || e); };
  try { const r = synth.ctx.decodeAudioData(b64Buf(VOICE_DATA[id]), done, fail); if (r && r.catch) r.catch(fail); } catch (e) { fail(e); }
}
function say(who, text, ms) {
  $('subWho').textContent = CAST[who].name + ' · ' + CAST[who].role; $('subLine').textContent = text; $('sub').classList.add('on');
  S.lastSay = performance.now(); clearTimeout(sayTimer); sayTimer = setTimeout(() => $('sub').classList.remove('on'), ms || 2600);
}
function setCut(mode) {
  if (!cfg.fx || S.sceneNow === 'practice') mode = '';
  const cine = cfg.fx && S.sceneNow === 'club' && (mode === 'full' || (S.segKey.startsWith('solo') || S.segKey.startsWith('tag') || S.segKey.startsWith('break') || S.segKey.startsWith('comp')));
  stage.classList.toggle('cine', cine);
  if (mode) $('react').classList.remove('on');
  if (S.cut === mode) return; S.cut = mode; $('closeWrap').className = mode;
  if (mode) { const f = $(mode === 'full' ? 'flash' : 'slash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
}
let panelTimer = 0;
function showPanels(sfx, ms) {
  if (!cfg.fx || S.sceneNow !== 'club') return;
  const m = S.mood, strip = f => f.replace(/ clip-path="url\(#fc[^)]*\)"/g, '').replace(/(id="|url\(#)(fb|fc)/g, '$1P$2').replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
  $('panels').innerHTML = [portrait('ines', m, 'tall'), portrait('tomas', m, 'tall'), portrait('trump', 'ecstatic', 'tall'), portrait('rafa', m, 'tall')].map(s => '<div class="pn">' + s + '</div>').join('') + '<div class="psfx">' + sfx + '</div>';
  $('react').classList.remove('on');
  const p = $('panels'); p.classList.remove('on'); void p.offsetWidth; p.classList.add('on');
  FX.emit(14, 'spark'); clearTimeout(panelTimer); panelTimer = setTimeout(() => p.classList.remove('on'), ms || 1500);
}
let cardTimer = 0;
function showCard(small, big) { $('scSmall').textContent = small; $('scBig').textContent = big; $('sceneCard').classList.add('show'); clearTimeout(cardTimer); cardTimer = setTimeout(() => $('sceneCard').classList.remove('show'), 1800); }
function setScene(scn) {
  if (S.sceneNow === scn) return; S.sceneNow = scn;
  const v = document.querySelectorAll('#wideHost svg.view'); v[0].style.display = 'none'; LS.root.style.display = scn === 'club' ? 'block' : 'none'; v[1].style.display = scn === 'practice' ? '' : 'none';
  stage.classList.toggle('practice', scn === 'practice');
  $('where').textContent = scn === 'practice' ? 'Scene 1 · The practice room' : 'Scene 2 · The Blue Room · ' + cfg.mode;
  $('btnSkip').hidden = scn !== 'practice'; $('takes').style.display = scn === 'practice' ? 'block' : 'none'; meterEl.style.display = scn === 'club' ? '' : 'none';
  $('face-ines').style.display = $('face-rafa').style.display = scn === 'practice' ? 'none' : '';
  $('subWho').textContent = ''; if (scn === 'practice') setCut('');
}

/* ---------- input & judging ---------- */
const midiName = m => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'][m % 12] + (Math.floor(m / 12) - 1);
function midiToStep(m) {
  const oct = Math.floor(m / 12) - 1, pc = m % 12;
  const nat = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }, shp = { 1: [0, 1], 3: [1, 1], 6: [3, 1], 8: [4, 1], 10: [5, 1] };
  const [Lt, a] = pc in nat ? [nat[pc], 0] : shp[pc]; return { step: (oct - 4) * 7 + Lt - 2, acc: a };
}
function startVoice(b, midi, holdMs) {
  releaseVoice(b);
  const c = synth.ctx, h = synth.horn(c.currentTime + .002, midi, 1, 'player');
  const v = { h }; v.timer = setTimeout(() => releaseVoice(b), holdMs); S.voices[b] = v;
  S.lastNote = performance.now(); S.playMidi = midi;
}
function releaseVoice(b) { const v = S.voices[b]; if (!v) return; clearTimeout(v.timer); v.h.release(synth.ctx.currentTime, .1); S.voices[b] = null; }
function pop(text, col) { S.pops.push({ t: performance.now(), text, col }); if (S.pops.length > 6) S.pops.shift(); }
function addRank(d) { S.rank = clamp(S.rank + d, 0, 1); }
function downgrade(tg) {
  const old = tg.state; if (!old || old === 'miss') return;
  const nw = old === 'cool' ? 'good' : 'bad';
  S.counts[old]--; S.counts[nw]++; addRank(DELTA[nw] - DELTA[old]); tg.state = nw; tg.holdState = 'short'; S.streak = 0; pop('TOO SHORT', '#ff9a7a');
}
function releaseHold(b, tr) {
  const tg = S.holds[b]; if (!tg) return; S.holds[b] = null;
  if (tg.holdState !== 'active') return;
  if (tr - tg.pressT < NEED[cfg.mode] * tg.dur * SPB) downgrade(tg); else tg.holdState = 'ok';
}
const octShift = () => ((S.octKey || S.octLock) ? 12 : 0) - ((S.octDnKey || S.octDnLock) ? 12 : 0);
function pressAt(b, tp) {
  const beat = (tp - S.t0) / SPB, seg = segAt(beat), D = DIFF[cfg.mode], octave = octShift();
  // Find the nearest unjudged note in the timing window FIRST, whatever segment the press falls in.
  // A slightly early press on the first note of a section lands in the previous segment
  // (count-in, Tomás's call, the end of a solo); it must still count for that note.
  let best = null, bd = 9;
  for (const tg of S.targets) {
    if (tg.state) continue;
    const dt = Math.abs(tp - (S.t0 + tg.beat * SPB));
    if (dt <= D.w[2] && dt < bd) { best = tg; bd = dt; }
  }
  if (!best && seg && seg.k === 'solo') { soloPress(b, beat, octave); return; }
  {
    if (best) {
      let r = bd <= D.w[0] ? 'cool' : bd <= D.w[1] ? 'good' : 'bad', ok = true;
      if (cfg.mode === 'medium') ok = (b >> 1) === (best.button >> 1); else if (cfg.mode === 'hard') ok = b === best.button;
      if (!ok) r = 'bad';
      best.state = r; S.counts[r]++; addRank(DELTA[r]);
      S.streak = r === 'cool' ? S.streak + 1 : 0;
      pop(r.toUpperCase() + (ok ? '' : ' · wrong key'), r === 'cool' ? '#ffb84d' : r === 'good' ? '#7fe3c8' : '#ff7a8a'); S.hitFx = { t: performance.now(), r }; PL.hitT = performance.now(); PL.hitR = r;
      if (best.hold) { best.pressT = tp; best.holdState = 'active'; S.holds[b] = best; }
      startVoice(b, ok ? best.midi : BUTTON_PITCH[b], best.hold ? best.dur * SPB * 1400 + 250 : Math.max(140, best.dur * SPB * 900));
      if (S.streak === 4 && best.seg && best.seg.k !== 'resp') { S.cutUntil = beat + 2.2; setCut('inset'); FX.emit(10, 'spark'); }
      if (r === 'cool') FX.emit(2, 'note', FX.w * .5, FX.h * .55);
      return;
    }
  }
  startVoice(b, BUTTON_PITCH[b], 1800);
}
function soloPress(b, beat, octave) {
  const ch = chordFor(beat + .15), midi = ch.scale[b] + octave;   // snap slightly-early presses to the coming chord
  startVoice(b, midi, 4000);
  S.played.push({ beat, midi, b });
  const now = performance.now();
  S.hist.push({ beat, b, ms: now }); if (S.hist.length > 14) S.hist.shift();
  const g8 = Math.abs(beat * 2 - Math.round(beat * 2)) / 2, pocket = Math.max(0, 1 - g8 / .11);
  const vari = new Set(S.hist.slice(-8).map(h => h.b)).size / 4;
  const rate = S.hist.filter(h => now - h.ms < 1000).length, dens = rate > 7 ? Math.max(0, 1 - (rate - 7) * .25) : 1;
  const prev = S.hist.length > 1 ? S.hist[S.hist.length - 2].beat : beat - 4, space = beat - prev >= .9 ? 1 : 0;
  let echo = 0;
  if (S.hist.length >= 5) {
    const bs = S.hist.slice(-5).map(h => h.beat), iv = [1, 2, 3, 4].map(i => bs[i] - bs[i - 1]);
    for (const k of ['A', 'B']) {
      const on = HOOKS[k].filter(n => n[2] !== R).map(n => n[0]), ivs = on.slice(1).map((x, i) => x - on[i]);
      for (let i = 0; i + 4 <= ivs.length; i++) if (iv.every((v, j) => Math.abs(v - ivs[i + j]) < .18)) echo = 1;
    }
  }
  S.heat = clamp(S.heat + .02 + .04 * pocket * dens + .025 * vari * dens + .025 * space + .04 * echo, 0, 1);
  if (S.heat > .85 && S.cut !== 'full' && beat > S.cutUntil + 6) { S.cutUntil = beat + 3; setCut('full'); FX.emit(14, 'spark'); if (performance.now() - (S.lastPanel || 0) > 12000) { S.lastPanel = performance.now(); showPanels('¡CANDELA!', 1300); } }
}
function inputDown(b, ts) {
  if (S.phase === 'cal') { calTap(evHeard(ts)); pads[b].classList.add('dn'); S.down[b] = true; return; }
  if (S.phase !== 'play' || S.down[b]) return;
  S.down[b] = true; pads[b].classList.add('dn');
  const tp = evHeard(ts) - L();
  // trumpet is monophonic: a new note cuts off whatever is still sounding
  for (let i = 0; i < 4; i++) if (i !== b && (S.voices[i] || S.holds[i])) { releaseHold(i, tp); releaseVoice(i); }
  pressAt(b, tp);
}
function inputUp(b, ts) {
  const was = S.down[b]; S.down[b] = false; pads[b].classList.remove('dn');
  if (S.phase === 'play' && was) { releaseHold(b, (ts ? evHeard(ts) : heardNow()) - L()); releaseVoice(b); }
}
addEventListener('keydown', e => {
  if (e.repeat) { if (e.code === 'Space' && (S.phase === 'play' || S.phase === 'cal')) e.preventDefault(); return; }
  if (e.code in CODE2B && (S.phase === 'play' || S.phase === 'cal')) { e.preventDefault(); inputDown(CODE2B[e.code], e.timeStamp); }
  else if (e.code === 'Space' && (S.phase === 'play' || S.phase === 'cal')) { e.preventDefault(); S.octKey = true; $('padOct').classList.add('dn'); }
  else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && (S.phase === 'play' || S.phase === 'cal')) { e.preventDefault(); S.octDnKey = true; $('padOctDn').classList.add('dn'); }
  else if (e.code === 'Escape') { if (S.phase === 'play') pauseGame(); else if (S.phase === 'pause') resumeGame(); }
});
addEventListener('keyup', e => {
  if (e.code in CODE2B) inputUp(CODE2B[e.code], e.timeStamp);
  else if (e.code === 'Space') { S.octKey = false; $('padOct').classList.remove('dn'); }
  else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { S.octDnKey = false; $('padOctDn').classList.remove('dn'); }
});
pads.forEach(p => {
  const b = +p.dataset.b;
  p.addEventListener('pointerdown', e => { e.preventDefault(); try { p.setPointerCapture(e.pointerId); } catch (_) {} inputDown(b, e.timeStamp); });
  const up = e => { if (S.down[b]) inputUp(b, e && e.timeStamp); };
  p.addEventListener('pointerup', up); p.addEventListener('pointercancel', up); p.addEventListener('lostpointercapture', up);
  p.addEventListener('contextmenu', e => e.preventDefault());
});
(() => { const o = $('padOct'); let dn = 0;
  o.addEventListener('pointerdown', e => { e.preventDefault(); dn = performance.now(); S.octKey = true; o.classList.add('dn'); });
  const up = () => { if (!dn) return; const short = performance.now() - dn < 260; dn = 0; S.octKey = false; if (short) S.octLock = !S.octLock; o.classList.remove('dn'); o.classList.toggle('lock', S.octLock); };
  o.addEventListener('pointerup', up); o.addEventListener('pointercancel', up); o.addEventListener('contextmenu', e => e.preventDefault()); })();
(() => { const o = $('padOctDn'); let dn = 0;
  o.addEventListener('pointerdown', e => { e.preventDefault(); dn = performance.now(); S.octDnKey = true; o.classList.add('dn'); });
  const up = () => { if (!dn) return; const short = performance.now() - dn < 260; dn = 0; S.octDnKey = false; if (short) S.octDnLock = !S.octDnLock; o.classList.remove('dn'); o.classList.toggle('lock', S.octDnLock); };
  o.addEventListener('pointerup', up); o.addEventListener('pointercancel', up); o.addEventListener('contextmenu', e => e.preventDefault()); })();

/* ---------- flow ---------- */
const OV = ['ovTitle', 'ovPause', 'ovSet', 'ovCal', 'ovEnd'];
function showOv(id) { OV.forEach(o => $(o).hidden = o !== id); if (id) { const f = $(id).querySelector('.btn'); if (f) f.focus({ preventScroll: true }); } }
function begin(o = {}) {
  $('panels').classList.remove('on');
  synth.init(); synth.setVolume(cfg.vol / 100); synth.ctx.resume();
  for (let i = 0; i < 4; i++) { releaseVoice(i); S.down[i] = false; pads[i].classList.remove('dn'); }
  const sb = o.start ?? -4; S.bot = o.bot || null; if (o.mode) cfg.mode = o.mode;
  resetSong(sb, !!o.club);
  S.t0 = synth.ctx.currentTime + .35 - sb * SPB; S.ti = Math.ceil(sb * 4); S.phase = 'play';
  setMood('groove'); setCut('');
  showOv(null); clearInterval(schedTimer); schedTimer = setInterval(sched, 25);
  $('live').textContent = 'Count in. Listen to the phrase, then play it back.';
  S.octLock = false; S.octDnLock = false; S.octKey = S.octDnKey = false; $('padOct').classList.remove('lock'); $('padOctDn').classList.remove('lock'); $('sceneCard').classList.remove('show'); $('react').classList.remove('on');
}
function pauseGame() {
  if (S.phase !== 'play') return; S.phase = 'pause'; synth.ctx.suspend();
  for (let i = 0; i < 4; i++) { S.down[i] = false; pads[i].classList.remove('dn'); if (S.holds[i]) { S.holds[i].holdState = 'ok'; S.holds[i] = null; } releaseVoice(i); }
  showOv('ovPause');
}
function resumeGame() { if (S.phase !== 'pause') return; showOv(null); synth.ctx.resume(); S.phase = 'play'; }
function toTitle() { S.phase = 'title'; clearInterval(schedTimer); if (synth.ctx) synth.ctx.suspend(); resetSong(-4); setScene('practice'); showOv('ovTitle'); setCut(''); $('where').textContent = 'Scene 1 · The practice room'; }
function endGame() {
  S.phase = 'end'; clearInterval(schedTimer);
  const c = S.counts, total = c.cool + c.good + c.bad + c.miss || 1, ratio = (c.cool + c.good * .7 + c.bad * .25) / total;
  const g = rankBand(S.rank), happy = g === 'Cool' || g === 'Good';   // same band the rank meter shows at the end
  const lines = { Cool: 'Standing ovation. The room wants an encore.', Good: 'A solid set. The room was with you.', Bad: 'A rough night, but the band had your back.', Awful: 'That one stings. Run it back, the song never stops for you.' };
  $('endArt').innerHTML = happy ? endGoodSVG() : endPoorSVG();
  $('endEye').textContent = happy ? 'Set complete' : 'Last call';
  $('endGrade').textContent = g; $('endGrade').style.color = { Cool: '#ffb84d', Good: '#7fe3c8', Bad: '#a8b6f0', Awful: '#ff7a8a' }[g];
  $('endLine').textContent = lines[g];
  $('sCool').textContent = c.cool; $('sGood').textContent = c.good; $('sBad').textContent = c.bad; $('sMiss').textContent = c.miss;
  const thr = Math.round(DIFF[cfg.mode].thr * 100);
  $('endSolo').textContent = S.soloOn ? `Solo heat ${Math.round((S.soloT ? S.heatSum / S.soloT : 0) * 100)}%. You earned the spotlight.` : `The band took the solo. Reach a rank of ${thr}% or better before the break to earn it on ${cfg.mode}.`;
  $('live').textContent = 'Set complete. Grade ' + g;
  setCut(''); showOv('ovEnd');
  if (happy && synth.ctx && cfg.fx !== false) { try { synth.cheer(g === 'Cool' ? 1 : .65); } catch (e) {} }
  if (synth.ctx) setTimeout(() => synth.ctx && S.phase === 'end' && synth.ctx.suspend(), happy ? 9000 : 3500);
}

/* ---------- calibration ---------- */
let cal = null, calTimer = 0;
function openCal(from) {
  synth.init(); synth.ctx.resume(); S.phase = 'cal'; S.calFrom = from;
  cal = { clicks: [], taps: [], next: synth.ctx.currentTime + .8 }; $('calOut').textContent = 'Tap 0 of 8'; $('btnCalApply').disabled = true; showOv('ovCal');
  clearInterval(calTimer); calTimer = setInterval(() => { const c = synth.ctx; while (cal.next < c.currentTime + .5) { synth.click(cal.next, false); cal.clicks.push(cal.next); cal.next += .6; } }, 100);
}
function calTap(t) {
  if (!cal) return; let bd = 9, d = 0;
  for (const c of cal.clicks) { const x = t - c; if (Math.abs(x) < Math.abs(bd)) { bd = x; d = x; } }
  if (Math.abs(d) > .3) return; cal.taps.push(d);
  const n = cal.taps.length;
  if (n < 8) $('calOut').textContent = 'Tap ' + n + ' of 8';
  else { const last = cal.taps.slice(-5).sort((a, b) => a - b), med = last[2]; cal.result = clamp(Math.round(med * 1000 / 5) * 5, -300, 600);
    $('calOut').textContent = (cal.result >= 0 ? '+' : '') + cal.result + ' ms'; $('btnCalApply').disabled = false; }
}
function closeCal(apply) {
  clearInterval(calTimer);
  if (apply && cal && cal.result !== undefined) { cfg.offset = cal.result; saveCfg(); syncSettings(); }
  cal = null; const back = S.calFrom === 'set' ? (S.setFrom || 'title') : 'title';
  S.phase = back === 'pause' ? 'pause' : 'title';
  showOv(S.calFrom === 'set' ? 'ovSet' : 'ovTitle'); if (synth.ctx && S.phase === 'title') synth.ctx.suspend();
}

/* ---------- settings UI ---------- */
function syncSettings() {
  $('rngOff').value = cfg.offset; $('outOff').textContent = (cfg.offset >= 0 ? '+' : '') + cfg.offset + ' ms';
  $('rngVol').value = cfg.vol; $('outVol').textContent = cfg.vol + '%'; $('chkFx').checked = cfg.fx;
  document.querySelectorAll('#modeOpts .opt').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === cfg.mode)));
}
syncSettings();
document.querySelectorAll('#modeOpts .opt').forEach(b => b.addEventListener('click', () => { cfg.mode = b.dataset.mode; saveCfg(); syncSettings(); }));
$('rngOff').addEventListener('input', e => { cfg.offset = +e.target.value; saveCfg(); syncSettings(); });
$('rngVol').addEventListener('input', e => { cfg.vol = +e.target.value; saveCfg(); syncSettings(); synth.setVolume(cfg.vol / 100); });
$('chkFx').addEventListener('change', e => { cfg.fx = e.target.checked; saveCfg(); if (!cfg.fx) setCut(''); });
if (cfg.three === undefined) cfg.three = true;
$('chk3d').checked = cfg.three;
if (cfg.voice === undefined) cfg.voice = true;
$('chkVoice').checked = cfg.voice;
$('chkVoice').addEventListener('change', e => { cfg.voice = e.target.checked; saveCfg(); });
$('chk3d').addEventListener('change', e => { cfg.three = e.target.checked; saveCfg(); });
const show3dSetting = () => { if (window.Club3D && Club3D.ok) $('set3d').hidden = false; };
addEventListener('club3d-ready', show3dSetting); show3dSetting();
$('btnStart').addEventListener('click', () => begin());
$('btnSkip').addEventListener('click', () => begin({ club: true }));
$('btnCal1').addEventListener('click', () => openCal('title'));
$('btnCal2').addEventListener('click', () => openCal('set'));
$('btnCalApply').addEventListener('click', () => closeCal(true));
$('btnCalCancel').addEventListener('click', () => closeCal(false));
$('btnPause').addEventListener('click', () => { if (S.phase === 'play') pauseGame(); else if (S.phase === 'pause') resumeGame(); });
$('btnResume').addEventListener('click', resumeGame);
$('btnQuit').addEventListener('click', toTitle);
$('btnSet').addEventListener('click', () => { S.setFrom = S.phase === 'play' ? 'pause' : S.phase; if (S.phase === 'play') pauseGame(); showOv('ovSet'); });
$('btnSetDone').addEventListener('click', () => { showOv(S.phase === 'pause' ? 'ovPause' : S.phase === 'title' ? 'ovTitle' : null); });
$('btnAgain').addEventListener('click', () => begin());
$('btnTitle').addEventListener('click', toTitle);
document.addEventListener('visibilitychange', () => { if (document.hidden && S.phase === 'play') pauseGame(); });

/* ---------- per-frame game logic ---------- */
function onSegChange(seg) {
  const k = seg ? seg.k : '';
  if (seg && seg.scene) setScene(seg.scene);
  if (seg && seg.k === 'count' && seg.card) {
    if (seg.scene === 'club') { showCard('Scene 2', 'The Blue Room'); S.counts = { cool: 0, good: 0, bad: 0, miss: 0 }; S.rank = .5; S.streak = 0; S.played = [];
      S.events = S.events.filter(e => e.seg.scene === 'club'); S.targets = S.targets.filter(e => e.seg.scene === 'club'); S.clubStarted = true; }
    else showCard('Scene 1', 'The practice room');
  }
  const pr = seg && seg.scene === 'practice';
  const tag = { count: ['Count in', ''], call: ['Listen', 'Phrase ' + (seg && seg.hook) + (pr ? ' · take ' + (S.clean + 1) + ' of 3' : '')], resp: ['Your turn', 'Play phrase ' + (seg && seg.hook) + ' back · hold long notes'],
    gap: ['Breathe', ''], perf: ['Perform', 'Phrase ' + (seg && seg.hook) + ' · full band'],
    comp: ['Inés solos', 'Back her up — comp the chords'],
    solo: ['Solo', 'Play what you feel'], break: ['Tomás solos', 'Listen and learn'], head: ['The head', 'Phrase ' + (seg && seg.hook) + ' · all together'], tag: ['Tag', 'Thank you'] }[k] || ['', ''];
  $('bannerTxt').textContent = tag[0]; $('bannerSub').textContent = tag[1]; $('live').textContent = tag[0] + '. ' + tag[1];
  $('banner').querySelector('.tag').style.background = k === 'solo' ? '#7aa5ff' : k === 'call' ? '#cdd8ff' : k === 'comp' ? '#c4b5fd' : '#ffb84d';
  if (k === 'resp' && seg.hook === 'A') sayId(pr ? 't_turn_long' : 't_turn', 2000);
  if (k === 'call' && seg.hook === 'B') sayId('t_second', 2200);
  if (k === 'comp') { sayId('i_my_turn', 3200); setMood('ecstatic'); S.compDone = true; showPanels('¡PIANO!', 1400); setTimeout(() => { if (S.segK === 'comp') { setCut('inset'); FX.emit(12, 'spark'); } }, 900); }
  if (k === 'perf' && seg.hook === 'A' && !S.compDone) sayId('t_whole_band', 2400);
  if (k === 'perf' && seg.hook === 'A' && S.compDone) { sayId('t_bring_home', 2400); S.compDone = false; }
  if (k === 'solo') { sayId('t_take_it', 3200); S.cutUntil = seg.a + 4; showPanels('¡TOMA!', 1400); setTimeout(() => { if (S.segK === 'solo') { setCut('full'); FX.emit(18, 'spark'); } }, 1100); }
  if (k === 'break') { sayId('t_break', 3200); setMood('encourage'); }
  if (k === 'head' && seg.hook === 'A') sayId('i_bring_home', 2200);
  if (k === 'tag') { showPanels('¡BRAVO!', 1500); setCut('inset'); S.cutUntil = seg.a + 3; FX.emit(20, 'spark'); }
}
let lastFrame = performance.now(), lastAnim = 0;
function decideRound() {
  S.roundDecided = true;
  const ts = S.targets.filter(t => t.round === S.round);
  const miss = ts.filter(t => t.state === 'miss' || !t.state).length, bad = ts.filter(t => t.state === 'bad').length, pts = ts.reduce((s, t) => s + ({ cool: 1, good: .85, bad: .4 }[t.state] || 0), 0), clean = ts.length > 0 && pts / ts.length >= .6;
  const R2 = S.roundStart + 32;
  if (clean) { S.clean++; updateTakes(); }
  addSeg({ k: 'gap', a: R2, b: R2 + 2, cb: R2, scene: 'practice' });
  if (clean && S.clean >= 3) { sayId('t_hook_real', 2600); startClub(R2 + 2); S.practiceDone = true; }
  else { sayId(clean ? 't_good_take' : (miss > 2 ? 't_almost' : 't_close'), 2400); S.clean = clean ? S.clean : S.clean; startRound(R2 + 2); }
  pop(clean ? 'NICE TAKE' : 'AGAIN', clean ? '#ffb84d' : '#8ea4e0');
}
function update(dt) {
  const seg = segAt(S.beat), k = seg ? seg.k : '', D = DIFF[cfg.mode], userNow = S.now - L();
  if ((seg ? seg.k + seg.a : '') !== S.segKey) { S.segKey = seg ? seg.k + seg.a : ''; S.segK = k; onSegChange(seg); }
  for (const tg of S.targets) if (!tg.state && S.beat > tg.beat + D.w[2] / SPB) { tg.state = 'miss'; S.counts.miss++; S.streak = 0; addRank(DELTA.miss); pop('MISS', '#8a93b8'); }
  for (let b = 0; b < 4; b++) { const tg = S.holds[b]; if (tg && tg.holdState === 'active' && userNow - tg.pressT >= NEED[cfg.mode] * tg.dur * SPB) tg.holdState = 'ok'; }
  if (!S.roundDecided && (S.beat >= S.roundStart + 31.6 || S.ctxBeat >= S.roundStart + 33.2)) decideRound();
  if (S.clubC0 !== null && S.soloOn === null && (S.beat >= S.soloAt - 1 || S.ctxBeat >= S.soloAt - .45) && S.clubStarted) {
    S.soloOn = S.rank >= D.thr; extendClub(S.soloOn);
    sayId(S.soloOn ? 't_solo_yours' : 't_let_me', 2600);
  }
  if (k === 'solo') { S.heat = Math.max(0, S.heat - dt * .15); S.heatSum += S.heat * dt; S.soloT += dt; }
  if (S.soloOn && S.segK === 'solo' && k !== 'solo' && !S.soloDone) { S.soloDone = true; const avg = S.soloT ? S.heatSum / S.soloT : 0; addRank(clamp((avg - .35) * .35, -.1, .15)); }
  if (k !== 'solo') S.heat = Math.max(0, S.heat - dt * .3);
  S.stem = stemTargets(seg);
  for (const n in S.stem) { if (S[n + 'T'] !== S.stem[n]) { S[n + 'T'] = S.stem[n]; synth.setStem(n, S.stem[n]); } $('stem-' + n).classList.toggle('on', S.stem[n] > .3); }
  setMood(computeMood(seg));
  if (S.cut && S.beat > S.cutUntil) setCut('');
  else if (!S.cut && k === 'solo' && cfg.fx && S.beat > S.cutUntil + 8 && S.heat > .5 && ((S.beat - S.soloAt) % 8) < .5) { S.cutUntil = S.beat + 2; setCut('inset'); }
  const spd = k === 'solo' ? S.heat * .7 : S.streak >= 4 ? .45 : 0; S.speed = lerp(S.speed, S.cut === 'full' ? Math.max(spd, .55) : spd, .08);
  $('rankWord').textContent = rankBand(S.rank); $('mark').style.left = (S.rank * 100) + '%';
  document.querySelectorAll('#segs i').forEach((e, i) => e.classList.toggle('on', S.rank >= i * .25 + .001));
  const sl = $('soloLine'), thr = D.thr * 100; sl.style.left = thr + '%'; $('soloLab').style.left = thr + '%';
  const showThr = S.soloOn === null && S.sceneNow === 'club';
  $('soloLab').style.display = showThr ? '' : 'none'; sl.style.display = showThr ? '' : 'none';
  if (S.beat >= S.endBeat) endGame();
  if (S.bot) runBot();
}
function runBot() {
  const seg = segAt(S.beat);
  for (const t of S.targets) if (!t.bot && S.beat >= t.beat - .025) {
    t.bot = true; if (S.bot === 'none') continue; if (S.bot === 'sloppy' && Math.random() < .3) continue;
    const j = S.bot === 'sloppy' ? (Math.random() - .5) * .2 : 0, tp = S.t0 + t.beat * SPB + j, bb = t.button;
    S.down[bb] = true; pressAt(bb, tp);
    const len = S.bot === 'tap' ? .12 : .92; // 'tap' bot never holds long notes
    const tr = tp + t.dur * SPB * len; releaseHold(bb, tr); S.down[bb] = false;
    setTimeout(() => releaseVoice(bb), t.dur * SPB * 900);
  }
  if (seg && seg.k === 'solo' && S.bot !== 'none') {
    const g = Math.floor(S.beat * 2); if (g !== S.botG) { S.botG = g; if (Math.random() < .8) { const b = Math.floor(Math.random() * 4); pressAt(b, S.t0 + g * .5 * SPB); setTimeout(() => releaseVoice(b), 220); } }
  }
}

/* ---------- stage animation (on twos, ~12 fps) ---------- */
const env = (pos, times, k) => { let v = 0; for (const t of times) { let d = pos - t; if (d < 0) d += 4; v = Math.max(v, Math.exp(-d / k)); } return v; };
function animate(tms) {
  const beat = S.phase === 'title' ? tms / 1000 / SPB : S.beat, pos = mod(beat, 4), m = S.mood;
  const amp = { worried: .45, encourage: 1, groove: 1.8, ecstatic: 3 }[m], lean = { worried: 7, encourage: 2, groove: -1, ecstatic: -7 }[m];
  const sw = Math.sin(beat * Math.PI * 2), sw2 = Math.sin(beat * Math.PI);
  const playing = S.voices.some(v => v) || performance.now() - S.lastNote < 160;
  const pv = S.down.map(d => d ? 5 : 0), horn = playing ? -3 - (S.playMidi - 60) * .12 + sw : 0;
  const setValves = (id) => { const c = el[id].children; c[0].setAttribute('transform', `translate(0,${pv[0]})`); c[1].setAttribute('transform', `translate(0,${pv[1] || pv[3]})`); c[2].setAttribute('transform', `translate(0,${pv[2]})`); };
  if (S.sceneNow === 'club') lsUpdate(tms, pos, sw, sw2, amp, lean, playing, (t, k) => env(pos, t, k));
  if (S.sceneNow === 'practice') {
    T('c-ptrump', `translate(780,${858 - Math.abs(sw2) * 2 * amp}) scale(1.55)`); T('p-trump-head', `rotate(${lean * .6},8,-300)`); T('p-trump-horn', `rotate(${horn},50,-326)`);
    setValves('p-valves'); el['p-bellGlow'].setAttribute('opacity', (.2 + (playing ? .5 : 0)).toFixed(2));
    T('p-tomas-b', `rotate(${sw2 * amp * .8},0,-170)`);
  } else if (!S.use3d) {
    T('c-bass', `translate(300,${712 - Math.abs(sw2) * 3 * amp})`);
    T('bass-body', `rotate(${sw2 * amp * .9},0,-170)`); T('bass-head', `rotate(${lean + sw * amp},4,-345)`);
    T('bass-armR', `rotate(${12 * env(pos, [1.5, 3, 3.5], .15) - 4},22,-318)`); T('bass-armL', `rotate(${sw2 * 2},-14,-322)`);
    T('c-piano', `translate(790,${712 - Math.abs(sw2) * 1.5 * amp})`);
    T('piano-torso', `rotate(${-4 + sw * amp * .9},0,-110)`); T('piano-head', `rotate(${lean + sw2 * amp * 1.4},16,-300)`);
    T('piano-arm', `rotate(${9 * env(pos, [.5, 1, 2.5, 3, 3.5], .1)},12,-268)`);
    T('c-perc', `translate(1290,${712 - Math.abs(sw) * 2.5 * amp})`);
    T('perc-head', `rotate(${lean + sw * amp * 1.3},6,-345)`);
    T('perc-armL', `rotate(${-15 * env(pos, [1, 2, 3.5], .09)},-26,-318)`); T('perc-armR', `rotate(${-15 * env(pos, [.5, 2.5, 3], .09)},30,-318)`);
    T('c-trump', `translate(600,${872 - Math.abs(sw2) * 3 * amp}) scale(1.38)`);
    T('trump-head', `rotate(${lean * .6},8,-300)`); T('trump-horn', `rotate(${horn},50,-326)`);
    setValves('valves');
    el.bellGlow.setAttribute('opacity', (.2 + (playing ? .45 : 0) + S.heat * .3).toFixed(2));
    el.neon.style.opacity = (.85 + .15 * Math.sin(tms / 400)).toFixed(2);
    el.ribbons.setAttribute('opacity', (playing ? .8 : S.heat * .5).toFixed(2));
    [...el.ribbons.children].forEach((p, i) => p.setAttribute('stroke-dashoffset', (-(tms / (9 + i * 3)) % 400).toFixed(0)));
    el.crowd.setAttribute('transform', `translate(0,${(-Math.abs(sw) * 4 * amp / 2).toFixed(1)})`);
    el['crowd-hands'].setAttribute('opacity', m === 'ecstatic' ? 1 : m === 'groove' && S.heat > .5 ? .6 : 0);
    el['crowd-hands'].setAttribute('transform', `translate(0,${(sw * 8).toFixed(1)})`);
  }
  const blink = (tms % 3400) < 130, hot = S.heat > .6 || S.mood === 'ecstatic', shut = blink || (playing && hot);
  el['cu-eye-open'].setAttribute('opacity', shut ? 0 : 1); el['cu-eye-shut'].setAttribute('opacity', shut ? 1 : 0);
  el['cu-brow'].setAttribute('transform', `translate(0,${(S.octKey || S.octLock) ? -8 : playing ? -2 : 0}) rotate(${S.mood === 'worried' ? 6 : 0},860,390)`);
  const puff = playing ? 1.1 + Math.abs(sw) * .04 : 1; el['cu-cheek'].setAttribute('transform', `translate(868,596) scale(${puff}) translate(-868,-596)`);
  el['cu-horn'].setAttribute('transform', `rotate(${-6 - (playing ? (S.playMidi - 60) * .18 : 0)} 944 562)`);
  for (let i = 0; i < 3; i++) el['pv' + i].setAttribute('transform', `translate(0,${i === 1 ? (pv[1] || pv[3] ? 22 : 0) : pv[i] ? 22 : 0})`);
  el['cu-flame'].setAttribute('opacity', (.25 + S.heat * .75 + (S.cut === 'full' ? .2 : 0)).toFixed(2));
  el['cu-glint'].setAttribute('opacity', playing ? .95 : .25);
  el['cu-flare'].setAttribute('opacity', (.3 + (playing ? .5 : 0) + S.heat * .2).toFixed(2));
  el['cu-all'].setAttribute('transform', `translate(${(sw2 * 3).toFixed(1)},${(Math.abs(sw) * -3 * amp / 3).toFixed(1)})`);
  [0, 1].forEach(i => { el['sw' + i].setAttribute('transform', `translate(${i * 4},${((tms / 30 + i * 70) % 150).toFixed(0)})`); el['sw' + i].setAttribute('opacity', (S.mood === 'worried' || hot) ? .8 : 0); });
}

/* ---------- notation lane ---------- */
function resizeScore() {
  const r = sc.cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
  sc.w = Math.max(1, Math.round(r.width)); sc.h = Math.max(1, Math.round(r.height)); sc.cv.width = sc.w * d; sc.cv.height = sc.h * d; sc.g.setTransform(d, 0, 0, d, 0, 0);
  FX.resize();
}
new ResizeObserver(resizeScore).observe(sc.cv); new ResizeObserver(() => FX.resize()).observe($('fx'));
document.fonts.load('40px Bravura', '').then(() => { S.fontReady = true; });
function drawScore() {
  const g = sc.g, w = sc.w, h = sc.h; g.clearRect(0, 0, w, h);
  if (!S.fontReady) return;
  const sp = clamp(h / 14.5, 8, 12), bottom = h - 4.3 * sp, clefW = sp * 6.6, nowX = clefW + (w - clefW) * .2;
  const ppb = clamp((w - nowX) / 7.4, 56, 112), beat = S.phase === 'title' ? -4 : S.beat, X = b => nowX + (b - beat) * ppb, Y = s => bottom - s * sp / 2;
  const userNow = S.now - L(), seg = segAt(beat), segK = seg ? seg.k : '';
  g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip(); g.textBaseline = 'alphabetic';
  // bar lines and chord names, per segment (chords follow each segment's own bar grid).
  // Engraving convention: the bar line sits a little before the downbeat, so a note on beat 1
  // is drawn clearly inside its own measure rather than on top of the line.
  const barPad = Math.min(sp * 2.2, ppb * .32);
  for (const sg of S.layout) {
    if (!sg.cb && sg.cb !== 0) continue; if (sg.k === 'count' || sg.k === 'gap' || X(sg.b) < clefW - 40 || X(sg.a) > w + 40) continue;
    for (let bb = sg.cb + Math.ceil((sg.a - sg.cb) / 4) * 4; bb < sg.b - 1e-6; bb += 4) {
      const x = X(bb) - barPad; if (x < clefW - 2 || x > w + 4) continue;
      g.strokeStyle = 'rgba(190,208,250,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, Y(8)); g.lineTo(x, Y(0)); g.stroke();
      const ch = CHORDS[mod(Math.floor((bb - sg.cb) / 4), 4)], cur = beat >= bb && beat < bb + 4;
      g.font = `700 ${Math.round(sp * 1.5)}px 'Playfair Display', Georgia, serif`; g.fillStyle = cur ? '#ffb84d' : 'rgba(205,216,250,.78)'; g.fillText(ch.name, x + 6, Y(8) - sp * 3.6);
    }
  }
  g.strokeStyle = 'rgba(190,208,250,.55)'; g.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const y = bottom - i * sp; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const hf = () => `${sp * 4}px Bravura`;
  const drawEvent = e => {
    const x = X(e.beat); if (x < clefW - sp || x > w + sp * 2) return;
    if (e.rest) { g.font = hf(); g.fillStyle = 'rgba(244,236,216,.6)'; g.fillText(e.dur >= 2 ? GL.rh : e.dur >= 1 ? GL.rq : GL.r8, x - sp * .5, Y(4)); return; }
    const y = Y(e.step), hw = sp * 1.18, passed = beat >= e.beat + e.dur;
    let col = e.kind === 'call' ? '#aebfee' : BCOL[e.button], a = 1;
    if (e.kind === 'call') { const lit = beat >= e.beat - .02 && beat < e.beat + e.dur; col = lit ? '#ffb84d' : passed ? '#7d8bb9' : '#aebfee'; }
    else if (e.state === 'miss') { col = '#6b749c'; a = .5; } else if (e.state === 'bad') { col = '#8c94b8'; a = .8; }
    g.globalAlpha = a; g.strokeStyle = 'rgba(244,236,216,.85)'; g.lineWidth = 1.3;
    for (let s = 10; s <= e.step; s += 2) { g.beginPath(); g.moveTo(x - hw * .85, Y(s)); g.lineTo(x + hw * .85, Y(s)); g.stroke(); }
    for (let s = -2; s >= e.step; s -= 2) { g.beginPath(); g.moveTo(x - hw * .85, Y(s)); g.lineTo(x + hw * .85, Y(s)); g.stroke(); }
    if (e.state === 'cool' || e.state === 'good') { g.fillStyle = e.state === 'cool' ? 'rgba(255,184,77,.28)' : 'rgba(127,227,200,.22)'; g.beginPath(); g.arc(x, y, sp * 1.5, 0, 7); g.fill(); }
    g.fillStyle = col; g.font = hf();
    g.fillText(e.dur >= 4 ? GL.whole : e.dur >= 2 ? GL.half : GL.black, x - hw / 2, y);
    if (e.acc) g.fillText(GL.sharp, x - hw / 2 - sp * 1.15, y);
    if (e.dur === 1.5 || e.dur === 3) { g.beginPath(); g.arc(x + hw * .5 + sp * .5, e.step % 2 === 0 ? y - sp * .5 : y, sp * .17, 0, 7); g.fill(); }
    if (e.dur < 4) {
      const down = (e.pair ? (e.step + e.pair.step) / 2 : e.step) >= 4, len = sp * 3.4, sx = down ? x - hw / 2 + sp * .06 : x + hw / 2 - sp * .06;
      let yEnd = down ? y + len : y - len;
      if (e.pair) { const p = e.pair; yEnd = down ? Math.max(y, Y(p.step)) + len : Math.min(y, Y(p.step)) - len; }
      g.strokeStyle = col; g.lineWidth = Math.max(1.2, sp * .12); g.beginPath(); g.moveTo(sx, y); g.lineTo(sx, yEnd); g.stroke();
      if (e.beam === 1) { const x2 = X(e.pair.beat) + (down ? -hw / 2 + sp * .06 : hw / 2 - sp * .06); g.fillStyle = col; const bt = sp * .5; g.beginPath(); if (down) g.rect(sx - .5, yEnd - bt, x2 - sx + 1, bt); else g.rect(sx - .5, yEnd, x2 - sx + 1, bt); g.fill(); }
      else if (!e.beam && e.dur <= .5) { g.fillStyle = col; g.fillText(down ? GL.flagD : GL.flagU, sx, yEnd); }
    }
    if (e.kind === 'play') {
      // hold ring: the note keeps its true value; the ring shows how long you have held it
      if (e.hold && e.holdState) {
        const need = NEED[cfg.mode], prog = e.holdState === 'active' ? clamp((userNow - e.pressT) / (e.dur * SPB), 0, 1) : e.holdState === 'ok' ? 1 : .35;
        g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(x, y, sp * 1.75, 0, 7); g.stroke();
        g.strokeStyle = e.holdState === 'short' ? '#ff7a7a' : e.holdState === 'ok' ? '#7fe3c8' : '#ffb84d';
        g.beginPath(); g.arc(x, y, sp * 1.75, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); g.stroke();
        if (e.holdState === 'active') { const nx = x + Math.cos(-Math.PI / 2 + need * e.dur / e.dur * Math.PI * 2) * sp * 1.75, ny = y + Math.sin(-Math.PI / 2 + need * Math.PI * 2) * sp * 1.75; g.fillStyle = '#fff'; g.beginPath(); g.arc(nx, ny, 2.2, 0, 7); g.fill(); }
      }
      const by = bottom + 3.1 * sp; g.fillStyle = col; g.beginPath(); g.arc(x, by, sp * .92, 0, 7); g.fill();
      g.fillStyle = '#1a1206'; g.font = `800 ${Math.round(sp * 1.2)}px 'Playfair Display', Georgia, serif`; g.textAlign = 'center'; g.fillText(BKEY[e.button], x, by + sp * .42); g.textAlign = 'left';
      if (e.hold && !e.holdState) { g.fillStyle = 'rgba(244,236,216,.7)'; g.font = `500 ${Math.round(sp * .9)}px 'DM Sans', sans-serif`; g.textAlign = 'center'; g.fillText('hold', x, by + sp * 2.1); g.textAlign = 'left'; }
    }
    g.globalAlpha = 1;
  };
  S.events.forEach(drawEvent);   // always drawn, so the next phrase is visible well before a solo ends
  S.played.forEach(p => {
    const x = X(p.beat); if (x < clefW || x > w) return; const { step, acc } = midiToStep(p.midi), y = Y(step), a = clamp(1 - (beat - p.beat) / 7, .15, 1);
    g.globalAlpha = a; g.fillStyle = BCOL[p.b]; g.font = hf(); g.fillText(GL.black, x - sp * .59, y);
    if (acc) g.fillText(GL.sharp, x - sp * 1.75, y);
    g.strokeStyle = 'rgba(244,236,216,.7)'; g.lineWidth = 1.2; for (let s = 10; s <= step; s += 2) { g.beginPath(); g.moveTo(x - sp, Y(s)); g.lineTo(x + sp, Y(s)); g.stroke(); }
    g.globalAlpha = 1;
  });
  const grd = g.createLinearGradient(0, 0, clefW, 0); grd.addColorStop(0, '#0b1438'); grd.addColorStop(.88, '#0b1438'); grd.addColorStop(1, 'rgba(11,20,56,0)');
  g.fillStyle = grd; g.fillRect(0, 0, clefW + sp, h);
  g.strokeStyle = 'rgba(190,208,250,.55)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { const y = bottom - i * sp; g.beginPath(); g.moveTo(0, y); g.lineTo(clefW - sp * .6, y); g.stroke(); }
  g.fillStyle = '#f4ecd8'; g.font = hf(); g.fillText(GL.gclef, sp * .7, Y(2)); g.fillText(tsGlyph(4), sp * 4.4, Y(4)); g.fillText(tsGlyph(4), sp * 4.4, Y(0));
  const ng = g.createLinearGradient(nowX - 14, 0, nowX + 14, 0); ng.addColorStop(0, 'rgba(255,184,77,0)'); ng.addColorStop(.5, 'rgba(255,184,77,.32)'); ng.addColorStop(1, 'rgba(255,184,77,0)');
  g.fillStyle = ng; g.fillRect(nowX - 14, Y(8) - sp * 2, 28, sp * 13);
  g.strokeStyle = '#ffb84d'; g.lineWidth = 2; g.beginPath(); g.moveTo(nowX, Y(8) - sp * 2); g.lineTo(nowX, bottom + sp * 5); g.stroke();
  g.textAlign = 'center';
  if (segK === 'count') {
    const n = Math.floor(beat - seg.a) + 1, f = 1 - mod(beat - seg.a, 1);
    g.fillStyle = `rgba(255,184,77,${(.25 + f * .7).toFixed(2)})`; g.font = `800 ${sp * 5}px 'Playfair Display', serif`; g.fillText(clamp(n, 1, 4), nowX + (w - nowX) * .45, Y(2) + sp * .5);
  }
  if (segK === 'solo' || segK === 'break') {
    const cx = nowX + (w - nowX) * .5;
    if (segK === 'solo') {
      const ch = chordFor(beat + .15, seg), oct = octShift(), gap = Math.min(86, (w - nowX) / 5.2), fade = clamp((seg.b - beat - 1.2) / 3, 0, 1);
      g.globalAlpha = fade;
      for (let i = 0; i < 4; i++) {
        const x = cx + (i - 1.5) * gap, y = Y(4) + 2, pr = S.down[i];
        g.fillStyle = BCOL[i]; g.globalAlpha = fade * (pr ? 1 : .88); g.beginPath(); g.arc(x, y, sp * (pr ? 2.1 : 1.8), 0, 7); g.fill(); g.globalAlpha = fade;
        g.fillStyle = '#1a1206'; g.font = `800 ${sp * 1.7}px 'Playfair Display', serif`; g.fillText(BKEY[i], x, y + sp * .35);
        g.fillStyle = 'rgba(244,236,216,.85)'; g.font = `500 ${Math.round(sp * 1.05)}px 'DM Sans', sans-serif`; g.fillText(midiName(ch.scale[i] + oct), x, y + sp * 3.1);
      }
      const bw = Math.min(260, (w - nowX) * .7), bx = cx - bw / 2, by = Y(8) - sp * 1.2;
      g.fillStyle = 'rgba(120,140,200,.25)'; g.fillRect(bx, by, bw, 6); const hg = g.createLinearGradient(bx, 0, bx + bw, 0); hg.addColorStop(0, '#7aa5ff'); hg.addColorStop(1, '#ffb84d');
      g.fillStyle = hg; g.fillRect(bx, by, bw * S.heat, 6); g.fillStyle = 'rgba(244,236,216,.8)'; g.font = `500 ${Math.round(sp)}px 'DM Sans', sans-serif`; g.fillText('HEAT · stay in the pocket, vary your notes, leave space', cx, by - 6);
      g.globalAlpha = Math.min(1, (1 - fade) * 1.5) * (fade > 0 ? 1 : 1); if (fade < 1) { g.fillStyle = '#ffb84d'; g.font = `800 ${Math.min(sp * 1.7, w / 22)}px 'Playfair Display', serif`; g.fillText('Get ready: the hook is coming back', cx, Math.max(sp * 1.6, 16)); }
      g.globalAlpha = 1;
    } else {
      g.fillStyle = 'rgba(244,236,216,.85)'; g.font = `700 ${Math.min(sp * 1.9, w / 20)}px 'Playfair Display', serif`; g.fillText('Tomás takes the solo', cx, Y(4)); g.font = `400 ${Math.min(sp * 1.1, w / 38)}px 'DM Sans', sans-serif`; g.fillStyle = '#93a2cf'; g.fillText('Keep your rank up to earn the next solo', cx, Y(4) + sp * 2.2);
    }
  }
  if (segK === 'tag') { g.fillStyle = 'rgba(244,236,216,.85)'; g.font = `700 ${sp * 2}px 'Playfair Display', serif`; g.fillText('Thank you, good night', nowX + (w - nowX) * .5, Y(4)); }
  if (S.holds.some(t => t && t.holdState === 'active')) { g.fillStyle = '#ffb84d'; g.font = `800 ${Math.round(sp * 1.5)}px 'Playfair Display', serif`; g.textAlign = 'right'; g.lineWidth = 4; g.strokeStyle = '#080d27'; g.strokeText('HOLD', nowX - sp * 1.2, Y(8) - sp * 2.2); g.fillText('HOLD', nowX - sp * 1.2, Y(8) - sp * 2.2); }
  g.textAlign = 'left';
  const nowMs = performance.now();
  S.pops = S.pops.filter(p => nowMs - p.t < 700);
  S.pops.forEach(p => { const k = (nowMs - p.t) / 700; g.globalAlpha = 1 - k; g.fillStyle = p.col; g.font = `800 italic ${Math.round(sp * 1.9)}px 'Playfair Display', serif`; g.textAlign = 'left'; g.lineWidth = 4; g.strokeStyle = '#080d27'; g.strokeText(p.text, nowX + sp * 1.2, Y(8) - sp * 2.2 - k * 14); g.fillText(p.text, nowX + sp * 1.2, Y(8) - sp * 2.2 - k * 14); });
  g.globalAlpha = 1; g.restore();
}

/* ---------- main loop ---------- */
function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (ts - lastFrame) / 1000); lastFrame = ts;
  if (S.phase === 'play') { S.now = heardNow(); S.ctxBeat = (S.now - S.t0) / SPB; S.beat = (S.now - L() - S.t0) / SPB; update(dt); }
  else if (S.phase === 'title') S.beat = -4;
  rigTick(ts);
  drawScore();
  // 3D club: when loaded and enabled, it replaces the 2D club drawing (close-ups and panels still overlay it)
  const scn3 = S.sceneNow === 'club' || S.sceneNow === 'practice', ph3 = S.phase === 'title' || S.phase === 'play' || S.phase === 'pause';
  const want3d = !!(cfg.three && window.__want3d && !window.__no3d && scn3 && (ph3 || S.phase === 'end')), use3d = !!(want3d && window.Club3D && Club3D.ok && ph3);
  if (use3d && window.Club3D.sceneNow !== S.sceneNow) Club3D.setScene(S.sceneNow);
  if (want3d !== S.want3d) { S.want3d = want3d; stage.classList.toggle('three', want3d); }
  if (use3d !== S.use3d) S.use3d = use3d;
  if (use3d && (S.phase === 'play' || S.phase === 'title')) { try { Club3D.frame(ts); } catch (e) { console.error(e); Club3D.ok = false; } }
  if (ts - lastAnim > 83) {
    lastAnim = ts; animate(ts);
    FX.draw(.083, S.speed, cfg.fx, S.cut === 'full' ? .5 : .62, S.cut === 'full' ? .5 : .55);
  }
}
resetSong(-4); setScene('practice'); setMood('groove'); $('banner').querySelector('.tag').style.background = '#ffb84d';
$('bannerTxt').textContent = 'Ready'; $('bannerSub').textContent = '';
requestAnimationFrame(frame);
S.begin = begin; S.showPanels = showPanels; S.setCut = setCut;
S.setMoodTest = m => { S.phase = 'play'; S.mood = ''; setMood(m); S.phase = 'pause'; };   // test hook: freeze on one mood
})();
