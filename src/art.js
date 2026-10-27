'use strict';
/* ---------- Art: backlit-silhouette club scene in the spirit of late-night jazz anime ---------- */
const RIM_L = '#ffb84d', RIM_R = '#6f9bff', DARK = '#080d28';
const INK = 'stroke="#04061a" stroke-width="7" stroke-linejoin="round"';
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ell = (cx, cy, rx, ry) => `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0Z`;
const sil = (d, o = {}) => { const l = o.l ?? 3.5, r = o.r ?? 2.5, f = o.fill || DARK;
  return `<path d="${d}" fill="${RIM_L}" transform="translate(${-l},${-l * .7})"/><path d="${d}" fill="${RIM_R}" opacity=".75" transform="translate(${r},${r * .3})"/><path d="${d}" fill="${f}"/>`; };
const limb = (d, w = 15) => `<path d="${d}" fill="none" stroke="${RIM_L}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-3,-2)"/><path d="${d}" fill="none" stroke="${RIM_R}" opacity=".7" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" transform="translate(2,1)"/><path d="${d}" fill="none" stroke="${DARK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function wideSVG() {
  const r = rng(11); let bok = '';
  for (let i = 0; i < 34; i++) {
    const x = r() * 1600, y = 20 + r() * 520, rad = 10 + r() * 38, hue = r();
    const col = hue < .5 ? '#ffb84d' : hue < .8 ? '#7aa5ff' : '#ff7a4d';
    bok += `<circle cx="${x | 0}" cy="${y | 0}" r="${rad | 0}" fill="${col}" opacity="${(.06 + r() * .16).toFixed(2)}"/>`;
  }
  let city = '';
  for (let i = 0; i < 12; i++) {
    const w = 26 + r() * 30, h = 60 + r() * 150, x = 1065 + i * 31;
    city += `<rect x="${x}" y="${400 - h}" width="${w}" height="${h}" fill="#0a1236"/>`;
    for (let k = 0; k < 7; k++) if (r() > .45) city += `<rect x="${x + 4 + r() * (w - 10)}" y="${400 - h + 8 + r() * (h - 20)}" width="4" height="5" fill="#ffb84d" opacity="${(.3 + r() * .6).toFixed(2)}"/>`;
  }
  const lamp = x => `<line x1="${x}" y1="0" x2="${x}" y2="120" stroke="#1b2766" stroke-width="3"/>
    <path d="M${x - 46},170 L${x - 18},118 L${x + 18},118 L${x + 46},170 Z" fill="#0d1646"/>
    <path d="M${x - 40},172 L${x + 40},172 L${x + 250},720 L${x - 250},720 Z" fill="url(#cone)"/>
    <ellipse cx="${x}" cy="172" rx="42" ry="9" fill="#ffd488"/>`;
  const floorLines = [...Array(9)].map((_, i) => `<line x1="0" y1="${700 + i * 26}" x2="1600" y2="${700 + i * 26}" stroke="#1c2a72" stroke-width="1" opacity="${(.5 - i * .04).toFixed(2)}"/>`).join('');

  /* characters, local coords: feet at (0,0) */
  const bass = `<g id="c-bass" transform="translate(300,712)">
    <g id="bass-body">
    ${sil('M-30,-175 L-34,0 L-8,0 L-2,-125 L6,0 L32,0 L30,-175 Z')}
    ${sil('M-34,-170 L-40,-300 Q-38,-335 -8,-340 L22,-340 Q46,-332 44,-296 L38,-170 Z')}
    <g id="bass-head">${sil(ell(4, -372, 23, 27))}${sil('M-21,-378 Q-22,-410 6,-410 Q34,-408 28,-376 Q10,-394 -21,-378Z')}${sil('M-8,-346 L-4,-362 L14,-362 L18,-346Z')}</g>
    </g>
    ${sil('M80,-47 C20,-48 10,-170 52,-200 C28,-240 38,-302 80,-300 C122,-302 134,-240 108,-200 C150,-170 140,-48 80,-47 Z', { l: 4 })}
    ${sil('M73,-296 L73,-432 L86,-432 L86,-296Z', { l: 2 })}${sil(ell(80, -440, 14, 14), { l: 2 })}
    <line x1="80" y1="-300" x2="80" y2="-80" stroke="${RIM_L}" stroke-width="1.5" opacity=".55"/>
    <g id="bass-armR">${limb('M22,-318 L54,-262 L80,-208', 15)}</g>
    <g id="bass-armL">${limb('M-14,-322 L34,-312 L76,-366', 15)}</g>
  </g>`;
  const piano = `<g id="c-piano" transform="translate(790,712)">
    ${sil('M-35,-100 L35,-100 L35,-86 L-35,-86 Z')}
    ${sil('M-34,-92 L-30,0 L-14,0 L-10,-92Z')}
    <g id="piano-body">
      ${limb('M0,-110 L78,-118 L74,0', 20)}
      <g id="piano-torso">${sil('M-24,-110 L-30,-250 Q-26,-292 6,-294 L32,-290 Q46,-270 38,-228 L32,-110 Z')}
      <g id="piano-head">${sil(ell(16, -326, 22, 26))}${sil('M-8,-330 Q-8,-362 18,-362 Q44,-358 40,-326 Q24,-346 -8,-330Z')}</g></g>
      <g id="piano-arm">${limb('M12,-268 L56,-188 L100,-206', 15)}</g>
    </g>
    ${sil('M72,-224 L440,-224 L470,-204 L470,-170 L72,-170 Z')}
    ${sil('M92,-228 L430,-228 L300,-352 L130,-312 Z', { l: 3 })}
    <line x1="140" y1="-318" x2="306" y2="-346" stroke="#3a4da0" stroke-width="3"/>
    ${sil('M104,-170 L120,-170 L120,0 L104,0Z')}${sil('M414,-170 L430,-170 L430,0 L414,0Z')}
    <rect x="72" y="-210" width="46" height="9" fill="#f4ecd8" opacity=".75"/>
  </g>`;
  const perc = `<g id="c-perc" transform="translate(1290,712)">
    <g id="perc-body">
      ${sil('M-36,-150 L-40,-300 Q-38,-336 -4,-338 L26,-336 Q52,-326 48,-290 L44,-150 Z')}
      <g id="perc-head">${sil(ell(6, -372, 23, 27))}${sil('M-20,-376 Q-22,-410 8,-410 Q36,-406 30,-374 Q10,-392 -20,-376Z')}${sil('M-24,-384 L34,-384 L34,-394 L-24,-394Z')}</g>
      <g id="perc-armL">${limb('M-26,-318 L-44,-262 L-34,-216', 15)}</g>
      <g id="perc-armR">${limb('M30,-318 L52,-262 L40,-216', 15)}</g>
    </g>
    ${sil('M-84,-214 Q-82,-110 -58,0 L-16,0 Q8,-110 8,-214 Z', { l: 4 })}
    ${sil('M-4,-214 Q-4,-110 18,0 L60,0 Q84,-110 84,-214 Z', { l: 4 })}
    <ellipse cx="-38" cy="-214" rx="46" ry="11" fill="#2a1d36"/><ellipse cx="-38" cy="-214" rx="46" ry="11" fill="none" stroke="${RIM_L}" stroke-width="3"/>
    <ellipse cx="40" cy="-214" rx="46" ry="11" fill="#2a1d36"/><ellipse cx="40" cy="-214" rx="46" ry="11" fill="none" stroke="${RIM_L}" stroke-width="3"/>
    <path d="M-80,-150 Q-38,-138 4,-150" fill="none" stroke="#3a4da0" stroke-width="3"/><path d="M0,-150 Q40,-138 82,-150" fill="none" stroke="#3a4da0" stroke-width="3"/>
  </g>`;
  const trump = trumpFig('trump', 'translate(600,872) scale(1.38)');
  return `<svg class="view" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070c2c"/><stop offset=".55" stop-color="#14205a"/><stop offset="1" stop-color="#1c2a72"/></linearGradient>
    <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb84d" stop-opacity=".34"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17237a"/><stop offset=".4" stop-color="#0b1244"/><stop offset="1" stop-color="#040618"/></linearGradient>
    <radialGradient id="flare"><stop offset="0" stop-color="#fff2c8"/><stop offset=".25" stop-color="#ffb84d" stop-opacity=".8"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
    <radialGradient id="pool"><stop offset="0" stop-color="#ffb84d" stop-opacity=".55"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
    <filter id="blur6"><feGaussianBlur stdDeviation="6"/></filter><filter id="blur14"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="rib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".5" stop-color="#ffb347"/><stop offset="1" stop-color="#7aa5ff" stop-opacity="0"/></linearGradient>
    <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <g filter="url(#blur14)">${bok}</g>
  <g opacity=".5">${[...Array(15)].map((_, i) => `<line x1="${i * 110}" y1="0" x2="${i * 110}" y2="700" stroke="#0a1240" stroke-width="2"/>`).join('')}</g>
  <rect x="1050" y="60" width="400" height="340" fill="#101b55"/>${city}
  <path d="M1050,400 L1450,400 L1450,60 L1050,60Z M1062,388 L1062,72 L1438,72 L1438,388Z" fill="#0b1240" fill-rule="evenodd"/>
  <line x1="1250" y1="60" x2="1250" y2="400" stroke="#0b1240" stroke-width="8"/><line x1="1050" y1="230" x2="1450" y2="230" stroke="#0b1240" stroke-width="8"/>
  <g id="neon" filter="url(#glow)"><text x="420" y="262" font-family="Shippori Mincho B1, serif" font-weight="800" font-size="64" letter-spacing="12" fill="none" stroke="#7aa5ff" stroke-width="3">NOCHE AZUL</text>
    <text x="424" y="298" font-family="Zen Kaku Gothic New, sans-serif" font-size="22" letter-spacing="12" fill="#ffb84d">LIVE TONIGHT</text></g>
  ${lamp(560)}${lamp(1010)}
  <rect y="700" width="1600" height="200" fill="url(#floor)"/>${floorLines}
  <rect y="696" width="1600" height="8" fill="#0a1138"/><rect y="696" width="1600" height="2" fill="#ffb84d" opacity=".5"/>
  <g filter="url(#blur6)" opacity=".8"><ellipse cx="320" cy="716" rx="170" ry="16" fill="url(#pool)"/><ellipse cx="900" cy="716" rx="260" ry="16" fill="url(#pool)"/><ellipse cx="1300" cy="716" rx="170" ry="16" fill="url(#pool)"/><ellipse cx="640" cy="880" rx="220" ry="22" fill="url(#pool)"/></g>
  ${perc}${piano}${bass}${trump}
  <g id="ribbons" opacity="0" fill="none" stroke-linecap="round" style="mix-blend-mode:screen"><path d="M930,414 C1080,340 1240,470 1600,380" stroke="url(#rib)" stroke-width="12" stroke-dasharray="300 90"/><path d="M930,424 C1100,500 1260,360 1600,480" stroke="url(#rib)" stroke-width="7" stroke-dasharray="220 100"/><path d="M930,404 C1040,300 1280,300 1600,260" stroke="url(#rib)" stroke-width="4" stroke-dasharray="160 120"/></g>
  ${crowd()}
  <rect width="1600" height="900" fill="url(#vig)"/>
  </svg>`;
}

/* ---------- Trumpeter close-up ---------- */
function closeSVG() {
  const sweat = [[790, 330], [850, 360], [700, 400], [880, 560], [760, 640]].map((p, i) => `<ellipse class="sweat" id="sw${i}" cx="${p[0]}" cy="${p[1]}" rx="4" ry="8" fill="#cfe2ff" opacity=".8"/>`).join('');
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <radialGradient id="halo" cx=".55" cy=".45" r=".6"><stop offset="0" stop-color="#ffb84d" stop-opacity=".75"/><stop offset=".5" stop-color="#ff7a4d" stop-opacity=".25"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
    <linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070d3c"/><stop offset=".55" stop-color="#1b2cae"/><stop offset="1" stop-color="#3a2a96"/></linearGradient>
    <linearGradient id="skin" gradientUnits="userSpaceOnUse" x1="470" y1="0" x2="980" y2="0"><stop offset="0" stop-color="#4a3f8c"/><stop offset=".36" stop-color="#6a58a8"/><stop offset=".36" stop-color="#d49470"/><stop offset=".86" stop-color="#e5a679"/><stop offset="1" stop-color="#f6c08c"/></linearGradient>
    <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".25" stop-color="#ffc552"/><stop offset=".26" stop-color="#d98a1f"/><stop offset="1" stop-color="#7a3d0e"/></linearGradient>
    <radialGradient id="iris" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#7b4a2a"/><stop offset=".6" stop-color="#2a1612"/><stop offset="1" stop-color="#120a0c"/></radialGradient>
    <radialGradient id="flare2"><stop offset="0" stop-color="#fff6d8"/><stop offset=".2" stop-color="#ffc552" stop-opacity=".85"/><stop offset="1" stop-color="#ffb84d" stop-opacity="0"/></radialGradient>
    <filter id="rough3"><feTurbulence type="fractalNoise" baseFrequency=".02 .06" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="36"/></filter>
    <linearGradient id="glintg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff8dc" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="cb"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <rect width="1600" height="900" fill="url(#cbg)"/>
  <g filter="url(#cb)" opacity=".8"><circle cx="220" cy="180" r="90" fill="#7aa5ff" opacity=".4"/><circle cx="420" cy="700" r="120" fill="#ff7a4d" opacity=".35"/><circle cx="1400" cy="170" r="110" fill="#ffb84d" opacity=".4"/><circle cx="1180" cy="760" r="80" fill="#7aa5ff" opacity=".4"/></g>
  <rect width="1600" height="900" fill="url(#halo)"/>
  <g filter="url(#rough3)" opacity=".55"><path d="M-40,160 C300,60 700,120 1000,40" stroke="#1a1480" stroke-width="70" fill="none" stroke-linecap="round"/><path d="M200,880 C500,800 900,860 1300,760" stroke="#4a2aa8" stroke-width="80" fill="none" stroke-linecap="round"/><path d="M1200,100 C1400,200 1500,160 1700,300" stroke="#2a3acc" stroke-width="60" fill="none" stroke-linecap="round"/></g>
  ${flameSVG()}
  <g id="cu-all">
  <path d="M250,900 C290,760 430,690 540,640 L770,640 C880,700 1010,770 1090,900Z" fill="${DARK}"/>
  <path d="M250,900 C290,760 430,690 540,640" fill="none" stroke="${RIM_L}" stroke-width="6" opacity=".8"/>
  <path d="M770,640 C880,700 1010,770 1090,900" fill="none" stroke="${RIM_R}" stroke-width="5" opacity=".7"/>
  <path d="M640,650 L700,780 L760,650Z" fill="#e9e1ce"/><path d="M640,650 L700,780 L700,650Z" fill="#cfc6b0"/>
  <g id="cu-head">
    <path d="M540,640 C440,560 436,380 540,290 C640,196 810,206 884,290 C906,318 916,360 912,402 L926,432 L982,498 L964,524 L930,528 L936,560 L918,612 C902,672 852,704 800,704 C740,708 690,690 640,650 Z" fill="url(#skin)" stroke="#04061a" stroke-width="7" stroke-linejoin="round"/>
    <path d="M884,290 C906,318 916,360 912,402 L926,432 L982,498 L964,524 L930,528" fill="none" stroke="#ffe0a8" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <ellipse cx="632" cy="478" rx="28" ry="44" fill="#5a4a98"/><path d="M620,452 Q640,470 628,506" fill="none" stroke="#3a2230" stroke-width="5" stroke-linecap="round"/>
    <path d="M520,430 C470,300 560,176 724,170 C846,166 936,230 940,336 L902,300 L910,368 L862,296 L850,358 L802,290 L772,346 L742,282 L702,336 L652,292 L644,366 L604,324 L594,424 Z" fill="#0a0f2a" stroke="#04061a" stroke-width="7" stroke-linejoin="round"/>
    <path d="M590,300 C660,214 780,200 862,252" fill="none" stroke="#7aa5ff" stroke-width="5" opacity=".6" stroke-linecap="round"/><path d="M640,262 C700,230 760,226 810,244" fill="none" stroke="#bcd0ff" stroke-width="3" opacity=".55" stroke-linecap="round"/>
    <path d="M520,430 C470,300 560,176 724,170" fill="none" stroke="${RIM_L}" stroke-width="5" opacity=".8"/>
    <path d="M800,372 C840,352 900,366 918,392 L918,420 C880,396 830,394 800,404Z" fill="#9a6a8a" opacity=".55"/>
    <path d="M912,420 L944,486 L926,500 L900,452Z" fill="#9a5f7a" opacity=".5"/>
    <g stroke="#2a2160" stroke-width="3" opacity=".5" stroke-linecap="round"><path d="M560,470 l40,-24"/><path d="M556,500 l50,-30"/><path d="M560,536 l56,-34"/><path d="M572,572 l56,-34"/><path d="M600,610 l50,-28"/></g>
    <g id="cu-eye">
      <path id="cu-brow" d="M812,396 Q856,376 910,396" fill="none" stroke="#0a0f2a" stroke-width="13" stroke-linecap="round"/>
      <g id="cu-eye-open"><path d="M818,440 Q856,416 902,436 Q880,470 850,470 Q824,462 818,440Z" fill="#fff6ee"/>
        <ellipse cx="860" cy="445" rx="22" ry="26" fill="url(#iris)"/><ellipse cx="860" cy="448" rx="9" ry="11" fill="#06030a"/>
        <circle cx="850" cy="434" r="8" fill="#fff"/><circle cx="871" cy="458" r="4" fill="#fff" opacity=".9"/>
        <path d="M812,444 Q856,408 906,432" fill="none" stroke="#06030a" stroke-width="9" stroke-linecap="round"/><path d="M906,432 L924,424" stroke="#06030a" stroke-width="6" stroke-linecap="round"/>
        <path d="M826,462 Q856,478 888,462" fill="none" stroke="#3a2230" stroke-width="3" opacity=".6"/></g>
      <path id="cu-eye-shut" d="M816,448 Q858,472 908,440" fill="none" stroke="#06030a" stroke-width="9" stroke-linecap="round" opacity="0"/>
    </g>
    <path d="M928,500 Q950,510 962,508" fill="none" stroke="#7a4a3e" stroke-width="3" opacity=".7"/>
    <g id="cu-cheek"><ellipse cx="868" cy="596" rx="58" ry="46" fill="#d8946a" opacity=".55"/><path d="M820,590 Q870,650 920,604" fill="none" stroke="#9c5f48" stroke-width="4" opacity=".6"/></g>
    ${sweat}<g fill="none" stroke="#cfe2ff" stroke-width="3" opacity=".8" class="bub"><circle cx="520" cy="360" r="12"/><circle cx="960" cy="330" r="9"/><circle cx="500" cy="560" r="7"/><circle cx="990" cy="620" r="14"/></g>
    <rect x="918" y="544" width="26" height="40" rx="8" fill="#7a3d0e"/><rect x="924" y="548" width="12" height="32" rx="5" fill="url(#brass)"/>
  </g>
  <g id="cu-horn" transform="rotate(-6 944 562)">
    <rect x="936" y="546" width="560" height="30" rx="14" fill="url(#brass)"/>
    <path d="M1130,596 C1130,652 1170,664 1230,664 L1430,664 C1480,664 1500,630 1500,588" fill="none" stroke="#7a3d0e" stroke-width="24" stroke-linecap="round"/>
    <path d="M1130,596 C1130,652 1170,664 1230,664 L1430,664 C1480,664 1500,630 1500,588" fill="none" stroke="url(#brass)" stroke-width="18" stroke-linecap="round"/>
    <path d="M1136,606 C1140,646 1176,656 1230,656 L1430,656" fill="none" stroke="#fff0b8" stroke-width="3" opacity=".6"/>
    ${[1180, 1236, 1292].map(x => `<rect x="${x - 21}" y="544" width="42" height="74" rx="10" fill="#7a3d0e"/><rect x="${x - 17}" y="548" width="34" height="66" rx="8" fill="url(#brass)"/><rect x="${x - 12}" y="552" width="6" height="56" rx="3" fill="#fff0b8" opacity=".45"/>`).join('')}
    <path d="M1010,578 C1010,690 1130,690 1130,578" fill="none" stroke="url(#brass)" stroke-width="22"/>
    <path d="M1010,590 C1010,676 1126,676 1126,590" fill="none" stroke="#fff0b8" stroke-width="3" opacity=".6"/>
    <path d="M1040,520 L1100,400 C1110,380 1150,372 1170,384 L1182,410 L1110,530Z" fill="#1c1a4a" ${INK}/>
    <path id="cu-hand" d="M1100,420 C1104,388 1140,370 1176,370 L1310,366 C1340,366 1356,384 1352,410 L1346,440 C1300,446 1200,446 1110,440Z" fill="#d49470" ${INK}/>
    <path d="M1300,370 C1336,372 1352,392 1346,428 L1320,438 C1328,410 1322,388 1300,370Z" fill="#6a58a8" opacity=".6"/>
    <path d="M1112,412 C1118,388 1150,376 1190,374" fill="none" stroke="#ffe0a8" stroke-width="5" opacity=".9"/>
    <path d="M1208,372 q14,-10 28,0 M1264,370 q14,-10 28,0" fill="none" stroke="#9c5f48" stroke-width="3" opacity=".7"/>
    <g id="cu-valves">${[1180, 1236, 1292].map((x, i) => `<g id="pv${i}"><rect x="${x - 8}" y="456" width="16" height="92" rx="5" fill="#ffd27a"/><rect x="${x - 18}" y="436" width="36" height="28" rx="13" fill="${DARK}" stroke="${RIM_L}" stroke-width="3"/><path d="M${x - 19},380 L${x - 19},440 C${x - 19},456 ${x + 19},456 ${x + 19},440 L${x + 19},380Z" fill="#d49470" ${INK}/><path d="M${x + 6},384 L${x + 6},446 C${x + 12},450 ${x + 19},446 ${x + 19},440 L${x + 19},384Z" fill="#6a58a8" opacity=".7"/><path d="M${x - 14},420 h22" stroke="#7a4a3e" stroke-width="3" opacity=".6"/></g>`).join('')}
      <rect x="1160" y="540" width="150" height="46" rx="12" fill="url(#brass)"/></g>
    <path d="M1480,540 C1540,538 1600,510 1646,450 L1646,676 C1600,616 1540,584 1480,582Z" fill="url(#brass)"/>
    <path d="M1490,548 C1550,544 1604,520 1640,474" fill="none" stroke="#fff0b8" stroke-width="5" opacity=".6"/>
    <ellipse cx="1648" cy="563" rx="26" ry="114" fill="#7a3d0e"/><ellipse cx="1648" cy="563" rx="18" ry="104" fill="#2a1408"/><ellipse cx="1642" cy="563" rx="22" ry="108" fill="none" stroke="#ffe08a" stroke-width="5"/>
    <ellipse cx="1560" cy="560" rx="100" ry="100" fill="url(#flare2)" id="cu-flare" opacity=".5"/>
    <rect class="glint" id="cu-glint" x="960" y="500" width="60" height="140" fill="url(#glintg)" transform="skewX(-20)"/>
    <path class="star" d="M1520,470 l8,40 40,8 -40,8 -8,40 -8,-40 -40,-8 40,-8z" fill="#fff8dc"/>
  </g>
  </g>
  </svg>`;
}

/* ---------- Bandmate faces (anime bust, mood-driven) ---------- */
const CAST = {
  tomas: { name: 'Tomás', role: 'Bass · bandleader', skin: '#d9a47c', hair: '#13162e', bg: ['#3a52b0', '#18255f'], style: 'swept', extra: 'goatee' },
  ines:  { name: 'Inés',  role: 'Piano',              skin: '#eebb98', hair: '#3a1d36', bg: ['#a1478a', '#4a1f52'], style: 'long',  extra: 'none' },
  rafa:  { name: 'Rafa',  role: 'Percussion',         skin: '#b97b55', hair: '#26160f', bg: ['#2aa28f', '#0f4a50'], style: 'curly', extra: 'cap' }
};
function faceSVG(who, mood) {
  const c = CAST[who], uid = who + mood;
  const hairBack = c.style === 'long' ? `<path d="M22,52 C16,20 38,10 50,10 C62,10 84,20 78,52 L82,92 L18,92Z" fill="${c.hair}"/>` : '';
  const hairFront = {
    swept: `<path d="M24,48 C20,22 38,12 54,13 C72,14 80,28 76,48 C70,36 62,30 46,30 C36,30 30,38 24,48Z" fill="${c.hair}"/><path d="M30,26 C42,18 58,18 70,26" fill="none" stroke="#7aa5ff" stroke-width="1.4" opacity=".7"/>`,
    long: `<path d="M24,52 C18,22 38,10 52,11 C70,12 82,26 76,52 C72,38 66,28 52,28 C40,28 30,38 24,52Z" fill="${c.hair}"/><path d="M42,16 C52,12 62,16 68,24" fill="none" stroke="#e9a8ff" stroke-width="1.4" opacity=".6"/>`,
    curly: `<path d="M22,50 C14,30 22,14 38,12 C44,6 58,6 64,12 C80,14 86,30 78,50 C72,36 64,32 50,32 C36,32 28,38 22,50Z" fill="${c.hair}"/>`
  }[c.style];
  const cap = c.extra === 'cap' ? `<path d="M20,34 C22,16 78,14 80,34 Z" fill="#e0a43c"/><path d="M60,32 L92,36 L80,41 L58,38Z" fill="#b5802a"/>` : '';
  const goatee = c.extra === 'goatee' ? `<path d="M43,76 Q50,86 57,76 Q50,80 43,76Z" fill="${c.hair}"/>` : '';
  const E = { worried: 'o', encourage: 'o', groove: 'h', ecstatic: 'c' }[mood];
  const eye = x => E === 'c' ? `<path d="M${x - 5},56 Q${x},49.5 ${x + 5},56" fill="none" stroke="#1a1020" stroke-width="2.4" stroke-linecap="round"/>`
    : E === 'h' ? `<ellipse cx="${x}" cy="55" rx="4.2" ry="3.2" fill="#1a1020"/><path d="M${x - 5.5},53.2 L${x + 5.5},53.2" stroke="${c.skin}" stroke-width="0"/><path d="M${x - 5.6},52.5 Q${x},49.8 ${x + 5.6},52.5" fill="none" stroke="#1a1020" stroke-width="2.2" stroke-linecap="round"/><circle cx="${x - 1.2}" cy="54" r="1.1" fill="#fff"/>`
    : `<ellipse cx="${x}" cy="54.5" rx="4.4" ry="${mood === 'worried' ? 6 : 5.4}" fill="#1a1020"/><circle cx="${x - 1.4}" cy="52.4" r="1.7" fill="#fff"/><circle cx="${x + 1.5}" cy="57" r=".8" fill="#fff"/><path d="M${x - 6},50.6 Q${x},47.4 ${x + 6},50.6" fill="none" stroke="#1a1020" stroke-width="1.8" stroke-linecap="round"/>`;
  const brows = mood === 'worried' ? `<path d="M31,46 L45,42.5" stroke="${c.hair}" stroke-width="2.2" stroke-linecap="round"/><path d="M69,46 L55,42.5" stroke="${c.hair}" stroke-width="2.2" stroke-linecap="round"/>`
    : mood === 'ecstatic' ? `<path d="M32,44 Q39,40 45,43" fill="none" stroke="${c.hair}" stroke-width="2.2" stroke-linecap="round"/><path d="M68,44 Q61,40 55,43" fill="none" stroke="${c.hair}" stroke-width="2.2" stroke-linecap="round"/>`
    : `<path d="M32,45.5 Q39,42.5 45,45" fill="none" stroke="${c.hair}" stroke-width="2.2" stroke-linecap="round"/><path d="M68,45.5 Q61,42.5 55,45" fill="none" stroke="${c.hair}" stroke-width="2.2" stroke-linecap="round"/>`;
  const mouth = { worried: `<path d="M44,73 Q50,69 56,73" fill="none" stroke="#5a2a2a" stroke-width="2" stroke-linecap="round"/>`,
    encourage: `<path d="M43,70 Q50,76 57,70" fill="none" stroke="#5a2a2a" stroke-width="2" stroke-linecap="round"/>`,
    groove: `<path d="M42,70 Q50,77 58,70" fill="none" stroke="#5a2a2a" stroke-width="2.2" stroke-linecap="round"/>`,
    ecstatic: `<path d="M40,68 Q50,86 60,68Z" fill="#6a1e2a"/><path d="M44,77 Q50,73 56,77 Q50,83 44,77Z" fill="#e8707a"/>` }[mood];
  const extra = mood === 'worried' ? `<path d="M76,36 Q80,44 76,48 Q72,44 76,36Z" fill="#cfe2ff"/>` : mood === 'ecstatic' ? `<path d="M84,20 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2z" fill="#fff6c8"/><path d="M14,30 l1.6,4 4,1.6 -4,1.6 -1.6,4 -1.6,-4 -4,-1.6 4,-1.6z" fill="#fff6c8"/>` : '';
  const blush = (mood === 'ecstatic' || mood === 'groove') ? `<ellipse cx="33" cy="66" rx="5" ry="3" fill="#ff7a8a" opacity=".35"/><ellipse cx="67" cy="66" rx="5" ry="3" fill="#ff7a8a" opacity=".35"/>` : '';
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="fb${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></linearGradient><clipPath id="fc${uid}"><circle cx="50" cy="50" r="50"/></clipPath></defs>
  <g clip-path="url(#fc${uid})"><rect width="100" height="100" fill="url(#fb${uid})"/>${hairBack}
  <path d="M10,100 C14,84 30,80 42,80 L58,80 C70,80 86,84 90,100Z" fill="#0a1030"/><path d="M42,80 L50,92 L58,80Z" fill="#f4ecd8"/>
  <rect x="44" y="70" width="12" height="14" fill="${c.skin}"/>
  <ellipse cx="50" cy="55" rx="26" ry="29" fill="${c.skin}"/><path d="M62,34 C80,44 78,76 54,84 C70,70 72,50 62,34Z" fill="#000" opacity=".12"/>
  ${hairFront}${cap}${blush}${brows}${eye(39)}${eye(61)}<path d="M50,58 L48.6,64 L51.4,64" fill="none" stroke="#00000033" stroke-width="1.2"/>${mouth}${goatee}${extra}
  </g></svg>`;
}

/* ---------- FX layer: speed lines, sparks, floating notes ---------- */
const FX = {
  cv: null, g: null, w: 0, h: 0, parts: [],
  init(cv) { this.cv = cv; this.g = cv.getContext('2d'); },
  resize() { const cv = this.cv, r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height)); cv.width = this.w * d; cv.height = this.h * d; this.g.setTransform(d, 0, 0, d, 0, 0); },
  emit(n, kind, x, y) { for (let i = 0; i < n; i++) this.parts.push({ kind, x: x ?? Math.random() * this.w, y: y ?? this.h * (.55 + Math.random() * .4), vx: (Math.random() - .5) * 30, vy: -20 - Math.random() * 40, life: 0, max: 1 + Math.random() * 1.2, s: 8 + Math.random() * 10, c: ['#ffb84d', '#7aa5ff', '#f4ecd8'][i % 3] }); },
  draw(dt, speed, fx, cx, cy) {
    const g = this.g, w = this.w, h = this.h; g.clearRect(0, 0, w, h);
    if (!fx) { this.parts.length = 0; return; }
    if (speed > 0.02) {
      const n = Math.round(18 + speed * 70), R = Math.hypot(w, h) * .6;
      g.save(); g.translate(cx * w, cy * h);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r0 = R * (.28 + Math.random() * .3), r1 = R * (.75 + Math.random() * .3);
        g.strokeStyle = `rgba(${Math.random() > .5 ? '244,236,216' : '150,185,255'},${(.08 + Math.random() * .3 * speed).toFixed(2)})`;
        g.lineWidth = .6 + Math.random() * 2.2 * speed;
        g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
      }
      g.restore();
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life += dt; if (p.life > p.max) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; const a = 1 - p.life / p.max;
      g.globalAlpha = a * .9; g.fillStyle = p.c;
      if (p.kind === 'note') { g.font = `${p.s * 1.8}px Bravura, serif`; g.fillText('', p.x, p.y); }
      else { g.beginPath(); g.moveTo(p.x, p.y - p.s * .6); g.lineTo(p.x + p.s * .15, p.y - p.s * .15); g.lineTo(p.x + p.s * .6, p.y); g.lineTo(p.x + p.s * .15, p.y + p.s * .15); g.lineTo(p.x, p.y + p.s * .6); g.lineTo(p.x - p.s * .15, p.y + p.s * .15); g.lineTo(p.x - p.s * .6, p.y); g.lineTo(p.x - p.s * .15, p.y - p.s * .15); g.closePath(); g.fill(); }
    }
    g.globalAlpha = 1;
  }
};

/* ---------- figures reused in both scenes ---------- */
function trumpFig(id, tf, mirror) {
  const body = sil('M-26,-160 C-30,-100 -34,-50 -34,-8 L-4,-8 C-4,-50 2,-100 8,-160Z') + sil('M6,-160 C10,-100 18,-50 24,-8 L54,-8 C46,-50 38,-110 34,-160Z')
    + sil('M-38,-10 L-4,-10 L-2,2 L-42,2Z') + sil('M22,-10 L56,-10 L60,2 L18,2Z')
    + sil('M-30,-300 C-37,-260 -35,-210 -31,-150 L39,-150 C43,-210 41,-260 31,-296 C20,-312 -18,-312 -30,-300Z');
  const head = sil('M-6,-314 L-6,-296 L16,-296 L16,-316Z') + sil('M-14,-322 C-30,-336 -28,-372 -8,-382 C12,-392 36,-384 44,-364 C47,-356 47,-350 46,-346 L56,-336 C58,-333 55,-331 52,-331 L50,-326 C52,-323 51,-320 48,-319 C48,-312 44,-308 38,-306 C30,-300 18,-298 8,-302 C-2,-306 -10,-312 -14,-322Z', { l: 3 })
    + sil('M-26,-352 C-26,-384 -2,-398 22,-392 C40,-388 48,-372 46,-356 C34,-366 18,-364 6,-352 C-4,-346 -16,-346 -26,-352Z', { l: 3 });
  const arm = limb('M2,-288 L30,-234', 17) + limb('M30,-234 L100,-316', 14);
  // Trumpet in side profile, drawn in brass so it reads against the navy silhouettes.
  // Real layout: mouthpiece -> leadpipe forward -> main tuning slide U-turn under the bell -> back into
  // the valve block -> out the top, back to the bell bow near the player -> long bell pipe forward -> flare.
  // Authored at full size, then scaled .75 about the mouthpiece (44,-326) so the bell is ~1/4 of the length.
  const BR = '#9a6d1f', BR_HI = '#ffe2a0', BR_IN = '#3a2408';
  const tube = (d, w) => `<path d="${d}" fill="none" stroke="${RIM_L}" stroke-width="${w + 3}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${BR}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${BR_HI}" stroke-width="${Math.max(1, w * .25)}" stroke-linecap="round" opacity=".75" transform="translate(0,${-w * .22})"/>`;
  const horn = `<g transform="translate(11,-81.5) scale(.75)">`
    + tube('M114,-343 L84,-343 C64,-343 64,-360 84,-360 L198,-360', 7)                       // bell bow + bell pipe (top)
    + tube('M58,-326 L214,-326 C232,-326 232,-309 214,-309 L150,-309', 7)                   // leadpipe + main tuning slide
    + tube('M116,-300 L116,-291 C116,-282 128,-282 128,-291 L128,-300', 4)                  // 1st valve slide
    + tube('M146,-300 L146,-287 C146,-276 160,-276 160,-287 L160,-300', 4)                  // 3rd valve slide
    + `<path d="M40,-331 C46,-334 50,-331 58,-329 L58,-323 C50,-321 46,-318 40,-321Z" fill="${BR}" stroke="${RIM_L}" stroke-width="2"/>` // mouthpiece
    + `<rect x="34" y="-333" width="8" height="14" rx="3" fill="${BR}" stroke="${RIM_L}" stroke-width="2"/>`
    + [120, 134, 148].map(x => `<rect x="${x - 6}" y="-370" width="12" height="70" rx="3" fill="${BR}" stroke="${RIM_L}" stroke-width="2"/><rect x="${x - 3.5}" y="-366" width="2.5" height="62" fill="${BR_HI}" opacity=".6"/><rect x="${x - 7.5}" y="-374" width="15" height="6" rx="2" fill="${BR}" stroke="${RIM_L}" stroke-width="1.6"/><rect x="${x - 7.5}" y="-303" width="15" height="6" rx="2" fill="${BR}" stroke="${RIM_L}" stroke-width="1.6"/>`).join('') // valve casings + caps
    + `<path d="M192,-365 C224,-367 248,-378 264,-394 L264,-326 C248,-342 224,-353 192,-355Z" fill="${BR}" stroke="${RIM_L}" stroke-width="2.4" stroke-linejoin="round"/>` // bell flare
    + `<path d="M196,-363 C226,-365 248,-375 262,-389" fill="none" stroke="${BR_HI}" stroke-width="2.4" opacity=".75"/>`
    + `<ellipse cx="264" cy="-360" rx="7" ry="34" fill="${BR_IN}" stroke="${RIM_L}" stroke-width="3"/><ellipse cx="265" cy="-360" rx="3" ry="27" fill="#ffd27a" opacity=".35"/>`
    + `<g id="${id === 'trump' ? 'valves' : 'p-valves'}">${[120, 134, 148].map(x => `<g><rect x="${x - 1.5}" y="-386" width="3" height="13" fill="${BR_HI}"/><ellipse cx="${x}" cy="-388" rx="6.5" ry="3" fill="${BR}" stroke="${RIM_L}" stroke-width="1.8"/></g>`).join('')}</g>`
    + sil(ell(132, -322, 17, 12), { l: 2 })                                                // hand gripping the valve block
    + `<path d="M120,-330 L148,-330 M121,-322 L149,-322 M123,-314 L147,-314" stroke="${RIM_R}" stroke-width="1.6" opacity=".5"/>`  // knuckle/finger lines
    + `</g>`
    + `<circle id="${id === 'trump' ? 'bellGlow' : 'p-bellGlow'}" cx="209" cy="-351" r="62" fill="url(#flare)" opacity=".4"/>`;
  const pre = id === 'trump' ? '' : 'p-';
  return `<g id="c-${id}" transform="${tf}"><g ${mirror ? 'transform="scale(-1,1)"' : ''}><g id="${pre}trump-body">${body}<g id="${pre}trump-head">${head}</g><g id="${pre}trump-arm">${arm}<g id="${pre}trump-horn">${horn}</g></g></g></g></g>`;
}
function crowd() {
  const xs = [60, 200, 340, 500, 660, 820, 980, 1130, 1280, 1440, 1560], hs = [830, 850, 820, 856, 836, 846, 824, 852, 834, 848, 828];
  let h = '', hands = '';
  xs.forEach((x, i) => { const y = hs[i];
    h += sil(`M${x - 34},900 L${x - 30},${y + 40} C${x - 30},${y + 20} ${x - 22},${y + 6} ${x - 4},${y + 6} L${x - 4},${y - 12} C${x - 24},${y - 14} ${x - 24},${y - 60} ${x},${y - 62} C${x + 24},${y - 60} ${x + 24},${y - 14} ${x + 4},${y - 12} L${x + 4},${y + 6} C${x + 22},${y + 6} ${x + 30},${y + 20} ${x + 30},${y + 40} L${x + 34},900Z`, { l: 3 });
    hands += `<g class="cw"><path d="M${x - 26},${y + 30} L${x - 46},${y - 70}" stroke="${DARK}" stroke-width="13" stroke-linecap="round"/><path d="M${x + 26},${y + 30} L${x + 46},${y - 80}" stroke="${DARK}" stroke-width="13" stroke-linecap="round"/><path d="M${x - 26},${y + 30} L${x - 46},${y - 70}" stroke="${RIM_L}" stroke-width="3" opacity=".8" stroke-linecap="round" transform="translate(-6,0)"/></g>`; });
  return `<g id="crowd">${h}<g id="crowd-hands" opacity="0">${hands}</g></g>`;
}
function practiceSVG() {
  const r = rng(5); let sk = '';
  for (let i = 0; i < 9; i++) { const w = 40 + r() * 50, hh = 70 + r() * 190, x = 790 + i * 54; sk += `<rect x="${x}" y="${420 - hh}" width="${w}" height="${hh}" fill="#1a1450"/>`; for (let k = 0; k < 6; k++) if (r() > .4) sk += `<rect x="${x + 6 + r() * (w - 14)}" y="${420 - hh + 10 + r() * (hh - 24)}" width="5" height="7" fill="#ffd27a" opacity="${(.4 + r() * .6).toFixed(2)}"/>`; }
  return `<svg class="view" id="viewPractice" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="display:none">
  <defs>
    <linearGradient id="pdusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a7a"/><stop offset=".55" stop-color="#d0607a"/><stop offset="1" stop-color="#ffb06a"/></linearGradient>
    <linearGradient id="pwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a48"/><stop offset="1" stop-color="#2a2552"/></linearGradient>
    <linearGradient id="pwood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2a30"/><stop offset="1" stop-color="#1c1020"/></linearGradient>
    <radialGradient id="plamp"><stop offset="0" stop-color="#ffd48a" stop-opacity=".95"/><stop offset=".5" stop-color="#ff9a4a" stop-opacity=".3"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient>
    <linearGradient id="pshaft" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb06a" stop-opacity=".5"/><stop offset="1" stop-color="#ffb06a" stop-opacity="0"/></linearGradient>
    <filter id="prough"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter>
  </defs>
  <rect width="1600" height="900" fill="url(#pwall)"/>
  <g filter="url(#prough)"><rect x="760" y="90" width="620" height="420" fill="url(#pdusk)"/>${sk}</g>
  <path d="M760,90 L1380,90 L1380,510 L760,510Z M776,106 L776,494 L1364,494 L1364,106Z" fill="#0d1240" fill-rule="evenodd"/><rect x="1062" y="90" width="14" height="420" fill="#0d1240"/>
  <polygon points="780,106 1060,106 900,900 420,900" fill="url(#pshaft)" opacity=".5" style="mix-blend-mode:screen"/>
  <rect y="640" width="1600" height="260" fill="url(#pwood)"/>
  <g stroke="#2a1a28" stroke-width="2"><line x1="0" y1="700" x2="1600" y2="700"/><line x1="0" y1="760" x2="1600" y2="760"/><line x1="0" y1="830" x2="1600" y2="830"/><line x1="380" y1="640" x2="220" y2="900"/><line x1="880" y1="640" x2="940" y2="900"/><line x1="1260" y1="640" x2="1480" y2="900"/></g>
  <rect y="636" width="1600" height="8" fill="#0d1240"/>
  <ellipse cx="300" cy="420" rx="340" ry="280" fill="url(#plamp)" style="mix-blend-mode:screen"/>
  <g filter="url(#prough)">
    <g fill="#0a0e30" stroke="#ffb06a" stroke-width="2.4"><rect x="70" y="150" width="150" height="200" transform="rotate(-3 145 250)"/><rect x="250" y="120" width="112" height="150" transform="rotate(2 306 195)"/></g>
    <line x1="380" y1="240" x2="380" y2="680" stroke="#ffb06a" stroke-width="12" transform="translate(-2,-2)"/><line x1="380" y1="240" x2="380" y2="680" stroke="#0a0e30" stroke-width="8"/>
    <path d="M380,680 L310,745 M380,680 L450,745 M380,680 L380,752" stroke="#0a0e30" stroke-width="7" fill="none"/>
    <path d="M296,400 L470,386 L478,252 L304,266Z" fill="#f4ecd8"/><path d="M296,400 L470,386 L478,252 L304,266Z" fill="#ffd9a0" opacity=".35"/>
    <g stroke="#6a5a7a" stroke-width="1.4"><line x1="314" y1="296" x2="462" y2="284"/><line x1="314" y1="308" x2="462" y2="296"/><line x1="314" y1="320" x2="462" y2="308"/><line x1="314" y1="332" x2="462" y2="320"/><line x1="314" y1="344" x2="462" y2="332"/></g>
    <ellipse cx="340" cy="326" rx="6" ry="5" fill="#e0566a"/><ellipse cx="380" cy="302" rx="6" ry="5" fill="#3fc1a5"/><ellipse cx="424" cy="316" rx="6" ry="5" fill="#f2c94c"/>
    <g fill="#0a0e30" stroke="#ffb06a" stroke-width="2.4"><rect x="130" y="760" width="170" height="70" rx="16"/></g>
  </g>
  ${trumpFig('ptrump', 'translate(780,858) scale(1.55)', true)}
  <g id="p-tomas" transform="translate(1210,858)"><g id="p-tomas-b">${sil('M-30,-175 L-34,0 L-8,0 L-2,-125 L6,0 L32,0 L30,-175Z')}${sil('M-34,-170 L-40,-300 Q-38,-335 -8,-340 L22,-340 Q46,-332 44,-296 L38,-170Z')}${sil(ell(4, -372, 23, 27))}${sil('M-21,-378 Q-22,-410 6,-410 Q34,-408 28,-376 Q10,-394 -21,-378Z')}${sil('M80,-47 C20,-48 10,-170 52,-200 C28,-240 38,-302 80,-300 C122,-302 134,-240 108,-200 C150,-170 140,-48 80,-47Z', { l: 4 })}${sil('M73,-296 L73,-432 L86,-432 L86,-296Z', { l: 2 })}${limb('M22,-318 L54,-262 L80,-208', 15)}</g></g>
  <rect width="1600" height="900" fill="#05081f" opacity=".12"/>
  </svg>`;
}
/* ---------- ending art ---------- */
function endGoodSVG() {
  return `<svg viewBox="0 190 640 290" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A strong night: the room on its feet in warm gold light, hands raised.">
  <defs><linearGradient id="eg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2a8a"/><stop offset=".5" stop-color="#c8607a"/><stop offset="1" stop-color="#ffb347"/></linearGradient>
  <radialGradient id="eg2" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#fff2c8" stop-opacity=".95"/><stop offset=".4" stop-color="#ffb347" stop-opacity=".5"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
  <filter id="eg3"><feGaussianBlur stdDeviation="12"/></filter></defs>
  <rect y="150" width="640" height="400" fill="url(#eg1)"/><rect y="150" width="640" height="400" fill="url(#eg2)" style="mix-blend-mode:screen"/>
  <g filter="url(#eg3)"><circle cx="90" cy="230" r="46" fill="#fff2c8" opacity=".6"/><circle cx="550" cy="220" r="60" fill="#ffb347" opacity=".6"/></g>
  <g fill="#fff6d8" style="mix-blend-mode:screen"><path class="tw" d="M140,250 l4,12 12,4 -12,4 -4,12 -4,-12 -12,-4 12,-4z"/><path class="tw" d="M480,270 l3,9 9,3 -9,3 -3,9 -3,-9 -9,-3 9,-3z"/><path class="tw" d="M300,215 l3,9 9,3 -9,3 -3,9 -3,-9 -9,-3 9,-3z"/></g>
  <g transform="translate(210,516) scale(.85)">${sil('M-26,-160 C-30,-100 -34,-50 -34,-8 L-4,-8 C-4,-50 2,-100 8,-160Z') + sil('M6,-160 C10,-100 18,-50 24,-8 L54,-8 C46,-50 38,-110 34,-160Z') + sil('M-30,-300 C-37,-260 -35,-210 -31,-150 L39,-150 C43,-210 41,-260 31,-296 C20,-312 -18,-312 -30,-300Z') + sil('M-14,-322 C-30,-336 -28,-372 -8,-382 C12,-392 36,-384 44,-364 C47,-356 47,-350 46,-346 L56,-336 L50,-326 C48,-312 44,-308 38,-306 C30,-300 18,-298 8,-302 C-2,-306 -10,-312 -14,-322Z') + sil('M-26,-352 C-26,-384 -2,-398 22,-392 C40,-388 48,-372 46,-356 C34,-366 18,-364 6,-352 C-4,-346 -16,-346 -26,-352Z') + limb('M2,-288 L70,-380', 14) + `<path d="M70,-380 L104,-420 C110,-400 108,-372 100,-352Z" fill="${DARK}" stroke="${RIM_L}" stroke-width="2.4"/>` + limb('M-26,-290 C-60,-300 -64,-380 -50,-440', 14)}</g>
  <g>${[60, 140, 420, 510, 590].map((x, i) => `<g class="cheer" style="animation-delay:${i * .12}s">${sil(`M${x - 28},520 L${x - 26},440 C${x - 26},420 ${x - 14},410 ${x - 4},410 L${x - 4},396 C${x - 22},394 ${x - 22},352 ${x},350 C${x + 22},352 ${x + 22},394 ${x + 4},396 L${x + 4},410 C${x + 14},410 ${x + 26},420 ${x + 26},440 L${x + 28},520Z`, { l: 3 })}<path d="M${x - 24},440 L${x - 40},370" stroke="${DARK}" stroke-width="12" stroke-linecap="round"/><path d="M${x + 24},440 L${x + 40},362" stroke="${DARK}" stroke-width="12" stroke-linecap="round"/></g>`).join('')}</g>
  </svg>`;
}
function endPoorSVG() {
  return `<svg viewBox="0 190 640 290" preserveAspectRatio="xMidYMid slice" role="img" aria-label="A rough night: an empty, cold club in the rain, the trumpeter sitting alone on a case.">
  <defs><linearGradient id="ep1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1230"/><stop offset="1" stop-color="#2a3358"/></linearGradient>
  <linearGradient id="ep2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9db4f0" stop-opacity="0"/><stop offset="1" stop-color="#9db4f0" stop-opacity=".5"/></linearGradient>
  <radialGradient id="ep3"><stop offset="0" stop-color="#cfe2ff" stop-opacity=".55"/><stop offset="1" stop-color="#9db4f0" stop-opacity="0"/></radialGradient></defs>
  <rect y="150" width="640" height="400" fill="url(#ep1)"/>
  <g class="rain" stroke="url(#ep2)" stroke-width="2"><line x1="40" y1="150" x2="30" y2="440"/><line x1="120" y1="150" x2="112" y2="470"/><line x1="210" y1="150" x2="204" y2="420"/><line x1="330" y1="150" x2="320" y2="460"/><line x1="440" y1="150" x2="432" y2="430"/><line x1="530" y1="150" x2="522" y2="470"/><line x1="600" y1="150" x2="592" y2="440"/></g>
  <rect y="450" width="640" height="100" fill="#0a0f2a"/><rect y="448" width="640" height="3" fill="#7a8fc8" opacity=".5"/>
  <ellipse cx="320" cy="360" rx="190" ry="190" fill="url(#ep3)" style="mix-blend-mode:screen"/>
  <g fill="#0a0f2a" stroke="#6f84c0" stroke-width="2"><rect x="40" y="390" width="40" height="60"/><rect x="60" y="370" width="40" height="80"/><rect x="520" y="380" width="70" height="70"/><rect x="560" y="340" width="50" height="110"/></g>
  <g transform="translate(330,448) scale(.78)">${sil('M-60,-60 L110,-60 L110,0 L-60,0Z', { l: 2 })}<g transform="translate(20,-60)">${sil('M-24,-30 C-24,-80 -22,-120 -10,-140 L16,-140 C30,-120 30,-80 30,-30Z') + sil('M-30,-176 C-40,-190 -36,-222 -18,-232 C2,-240 26,-232 34,-214 L44,-204 L38,-196 C38,-180 28,-168 14,-166 C0,-166 -20,-166 -30,-176Z') + sil('M-34,-206 C-34,-232 -10,-246 14,-240 C32,-236 38,-222 36,-208 C24,-216 8,-214 -4,-202 C-14,-196 -26,-196 -34,-206Z') + limb('M-8,-134 L14,-84 L-4,-40', 13) + limb('M22,-190 L56,-130', 8) + `<path d="M56,-130 L90,-90 L46,-84Z" fill="${DARK}" stroke="${RIM_L}" stroke-width="2"/>`}</g></g>
  </svg>`;
}

/* ---------- Blue-flame aura (solo close-up) ---------- */
function flameSVG() {
  let s = '', seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const cx = 720, cy = 440;
  for (let layer = 0; layer < 2; layer++) {
    let d = '';
    for (let i = 0; i < 16; i++) {
      const a0 = (-200 + i * 26 + rnd() * 6) * Math.PI / 180, a1 = a0 + .24, am = (a0 + a1) / 2;
      const r0 = layer ? 250 : 290, rt = (layer ? 330 : 420) + rnd() * (layer ? 60 : 140), sk = .07;
      const P = (r, a) => `${(cx + Math.cos(a) * r * 1.15).toFixed(0)},${(cy + Math.sin(a) * r).toFixed(0)}`;
      d += `M${P(r0, a0)} Q${P((r0 + rt) / 2, a0 - sk)} ${P(rt, am + sk)} Q${P((r0 + rt) / 2 + 10, a1 + sk)} ${P(r0, a1)}Z `;
    }
    s += `<path class="fl fl${layer}" d="${d}" fill="${layer ? '#cfe2ff' : '#2f55f0'}" opacity="${layer ? .75 : .8}"/>`;
  }
  return `<g id="cu-flame" opacity=".4">${s}</g>`;
}
function eyeStripSVG() {
  return `<svg viewBox="0 0 300 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
  <linearGradient id="esb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1456"/><stop offset="1" stop-color="#3a2aa8"/></linearGradient>
  <radialGradient id="esi" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#7b4a2a"/><stop offset=".6" stop-color="#2a1612"/><stop offset="1" stop-color="#120a0c"/></radialGradient></defs>
  <rect width="300" height="800" fill="url(#esb)"/>
  <g opacity=".7">${flameSVG().replace('id="cu-flame"', '').replace(/class="fl fl\d"/g, 'class="fl"')}</g>
  <path d="M-20,260 L-20,800 L320,800 L320,230 C250,250 190,240 150,250 C90,262 40,256 -20,260Z" fill="#d49470" stroke="#04061a" stroke-width="8"/>
  <path d="M-20,260 L-20,800 L150,800 L120,250Z" fill="#4a3f8c" opacity=".85"/>
  <path d="M-30,60 C40,-10 260,-10 330,60 L330,250 L300,200 L270,260 L240,196 L210,256 L180,190 L150,250 L120,190 L90,262 L60,200 L30,258 L-30,250Z" fill="#0a0f2a" stroke="#04061a" stroke-width="8"/>
  <path d="M30,70 C100,30 200,30 280,70" fill="none" stroke="#7aa5ff" stroke-width="5" opacity=".6"/>
  <path d="M110,330 Q190,285 290,330" fill="none" stroke="#04061a" stroke-width="26" stroke-linecap="round"/>
  <path d="M104,430 Q190,372 296,424 Q250,500 190,502 Q120,490 104,430Z" fill="#fff6ee" stroke="#04061a" stroke-width="7"/>
  <ellipse cx="200" cy="440" rx="46" ry="52" fill="url(#esi)"/><ellipse cx="200" cy="446" rx="18" ry="22" fill="#06030a"/>
  <circle cx="182" cy="420" r="15" fill="#fff"/><circle cx="224" cy="470" r="7" fill="#fff" opacity=".9"/>
  <path d="M96,436 Q190,360 300,414" fill="none" stroke="#06030a" stroke-width="16" stroke-linecap="round"/>
  <path d="M170,560 Q190,590 160,610" fill="none" stroke="#2a2160" stroke-width="6" opacity=".6" stroke-linecap="round"/>
  <path d="M250,230 L300,224 L300,360Z" fill="#ffe0a8" opacity=".35"/>
  <ellipse cx="60" cy="380" rx="8" ry="16" fill="#cfe2ff" opacity=".9"/><ellipse cx="240" cy="620" rx="9" ry="18" fill="#cfe2ff" opacity=".9"/><ellipse cx="90" cy="560" rx="7" ry="14" fill="#cfe2ff" opacity=".9"/>
  <g fill="none" stroke="#cfe2ff" stroke-width="4" opacity=".85"><circle cx="40" cy="300" r="11"/><circle cx="270" cy="560" r="8"/><circle cx="60" cy="700" r="13"/></g></svg>`;
}
