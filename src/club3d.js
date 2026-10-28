/* Noche Azul — 3D club (Three.js).
   Toon-shaded band with ink outlines, PBR brass and lacquer, volumetric spot beams, haze, bloom,
   and a camera director that cuts on the bar lines. Reads game state from window.__nz each frame.
   Exposes window.Club3D = { ok, frame(ts), shot(id) }. If anything fails, ok stays false and the
   game keeps its 2D SVG club. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const NZ = window.__nz;
const C3 = window.Club3D = { ok: false, forced: null };
const TAU = Math.PI * 2, V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, mod = (a, n) => ((a % n) + n) % n;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const env = (pos, times, k) => { let v = 0; for (const t of times) { let d = pos - t; if (d < 0) d += 4; v = Math.max(v, Math.exp(-d / k)); } return v; };
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* ---------------- renderer ---------------- */
const stage = document.getElementById('stage');
const canvas = document.createElement('canvas'); canvas.id = 'c3d'; canvas.setAttribute('aria-hidden', 'true');
document.getElementById('wideHost').after(canvas);
const coarse = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03051a);
scene.fog = new THREE.FogExp2(0x070b2e, .045);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
const camera = new THREE.PerspectiveCamera(40, 16 / 9, .05, 80);

/* ---------------- materials ---------------- */
const RIM = { col: { value: new THREE.Color(0x3d64ff) }, amt: { value: .55 }, off: { value: 0 }, hatch: { value: .45 } };
const ramp = (() => { const t = new THREE.DataTexture(new Uint8Array([55, 135, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toonCache = new Map();
function toon(color, o = {}) {
  const rim = o.rim !== false, k = color + '|' + (o.map ? o.map.uuid : '') + '|' + (o.side || 0) + '|' + rim;
  if (toonCache.has(k)) return toonCache.get(k);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp, map: o.map || null, side: o.side || THREE.FrontSide });
  // anime look: hard fresnel rim light + manga-style hatching in the deepest shadows
  m.onBeforeCompile = sh => {
    sh.uniforms.rimCol = RIM.col; sh.uniforms.rimAmt = rim ? RIM.amt : RIM.off; sh.uniforms.hatchAmt = RIM.hatch;
    sh.fragmentShader = 'uniform vec3 rimCol; uniform float rimAmt; uniform float hatchAmt;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
      { vec3 vd = normalize(vViewPosition); float fr = 1. - clamp(dot(normal, vd), 0., 1.);
        outgoingLight += rimCol * smoothstep(.7, .86, fr) * rimAmt;
        float lum = dot(outgoingLight, vec3(.299, .587, .114));
        float hatch = step(.6, fract((gl_FragCoord.x - gl_FragCoord.y) / 5.));
        outgoingLight *= 1. - (1. - smoothstep(.015, .07, lum)) * hatch * hatchAmt; }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'toonrim' + rim;
  toonCache.set(k, m); return m;
}
const olCache = new Map();
function outlineMat(th) {
  if (olCache.has(th)) return olCache.get(th);
  const m = new THREE.MeshBasicMaterial({ color: 0x02030c, side: THREE.BackSide });
  m.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${th.toFixed(4)};`); };
  m.customProgramCacheKey = () => 'ol' + th; olCache.set(th, m); return m;
}
function part(geo, mat, o = {}) {
  const g = new THREE.Group(), m = new THREE.Mesh(geo, mat);
  m.castShadow = o.cast !== false; m.receiveShadow = !!o.receive; g.add(m);
  const th = o.outline === undefined ? .011 : o.outline;
  if (th) g.add(new THREE.Mesh(geo, outlineMat(th)));
  return g;
}
const BRASS = new THREE.MeshStandardMaterial({ color: 0xe0a948, metalness: .9, roughness: .26, envMapIntensity: 1.25, side: THREE.DoubleSide });
const LACQUER = new THREE.MeshStandardMaterial({ color: 0x07080f, metalness: .25, roughness: .12, envMapIntensity: 1.1 });
const CHROME = new THREE.MeshStandardMaterial({ color: 0xbfc6d8, metalness: 1, roughness: .2 });

/* ---------------- canvas textures ---------------- */
function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.repeat); }
  t.userData.redraw = () => { const g = c.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; };
  return t;
}
const brickTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#10142e'; g.fillRect(0, 0, w, h);
  const bw = 64, bh = 28;
  for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
    const x = c * bw + (r % 2 ? bw / 2 : 0), v = 26 + Math.random() * 18;
    g.fillStyle = `rgb(${v + 8},${v + 6},${v + 30})`; g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
  }
}, { repeat: [7, 3] });
const cityTex = canvasTex(1024, 512, (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#060a2a'); sky.addColorStop(.6, '#1b2a7a'); sky.addColorStop(1, '#4b3a8a');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,240,210,.9)'; g.beginPath(); g.arc(820, 90, 34, 0, TAU); g.fill();
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .7})`; g.fillRect(Math.random() * w, Math.random() * h * .45, 2, 2); }
  for (let layer = 0; layer < 2; layer++) for (let x = -20; x < w; x += 40 + Math.random() * 50) {
    const bw = 40 + Math.random() * 70, bh = (layer ? 120 : 200) + Math.random() * 220;
    g.fillStyle = layer ? '#0a1136' : '#070c28'; g.fillRect(x, h - bh, bw, bh);
    for (let k = 0; k < bh / 9; k++) if (Math.random() > .55) { g.fillStyle = Math.random() > .3 ? 'rgba(255,190,90,.85)' : 'rgba(150,190,255,.7)'; g.fillRect(x + 4 + Math.random() * (bw - 10), h - bh + 6 + Math.random() * (bh - 10), 4, 5); }
  }
});
const neonTex = canvasTex(1024, 300, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.textAlign = 'center';
  g.font = `800 132px 'Playfair Display', Georgia, serif`;
  for (const [blur, col] of [[40, '#3f6bff'], [14, '#8fb0ff'], [0, '#eef3ff']]) { g.shadowBlur = blur; g.shadowColor = '#5a86ff'; g.fillStyle = col; g.fillText('NOCHE AZUL', w / 2, 150); }
  g.font = `700 46px 'DM Sans', sans-serif`;
  for (const [blur, col] of [[20, '#ffb84d'], [0, '#fff1cc']]) { g.shadowBlur = blur; g.shadowColor = '#ff9a3d'; g.fillStyle = col; g.fillText('L I V E   T O N I G H T', w / 2, 240); }
});
Promise.all([document.fonts.load("800 132px 'Playfair Display'"), document.fonts.load("700 46px 'DM Sans'")]).then(() => neonTex.userData.redraw()).catch(() => {});
const dotTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.4, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });

/* ---------------- room ---------------- */
const STAGE_Y = .6;
{
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: .32, metalness: .1, envMapIntensity: .35 });
  const stg = new THREE.Mesh(new THREE.BoxGeometry(15, STAGE_Y, 5.4), floorMat); stg.position.set(0, STAGE_Y / 2, -.95); stg.receiveShadow = true; scene.add(stg);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(15, .04, .04), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, .9, .35) })); lip.position.set(0, STAGE_Y - .02, 1.73); scene.add(lip);
  const aud = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), toon(0x0b0d22, { rim: false })); aud.rotation.x = -Math.PI / 2; aud.position.set(0, 0, 9); aud.receiveShadow = true; scene.add(aud);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), toon(0xffffff, { map: brickTex, rim: false })); wall.position.set(0, 4, -3.6); wall.receiveShadow = true; scene.add(wall);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.2), new THREE.MeshBasicMaterial({ map: cityTex, fog: false })); win.position.set(2.6, 4.0, -3.55); scene.add(win);
  const frameM = toon(0x05071a, { rim: false });
  [[2.6, 5.62, 4.8, .12], [2.6, 2.38, 4.8, .12], [.27, 4, .12, 3.3], [4.93, 4, .12, 3.3], [2.6, 4, .07, 3.2], [1.45, 4, .05, 3.2], [3.75, 4, .05, 3.2]].forEach(([x, y, w, h]) => { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, .1), frameM); f.position.set(x, y, -3.5); scene.add(f); });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.23), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.8, 1.8, 1.8) }));
  neon.position.set(-3.3, 4.7, -3.5); scene.add(neon); C3.neon = neon;
  // side curtains with folds
  const curtGeo = new THREE.PlaneGeometry(3, 8, 48, 1); const p = curtGeo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * .12); curtGeo.computeVertexNormals();
  for (const s of [-1, 1]) { const c = new THREE.Mesh(curtGeo, toon(0x1a1f6e, { side: THREE.DoubleSide, rim: false })); c.position.set(s * 8.4, 4, -1.8); c.rotation.y = -s * .9; c.receiveShadow = true; scene.add(c); }
  const val = new THREE.Mesh(new THREE.BoxGeometry(18, 1.1, .3), toon(0x151a5c, { rim: false })); val.position.set(0, 7.1, 1.9); scene.add(val);
  // lighting truss
  const truss = new THREE.Mesh(new THREE.BoxGeometry(14, .12, .12), toon(0x0c0f24, { rim: false })); truss.position.set(0, 6.4, 1.2); scene.add(truss);
}

/* ---------------- people ---------------- */
function hair(style, head, m, accent) {
  const capGeo = new THREE.SphereGeometry(.128, 18, 12, 0, TAU, 0, Math.PI * .56);
  const cap = part(capGeo, m, { outline: .009 }); cap.scale.set(.95, 1.12, 1.04); cap.position.set(0, .118, -.006); cap.rotation.x = -.5; head.add(cap);  // tilted back so the hairline sits above the brows
  if (style === 'spiky') {
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * TAU, tilt = .55 + (i % 3) * .2, d = V(Math.sin(a) * Math.sin(tilt), Math.cos(tilt), Math.cos(a) * Math.sin(tilt) - .25).normalize();
      if (d.z > .55) continue;
      const sp = part(new THREE.ConeGeometry(.045, .13, 6), m, { outline: .007 });
      sp.quaternion.setFromUnitVectors(V(0, 1, 0), d); sp.position.copy(d.clone().multiplyScalar(.12)).add(V(0, .135, 0)); head.add(sp);
    }
  } else if (style === 'curly') {
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399, r = .024 + (i % 5) * .009;
      const d = V(Math.sin(a) * (.045 + (i % 4) * .014), .19 + Math.abs(Math.cos(i * 1.7)) * .035, Math.cos(a) * (.04 + (i % 3) * .015) - .035);
      if (d.z > .06 && d.y < .24) continue;
      const c = part(new THREE.SphereGeometry(r, 8, 6), m, { outline: .006 }); c.position.copy(d); head.add(c);
    }
  } else if (style === 'long') {
    const back = part(new THREE.CapsuleGeometry(.12, .28, 4, 12), m, { outline: .009 }); back.scale.set(1.05, 1, .55); back.position.set(0, -.02, -.07); head.add(back);
  } else if (style === 'cap') {
    const c = part(new THREE.SphereGeometry(.135, 18, 10, 0, TAU, 0, Math.PI * .5), toon(accent), { outline: .009 }); c.scale.set(.96, .95, 1.05); c.position.set(0, .14, 0); head.add(c);
    const brim = part(new THREE.CylinderGeometry(.11, .11, .012, 16, 1, false, -Math.PI / 2, Math.PI), toon(accent), { outline: .006 }); brim.position.set(0, .15, .07); brim.rotation.x = .12; head.add(brim);
  } else if (style === 'slick') {
    const t = part(new THREE.SphereGeometry(.06, 10, 8), m, { outline: .007 }); t.scale.set(1.8, .7, 1.4); t.position.set(-.02, .225, .02); head.add(t);
  }
}
function person(o) {
  const skin = toon(o.skin), shirt = toon(o.shirt), pants = toon(o.pants), hairM = toon(o.hair), shoe = toon(0x0c0c14);
  const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = .94; root.add(hips);
  const J = { root, hips, legs: [], arms: [] };
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * .1, 0, 0); hips.add(hip);
    const th = part(new THREE.CapsuleGeometry(.082, .32, 4, 10), pants); th.position.y = -.23; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -.46; hip.add(knee);
    const sh = part(new THREE.CapsuleGeometry(.066, .31, 4, 10), pants); sh.position.y = -.22; knee.add(sh);
    const ft = part(new THREE.BoxGeometry(.11, .08, .27), shoe, { outline: .008 }); ft.position.set(0, -.45, .06); knee.add(ft);
    J.legs.push({ hip, knee });
  }
  const spine = new THREE.Group(); hips.add(spine); J.spine = spine;
  const pelvis = part(new THREE.SphereGeometry(.15, 14, 10), pants); pelvis.scale.set(1.18, .72, .82); spine.add(pelvis);
  const torso = part(new THREE.CapsuleGeometry(.17, .22, 4, 14), shirt); torso.scale.set(1.14, 1, .72); torso.position.y = .27; spine.add(torso);
  if (o.jacket) { const lap = part(new THREE.CapsuleGeometry(.175, .2, 4, 14, ), toon(o.jacket)); lap.scale.set(1.17, 1.02, .76); lap.position.set(0, .26, -.004); spine.add(lap);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(.09, .24), toon(0x8f95ac)); sh.position.set(0, .36, .133); spine.add(sh);
    if (o.tie) { const tie = new THREE.Mesh(new THREE.BoxGeometry(.028, .2, .01), toon(o.tie, { rim: false })); tie.position.set(0, .33, .138); spine.add(tie); } }
  if (o.dress) { const sk = part(new THREE.CylinderGeometry(.19, .3, .55, 16, 1, true), toon(o.shirt, { side: THREE.DoubleSide })); sk.position.y = -.2; spine.add(sk); }
  const chest = new THREE.Group(); chest.position.y = .45; spine.add(chest); J.chest = chest;
  const neck = part(new THREE.CylinderGeometry(.045, .052, .12, 10), skin, { outline: .007 }); neck.position.y = .05; chest.add(neck);
  const head = new THREE.Group(); head.position.y = .1; chest.add(head); J.head = head;
  const skull = part(new THREE.SphereGeometry(.12, 22, 16), skin); skull.scale.set(.92, 1.1, 1); skull.position.y = .11; head.add(skull);
  const jaw = part(new THREE.SphereGeometry(.085, 14, 10), skin, { outline: .008 }); jaw.scale.set(1, .8, 1.05); jaw.position.set(0, .05, .03); head.add(jaw);
  const eyeM = toon(0x0a0a16); J.eyes = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(.021, 10, 8), toon(0xf4f1ea, { rim: false })); w.scale.set(1.15, 1.35, .4); w.position.set(s * .043, .12, .113); head.add(w);
    const e = new THREE.Mesh(new THREE.SphereGeometry(.015, 10, 8), eyeM); e.scale.set(1, 1.5, .45); e.position.set(s * .042, .118, .118); head.add(e); J.eyes.push(e); J.eyes.push(w);
    const b = new THREE.Mesh(new THREE.BoxGeometry(.046, .011, .012), hairM); b.position.set(s * .045, .163, .114); b.rotation.z = -s * .14; head.add(b);
    const ear = part(new THREE.SphereGeometry(.025, 8, 6), skin, { outline: .005 }); ear.scale.set(.5, 1, .8); ear.position.set(s * .112, .11, 0); head.add(ear);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.016, .045, 6), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, .088, .127); head.add(nose);
  hair(o.hairStyle, head, hairM, o.accent);
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * .225, -.01, 0); chest.add(sh);
    const ball = part(new THREE.SphereGeometry(.072, 12, 8), o.jacket ? toon(o.jacket) : shirt, { outline: .009 }); sh.add(ball);
    const up = part(new THREE.CapsuleGeometry(.058, .2, 4, 10), o.bareArms ? skin : (o.jacket ? toon(o.jacket) : shirt)); up.position.y = -.15; sh.add(up);
    const el = new THREE.Group(); el.position.y = -.3; sh.add(el);
    const fo = part(new THREE.CapsuleGeometry(.05, .19, 4, 10), o.rolled || o.bareArms ? skin : (o.jacket ? toon(o.jacket) : shirt)); fo.position.y = -.13; el.add(fo);
    const hand = part(new THREE.SphereGeometry(.052, 10, 8), skin, { outline: .007 }); hand.scale.set(.82, 1.25, .62); hand.position.y = -.29; el.add(hand);
    J.arms.push({ sh, el, l1: .3, l2: .29, side: s });
  }
  return J;
}

/* ---------------- instruments ---------------- */
const tubeMesh = (pts, r, mat = BRASS) => { const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, 'catmullrom', .15); const m = new THREE.Mesh(new THREE.TubeGeometry(c, pts.length * 12, r, 8, false), mat); m.castShadow = true; return m; };
const lathe = (prof, mat = BRASS, seg = 24) => { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg); g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
function trumpet() {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [.012, 0], [.015, .007], [.01, .016], [.006, .028], [.0055, .065]]));
  g.add(tubeMesh([[0, 0, .06], [0, 0, .2], [0, 0, .36]], .0056));                                        // leadpipe
  g.add(tubeMesh([[0, 0, .355], [0, -.01, .382], [0, -.034, .392], [0, -.052, .37], [0, -.054, .33], [0, -.054, .24]], .006)); // main tuning slide
  g.add(tubeMesh([[0, .022, .17], [0, .024, .1], [0, .03, .072], [0, .046, .068], [0, .054, .09], [0, .054, .2], [0, .054, .345]], .0064)); // bell bow + bell pipe
  g.add(tubeMesh([[.0, -.082, .222], [0, -.1, .224], [0, -.104, .25], [0, -.086, .252]], .0045));      // 3rd valve slide
  g.add(tubeMesh([[.0, -.082, .172], [0, -.094, .17], [0, -.097, .19], [0, -.084, .19]], .0042));      // 1st valve slide
  const bell = lathe([[.0066, 0], [.008, .05], [.011, .09], [.017, .115], [.028, .132], [.045, .145], [.061, .153], [.064, .155], [.06, .156]], BRASS, 32);
  bell.position.set(0, .054, .343); g.add(bell);
  const valves = [];
  [.172, .197, .222].forEach(z => {
    const cas = new THREE.Mesh(new THREE.CylinderGeometry(.0115, .0115, .11, 14), BRASS); cas.position.set(0, -.026, z); cas.castShadow = true; g.add(cas);
    for (const y of [.03, -.082]) { const cp = new THREE.Mesh(new THREE.CylinderGeometry(.0135, .0135, .012, 14), BRASS); cp.position.set(0, y, z); g.add(cp); }
    const btn = new THREE.Group(); btn.position.set(0, 0, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.0028, .0028, .036, 6), CHROME); stem.position.y = .052; btn.add(stem);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.0105, .0105, .006, 14), toon(0xf6ecd4)); cap.position.y = .072; btn.add(cap);
    g.add(btn); valves.push(btn);
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.009, .0016, 6, 14), BRASS); ring.position.set(0, .012, .12); ring.rotation.y = Math.PI / 2; g.add(ring);
  g.userData = { valves, bell: V(0, .054, .5), grip: V(.03, -.045, .2), press: V(-.008, .082, .2) };
  return g;
}
function uprightBass() {
  const g = new THREE.Group(), wood = toon(0xa0521e), dark = toon(0x14100c);
  const R = [[0, 0], [.27, .05], [.34, .22], [.31, .4], [.2, .52], [.22, .62], [.29, .78], [.25, .97], [.12, 1.1], [0, 1.14]];
  const sh = new THREE.Shape(); sh.moveTo(0, 0);
  sh.splineThru(R.slice(1).map(p => new THREE.Vector2(p[0], p[1])));
  sh.splineThru(R.slice(0, -1).reverse().map(p => new THREE.Vector2(-p[0], p[1])));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .14, bevelEnabled: true, bevelThickness: .035, bevelSize: .03, bevelSegments: 3, curveSegments: 28 }); geo.translate(0, 0, -.07);
  const body = part(geo, wood, { outline: .012 }); body.position.y = .16; g.add(body);
  const fb = part(new THREE.BoxGeometry(.065, 1.0, .03), dark, { outline: .006 }); fb.position.set(0, 1.12, .1); fb.rotation.x = -.05; g.add(fb);
  const neck = part(new THREE.BoxGeometry(.05, .5, .06), wood, { outline: .006 }); neck.position.set(0, 1.5, .05); g.add(neck);
  const scroll = part(new THREE.TorusGeometry(.04, .022, 8, 16), wood, { outline: .006 }); scroll.position.set(0, 1.8, .04); scroll.rotation.y = Math.PI / 2; g.add(scroll);
  for (let i = 0; i < 4; i++) { const pg = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .14, 6), CHROME); pg.rotation.z = Math.PI / 2; pg.position.set(0, 1.62 + i * .045, .05); g.add(pg); }
  const bridge = part(new THREE.BoxGeometry(.16, .07, .015), toon(0xe9d6a8), { outline: .004 }); bridge.position.set(0, .62, .13); g.add(bridge);
  const tail = part(new THREE.BoxGeometry(.09, .3, .02), dark, { outline: .005 }); tail.position.set(0, .4, .12); g.add(tail);
  for (let i = 0; i < 4; i++) { const x = (i - 1.5) * .014; const st = new THREE.Mesh(new THREE.CylinderGeometry(.0016, .0016, 1.15, 4), CHROME); st.position.set(x, 1.0, .125); g.add(st); }
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(.008, .004, .2, 6), CHROME); pin.position.y = .08; g.add(pin);
  return g;
}
function grandPiano() {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.5, 0); sh.lineTo(1.5, .5);
  sh.bezierCurveTo(1.5, .92, .98, .9, .86, 1.24); sh.bezierCurveTo(.74, 1.6, .62, 1.92, .3, 1.92); sh.lineTo(0, 1.92); sh.closePath();
  const caseGeo = new THREE.ExtrudeGeometry(sh, { depth: .3, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 2, curveSegments: 24 }); caseGeo.rotateX(-Math.PI / 2);
  const cs = new THREE.Mesh(caseGeo, LACQUER); cs.position.y = .72; cs.castShadow = true; g.add(cs);
  const csOl = new THREE.Mesh(caseGeo, outlineMat(.012)); csOl.position.y = .72; g.add(csOl);
  const inner = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), toon(0xb48a3c)); inner.rotation.x = -Math.PI / 2; inner.scale.set(.96, .97, 1); inner.position.set(.03, .99, -.03); g.add(inner);
  const lidGeo = new THREE.ExtrudeGeometry(sh, { depth: .018, bevelEnabled: false, curveSegments: 24 }); lidGeo.rotateX(-Math.PI / 2);
  const lid = new THREE.Group(); lid.position.set(0, 1.03, 0); const lm = new THREE.Mesh(lidGeo, LACQUER); lm.castShadow = true; lid.add(lm); lid.add(new THREE.Mesh(lidGeo, outlineMat(.01)));
  lid.rotation.z = .62; g.add(lid);
  const prop = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .78, 6), LACQUER); prop.position.set(1.18, 1.32, -1.0); prop.rotation.z = .5; g.add(prop);
  [[.12, -.12], [1.38, -.18], [.32, -1.7]].forEach(([x, z]) => { const l = part(new THREE.CylinderGeometry(.05, .035, .72, 10), LACQUER, { outline: .008 }); l.position.set(x, .36, z); g.add(l); });
  const keybed = part(new THREE.BoxGeometry(1.5, .07, .2), LACQUER, { outline: .006 }); keybed.position.set(.75, .76, .09); g.add(keybed);
  const white = part(new THREE.BoxGeometry(1.36, .025, .15), toon(0xf4efe2), { outline: .004 }); white.position.set(.75, .805, .1); g.add(white);
  const blackGeo = new THREE.BoxGeometry(.012, .02, .09), bk = new THREE.InstancedMesh(blackGeo, toon(0x08080c), 36), m4 = new THREE.Matrix4();
  let n = 0; for (let i = 0; i < 52 && n < 36; i++) { if ([2, 6].includes(i % 7)) continue; m4.makeTranslation(.07 + (i + .5) * (1.36 / 52) + .0, .825, .065); bk.setMatrixAt(n++, m4); }
  bk.count = n; g.add(bk);
  [-.01, 1.51].forEach(x => { const ch = part(new THREE.BoxGeometry(.06, .1, .22), LACQUER, { outline: .005 }); ch.position.set(x === -.01 ? .03 : 1.47, .8, .1); g.add(ch); });
  const bench = part(new THREE.BoxGeometry(.75, .07, .35), LACQUER, { outline: .008 }); bench.position.set(.75, .5, .62); g.add(bench);
  [[.42, .5], [1.08, .5], [.42, .74], [1.08, .74]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .48, 6), LACQUER); l.position.set(x, .24, z); g.add(l); });
  return g;
}
function conga(h, r) {
  const g = new THREE.Group();
  const body = lathe([[r * .78, 0], [r * .95, h * .25], [r * 1.02, h * .55], [r * .9, h * .9], [r * .86, h]], toon(0x8c2f1a), 24);
  body.rotation.x = -Math.PI / 2; body.position.y = 0; g.add(body);
  const ol = new THREE.Mesh(body.geometry, outlineMat(.01)); ol.rotation.x = -Math.PI / 2; g.add(ol);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(r * .9, r * .9, .02, 24), toon(0xefe2c4)); head.position.y = h + .005; g.add(head);
  for (const y of [h - .02, h * .5, .03]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * (y > h * .8 ? .9 : y < .1 ? .8 : 1.02), .008, 6, 24), CHROME); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
  g.userData.top = h + .02;
  return g;
}

/* ---------------- band ---------------- */
const band = {};
{
  // trumpeter (the player): white shirt, rolled sleeves, spiky hair
  const t = person({ skin: 0xdba46c, shirt: 0x9fa3b4, pants: 0x1c2136, hair: 0x08080f, hairStyle: 'curly', rolled: true });
  t.root.position.set(-.2, STAGE_Y, .55); t.root.rotation.y = .12; scene.add(t.root);
  const tr = trumpet(); t.head.add(tr); t.horn = tr; band.trump = t;
  // Tomás: bass, dark suit
  const b = person({ skin: 0xc98c5a, shirt: 0xeef0f6, pants: 0x151b45, jacket: 0x1d2a62, hair: 0x0d0d12, hairStyle: 'slick', tie: 0xe2b43c });
  b.root.position.set(-2.75, STAGE_Y, -.8); b.root.rotation.y = .42; scene.add(b.root);
  const bs = uprightBass(); bs.position.set(.34, 0, .2); bs.rotation.set(-.12, -.35, .1); b.root.add(bs); b.inst = bs; band.bass = b;
  // Inés: piano, burgundy dress, long hair
  const pi = grandPiano(); pi.position.set(2.05, STAGE_Y, -1.25); pi.rotation.y = -Math.PI / 2; scene.add(pi);
  const p = person({ skin: 0xdba27e, shirt: 0xc4263f, pants: 0x8e1c34, hair: 0x2a1036, hairStyle: 'long', dress: true, bareArms: true });
  p.root.position.set(.75, 0, .62); p.root.rotation.y = Math.PI; pi.add(p.root);
  p.hips.position.y = .58; p.legs.forEach(l => { l.hip.rotation.x = -1.5; l.knee.rotation.x = 1.45; });
  p.inst = pi; band.piano = p;
  // Rafa: congas, teal shirt, yellow cap
  const r = person({ skin: 0x9c5e3a, shirt: 0x2fa89c, pants: 0x1a1a2a, hair: 0x0a0a0a, hairStyle: 'cap', accent: 0xe9c540, bareArms: true });
  r.root.position.set(4.55, STAGE_Y, .05); r.root.rotation.y = -.5; scene.add(r.root);
  const drums = [conga(.74, .15), conga(.78, .16), conga(.7, .14)];
  [[.3, .36], [-.03, .46], [-.36, .34]].forEach(([x, z], i) => { drums[i].position.set(x, .06, z); drums[i].rotation.x = -.12; r.root.add(drums[i]); });
  r.drums = drums; band.perc = r;
  // mic stand facing the trumpeter
  const ms = new THREE.Group(); ms.position.set(-.05, STAGE_Y, 1.25);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1.45, 6), CHROME); pole.position.y = .72; ms.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.14, .16, .03, 16), toon(0x111118)); ms.add(base);
  const mic = new THREE.Mesh(new THREE.CapsuleGeometry(.022, .08, 4, 8), CHROME); mic.position.set(0, 1.47, -.06); mic.rotation.x = 1.2; ms.add(mic);
  scene.add(ms);
}

/* ---------------- painted band: billboards built from the portrait art (body + face layers + hand sprites), drawn on twos ---------------- */
const IMGC = new Map(), gi = src => { let i = IMGC.get(src); if (!i) { i = new Image(); i.src = src; IMGC.set(src, i); } return i; };
const ok = im => im.complete && im.naturalWidth > 0;
function makePainted(who, size, parent) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 768;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .04, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); mesh.renderOrder = 2;
  const grp = new THREE.Group(); grp.add(mesh); parent.add(grp);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(size * .3, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .5, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.scale.set(1, .5, 1); parent.add(sh);
  return { who, cv, g: cv.getContext('2d'), tex, mesh, grp, sh, size };
}
function putPainted(P, headX, headY, headZ, floorY) {   // head = where the eyes should be in the world
  const B = STAGE.body[P.who], cy = headY - (.5 - B.ey / 1024) * P.size;
  P.grp.position.set(headX, cy, headZ); P.sh.position.set(headX, floorY + .02, headZ + .1); P.base = { x: headX, y: cy, z: headZ };
}
function drawSp(g, img, U, sp) {
  if (!ok(img)) return; const a = sp.anchor || [.5, .5], W = sp.w * U, H = W * img.naturalHeight / img.naturalWidth;
  g.save(); g.translate(sp.at[0] * U, sp.at[1] * U); g.rotate((sp.rot || 0) * Math.PI / 180); g.scale(sp.flip ? -1 : 1, 1); g.drawImage(img, -a[0] * W, -a[1] * H, W, H); g.restore();
}
function paintChar(P, st) {
  const g = P.g, who = P.who, B = STAGE.body[who], R = RIGS[who], cv = P.cv, U = cv.width / 1024, H = STAGE.hand;
  g.clearRect(0, 0, cv.width, cv.height);
  const body = gi(B.src); if (ok(body)) g.drawImage(body, 0, 0, cv.width, cv.height);
  const fk = ((NZ.faceKey && NZ.faceKey[who]) || '0,0').split(',').map(Number), ex = B.ex || 512;
  for (const o of [B.nose, R.eyes[fk[0] * 2], R.eyes[fk[0] * 2 + 1], R.mouths[fk[1]]]) {
    const im = gi(o.src); if (!ok(im)) continue;
    const x = 512 + (o.x / 100 * 1024 - ex) * B.k, y = B.ey + (o.y / 100 * 1024 - B.rey) * B.k, w = o.w / 100 * 1024 * B.k * U, h = w * im.naturalHeight / im.naturalWidth;
    g.drawImage(im, x * U - w / 2, y * U - h / 2, w, h);
  }
  const pos = st.pos, sw = Math.sin(st.beat * Math.PI * 2);
  if (who === 'tomas') {
    drawSp(g, gi(STAGE.bass.src), U, { at: [720, 560], w: 900 * STAGE.bass.w / STAGE.bass.h });
    const pluck = env(pos, [1.5, 3, 3.5], .15) > .45;
    if (st.solo) drawSp(g, gi(H.bcond.src), U, { at: [700, 430], w: 250, rot: Math.sin(performance.now() / 260) * 6 }); else drawSp(g, gi(H.bh1.src), U, { at: [620, pluck ? 590 : 570], w: 440 });
  } else if (who === 'ines') {
    drawSp(g, gi(STAGE.piano.src), U, { at: [512, 905], w: 1010 });
    const key = env(pos, [.5, 1, 2.5, 3, 3.5], .1) > .35;
    drawSp(g, gi((key ? H.ih2 : H.ih1).src), U, key ? { at: [512, 760], w: 560 } : { at: [512, 720], w: 520 });
  } else if (who === 'rafa') {
    drawSp(g, gi(STAGE.congas.src), U, { at: [512, 880], w: 720 });
    const slap = env(pos, [.5, 1, 2, 2.5, 3, 3.5], .09) > .4;
    drawSp(g, gi((slap ? H.rh1 : H.rrest).src), U, slap ? { at: [512, 700], w: 560 } : { at: [512, 740], w: 600 });
  } else {
    const pl = st.playing;
    drawSp(g, gi(STAGE.trumpet.src), U, { anchor: [.94, .09], flip: true, w: 400, ...(pl ? { at: [512, 292], rot: 6 - (st.midi - 60) * .6 } : { at: [540, 620], rot: 62 }) });
    drawSp(g, gi((pl ? H.th1 : H.th2).src), U, pl ? { at: [560, 560], w: 380 } : { at: [512, 700], w: 460 });
  }
  // dissolve the bottom edge into the stage haze
  const y0 = cv.height * .84, gr = g.createLinearGradient(0, y0, 0, cv.height); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, y0, cv.width, cv.height - y0); g.globalCompositeOperation = 'source-over';
  P.tex.needsUpdate = true;
}
function movePainted(P, beat, amp, ph, bobAmt, rot) {
  const b = Math.abs(Math.sin(beat * Math.PI + ph)); P.grp.position.y = P.base.y + b * bobAmt * amp; P.grp.rotation.z = rot;
  P.grp.rotation.y = Math.atan2(camera.position.x - P.grp.position.x, camera.position.z - P.grp.position.z);
}
const PAINTED = {};   // painted billboards are no longer used on stage: the 3D models stay, the 2D art lives in the manga pop-ins

/* ---------------- crowd & tables ---------------- */
const crowd = (() => {
  const head = new THREE.SphereGeometry(.12, 10, 8); head.translate(0, .52, 0);
  const torso = new THREE.CapsuleGeometry(.2, .28, 3, 10); torso.scale(1.2, 1, .7); torso.translate(0, .12, 0);
  const geo = mergeGeometries([head, torso]);
  const mat = toon(0x0d1236);
  const seats = [];
  for (let row = 0; row < 6; row++) for (let i = 0; i < 9; i++) {
    const x = -7 + i * 1.75 + (row % 2) * .8 + (rnd() - .5) * .5, z = 3.0 + row * 1.35 + (rnd() - .5) * .4;
    if (Math.abs(x) < .6 && row < 1) continue;
    seats.push({ x, z, ph: rnd() * TAU, s: .9 + rnd() * .2, y: .62 + rnd() * .08 });
  }
  const im = new THREE.InstancedMesh(geo, mat, seats.length); im.castShadow = false; scene.add(im);
  const armGeo = new THREE.CapsuleGeometry(.045, .45, 3, 6); armGeo.translate(0, .22, 0);
  const arms = new THREE.InstancedMesh(armGeo, mat, seats.length * 2); scene.add(arms);
  // tables with candles
  const tGeo = mergeGeometries([new THREE.CylinderGeometry(.42, .42, .04, 20).translate(0, .72, 0), new THREE.CylinderGeometry(.04, .06, .72, 8).translate(0, .36, 0)]);
  const tables = new THREE.InstancedMesh(tGeo, toon(0x140f22, { rim: false }), 22), candles = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.6, .5), toneMapped: false }), 22);
  const glowM = new THREE.SpriteMaterial({ map: dotTex, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 });
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) {
    if (n >= 22) break; const x = -6.2 + i * 2.5 + (row % 2) * 1.2, z = 3.6 + row * 1.9;
    m4.makeTranslation(x, 0, z); tables.setMatrixAt(n, m4); m4.makeTranslation(x, .79, z); candles.setMatrixAt(n, m4);
    const sp = new THREE.Sprite(glowM); sp.position.set(x, .82, z); sp.scale.set(.6, .6, .6); scene.add(sp); n++;
  }
  tables.count = candles.count = n; scene.add(tables); scene.add(candles);
  return { im, arms, seats, m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler() };
})();

/* ---------------- lights ---------------- */
scene.add(new THREE.HemisphereLight(0x3a4cb0, 0x07061a, .7));
const cone = (() => {
  const vs = `varying float vH; varying vec3 vN; varying vec3 vV; varying float vZ; uniform float L;
    void main(){ vH = clamp(-position.y / L, 0., 1.); vec4 mv = modelViewMatrix * vec4(position,1.); vZ = -mv.z; vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`;
  // edge term gives the soft cylinder look; the depth fade stops the beam from washing out the frame when the camera is inside it
  const fs = `varying float vH; varying vec3 vN; varying vec3 vV; varying float vZ; uniform vec3 col; uniform float amt;
    void main(){ float edge = pow(abs(dot(vN, vV)), 2.4); float a = amt * edge * pow(1. - vH, 1.2) * smoothstep(0., .08, vH) * smoothstep(1.2, 4.5, vZ);
      gl_FragColor = vec4(col * a, a); }`;
  return (L, rad, col) => {
    const geo = new THREE.ConeGeometry(rad, L, 40, 1, true); geo.translate(0, -L / 2, 0);
    const m = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: { L: { value: L }, col: { value: new THREE.Color(col) }, amt: { value: .25 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    return new THREE.Mesh(geo, m);
  };
})();
const spots = {};
function addSpot(name, from, to, color, angle, base, shadow) {
  const l = new THREE.SpotLight(color, base, 20, angle, .55, 1.4); l.position.copy(from); l.target.position.copy(to); scene.add(l, l.target);
  if (shadow) { l.castShadow = true; l.shadow.mapSize.set(coarse ? 512 : 1024, coarse ? 512 : 1024); l.shadow.bias = -.0006; l.shadow.camera.near = 1; l.shadow.camera.far = 14; }
  const L = from.distanceTo(to) + .6, c = cone(L, Math.tan(angle) * L * .92, color);
  c.position.copy(from); c.quaternion.setFromUnitVectors(V(0, -1, 0), to.clone().sub(from).normalize()); scene.add(c);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, .32, 12), toon(0x0b0d22, { rim: false })); lamp.position.copy(from); lamp.quaternion.copy(c.quaternion); scene.add(lamp);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.17, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(3), toneMapped: false }));
  lens.position.copy(from).add(to.clone().sub(from).normalize().multiplyScalar(.17)); lens.lookAt(to); scene.add(lens);
  spots[name] = { l, c, base, k: 1, lens };
}
addSpot('trump', V(-.2, 6.3, 3.0), V(-.2, STAGE_Y, .5), 0xffc47a, .3, 55, true);
addSpot('bass', V(-3.4, 6.3, 2.4), V(-2.7, STAGE_Y, -.8), 0xffd9a8, .27, 55, true);
addSpot('piano', V(2.2, 6.3, 2.2), V(1.6, STAGE_Y, -.9), 0xff9f6a, .3, 42, false);
addSpot('perc', V(5.2, 6.3, 2.4), V(4.5, STAGE_Y, .2), 0x7ea6ff, .27, 60, false);
addSpot('rimL', V(-5.5, 5.8, -3.0), V(-1.5, 1.2, .6), 0x3d63ff, .38, 70, false);
addSpot('rimR', V(5.8, 5.8, -3.0), V(1.0, 1.2, .5), 0x7a52ff, .38, 70, false);
const bellLight = new THREE.PointLight(0xffb060, 0, 3, 2); scene.add(bellLight);

/* dust in the beams */
const dust = (() => {
  const N = 520, pos = new Float32Array(N * 3), sp = [];
  for (let i = 0; i < N; i++) { pos[i * 3] = (rnd() - .5) * 12; pos[i * 3 + 1] = .8 + rnd() * 5.5; pos[i * 3 + 2] = -2 + rnd() * 5; sp.push(.05 + rnd() * .15); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: .035, map: dotTex, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2b0 }));
  scene.add(p); return { p, pos, sp, N };
})();

/* solo aura: swirling blue/amber flame behind the trumpeter */
const aura = (() => {
  const m = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, amt: { value: 0 }, c1: { value: new THREE.Color(0x2a5bff) }, c2: { value: new THREE.Color(0xffb04a) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float t, amt; uniform vec3 c1, c2;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a * n(p); p *= 2.03; a *= .5; } return v; }
      void main(){ vec2 p = vUv * 2. - 1.; p.y += .15; float r = length(p * vec2(1., .72)); float ang = atan(p.y, p.x);
        float f = fbm(vec2(ang * 2.2, r * 3. - t * 1.6)) ; float g = fbm(vec2(ang * 4. + 3., r * 6. - t * 2.4));
        float flame = smoothstep(1.05, .25, r + (f - .5) * .9) * (.55 + .45 * g);
        float ray = pow(max(0., sin(ang * 14. + f * 6. - t * 2.)), 18.) * smoothstep(1.2, .2, r) * .8;
        vec3 col = mix(c1, c2, smoothstep(.35, .85, f + r * .3)) * .9;
        float a = clamp((flame + ray) * amt, 0., 1.); gl_FragColor = vec4(col * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.6), m); scene.add(mesh); return { mesh, m };
})();

/* ---------------- post ---------------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 288), .5, .4, .95); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, punch: { value: 0 }, vign: { value: 1.1 }, grain: { value: .07 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, punch, vign, grain; varying vec2 vUv;
    void main(){ vec2 c = vUv - .5; float ca = .002 + punch * .008;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * ca).b);
      float l = dot(col, vec3(.299,.587,.114));
      col = mix(col, col * vec3(.82,.92,1.3), (1. - smoothstep(0., .45, l)) * .4);
      col = mix(col, col * vec3(1.1,1.,.86), smoothstep(.55, 1., l) * .35);
      col *= 1. - dot(c, c) * vign;
      float g = fract(sin(dot(vUv * 913.7 + time, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - .5) * grain;
      gl_FragColor = vec4(col, 1.); }`
});
composer.addPass(grade);

function resize() {
  const r = stage.getBoundingClientRect(), w = Math.max(2, Math.round(r.width)), h = Math.max(2, Math.round(r.height));
  renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  bloom.resolution.set(Math.round(w / 2), Math.round(h / 2));
}
new ResizeObserver(resize).observe(stage); resize();

/* ---------------- IK ---------------- */
const _a = V(0, 0, 0), _b = V(0, 0, 0), _c = V(0, 0, 0), _d = V(0, 0, 0), _e = V(0, 0, 0), _f = V(0, 0, 0);
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), DOWN = V(0, -1, 0);
function ik(arm, target, pole) {
  const S0 = arm.sh.getWorldPosition(_a), d = _b.subVectors(target, S0), L1 = arm.l1, L2 = arm.l2;
  const dist = clamp(d.length(), Math.abs(L1 - L2) + .02, L1 + L2 - .004); d.normalize();
  const A = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1));
  const p = _c.subVectors(pole, S0); p.addScaledVector(d, -p.dot(d)); if (p.lengthSq() < 1e-6) p.set(0, -1, 0); p.normalize();
  const up = _d.copy(d).multiplyScalar(Math.cos(A)).addScaledVector(p, Math.sin(A));
  const E = _e.copy(S0).addScaledVector(up, L1), fore = _f.copy(S0).addScaledVector(d, dist).sub(E).normalize();
  const pq = arm.sh.parent.getWorldQuaternion(_q1), wq = _q2.setFromUnitVectors(DOWN, up);
  arm.sh.quaternion.copy(pq).invert().multiply(wq);
  arm.el.quaternion.setFromUnitVectors(DOWN, fore.applyQuaternion(wq.invert()));
}
const tw = (obj, x, y, z) => obj.localToWorld(V(x, y, z));

/* ---------------- camera director ---------------- */
const P = { tp: V(-.2, 2.2, .55), bs: V(-2.75, 2.05, -.8), pn: V(1.45, 1.85, -.5), cg: V(4.55, 1.55, .3) };
const SHOTS = {
  WIDE: u => ({ pos: V(lerp(-1.2, 1.2, u), 2.8, 9.6), look: V(.5, 1.9, -.8), fov: 40 }),
  WIDE_LOW: u => ({ pos: V(lerp(1.2, -.6, u), 1.38, 7.4), look: V(-.2, 2.3, -.6), fov: 40 }),
  TRUMP_LOW: u => ({ pos: P.tp.clone().add(V(1.45 - u * .2, -1.0, 2.3 - u * .4)), look: P.tp.clone().add(V(0, -.15, .1)), fov: 32 }),
  TRUMP_34: u => ({ pos: P.tp.clone().add(V(-1.75 + u * .25, .05, 2.35 - u * .3)), look: P.tp.clone().add(V(.15, -.15, .25)), fov: 30 }),
  TRUMP_PROFILE: u => ({ pos: P.tp.clone().add(V(2.0 - u * .3, -.12, .9)), look: P.tp.clone().add(V(-.1, -.05, .45)), fov: 28 }),
  BEHIND: u => ({ pos: V(-.9 + u * .6, 2.55, -2.7), look: V(.2, 1.7, 6), fov: 52 }),
  BASS: u => ({ pos: P.bs.clone().add(V(.55 - u * .3, -.1, 2.6)), look: P.bs.clone().add(V(.15, -.3, .15)), fov: 34 }),
  PIANO: u => ({ pos: P.pn.clone().add(V(1.7 - u * .25, .3, 1.8)), look: P.pn.clone().add(V(.15, -.25, 0)), fov: 34 }),
  PIANO_KEYS: u => ({ pos: P.pn.clone().add(V(.5 + u * .2, .55, 1.35)), look: P.pn.clone().add(V(.55, -.5, -.15)), fov: 38 }),
  CONGA: u => ({ pos: P.cg.clone().add(V(-1.7, .6, 2.0 - u * .25)), look: P.cg.clone().add(V(0, .3, 0)), fov: 34 }),
  ORBIT: (u, h) => { const a = -.9 + u * 1.3, r = 2.7 - h * .9; return { pos: P.tp.clone().add(V(Math.sin(a) * r, -.35 + .25 * Math.sin(u * 3), Math.cos(a) * r)), look: P.tp.clone().add(V(0, -.1, .2)), fov: 36 }; },
  CRANE: u => ({ pos: V(0, lerp(6.6, 3.0, ease(u)), lerp(13, 10.5, u)), look: V(.3, lerp(1.2, 1.9, u), -.8), fov: 44 }),
  CRANE_OUT: u => ({ pos: V(0, lerp(2.8, 6.8, ease(u)), lerp(9, 14, ease(u))), look: V(.3, 1.8, -.8), fov: 44 }),
};
const LISTS = {
  count: ['CRANE'], perf: ['WIDE_LOW', 'TRUMP_LOW', 'BASS', 'BEHIND', 'TRUMP_34', 'CONGA', 'WIDE'],
  comp: ['PIANO', 'PIANO_KEYS', 'CONGA', 'PIANO'], solo: ['TRUMP_LOW', 'ORBIT', 'BEHIND', 'TRUMP_PROFILE', 'ORBIT', 'WIDE_LOW', 'TRUMP_34', 'ORBIT'],
  break: ['BASS', 'WIDE'], head: ['WIDE', 'TRUMP_34', 'WIDE_LOW', 'BEHIND'], tag: ['CRANE_OUT'], gap: ['WIDE']
};
function pickShot(seg, beat) {
  if (C3.forced) return { id: C3.forced, a: Math.floor(beat / 8) * 8, len: 8 };
  if (!seg) return { id: 'WIDE', a: Math.floor(beat / 16) * 16, len: 16 };
  const k = seg.k, step = k === 'count' ? 4 : (k === 'perf' || k === 'head' || k === 'solo' || k === 'comp') ? 16 : 8;
  const i = Math.max(0, Math.floor((beat - seg.a) / step)), L = LISTS[k] || ['WIDE'];
  const off = (k === 'perf' || k === 'head') ? Math.floor(seg.a / 8) : 0;
  return { id: L[(i + off) % L.length], a: seg.a + i * step, len: step };
}
const segAt = b => { for (const s of NZ.layout || []) if (b >= s.a && b < s.b) return s; return null; };

/* ---------------- per-frame ---------------- */
const st = { last: 0, shotKey: '', shake: 0, punch: 0, fovKick: 0, up: 1, lastHit: null, lastBar: -1, poseT: -1 };
const PLAY_SEGS = new Set(['perf', 'head', 'solo', 'comp', 'tag', 'count']);
function poseBand(beat, tq) {
  const m = NZ.mood || 'groove', amp = { worried: .35, encourage: .6, groove: 1, ecstatic: 1.45 }[m] || 1;
  const pos = mod(beat, 4), sw = Math.sin(beat * Math.PI), bob = Math.abs(Math.sin(beat * Math.PI));
  const seg = segAt(beat), k = seg ? seg.k : '', now = performance.now();
  const playing = (NZ.voices || []).some(v => v) || now - (NZ.lastNote || -1e9) < 180;
  const heat = NZ.heat || 0, midi = NZ.playMidi || 69, lean3 = { worried: .1, encourage: .03, groove: -.02, ecstatic: -.1 }[m] || 0;
  const idle = (J, a, phase = 0) => {
    const b2 = Math.abs(Math.sin(beat * Math.PI + phase));
    J.hips.position.y = (J.seated ? .58 : .94) - b2 * .03 * a;
    if (!J.seated) J.legs.forEach(l => { l.knee.rotation.x = b2 * .16 * a; l.hip.rotation.x = -b2 * .08 * a; });
    J.spine.rotation.z = Math.sin(beat * Math.PI + phase) * .045 * a;
  };
  // trumpeter
  const T = band.trump, upTarget = (playing || now - (NZ.lastNote || -1e9) < 1600 || PLAY_SEGS.has(k)) && k !== 'break' ? 1 : 0;
  st.up = lerp(st.up, upTarget, .25);
  idle(T, amp);
  const blow = playing ? 1 : .3;
  T.spine.rotation.x = -(.04 + heat * .16 + (midi - 69) * .004 * blow) * st.up + (1 - st.up) * .04;
  T.chest.rotation.x = -(heat * .08) * st.up;
  T.head.rotation.x = (-(midi - 69) * .008 * blow - heat * .06) * st.up + (1 - st.up) * (.12 + bob * .1);
  T.head.rotation.y = (1 - st.up) * -.3;
  const tr = T.horn;
  tr.position.set(0, lerp(-.6, .068, st.up), lerp(.24, .122, st.up));
  tr.rotation.set(lerp(1.3, .12 - (midi - 69) * .011 * blow - heat * .3 * (playing ? 1 : 0), st.up), 0, 0);
  const pv = [NZ.down?.[0], NZ.down?.[1] || NZ.down?.[3], NZ.down?.[2]];
  tr.userData.valves.forEach((v, i) => v.position.y = pv[i] ? -.014 : 0);
  const shut = (playing && heat > .45) || (tq % 3.4 < .12); T.eyes.forEach((e, i) => e.scale.y = shut ? .2 : (i % 2 ? 1.35 : 1.5));
  T.root.updateMatrixWorld(true);
  const g = tr.userData;
  ik(T.arms[0], tw(tr, g.press.x, g.press.y + .01, g.press.z), tw(T.root, -.8, .55, .1));            // right hand on the valves
  ik(T.arms[1], st.up > .5 ? tw(tr, g.grip.x, g.grip.y, g.grip.z) : tw(T.root, .28, .9, .05), tw(T.root, .85, .55, .2));
  // bass
  const B = band.bass; idle(B, amp * .8, .4);
  B.head.rotation.x = bob * .14 * amp; B.head.rotation.y = -.25;
  B.spine.rotation.y = .2;
  B.root.updateMatrixWorld(true);
  const pluck = env(pos, [0, 1.5, 2, 3, 3.5], .14), chordI = mod(Math.floor(beat / 4), 4);
  ik(B.arms[0], tw(B.inst, -.04 + pluck * .07, .78 + pluck * .03, .2 - pluck * .05), tw(B.root, -.7, .9, -.3));
  ik(B.arms[1], tw(B.inst, -.02, 1.32 + [0, .12, .2, 0][chordI], .13), tw(B.root, .7, 1.4, -.2));
  // piano
  const Pn = band.piano; Pn.seated = true; idle(Pn, amp * .6, .9);
  Pn.spine.rotation.x = .16 + bob * .04 * amp; Pn.head.rotation.x = .18 + Math.sin(beat * Math.PI + 1) * .08 * amp;
  Pn.root.updateMatrixWorld(true);
  let rx = 1.0, lx = .45, rDown = env(pos, [.5, 1, 2.5, 3, 3.5], .1), lDown = env(pos, [0, 2], .15);
  if (k === 'comp' && NZ.pianoLine) { for (const n of NZ.pianoLine) if (beat >= n.beat && beat < n.beat + n.dur) { rx = .55 + (n.midi - 60) / 30 * .8; rDown = Math.exp(-(beat - n.beat) / .12); break; } }
  ik(Pn.arms[0], tw(Pn.inst, rx, .86 + (1 - rDown) * .07, .12), tw(Pn.root, -.6, .7, -.3));
  ik(Pn.arms[1], tw(Pn.inst, lx, .86 + (1 - lDown) * .06, .12), tw(Pn.root, .6, .7, -.3));
  // congas
  const R = band.perc; idle(R, amp * 1.2, .2);
  R.head.rotation.x = bob * .2 * amp; R.spine.rotation.x = .12;
  R.root.updateMatrixWorld(true);
  const hl = env(pos, [1, 2, 3.5], .09), hr = env(pos, [.5, 2.5, 3], .09);
  const dl = R.drums[0], dr = R.drums[1];
  ik(R.arms[1], tw(dl, 0, dl.userData.top + .05 + (1 - hl) * .17, -.02), tw(R.root, .8, 1.0, -.3));
  ik(R.arms[0], tw(dr, 0, dr.userData.top + .05 + (1 - hr) * .17, -.02), tw(R.root, -.8, 1.0, -.3));
  // painted band (billboards)
  if (PAINTED.trump) { const st2 = { pos, beat, playing, midi, solo: k === 'solo' };
    for (const key in PAINTED) { const P = PAINTED[key]; paintChar(P, st2); }
    movePainted(PAINTED.trump, beat, amp, .3, .03, lean3 * .35 + (playing ? Math.sin(tq * 12) * .01 : 0));
    movePainted(PAINTED.bass, beat, amp * .8, .4, .025, Math.sin(beat * Math.PI) * .012 * amp);
    movePainted(PAINTED.piano, beat, amp * .6, .9, .02, Math.sin(beat * Math.PI * 2) * .01 * amp);
    movePainted(PAINTED.perc, beat, amp * 1.2, .2, .035, Math.sin(beat * Math.PI * 2) * .015 * amp); }
  // crowd
  const hands = m === 'ecstatic' || heat > .7, cr = crowd;
  cr.seats.forEach((s, i) => {
    const bb = Math.abs(Math.sin(beat * Math.PI + s.ph * .3)) * .05 * amp;
    cr.m4.compose(V(s.x, s.y + bb, s.z), cr.q.setFromEuler(cr.e.set(0, 0, Math.sin(beat * Math.PI + s.ph) * .05 * amp)), V(s.s, s.s, s.s)); cr.im.setMatrixAt(i, cr.m4);
    for (const side of [-1, 1]) {
      const up = hands && (i % 3 !== 0) ? 1 : 0, wave = Math.sin(beat * Math.PI + s.ph + side) * .25;
      cr.m4.compose(V(s.x + side * .22 * s.s, s.y + .3 + bb, s.z), cr.q.setFromEuler(cr.e.set(0, 0, side * (.25 + wave))), V(s.s, up ? s.s : .0001, s.s));
      cr.arms.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), cr.m4);
    }
  });
  cr.im.instanceMatrix.needsUpdate = true; cr.arms.instanceMatrix.needsUpdate = true;
  return { k, playing, heat };
}
function lights(k, playing, heat, t) {
  const solo = k === 'solo', comp = k === 'comp', brk = k === 'break';
  const want = { trump: solo ? .95 + heat * .2 : comp || brk ? .55 : 1.0, bass: solo ? .25 : brk ? 1.5 : .9, piano: solo ? .25 : comp ? 1.25 : .9, perc: solo ? .25 : .9, rimL: solo ? .7 + heat * .6 : 1, rimR: solo ? .7 + heat * .6 : 1 };
  for (const n in spots) { const s = spots[n]; s.k = lerp(s.k, want[n] ?? 1, .08); s.l.intensity = s.base * s.k; s.c.material.uniforms.amt.value = .11 * s.k + (n === 'trump' ? heat * .07 : 0); }
  RIM.col.value.setHSL(solo && heat > .5 ? .09 : .63, .9, .55); RIM.amt.value = .45 + (solo ? heat * .2 : 0);
  spots.rimL.l.color.setHSL(.62 + Math.sin(t * .4) * .03, .9, .6); spots.rimR.l.color.setHSL(.72 + Math.sin(t * .3) * .04, .9, .62);
  const bell = tw(band.trump.horn, 0, .054, .9); bellLight.position.copy(bell); bellLight.intensity = lerp(bellLight.intensity, (playing ? .9 : .1) + heat * 1.2, .3);
  C3.neon.material.color.setScalar(1.6 + Math.sin(t * 7) * .06 + (Math.sin(t * 23) > .97 ? -.6 : 0));
  aura.m.uniforms.t.value = t; aura.m.uniforms.amt.value = lerp(aura.m.uniforms.amt.value, solo ? clamp((heat - .25) * .9, 0, .55) * (playing ? 1 : .6) : 0, .06);
  aura.mesh.visible = aura.m.uniforms.amt.value > .01;
  aura.mesh.position.copy(P.tp).add(V(0, -.3, -1.4)); aura.mesh.quaternion.copy(camera.quaternion);
}
function moveDust(dt) {
  const d = dust; for (let i = 0; i < d.N; i++) { d.pos[i * 3 + 1] += d.sp[i] * dt * .3; d.pos[i * 3] += Math.sin(i + performance.now() / 3000) * dt * .02; if (d.pos[i * 3 + 1] > 6.3) d.pos[i * 3 + 1] = .8; }
  d.p.geometry.attributes.position.needsUpdate = true;
}
/* adaptive quality: if the device can't hold ~30 fps, step down resolution, then shadows, then bloom */
const Q = { level: 0, acc: 0, n: 0, basePR: renderer.getPixelRatio() };
function adaptQuality(delta) {
  if (delta > 250 || C3.noAdapt) return;        // tab was hidden or paused
  Q.acc += delta; Q.n++;
  if (Q.n < 45) return;
  const avg = Q.acc / Q.n; Q.acc = Q.n = 0;
  if (avg > 46 && Q.level < 3) {
    Q.level++;
    if (Q.level === 1) renderer.setPixelRatio(Math.max(.75, Q.basePR * .7));
    if (Q.level === 2) { renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material && 'needsUpdate' in o.material) o.material.needsUpdate = true; }); }
    if (Q.level === 3) { bloom.enabled = false; renderer.setPixelRatio(.6); }
    resize(); C3.quality = Q.level;
  }
}
C3.frame = (ts) => {
  if (ts - st.last < 31) return;               // ~30 fps is plenty and keeps phones cool
  adaptQuality(ts - st.last);
  const dt = Math.min(.1, (ts - st.last) / 1000); st.last = ts;
  if (C3.sceneNow === 'practice') return practiceFrame(ts, Math.min(.1, (ts - st.last) / 1000 || .033), st.last = ts);
  const beat = NZ.phase === 'title' ? ts / 577 : NZ.beat, t = ts / 1000;
  // characters move "on twos" (12 fps) like hand-drawn anime; the camera stays smooth
  const tq = Math.floor(t * 12) / 12, bq = NZ.phase === 'play' ? beat - (t - tq) / .577 : beat;
  let info = st.info;
  if (tq !== st.poseT || !info) { st.poseT = tq; info = st.info = poseBand(bq, tq); }
  lights(info.k, info.playing, info.heat, t);
  moveDust(dt);
  // camera
  const seg = segAt(beat), sh = pickShot(seg, beat), key = sh.id + sh.a;
  if (key !== st.shotKey) { st.shotKey = key; if (info.k === 'solo' && info.heat > .55) { st.punch = 1; st.fovKick = 6; } }
  const hit = NZ.hitFx; if (hit && hit !== st.lastHit) { st.lastHit = hit;  }
  const bar = Math.floor(beat / 4); if (bar !== st.lastBar) { st.lastBar = bar; if (info.k === 'solo' && info.heat > .6) { st.shake = .045; st.punch = Math.max(st.punch, .7); st.fovKick = Math.max(st.fovKick, 4); } }
  const u = clamp((beat - sh.a) / sh.len, 0, 1), s = (SHOTS[sh.id] || SHOTS.WIDE)(ease(u), info.heat);
  const hx = Math.sin(t * 1.3) * .02 + Math.sin(t * 2.9) * .01, hy = Math.sin(t * 1.7 + 1) * .015;
  const sx = (Math.random() - .5) * st.shake, sy = (Math.random() - .5) * st.shake;
  camera.position.copy(s.pos).add(V(hx + sx, hy + sy, 0)); camera.lookAt(s.look);
  camera.fov = s.fov - st.fovKick; camera.updateProjectionMatrix();
  st.shake *= .85; st.punch *= .9; st.fovKick *= .88;
  bloom.strength = .42 + info.heat * .28 + st.punch * .3;
  grade.uniforms.time.value = t % 100; grade.uniforms.punch.value = st.punch;
  composer.render(dt);
};
C3.shot = id => { C3.forced = id || null; };
C3._dbg = { THREE, scene, camera, renderer, band, composer, poseBand, ik };
C3.still = (o) => {
  if (o.scene !== 'practice') C3.setScene('club');
  if (o.scene === 'practice') { C3.setScene('practice'); Object.assign(NZ, { heat: .3, mood: o.mood || 'groove' }); if (o.playing) { NZ.lastNote = performance.now(); NZ.playMidi = 72; } pracPose(o.beat ?? 1.25, 0); const s = PSHOTS[o.shot || 'WIDE'](.5); camera.position.copy(s.pos); camera.lookAt(s.look); camera.fov = s.fov; camera.updateProjectionMatrix(); composer.render(.03); const url = renderer.domElement.toDataURL('image/jpeg', .9); C3.setScene('club'); return url; }   // render one moment: { beat, seg, heat, mood, playing, shot, u }
  Object.assign(NZ, { heat: o.heat ?? .3, mood: o.mood || 'groove' }); if (o.playing) { NZ.lastNote = performance.now(); NZ.playMidi = o.midi || 72; }
  const fakeSeg = { k: o.seg || 'perf', a: 0, b: 64 }, real = NZ.layout; NZ.layout = [fakeSeg];
  const info = poseBand(o.beat ?? 1.25, 0); info.k = fakeSeg.k; lights(info.k, !!o.playing, NZ.heat, 3);
  for (let i = 0; i < 40; i++) lights(info.k, !!o.playing, NZ.heat, 3 + i * .03);
  const s = SHOTS[o.shot || 'WIDE'](o.u ?? .5, NZ.heat); camera.position.copy(s.pos); camera.lookAt(s.look); camera.fov = s.fov; camera.updateProjectionMatrix();
  bloom.strength = .42 + NZ.heat * .28; NZ.layout = real; composer.render(.03); return renderer.domElement.toDataURL('image/jpeg', .9);
};
/* ---------------- practice room (3D): a cosy rehearsal lounge far off to the side of the club, same painted cast ---------------- */
const OX = 200, PR = {};
{
  const g = new THREE.Group(); scene.add(g); PR.g = g;
  const add = (m, x, y, z, rx = 0, ry = 0) => { m.position.set(OX + x, y, z); m.rotation.set(rx, ry, 0); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const wood = toon(0x6b3d22, { rim: false }), dark = toon(0x2a1510, { rim: false });
  const floorT = canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#7a4a2a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#6e4125' : '#835230'; c.fillRect(0, i * 64, w, 62); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, i * 64 + 62, w, 2); for (let j = 0; j < 3; j++) c.fillRect((i * 97 + j * 190) % w, i * 64, 2, 62); } });
  floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(2, 2);
  add(new THREE.Mesh(new THREE.PlaneGeometry(14, 10), toon(0xffffff, { map: floorT, rim: false })), 0, 0, 1, -Math.PI / 2);
  add(new THREE.Mesh(new THREE.PlaneGeometry(14, 6), toon(0xffffff, { map: brickTex, rim: false })), 0, 3, -2.6);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.1), new THREE.MeshBasicMaterial({ map: cityTex, fog: false })); win.position.set(OX + 1.9, 2.5, -2.55); g.add(win);
  for (const [x, y, w, h] of [[1.9, 3.58, 2.8, .1], [1.9, 1.42, 2.8, .1], [.55, 2.5, .1, 2.2], [3.25, 2.5, .1, 2.2], [1.9, 2.5, .06, 2.1]]) add(new THREE.Mesh(new THREE.BoxGeometry(w, h, .08), dark), x, y, -2.5);
  // rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), toon(0x1c2f66, { rim: false })); rug.scale.set(1, .6, 1); add(rug, 0, .01, .1, -Math.PI / 2);
  const rug2 = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.8, 40), toon(0xd6a23c, { rim: false })); rug2.scale.set(1, .6, 1); add(rug2, 0, .012, .1, -Math.PI / 2);
  // amp + music stand + plant
  const amp = add(new THREE.Mesh(new THREE.BoxGeometry(.8, .7, .4), toon(0x2b2a3a, {})), -2.6, .35, -1.3);
  add(new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), toon(0x8a6a3a, { rim: false })), -2.6, .38, -1.09);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.3, 6), dark), -1.6, .65, .1);
  const sheet = add(new THREE.Mesh(new THREE.BoxGeometry(.5, .35, .02), toon(0xf3e8c8, { rim: false })), -1.6, 1.3, .1, -.25);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.22, .17, .38, 12), toon(0x9a4a2a, {})), 3.7, .19, -1.6);
  for (let i = 0; i < 7; i++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(.09, .9, 6), toon(0x1c6a46, {})); add(lf, 3.7 + Math.sin(i * 2.4) * .25, .85, -1.6 + Math.cos(i * 2.4) * .2, Math.cos(i * 2.4) * .5, 0); lf.rotation.z = Math.sin(i * 2.4) * .5; }
  // hanging lamp + string lights
  add(new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1.6, 4), dark), -.4, 4.2, -.4);
  const shade = add(new THREE.Mesh(new THREE.ConeGeometry(.45, .35, 20, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.4, .6), side: THREE.DoubleSide, toneMapped: false })), -.4, 3.3, -.4);
  PR.lamp = new THREE.PointLight(0xffb060, 14, 11, 1.6); PR.lamp.position.set(OX - .4, 3.1, .3); g.add(PR.lamp);
  PR.fill = new THREE.PointLight(0x6a8cff, 5, 9, 1.8); PR.fill.position.set(OX + 2.4, 2.5, -1.6); g.add(PR.fill);
  PR.key = new THREE.SpotLight(0xffd9a0, 22, 12, .8, .6, 1.2); PR.key.position.set(OX + .6, 3.6, 3.4); PR.key.target.position.set(OX + .2, 1.3, -.4); g.add(PR.key, PR.key.target);
  const bulbs = []; for (let i = 0; i < 14; i++) { const x = -2.4 + i * .38, y = 4.6 - Math.sin(i / 13 * Math.PI) * .55, b = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.4, .5), toneMapped: false })); b.position.set(OX + x, y, -2.45); g.add(b); bulbs.push(b); }
  PR.bulbs = bulbs;
  g.visible = false;
}
const PSHOTS = {
  WIDE: u => ({ pos: V(OX - .3 + u * .5, 1.75, 4.6 - u * .4), look: V(OX + .45, 1.3, -.2), fov: 40 }),
  TRUMP: u => ({ pos: V(OX - .1 + u * .15, 1.7, 2.7 - u * .3), look: V(OX - .45, 1.5, .1), fov: 36 }),
  TOMAS: u => ({ pos: V(OX + 1.0 - u * .2, 1.6, 2.5), look: V(OX + 1.4, 1.35, -.5), fov: 36 })
};
C3.sceneNow = 'club';
const HOME = { t: [band.trump.root.position.clone(), band.trump.root.rotation.y], b: [band.bass.root.position.clone(), band.bass.root.rotation.y] };
C3.setScene = s => {
  C3.sceneNow = s; const pr = s === 'practice'; PR.g.visible = pr;
  if (pr) { band.trump.root.position.set(OX - .45, 0, .1); band.trump.root.rotation.y = .3; band.bass.root.position.set(OX + 1.45, 0, -.5); band.bass.root.rotation.y = -.35; }
  else { band.trump.root.position.copy(HOME.t[0]); band.trump.root.rotation.y = HOME.t[1]; band.bass.root.position.copy(HOME.b[0]); band.bass.root.rotation.y = HOME.b[1]; }
  band.piano.root.parent.visible = !pr; band.perc.root.visible = !pr;
  band.trump.root.updateMatrixWorld(true); band.bass.root.updateMatrixWorld(true);
};
function pracPose(beat, tq) {
  const i = poseBand(beat, tq); PR.lamp.intensity = 14 + Math.sin(tq * 3) * .4; PR.bulbs.forEach((b, j) => b.scale.setScalar(.8 + .3 * Math.sin(tq * 2 + j)));
  return i.playing;
}
function practiceFrame(ts, dt) {
  const beat = NZ.phase === 'title' ? ts / 577 : (NZ.beat || 0), t = ts / 1000, tq = Math.floor(t * 12) / 12;
  if (tq !== st.poseT) { st.poseT = tq; st.pPlaying = pracPose(beat, tq); }
  const ids = ['WIDE', 'TRUMP', 'WIDE', 'TOMAS'], bi = Math.floor(Math.max(0, beat) / 16), id = NZ.phase === 'play' ? ids[bi % 4] : 'WIDE', u = ease(clamp(mod(beat, 16) / 16, 0, 1));
  const s = PSHOTS[id](u);
  camera.position.copy(s.pos).add(V(Math.sin(t * 1.3) * .02, Math.sin(t * 1.7 + 1) * .015, 0)); camera.lookAt(s.look); camera.fov = s.fov; camera.updateProjectionMatrix();
  bloom.strength = .4; grade.uniforms.time.value = t % 100; grade.uniforms.punch.value = 0;
  composer.render(dt);
}

C3.ok = true;
window.dispatchEvent(new Event('club3d-ready'));
// warm up: compile every shader and render once while the practice room is on screen,
// so the first 3D frame at the club count-in doesn't hitch
setTimeout(() => { try { const s = SHOTS.WIDE(.5); camera.position.copy(s.pos); camera.lookAt(s.look); poseBand(0, 0); renderer.compile(scene, camera); composer.render(.03); } catch (e) { console.warn(e); } }, 600);
