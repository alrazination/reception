// Inside the hall: the Islamic quiz on stage, children's games, families chatting over chai.
import * as THREE from 'three';
import { makePerson, rnd, lerp } from './world.js';

const PI = Math.PI;
const R = (a, b) => a + rnd() * (b - a);
const FY = .45, ZB = -20.75; // hall floor height and back wall
const hdr = (r, g, b) => new THREE.Color(r, g, b);
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.ctx = g; return t; }

function backdrop() {
  return tex(1024, 336, (g, w, h) => {
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f7d9df'); gr.addColorStop(1, '#fff1dc');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    gr = g.createRadialGradient(w / 2, h * .62, 10, w / 2, h * .62, 300); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(1, 'rgba(255,240,220,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let x = 10; x < w; x += 13) for (let y = 4; y < h; y += 15 + Math.random() * 9) { g.fillStyle = 'rgba(255,214,140,.9)'; g.beginPath(); g.arc(x + Math.sin(y) * 2, y, 1.6, 0, 2 * PI); g.fill(); }
    // balloon arch
    const cx = w / 2, cy = h + 30, rx = 330, ry = 236, pal = ['#f4a9bd', '#ffffff', '#f7c9d6', '#f6d98f', '#cfe0f2', '#e8b4c8', '#fde3b8'];
    for (let layer = 0; layer < 3; layer++) for (let k = 0; k <= 64; k++) { const a = PI + k / 64 * PI, off = (layer - 1) * 17 + (Math.random() - .5) * 6;
      const x = cx + Math.cos(a) * (rx + off), y = cy + Math.sin(a) * (ry + off), r = 13 + Math.random() * 8;
      g.fillStyle = pal[(k * 3 + layer * 2) % pal.length]; g.beginPath(); g.ellipse(x, y, r, r * 1.12, 0, 0, 2 * PI); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.06)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(x - r * .35, y - r * .4, r * .22, r * .3, -.5, 0, 2 * PI); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#2f555a'; g.font = '700 60px Lora, Georgia, serif'; g.fillText('Walimah', w / 2, 52);
    const pair = (y, a, b) => { g.font = '700 40px Lora, Georgia, serif'; const s1 = a + ' ', s2 = ' ' + b, amp = '&';
      const w1 = g.measureText(s1).width, w2 = g.measureText(s2).width; g.font = '500 40px Lora, Georgia, serif'; const wa = g.measureText(amp).width;
      let x = w / 2 - (w1 + wa + w2) / 2; g.textAlign = 'left';
      g.font = '700 40px Lora, Georgia, serif'; g.fillStyle = '#2f555a'; g.fillText(s1, x, y); x += w1;
      g.font = '500 40px Lora, Georgia, serif'; g.fillStyle = '#b8924d'; g.fillText(amp, x, y); x += wa;
      g.font = '700 40px Lora, Georgia, serif'; g.fillStyle = '#2f555a'; g.fillText(s2, x, y); g.textAlign = 'center'; };
    pair(178, 'Razin', 'Sahar'); pair(228, 'Razeen', 'Naeema');
  });
}
function scoreTex() {
  const t = tex(512, 200, () => { }); t.userData.draw = (a, b, q, flash) => { const g = t.userData.ctx, w = 512, h = 200;
    g.fillStyle = '#183a3f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8b867'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#f0d58f'; g.font = '600 24px Mukta, sans-serif'; g.fillText('\u2726  \u2726  \u2726', w / 2, 34);
    [[a, '', 128, flash === 0], [b, '', 384, flash === 1]].forEach(([s, n, x, f]) => {
      g.fillStyle = f ? '#ffe9a8' : '#ffffff'; g.font = '700 70px Lora, serif'; g.fillText(s, x, 112);
      g.fillStyle = f ? '#ffd36b' : '#9fd0c9'; g.font = '700 22px Mukta, sans-serif'; g.fillText(n, x, 166); });
    g.fillStyle = 'rgba(216,184,103,.6)'; g.fillRect(w / 2 - 1, 60, 2, 120);
    t.needsUpdate = true; };
  return t;
}
function label(text, bg, fg, w = 256, h = 64, font = '700 30px Mukta, sans-serif') {
  return tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); });
}
function bubbleTex() {
  return tex(128, 96, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(64, 40, 56, 34, 0, 0, 2 * PI); g.fill(); g.beginPath(); g.moveTo(40, 66); g.lineTo(30, 92); g.lineTo(62, 70); g.fill();
    g.fillStyle = '#3f7a85'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(40 + i * 24, 40, 7, 0, 2 * PI); g.fill(); } });
}
function heartTex() {
  return tex(128, 96, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(64, 40, 56, 34, 0, 0, 2 * PI); g.fill(); g.beginPath(); g.moveTo(80, 66); g.lineTo(96, 92); g.lineTo(66, 70); g.fill();
    g.fillStyle = '#e0566f'; g.beginPath(); g.moveTo(64, 58); g.bezierCurveTo(30, 36, 44, 14, 64, 30); g.bezierCurveTo(84, 14, 98, 36, 64, 58); g.fill(); });
}

export function buildInterior(hall) {
  const I = { anim: [] }; const G = new THREE.Group(); hall.add(G); G.visible = false; I.group = G;
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
  // backdrop and stage
  const bd = new THREE.Mesh(new THREE.PlaneGeometry(26, 8.53), new THREE.MeshBasicMaterial({ map: backdrop(), color: hdr(.8, .76, .72) }));
  bd.position.set(0, FY + 4.27, ZB + .06); G.add(bd);
  const stage = new THREE.Mesh(new THREE.BoxGeometry(17, .6, 4.6), std(0x6b2230)); stage.position.set(0, FY + .3, -18.45); G.add(stage);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(17.05, .08, .06), std(0xd8b25e, { metalness: .8, roughness: .3 })); trim.position.set(0, FY + .56, -16.13); G.add(trim);
  const SY = FY + .6;
  // on stage: a speaker at the lectern addressing the hall, others seated beside
  I.stage = [];
  { const sp = makePerson('m', 31); sp.position.set(.4, SY, -17); sp.rotation.y = PI; G.add(sp); I.speaker = sp;
    const mic = new THREE.Group(); const mb = new THREE.Mesh(new THREE.CylinderGeometry(.02, .016, .2, 8), std(0x1a1a1a, { metalness: .7, roughness: .3 })); mb.position.y = .06;
    const mh = new THREE.Mesh(new THREE.SphereGeometry(.035, 10, 8), std(0x777777, { metalness: .8, roughness: .3 })); mh.position.y = .17; mic.add(mb, mh); mic.position.set(0, -.6, -.03); sp.userData.arm1.add(mic);
    const chairG = chairGeo(), cm = std(0xfff6ea);
    [[-5.2, 'm'], [-3.8, 'm'], [3.8, 'm'], [5.2, 'm'], [-6.6, 'w'], [6.6, 'w']].forEach(([x, k], j) => {
      const c = new THREE.Mesh(chairG, cm); c.position.set(x, SY, -18.6); c.rotation.y = PI; G.add(c);
      const p = makePerson(k, 33 + j); p.scale.set(1, .74, 1); p.position.set(x, SY + .05, -18.65); p.rotation.y = PI; G.add(p); I.stage.push(p); });
    const flowers = []; for (const x of [-2, 2]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(.18, .14, .6, 12), std(0xd8b25e, { metalness: .6, roughness: .35 })); v.position.set(x, SY + .3, -16.6); G.add(v);
      for (let f = 0; f < 26; f++) { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 0), std(['#f4a9bd', '#ffffff', '#f7c9d6', '#9ccf9e'][f % 4])); fl.position.set(x + (rnd() - .5) * .45, SY + .7 + rnd() * .35, -16.6 + (rnd() - .5) * .45); G.add(fl); } }
  }
  // the hall seated in long rows facing the stage (drawn in batches so phones stay smooth)
  { const rows = 7, per = 9, seats = [];
    for (let r = 0; r < rows; r++) for (const side of [-1, 1]) for (let i = 0; i < per; i++) seats.push([side * (.85 + i * .62), -14.7 + r * 1.05]);
    const chairs = new THREE.InstancedMesh(chairGeo(), std(0xfff6ea), seats.length), o = new THREE.Object3D();
    seats.forEach((p, i) => { o.position.set(p[0], FY, p[1]); o.rotation.set(0, 0, 0); o.updateMatrix(); chairs.setMatrixAt(i, o.matrix); }); G.add(chairs);
    const filled = seats.filter(() => rnd() < .88), women = [], men = [];
    filled.forEach(p => (rnd() < .55 ? women : men).push({ x: p[0], z: p[1] + .04, ph: R(0, 9) }));
    const part = (geo, n, col) => { const m = new THREE.InstancedMesh(geo, std(0xffffff), n); col.forEach((c, i) => m.setColorAt(i, new THREE.Color(c))); G.add(m); return m; };
    const pick = (a, n) => Array.from({ length: n }, () => a[(rnd() * a.length) | 0]);
    const skin = ['#c99068', '#b57d55', '#d9a679', '#9c6a48'], abaya = ['#3b2a4a', '#5a2a3a', '#1f2c4a', '#2a2a2e', '#2f4a4a', '#6a4a3a', '#7a5a8a'], hijab = ['#f3e6d8', '#f2c6cf', '#cfe0d6', '#e8d3a8', '#d9c4e8', '#ffffff', '#f7d9e0'], thobe = ['#ffffff', '#cfe0f2', '#f3ead6', '#d9eadf', '#f2d9de', '#c9ced6', '#a9c2de'];
    const wT = new THREE.CylinderGeometry(.16, .27, .66, 12); wT.translate(0, .81, 0);
    const wH = mergeChairs([(() => { const g = new THREE.SphereGeometry(.145, 12, 10); g.scale(1, 1.08, 1.05); g.translate(0, 1.27, 0); return g; })(), (() => { const g = new THREE.ConeGeometry(.25, .34, 12); g.translate(0, 1.08, 0); return g; })()]);
    const mT = mergeChairs([(() => { const g = new THREE.CylinderGeometry(.2, .26, .66, 12); g.translate(0, .81, 0); return g; })(), (() => { const g = new THREE.SphereGeometry(.24, 12, 8); g.scale(1, .45, .8); g.translate(0, 1.13, 0); return g; })()]);
    const mHd = new THREE.SphereGeometry(.115, 12, 10); mHd.translate(0, 1.33, 0);
    const mCap = new THREE.SphereGeometry(.12, 12, 8, 0, 2 * PI, 0, PI / 2); mCap.rotateX(.25); mCap.translate(0, 1.35, .012);
    I.crowd = [
      { list: women, meshes: [part(wT, women.length, pick(abaya, women.length)), part(wH, women.length, pick(hijab, women.length))] },
      { list: men, meshes: [part(mT, men.length, pick(thobe, men.length)), part(mHd, men.length, pick(skin, men.length)), part(mCap, men.length, men.map(() => '#1c1410'))] },
    ];
  }
  // games corner: relay race and cheering parents
  { const lab = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .9), new THREE.MeshBasicMaterial({ map: label('GAMES CORNER', '#f7c948', '#5a3a10', 256, 64), color: hdr(1.1, 1.1, 1.1) }));
    lab.visible = false;
    const cone = new THREE.ConeGeometry(.18, .45, 10), coneMat = std(0xff7a3a);
    I.runners = [];
    [-12.2, -10.8, -9.4].forEach((x, i) => {
      for (const z of [-11, -2.5]) { const c = new THREE.Mesh(cone, coneMat); c.position.set(x, FY + .225, z); G.add(c); }
      const k = makePerson('k', 60 + i); k.position.set(x, FY, -10); G.add(k); I.runners.push({ p: k, x, sp: 2.1 + i * .35, ph: i * 1.7 });
    });
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(4.6, .12), std(0xffffff)); tape.rotation.x = -PI / 2; tape.position.set(-10.8, FY + .01, -2.5); G.add(tape);
    I.cheer = [];
    [[-7.7, -4], [-7.6, -6.6], [-8, -9], [-13.9, -5.5], [-13.8, -8.6]].forEach(([x, z], i) => { const p = makePerson(['w', 'm', 'w', 'm', 'k'][i], 70 + i); p.position.set(x, FY, z); p.rotation.y = x < -11 ? -PI / 2 : PI / 2; G.add(p); I.cheer.push(p); });
    // ring toss for the little ones
    const pegs = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .5, 6), std(0x8a5a3a)); pegs.position.set(-6.4, FY + .25, -12.6); G.add(pegs);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.18, .035, 6, 18), std(0xf49ab8)); ring.rotation.x = PI / 2; G.add(ring); I.ring = ring;
    const tosser = makePerson('k', 66); tosser.position.set(-6.4, FY, -10); G.add(tosser); I.tosser = tosser;
  }
  // families chatting over chai
  I.chat = []; I.bubbles = [];
  { const bt = [bubbleTex(), bubbleTex()];
    [[7.6, -4.4], [11.2, -7.6], [7.4, -10.6], [-4.2, -4.6]].forEach(([x, z], ti) => {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, .06, 24), std(0xfff6ea)); top.position.set(x, FY + .78, z); G.add(top);
      const cloth = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.2, .74, 24, 1, true), std(ti % 2 ? 0xf3c6d1 : 0xcfe3d6, { side: THREE.DoubleSide })); cloth.position.set(x, FY + .41, z); G.add(cloth);
      const vase = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .3, 12), std(0xd8b25e, { metalness: .6, roughness: .35 })); vase.position.set(x, FY + .96, z); G.add(vase);
      for (let f = 0; f < 9; f++) { const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), std(['#f4a9bd', '#ffffff', '#f7c9d6'][f % 3])); fl.position.set(x + (rnd() - .5) * .25, FY + 1.17 + rnd() * .12, z + (rnd() - .5) * .25); G.add(fl); }
      const n = ti === 3 ? 3 : 5;
      for (let j = 0; j < n; j++) { const a = j / n * 2 * PI + ti; const k = ['w', 'm', 'w', 'w', 'm'][(j + ti) % 5]; const p = makePerson(k, 80 + ti * 5 + j);
        p.position.set(x + Math.cos(a) * 1.5, FY, z + Math.sin(a) * 1.5); p.rotation.y = Math.atan2(p.position.x - x, p.position.z - z); G.add(p); I.chat.push(p); }
      for (let b = 0; b < 2; b++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt[(b + ti) % 2], transparent: true, depthWrite: false, opacity: 0 })); s.scale.set(.6, .45, 1);
        s.position.set(x + R(-1.4, 1.4), FY + 2.2, z + R(-1.2, 1.2)); G.add(s); I.bubbles.push({ s, ph: R(0, 9), per: R(3.5, 6) }); }
    });
  }
  // balloons, bunting, confetti
  { const n = 46, m = new THREE.InstancedMesh(new THREE.SphereGeometry(.28, 12, 10), new THREE.MeshStandardMaterial({ roughness: .35, metalness: .05 }), n), c = new THREE.Color(), o = new THREE.Object3D();
    const pal = ['#f4a9bd', '#ffd36b', '#8fd0c8', '#b9a4e8', '#ff8a65', '#ffffff', '#f7c9d6'], list = [];
    for (let i = 0; i < n; i++) { const cl = i < 18; const p = cl ? [((i % 2) ? 1 : -1) * R(7.6, 8.4), FY + R(1.2, 2.8), R(-17.4, -16.4)] : [R(-13, 13), R(6.4, 8.2), R(-19, -2)];
      list.push({ p, ph: R(0, 9) }); m.setColorAt(i, c.set(pal[i % pal.length])); o.position.set(...p); o.scale.set(1, 1.2, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    G.add(m); I.balloons = { m, list, o };
    const flags = [], fc = []; for (const z of [-4, -8, -12, -16]) for (let i = 0; i <= 26; i++) { const t = i / 26, x = -14.6 + t * 29.2, y = 8.2 - Math.sin(t * PI) * 1.4;
      const f = new THREE.BufferGeometry(); f.setAttribute('position', new THREE.Float32BufferAttribute([x - .22, y, z, x + .22, y, z, x, y - .5, z], 3)); f.computeVertexNormals(); flags.push(f); fc.push(i % 6); }
    const fm = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, vertexColors: true, roughness: .7 });
    const merged = mergeChairs(flags.map((f, i) => { const col = new THREE.Color(pal[fc[i]]); f.setAttribute('color', new THREE.Float32BufferAttribute([col.r, col.g, col.b, col.r, col.g, col.b, col.r, col.g, col.b], 3)); return f; }));
    G.add(new THREE.Mesh(merged, fm));
    const N = 320, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const cc = new THREE.Color(pal[i % pal.length]); col.set([cc.r * 1.6, cc.g * 1.6, cc.b * 1.6], i * 3); pos[i * 3 + 1] = -99; }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const cf = new THREE.Points(cg, new THREE.PointsMaterial({ size: .09, vertexColors: true })); cf.visible = false; I.confetti = { g: cg, pos, vel, N };
  }
  // warm light inside
  const L1 = new THREE.PointLight(0xffd8a8, 0, 30, 1.4); L1.position.set(0, 6.5, -15); G.add(L1);
  const L2 = new THREE.PointLight(0xffc890, 0, 26, 1.5); L2.position.set(-8, 5.5, -6); G.add(L2);
  const L3 = new THREE.PointLight(0xffc890, 0, 26, 1.5); L3.position.set(8, 5.5, -6); G.add(L3);
  I.lights = [L1, L2, L3];
  return I;
}
function chairGeo() {
  const seat = new THREE.BoxGeometry(.5, .07, .5); seat.translate(0, .48, 0);
  const back = new THREE.BoxGeometry(.5, .38, .05); back.translate(0, .7, .23);
  const legs = []; for (const x of [-.21, .21]) for (const z of [-.21, .21]) { const l = new THREE.BoxGeometry(.04, .45, .04); l.translate(x, .225, z); legs.push(l); }
  return mergeChairs([seat, back, ...legs]);
}
function mergeChairs(list) { // tiny local merge so this module stays standalone
  const geos = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; geos.forEach(g => n += g.attributes.position.count);
  const out = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), hasC = !!geos[0].attributes.color, col = hasC ? new Float32Array(n * 3) : null; let o = 0;
  geos.forEach(g => { pos.set(g.attributes.position.array, o * 3); if (hasC) col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); if (hasC) out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.computeVertexNormals(); return out;
}

export function updateInterior(I, t, dt, on, cue) {
  I.group.visible = on > 0; if (!on) return;
  I.lights[0].intensity = 26 * on; I.lights[1].intensity = 12 * on; I.lights[2].intensity = 12 * on;
  const arm = (p, s, v) => { const a = p.userData['arm' + s]; if (a) a.rotation.z += (v - a.rotation.z) * Math.min(1, dt * 8); };
  // the host chats casually on stage, mic in hand, strolling a little; now and then the hall laughs
  const laugh = Math.pow(Math.max(0, Math.sin(t * .42 - 1)), 10);
  { const sp = I.speaker, u = sp.userData; // stands still and talks, mic held up
    u.arm1.rotation.x = -2.25; u.arm1.rotation.z = -.35; u['arm-1'].rotation.set(0, 0, -.12);
    if (u['leg-1']) { u['leg-1'].rotation.x = 0; u['leg1'].rotation.x = 0; }
    u.body.rotation.y = Math.sin(t * .25) * .18; u.body.rotation.x = laugh * .04; u.body.position.y = 0; }
  I.stage.forEach((p, i) => { const u = p.userData; u.body.rotation.x = -laugh * .08 * (.6 + (i % 3) * .2); u.body.position.y = Math.abs(Math.sin(t * 11 + i)) * .02 * laugh; u.body.rotation.y = Math.sin(t * .2 + i) * .1; });
  // the seated guests listen, and laugh along (quietly) when the host says something funny
  { const o = I.tmpO || (I.tmpO = new THREE.Object3D());
    I.crowd.forEach(gp => { gp.list.forEach((p, i) => { const l = laugh * (.5 + (p.ph % 1) * .5), turn = Math.sin(t * .23 + p.ph * 3) > .95 ? Math.sin(t * 1.2 + p.ph) * .35 : 0;
      o.position.set(p.x, FY + .05 + Math.abs(Math.sin(t * 10 + p.ph)) * .02 * l, p.z); o.rotation.set(-l * .1 + Math.sin(t * .5 + p.ph) * .015, turn, Math.sin(t * .4 + p.ph * 1.3) * .015 + Math.sin(t * 9 + p.ph) * .02 * l); o.scale.setScalar(1); o.updateMatrix();
      gp.meshes.forEach(m => m.setMatrixAt(i, o.matrix)); }); gp.meshes.forEach(m => m.instanceMatrix.needsUpdate = true); }); }
  // relay race
  I.runners.forEach(r => { const s = (t * r.sp / 8.5 + r.ph) % 2, f = s < 1 ? s : 2 - s; const z = lerp(-10.6, -2.9, f * f * (3 - 2 * f) * .15 + f * .85);
    r.p.position.z = z; r.p.rotation.y = s < 1 ? PI : 0; const ph = t * 13 + r.ph; r.p.userData.body.position.y = Math.abs(Math.sin(ph)) * .1;
    if (r.p.userData['leg-1']) { r.p.userData['leg-1'].rotation.x = Math.sin(ph) * .9; r.p.userData['leg1'].rotation.x = -Math.sin(ph) * .9; }
    arm(r.p, -1, 0); r.p.userData['arm-1'].rotation.x = -Math.sin(ph) * .9; r.p.userData['arm1'].rotation.x = Math.sin(ph) * .9; });
  I.cheer.forEach((p, i) => { const w = Math.sin(t * 6 + i * 2); arm(p, -1, -2.5 - w * .3); arm(p, 1, 2.5 + w * .3); p.userData.body.position.y = Math.abs(Math.sin(t * 5 + i)) * .04; });
  // ring toss arc
  { const c = (t * .55) % 1, k = I.tosser; const a = new THREE.Vector3(-6.4, FY + 1.1, -10.3), b = new THREE.Vector3(-6.4, FY + .5, -12.6);
    I.ring.position.lerpVectors(a, b, c); I.ring.position.y += Math.sin(c * PI) * 1.1; I.ring.rotation.z = c * 8; I.ring.visible = c < .97;
    arm(k, 1, c < .15 ? 2.2 : .5); }
  // chatting: gentle, natural movement only
  I.chat.forEach((p, i) => { const u = p.userData; u.body.rotation.y = Math.sin(t * .35 + i * 1.7) * .18; u.body.rotation.x = Math.sin(t * .5 + i) * .015; });
  I.bubbles.forEach(b => { const c = ((t + b.ph) % b.per) / b.per; const o = c < .5 ? Math.sin(c / .5 * PI) : 0; b.s.material.opacity = o; b.s.position.y = FY + 2.1 + c * .3; });
  // balloons bob
  const BL = I.balloons; BL.list.forEach((b, i) => { BL.o.position.set(b.p[0] + Math.sin(t * .6 + b.ph) * .06, b.p[1] + Math.sin(t * .9 + b.ph) * .12, b.p[2]); BL.o.scale.set(1, 1.2, 1); BL.o.rotation.z = Math.sin(t * .7 + b.ph) * .1; BL.o.updateMatrix(); BL.m.setMatrixAt(i, BL.o.matrix); });
  BL.m.instanceMatrix.needsUpdate = true;
  // confetti
  const C = I.confetti; for (let i = 0; i < C.N; i++) { const k = i * 3; if (C.pos[k + 1] < FY) { C.pos[k + 1] = -99; continue; }
    C.vel[k + 1] -= 3.2 * dt; C.vel[k] *= .985; C.vel[k + 2] *= .985; C.vel[k + 1] = Math.max(C.vel[k + 1], -1.1);
    C.pos[k] += (C.vel[k] + Math.sin(t * 4 + i) * .3) * dt; C.pos[k + 1] += C.vel[k + 1] * dt; C.pos[k + 2] += C.vel[k + 2] * dt; }
  C.g.attributes.position.needsUpdate = true;
}
function burst(I, x) {
  const C = I.confetti; for (let i = 0; i < C.N; i++) { const k = i * 3;
    C.pos[k] = x + (Math.random() - .5) * 1.5; C.pos[k + 1] = FY + 5 + Math.random(); C.pos[k + 2] = -17 + (Math.random() - .5) * 1.5;
    C.vel[k] = (Math.random() - .5) * 5; C.vel[k + 1] = 1 + Math.random() * 3; C.vel[k + 2] = (Math.random() - .2) * 4; }
}
