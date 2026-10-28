'use strict';
/* ---------- Music constants ---------- */
const BPM = 104, SPB = 60 / BPM;
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
// chords per bar: Am7 | Dm7 | E7 | Am7
const CHORDS = [
  { name: 'Am7', root: 33, fifth: 40, voice: [57, 60, 64, 67], scale: [69, 72, 76, 79] },
  { name: 'Dm7', root: 38, fifth: 45, voice: [57, 62, 65, 72], scale: [69, 74, 77, 81] },
  { name: 'E7',  root: 40, fifth: 47, voice: [56, 62, 64, 68], scale: [71, 74, 76, 80] },
  { name: 'Am7', root: 33, fifth: 40, voice: [57, 60, 64, 67], scale: [69, 72, 76, 79] }
];
const chordAt = beat => CHORDS[((Math.floor(beat / 4) % 4) + 4) % 4];

// Staff steps: 0 = E4 (bottom line). Rests use 'r'.
const R = 'r';
const HOOKS = {
  A: [[0,.5,3],[.5,.5,5],[1,1,7],[2,.5,R],[2.5,.5,6],[3,.5,5],[3.5,.5,3],[4,1.5,6],[5.5,.5,8],[6,2,7]],
  B: [[0,.5,4],[.5,.5,2,1],[1,1,4],[2,.5,R],[2.5,.5,7],[3,.5,6],[3.5,.5,4],[4,1,5],[5,1,7],[6,1.5,10],[7.5,.5,R]]
};
const SEMIS = [0, 2, 4, 5, 7, 9, 11];
function stepToMidi(step, acc) {
  const L = ((step + 2) % 7 + 7) % 7;
  const oct = 4 + Math.floor((step + 2) / 7);
  return 12 * (oct + 1) + SEMIS[L] + (acc || 0);
}
function stepToButton(step) {
  const s = Math.max(2, Math.min(10, step));
  return Math.min(3, Math.floor((s - 2) * 4 / 9));
}
const BUTTON_PITCH = [67, 72, 76, 81];
const BREAK_LINE = [
  [0,.5,69],[.5,.5,72],[1,.5,76],[1.5,1,79],[2.5,.5,76],[3,1,72],
  [4,.5,74],[4.5,.5,77],[5,.5,81],[5.5,1,77],[6.5,.5,74],[7,1,69],
  [8,.5,71],[8.5,.5,74],[9,.5,76],[9.5,.5,80],[10,1,83],[11,1,80],
  [12,1,81],[13,.5,79],[13.5,.5,76],[14,2,72]
];
// Piano solo line played by Inés during comp section (16 beats, Am7|Dm7|E7|Am7)
const PIANO_SOLO_LINE = [
  [0,.5,81],[.5,.5,79],[1,1,76],[2,.5,79],[2.5,.5,81],[3,.5,76],[3.5,.5,74],
  [4,1,81],[5,.5,79],[5.5,.5,77],[6,1,74],[7,.5,77],[7.5,.5,79],
  [8,.5,83],[8.5,.5,80],[9,1,76],[10,.5,80],[10.5,.5,83],[11,1,79],
  [12,.5,81],[12.5,.5,79],[13,1,76],[14,2,72]
];

/* ---------- Synth engine ---------- */
class Synth {
  constructor() { this.ctx = null; this.vol = 0.85; }
  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new C({ latencyHint: 'interactive' });
    this.master = ctx.createGain(); this.master.gain.value = this.vol;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3.2; comp.attack.value = 0.008; comp.release.value = 0.22;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.rev = ctx.createConvolver(); this.rev.buffer = this.impulse(1.7, 2.8);
    const revOut = ctx.createGain(); revOut.gain.value = 0.9;
    this.rev.connect(revOut); revOut.connect(this.master);
    const sends = { bass: .04, keys: .45, perc: .14, horns: .5, lead: .6, player: .55, fx: .1, voice: .12 };
    this.bus = {};
    // the band runs through a duck node so a spoken line can sit on top of the music
    this.duck = ctx.createGain(); this.duck.gain.value = 1; this.duck.connect(this.master);
    for (const k in sends) {
      const g = ctx.createGain(); g.gain.value = 1; g.connect(k === 'voice' || k === 'player' ? this.master : this.duck);
      const s = ctx.createGain(); s.gain.value = sends[k]; g.connect(s); s.connect(this.rev);
      this.bus[k] = g;
    }
    const n = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;
  }
  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }
  duckFor(sec) {
    if (!this.duck) return; const t = this.ctx.currentTime, g = this.duck.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(.5, t, .06); g.setTargetAtTime(1, t + sec, .25);
  }
  cheer(level = 1) {   // a crowd: swelling band-passed noise, claps, and a few whoops
    const ctx = this.ctx, t = ctx.currentTime + .05, dur = 4.2 + level * 2, out = ctx.createGain(); out.gain.value = .9 * level; out.connect(this.master);
    const body = (freq, q, peak, at) => { const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t + at); g.gain.linearRampToValueAtTime(peak, t + at + .5); g.gain.setValueAtTime(peak, t + dur * .55); g.gain.exponentialRampToValueAtTime(.0008, t + dur); s.connect(f); f.connect(g); g.connect(out); s.start(t + at, Math.random()); s.stop(t + dur + .1); };
    body(700, .7, .35, 0); body(1800, .9, .22, .1); body(3600, 1.2, .1, .2);
    for (let i = 0; i < 70 * level; i++) { const at = Math.random() * (dur * .8); this.nz(t + at - ctx.currentTime + ctx.currentTime, .05 + Math.random() * .05, 'bandpass', 1400 + Math.random() * 2600, 1.4, .1 + Math.random() * .18, 'fx'); }
    for (let i = 0; i < 4 + 4 * level; i++) {
      const at = .25 + Math.random() * (dur * .55), o = ctx.createOscillator(); o.type = 'sawtooth'; const f0 = 330 + Math.random() * 220;
      o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + at + .35);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3; const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t + at); g.gain.linearRampToValueAtTime(.05, t + at + .1); g.gain.exponentialRampToValueAtTime(.0005, t + at + .6);
      o.connect(f); f.connect(g); g.connect(out); o.start(t + at); o.stop(t + at + .7);
    }
  }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02); }
  setStem(name, v) { if (this.bus) this.bus[name].gain.setTargetAtTime(v, this.ctx.currentTime, 0.25); }
  nz(t, dur, type, freq, q, vel, bus) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.bus[bus]); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  bass(t, midi, dur, vel) {
    const ctx = this.ctx, f = midiHz(midi);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(280, t + 0.3);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(0.25, dur));
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.bus.bass);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    this.nz(t, 0.03, 'bandpass', 900, 1, 0.12 * vel, 'bass');
  }
  epiano(t, midi, dur, vel) {
    const ctx = this.ctx, f = midiHz(midi);
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = f;
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = f;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.5 * vel, t); mg.gain.exponentialRampToValueAtTime(f * 0.04, t + 0.55);
    mod.connect(mg); mg.connect(car.frequency);
    const tine = ctx.createOscillator(); tine.type = 'sine'; tine.frequency.value = f * 7;
    const tg = ctx.createGain(); tg.gain.setValueAtTime(0.05 * vel, t); tg.gain.exponentialRampToValueAtTime(0.0005, t + 0.12);
    tine.connect(tg);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(0.4, dur * 1.8));
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400;
    car.connect(g); tg.connect(g); g.connect(lp); lp.connect(this.bus.keys);
    car.start(t); mod.start(t); tine.start(t);
    const end = t + Math.max(0.4, dur * 1.8) + 0.1; car.stop(end); mod.stop(end); tine.stop(end);
  }
  clave(t, vel) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 2450;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.4 * vel, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.07);
    o.connect(g); g.connect(this.bus.perc); o.start(t); o.stop(t + 0.09);
    this.nz(t, 0.02, 'highpass', 3000, 1, 0.08 * vel, 'perc');
  }
  click(t, accent) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = accent ? 1800 : 1300;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.05);
    o.connect(g); g.connect(this.bus.fx); o.start(t); o.stop(t + 0.07);
  }
  conga(t, kind, vel) {
    const ctx = this.ctx;
    if (kind === 'slap') { this.nz(t, 0.09, 'bandpass', 1900, 1.4, 0.5 * vel, 'perc'); }
    const o = ctx.createOscillator(); o.type = 'sine';
    const hi = kind === 'open' ? 320 : kind === 'low' ? 200 : kind === 'slap' ? 300 : 240;
    o.frequency.setValueAtTime(hi, t); o.frequency.exponentialRampToValueAtTime(hi * 0.72, t + 0.09);
    const g = ctx.createGain(); const len = kind === 'open' ? 0.3 : kind === 'low' ? 0.26 : 0.11;
    g.gain.setValueAtTime(0.55 * vel, t); g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    o.connect(g); g.connect(this.bus.perc); o.start(t); o.stop(t + len + 0.02);
    this.nz(t, 0.025, 'bandpass', 1200, 1, 0.25 * vel, 'perc');
  }
  shaker(t, vel) { this.nz(t, 0.06, 'highpass', 6500, 0.8, 0.16 * vel, 'perc'); }
  // Brass-ish voice. Returns a handle: {release(time)}.
  horn(t, midi, vel, bus, o = {}) {
    const ctx = this.ctx, f = midiHz(midi);
    const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = f; a.detune.value = -5;
    const b = ctx.createOscillator(); b.type = 'sawtooth'; b.frequency.value = f; b.detune.value = 6;
    const c = ctx.createOscillator(); c.type = 'square'; c.frequency.value = f; const cg = ctx.createGain(); cg.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2;
    const top = o.mute ? Math.min(2600, f * 5) : Math.min(6500, f * 9);
    lp.frequency.setValueAtTime(f * 1.6, t);
    lp.frequency.exponentialRampToValueAtTime(top, t + (o.stab ? 0.03 : 0.07));
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2.8, top * 0.55), t + 0.45);
    const f1 = ctx.createBiquadFilter(); f1.type = 'peaking'; f1.frequency.value = o.mute ? 1500 : 1150; f1.gain.value = 7; f1.Q.value = 1.3;
    const f2 = ctx.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 2400; f2.gain.value = o.mute ? 2 : 5; f2.Q.value = 1.1;
    const g = ctx.createGain(); const peak = (o.mute ? 0.11 : 0.15) * vel * (o.gain || 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.stab ? 0.012 : 0.035));
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.3; const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.5); lfo.connect(lg); lg.connect(a.detune); lg.connect(b.detune);
    a.connect(lp); b.connect(lp); c.connect(cg); cg.connect(lp); lp.connect(f1); f1.connect(f2); f2.connect(g); g.connect(this.bus[bus]);
    a.start(t); b.start(t); c.start(t); lfo.start(t);
    this.nz(t, 0.05, 'bandpass', Math.min(5000, f * 4), 1.2, 0.07 * vel, bus);
    let done = false;
    const stopAt = e => { a.stop(e); b.stop(e); c.stop(e); lfo.stop(e); };
    return {
      release: (te, rel = 0.09) => {
        if (done) return; done = true;
        const tt = Math.max(te, t + 0.04);
        g.gain.cancelScheduledValues(tt); g.gain.setValueAtTime(Math.max(0.0002, peak), tt);
        g.gain.exponentialRampToValueAtTime(0.0003, tt + rel); stopAt(tt + rel + 0.05);
      }
    };
  }
}
const synth = new Synth();
