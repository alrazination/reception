import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildWorld, U, updatePeople, updateBirds, smooth, clamp, lerp } from './world.js';
import { createSound } from './sound.js';
import { buildInterior, updateInterior } from './interior.js';
import { initUI, P } from './ui.js';

const $ = id => document.getElementById(id);
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
initUI();
if (P.has('make')) throw 'maker';

// ---------- renderer ----------
const canvas = $('gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
catch (e) { body.classList.add('nogl', 'final'); throw e; }
const mobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
const low = P.has('low') || (mobile && ((navigator.deviceMemory || 4) <= 3 || (navigator.hardwareConcurrency || 4) <= 4));
let DPR = Math.min(devicePixelRatio || 1, low ? 1 : 1.75);
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = !low; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, .1, 9000);
let W_ = innerWidth, H_ = innerHeight;
const rsz = [Math.min(1024, Math.round(W_ * DPR * .5)), Math.min(1024, Math.round(H_ * DPR * .5))];
const W = buildWorld(scene, renderer, { low, dpr: DPR, reflectSize: rsz });
const IN = buildInterior(W.hall);

// environment light for the gold and stone, refreshed as the sky changes
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(W.sky.geometry, W.sky.material).copy(W.sky));
{ const n = new THREE.Mesh(new THREE.SphereGeometry(4000, 24, 12), W.nightMat); envScene.add(n); }
let envRT = null, envD = -1;
function refreshEnv(d) { if (Math.abs(d - envD) < .06) return; envD = d; const rt = pmrem.fromScene(envScene, 0, 1, 10000); if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; scene.environmentIntensity = .55; }

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .4, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uWhite: { value: 0 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform sampler2D tDiffuse;uniform float uTime,uWhite;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);vec2 q=vUv-.5;c.rgb*=1.-dot(q,q)*.85;float n=fract(sin(dot(vUv*vec2(812.,613.)+fract(uTime),vec2(12.9898,78.233)))*43758.5453)-.5;c.rgb+=n*.022;c.rgb=mix(c.rgb,vec3(1.,.97,.9),uWhite);gl_FragColor=c;}'
});
composer.addPass(grade);

// ---------- framing ----------
let sheetH = 0, sheetTarget = 0;
function fovFor(aspect) { const h = 64 * Math.PI / 180; return clamp(2 * Math.atan(Math.tan(h / 2) / aspect) * 180 / Math.PI, 42, 80); }
function resize() {
  W_ = innerWidth; H_ = innerHeight; renderer.setSize(W_, H_, false); composer.setPixelRatio(DPR); composer.setSize(W_, H_);
  frame_();
}
function frame_() { // keep the scene composed in the part of the screen not covered by the card
  const vis = Math.max(H_ * .3, H_ - sheetH); camera.aspect = W_ / vis; camera.fov = fovFor(W_ / vis);
  if (sheetH > 1) camera.setViewOffset(W_, vis, 0, 0, W_, H_); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- the journey ----------
const TJ = 30, TS = 50 / TJ; // the journey runs at 30 seconds; world timings were authored for 50
const camCurve = new THREE.CatmullRomCurve3([
  [0, 175, 340], [0, 128, 285], [0, 58, 205], [-3.5, 15, 142], [0, 4.4, 108], [2.2, 2.9, 62], [0, 2.2, 26], [0, 1.75, 7.6]
].map(p => new THREE.Vector3(...p)), false, 'centripetal');
const lookCurve = new THREE.CatmullRomCurve3([
  [0, 98, -220], [0, 62, -170], [0, 22, -110], [0, 7, -44], [0, 4.4, -14], [0, 4, -6], [0, 3.4, -2], [0, 2.95, -1]
].map(p => new THREE.Vector3(...p)));
const lens = camCurve.getLengths(600), total = lens[600];
const uAt = i => lens[Math.round(i / 7 * 600)] / total;
// time -> distance along the path, monotone and smooth (slow start, unhurried glide, gentle stop)
const knots = [[0, 0], [7.5, uAt(2)], [13.5, uAt(4)], [22.5, uAt(6)], [TJ, 1]];
const slopes = knots.map((k, i) => { if (i === 0 || i === knots.length - 1) return 0; const a = (k[1] - knots[i - 1][1]) / (k[0] - knots[i - 1][0]), b = (knots[i + 1][1] - k[1]) / (knots[i + 1][0] - k[0]); return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b); });
function uOf(t) {
  t = clamp(t, 0, TJ); let i = 0; while (i < knots.length - 2 && t > knots[i + 1][0]) i++;
  const [t0, u0] = knots[i], [t1, u1] = knots[i + 1], h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
  return clamp((2 * s3 - 3 * s2 + 1) * u0 + (s3 - 2 * s2 + s) * h * slopes[i] + (-2 * s3 + 3 * s2) * u1 + (s3 - s2) * h * slopes[i + 1]);
}
const sunsetAt = t => { t *= TS; return .45 * smooth(4, 22, t) + .27 * smooth(21, 32, t) + .28 * smooth(31, 45, t); };
const keys = [
  { d: 0, el: 7.5, sun: '#ffc58a', si: 3.2, hs: '#ffdcb8', hg: '#56603f', hi: .8, fog: '#f0c7a0', fd: .0011, ex: 1.1, ray: 2.2, tur: 5 },
  { d: .45, el: 1.3, sun: '#ff9550', si: 2.5, hs: '#f5b08e', hg: '#45403a', hi: .8, fog: '#e9a68a', fd: .0014, ex: 1.45, ray: 2.9, tur: 7 },
  { d: .72, el: -2.4, sun: '#ff6a3a', si: .3, hs: '#8c7fb5', hg: '#2a2836', hi: .42, fog: '#5b5486', fd: .0018, ex: 1.4, ray: 3, tur: 8 },
  { d: 1, el: -9, sun: '#ff6a3a', si: 0, hs: '#4a5a92', hg: '#161a26', hi: .32, fog: '#151b38', fd: .0016, ex: 1.3, ray: 3, tur: 8 },
].map(k => ({ ...k, sun: new THREE.Color(k.sun), hs: new THREE.Color(k.hs), hg: new THREE.Color(k.hg), fog: new THREE.Color(k.fog) }));
const tmpC = new THREE.Color(), sunDir = new THREE.Vector3();
let exposureBase = .5;
function applySky(d) {
  let i = 0; while (i < keys.length - 2 && d > keys[i + 1].d) i++;
  const a = keys[i], b = keys[i + 1], f = smooth(a.d, b.d, d), L = (x, y) => lerp(x, y, f), C = (x, y) => tmpC.copy(x).lerp(y, f);
  const el = L(a.el, b.el) * Math.PI / 180, az = .5;
  sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  const su = W.sky.material.uniforms; su.sunPosition.value.copy(sunDir); su.rayleigh.value = L(a.ray, b.ray); su.turbidity.value = L(a.tur, b.tur);
  W.sun.position.copy(W.sun.target.position).addScaledVector(sunDir, 160); W.sun.color.copy(C(a.sun, b.sun)); W.sun.intensity = L(a.si, b.si);
  W.hemi.color.copy(C(a.hs, b.hs)); W.hemi.groundColor.copy(C(a.hg, b.hg)); W.hemi.intensity = L(a.hi, b.hi);
  scene.fog.color.copy(C(a.fog, b.fog)); scene.fog.density = L(a.fd, b.fd);
  exposureBase = L(a.ex, b.ex);
  const night = smooth(.55, 1, d), lit = smooth(.32, .75, d);
  W.nightMat.uniforms.uOp.value = night * .96; W.starMat.uniforms.uOp.value = smooth(.62, 1, d); W.moonMat.opacity = smooth(.55, .9, d);
  W.moon.intensity = .45 * night; W.fireflyMat.uniforms.uOp.value = smooth(.6, .95, d);
  W.lampHeadMat.emissiveIntensity = 4 * lit; W.bulbMat.color.setRGB(1, .78, .45).multiplyScalar(.25 + 3.4 * lit);
  W.winMats.forEach(m => m.emissiveIntensity = .3 + 2 * smooth(.25, .8, d)); W.signMat.emissiveIntensity = .05 + .5 * lit;
  W.doorLight.intensity = 12 * lit; W.gardenLight.intensity = 6 * lit;
  refreshEnv(d);
}

// ---------- state ----------
let phase = 'intro', T = 0, wt = 0, doorP = 0, doorTarget = 0, openAt = -1, finalAt = -1, insideAt = -1, leaveAt = -1, d = 0;
const sound = createSound();
const caps = [...document.querySelectorAll('.cap:not(.in)')].map(e => ({ e, a: +e.dataset.a, b: +e.dataset.b }));
const capsIn = [...document.querySelectorAll('.cap.in')].map(e => ({ e, a: +e.dataset.a, b: +e.dataset.b }));
function begin(withSound) {
  if (phase !== 'intro') return;
  if (withSound) { sound.enable(true); }
  body.classList.add('go'); phase = 'journey'; motion(); setSoundBtn();
}
$('go').onclick = () => begin(true); $('quiet').onclick = () => begin(false);
$('skip').onclick = () => { if (phase === 'final') return; sound.prime(); toFinal(true); };
const setSoundBtn = () => { const on = sound.on(); $('snd').setAttribute('aria-pressed', on); $('sndl').textContent = on ? 'Sound on' : 'Sound off'; };
$('snd').onclick = () => { sound.enable(!sound.on()); setSoundBtn(); musicFor(); };
$('grip').onclick = () => { body.classList.toggle('mini'); measureSheet(); };
$('dooropen').onclick = () => openDoors();
$('cont').onclick = () => { if (phase === 'inside') { phase = 'leaving'; leaveAt = wt; body.classList.remove('joinon'); } };
$('joinwa').href = document.querySelector('.wa').href;
function restart() {
  phase = 'journey'; T = 0; wt = 0; doorP = 0; doorTarget = 0; openAt = insideAt = leaveAt = finalAt = -1; dragYaw = dragPitch = 0;
  body.classList.remove('door', 'final', 'inside', 'joinon', 'joinmini', 'mini', 'tapped'); body.classList.add('go');
  W.diyas.list.forEach(l => l.lit = -1); LN.list.length = 0; bgSpawned = 0; bgClock = 0;
  LN.o.scale.setScalar(0); LN.o.updateMatrix(); for (let i = 0; i < LN.n; i++) LN.mesh.setMatrixAt(i, LN.o.matrix); LN.mesh.instanceMatrix.needsUpdate = true;
  sheetTarget = 0; envD = -1; window.scrollTo(0, 0);
}
for (const id of ['replay', 'replay2']) $(id).onclick = e => { e.preventDefault(); e.stopImmediatePropagation(); restart(); };
// slide the cards down (or back up) with the grip or a swipe
$('jgrip').onclick = () => body.classList.toggle('joinmini');
for (const [el, cls] of [[$('sheet'), 'mini'], [$('join'), 'joinmini']]) { let y0 = null;
  el.addEventListener('pointerdown', e => { y0 = e.clientY; });
  el.addEventListener('pointerup', e => { if (y0 === null) return; const dy = e.clientY - y0; y0 = null; if (dy > 45) body.classList.add(cls); else if (dy < -45) body.classList.remove(cls); if (cls === 'mini') measureSheet(); }); }
function measureSheet() { sheetTarget = body.classList.contains('final') ? $('sheet').getBoundingClientRect().height * (body.classList.contains('mini') ? 0 : 1) + (body.classList.contains('mini') ? 64 : 0) : 0; }
addEventListener('resize', measureSheet);

function openDoors() {
  if (phase !== 'door') return; phase = 'opening'; openAt = wt; doorTarget = 1; body.classList.remove('door');
  try { navigator.vibrate && navigator.vibrate([16, 70, 30]); } catch (_) { }
}
function musicFor() {
  if (phase === 'intro') return sound.musicMix(0, 600, .5);
  if (phase === 'journey' || phase === 'door') { // muffled and distant, slowly drawing nearer to the hall
    const dist = camera.position.distanceTo(tmp.set(0, 3, -6)), c = 1 - clamp(Math.log(dist / 9) / Math.log(45));
    return sound.musicMix(.09 + .26 * c * c, 650 + 2400 * c * c, .55 - .25 * c); }
  if (phase === 'opening') { const e = smooth(0, .6, doorP); return sound.musicMix(lerp(.35, .7, e), lerp(3000, 16000, e), lerp(.3, .12, e)); }
  if (phase === 'inside' || phase === 'leaving') return sound.musicMix(.7, 16000, .12);
  return sound.musicMix(.28, 2200, .4); // outside again, heard from the hall
}
function toFinal(skip) {
  phase = 'final'; finalAt = wt; T = TJ; doorP = 1; body.classList.remove('door', 'intro', 'joinon', 'inside'); body.classList.add('go', 'final');
  requestAnimationFrame(() => { measureSheet(); });
  setSoundBtn();
}

// ---------- input: drag to look around, tilt, slide the doors, tap the sky for a lantern ----------
let yaw = 0, pitch = 0, dragYaw = 0, dragPitch = 0, gx = 0, gy = 0, cx = 0, cy = 0, b0 = null, mot = false, ptr = null;
function ori(e) { if (e.gamma == null) return; if (b0 === null) b0 = e.beta; gx = clamp(e.gamma / 25, -1, 1); gy = clamp((e.beta - b0) / 25, -1, 1); }
function motion() { if (mot || reduce) return; mot = true; const D = window.DeviceOrientationEvent; if (!D) return;
  if (typeof D.requestPermission === 'function') D.requestPermission().then(s => { if (s === 'granted') addEventListener('deviceorientation', ori); }).catch(() => { });
  else addEventListener('deviceorientation', ori); }
canvas.addEventListener('pointerdown', e => { ptr = { x: e.clientX, y: e.clientY, t: performance.now(), y0: dragYaw, p0: dragPitch, moved: 0 }; try { canvas.setPointerCapture(e.pointerId); } catch (_) { } });
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && !ptr) { gx = (e.clientX / innerWidth - .5) * 1.2; gy = (e.clientY / innerHeight - .5) * 1.2; }
  if (!ptr) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.moved = Math.max(ptr.moved, Math.hypot(dx, dy));
  if (phase === 'door') { doorTarget = clamp(Math.abs(dx) / (innerWidth * .38)) * .55; if (doorTarget > .5) openDoors(); return; }
  dragYaw = clamp(ptr.y0 + dx / innerWidth * 1.6, -.9, .9); dragPitch = clamp(ptr.p0 + dy / innerHeight * .9, -.35, .45);
});
const up = e => {
  if (!ptr) return; const tap = ptr.moved < 8 && performance.now() - ptr.t < 500;
  if (phase === 'door') { if (doorTarget > .16 || tap) openDoors(); else doorTarget = 0; }
  else if (phase === 'final' && tap) release(e.clientX, e.clientY);
  ptr = null;
};
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
addEventListener('keydown', e => { if (phase === 'door' && (e.key === 'Enter' || e.key === ' ')) openDoors(); });

// ---------- lanterns ----------
const LN = W.lanterns, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
function spawn(i, x, y, z, v, s, guest) { LN.list[i] = { x, y0: y, z, v, s, born: wt, ph: Math.random() * 9, guest }; }
function release(px, py) {
  v2.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera);
  const p = ray.ray.at(16 + Math.random() * 10, new THREE.Vector3()); p.y = Math.max(p.y, 1.2);
  const i = LN.bg + (LN.next++ % (LN.n - LN.bg)); spawn(i, p.x, p.y, p.z, 1.1 + Math.random() * .4, 1.5, true);
  try { navigator.vibrate && navigator.vibrate(8); } catch (_) { }
  body.classList.add('tapped');
}
let bgSpawned = 0, bgClock = 0;
function updateLanterns(dt) {
  if (d > .68 && bgSpawned < LN.bg) { bgClock += dt; while (bgClock > .22 && bgSpawned < LN.bg) { bgClock -= .22; const far = Math.random();
    const x = (Math.random() - .5) * 340, z = far < .7 ? -60 - Math.random() * 380 : 40 + Math.random() * 120; if (z > -60 && Math.abs(x) < 40) continue;
    spawn(bgSpawned++, x, -2 + Math.random() * 6, z, 1.1 + Math.random() * 1.3, 1, false); } }
  const o = LN.o;
  for (let i = 0; i < LN.n; i++) { const l = LN.list[i]; if (!l) continue; const age = wt - l.born, y = l.y0 + l.v * age;
    if (y > 330) { if (l.guest) { LN.list[i] = null; o.scale.setScalar(0); o.updateMatrix(); LN.mesh.setMatrixAt(i, o.matrix); continue; } l.born = wt; l.y0 = -2; }
    o.position.set(l.x + Math.sin(age * .35 + l.ph) * 1.5, y, l.z + Math.cos(age * .3 + l.ph) * 1.2); o.rotation.set(Math.sin(age * .8 + l.ph) * .08, age * .2, Math.cos(age * .7 + l.ph) * .08);
    o.scale.setScalar(l.s * smooth(0, 1.2, age) * (1 + .06 * Math.sin(wt * 9 + l.ph))); o.updateMatrix(); LN.mesh.setMatrixAt(i, o.matrix); }
  LN.mesh.instanceMatrix.needsUpdate = true;
}
function updateDiyas() {
  const D = W.diyas, front = lerp(113, 4, smooth(17, 37, T * TS)), o = D.o;
  D.list.forEach((l, i) => { if (l.lit < 0 && (l.z > front || phase === 'final')) l.lit = wt - (phase === 'final' ? 1 : 0);
    const s = l.lit < 0 ? 0 : Math.min(1, (wt - l.lit) / .7) * (1 + .14 * Math.sin(wt * 13 + l.ph) + .08 * Math.sin(wt * 23 + l.ph * 2));
    o.position.set(l.x, .32, l.z); o.scale.set(s, s * (1 + .1 * Math.sin(wt * 17 + l.ph)), s); o.updateMatrix(); D.mesh.setMatrixAt(i, o.matrix); });
  D.mesh.instanceMatrix.needsUpdate = true;
}

// ---------- the loop ----------
const camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
const doorPos = camCurve.getPointAt(1), doorLook = lookCurve.getPoint(1);
const INPOS0 = new THREE.Vector3(0, 2.05, -3), INPOS1 = new THREE.Vector3(0, 2.15, -6.4);
const inLook = new THREE.CatmullRomCurve3([[0, 2.6, -20], [0, 2.5, -20], [-2, 2.2, -18], [-10, 1.2, -7], [-9, 1.2, -6], [2, 1.4, -9], [9, 1.2, -6], [8, 1.3, -7.5], [0, 2.5, -20], [0, 2.6, -20]].map(p => new THREE.Vector3(...p)));
let last = performance.now(), soundClock = 0, frames = 0, slow = 0, lastCapIdx = -1;
const st = P.get('t'); if (st !== null) { body.classList.add('go'); phase = 'journey'; T = parseFloat(st) || 0; wt = T; if (T >= TJ + 5) toFinal(true); }
if (reduce) toFinal(true);
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const tt = now / 1000; U.time.value = tt; grade.uniforms.uTime.value = tt;
  if (phase !== 'intro') wt += dt;
  if (phase === 'journey') { T += dt; if (T >= TJ) { T = TJ; phase = 'door'; body.classList.add('door'); } }
  // adapt quality if the phone struggles
  if (phase !== 'intro' && frames < 120) { frames++; slow += dt > 1 / 28 ? 1 : 0; if (frames === 120 && slow > 70 && DPR > 1) { DPR = 1; renderer.setPixelRatio(1); resize(); } }
  d = phase === 'final' ? 1 : phase === 'intro' ? 0 : Math.max(sunsetAt(T), phase === 'door' || phase === 'opening' ? 1 : 0);
  applySky(d);
  // camera
  let white = 0, exMul = 1;
  if (phase === 'intro') { camPos.copy(camCurve.getPointAt(0)).add(tmp.set(Math.sin(tt * .1) * 6, Math.sin(tt * .13) * 2, 0)); look.copy(lookCurve.getPoint(0)); }
  else if (phase === 'journey' || phase === 'door') { camPos.copy(camCurve.getPointAt(uOf(T))); look.copy(lookCurve.getPoint(T / TJ)); if (phase === 'door') camPos.y += Math.sin(tt * .9) * .025; }
  else if (phase === 'opening') { const e = clamp((wt - openAt - 1.2) / 4.6); const ee = e * e * (3 - 2 * e);
    camPos.copy(doorPos).lerp(INPOS0, ee); look.copy(doorLook).lerp(inLook.getPoint(0), ee);
    exMul = 1 + Math.sin(e * Math.PI) * .9; if (e >= 1) { phase = 'inside'; insideAt = wt; body.classList.add('inside'); } }
  else if (phase === 'inside' || phase === 'leaving') { const it = wt - insideAt, f = clamp(it / 22), ff = f * f * (3 - 2 * f);
    camPos.copy(INPOS0).lerp(INPOS1, ff); camPos.y += Math.sin(wt * .7) * .03; look.copy(inLook.getPoint(f)).add(tmp.set(Math.sin(wt * .23) * .6, Math.sin(wt * .31) * .2, 0));
    capsIn.forEach(c => c.e.classList.toggle('on', phase === 'inside' && it >= c.a && it < c.b));
    if (it > 7.5 && phase === 'inside') body.classList.add('joinon');
    if (phase === 'leaving') { const l = (wt - leaveAt) / 1.4; white = smooth(0, 1, l); if (l >= 1) toFinal(false); } }
  else if (phase === 'final') { const f = wt - finalAt; white = 1 - smooth(.2, 2.2, f);
    camPos.set(Math.sin(wt * .06) * 5, 2.1 + Math.sin(wt * .11) * .25, 46 + Math.sin(wt * .045) * 3); look.set(0, 8.5, -24); doorTarget = 1; }
  sheetH += (sheetTarget - sheetH) * Math.min(1, dt * 5); if (Math.abs(sheetTarget - sheetH) > .5 || (sheetH > 0 && !camera.view)) frame_();
  camera.position.copy(camPos); camera.lookAt(look);
  cx += (gx - cx) * .05; cy += (gy - cy) * .05;
  if (!ptr) { dragYaw *= Math.pow(.25, dt); dragPitch *= Math.pow(.25, dt); }
  yaw = dragYaw - cx * .14; pitch = -dragPitch + cy * .08;
  camera.rotateY(yaw); camera.rotateX(pitch);
  renderer.toneMappingExposure = exposureBase * exMul; grade.uniforms.uWhite.value = white;
  // doors
  doorP += (doorTarget - doorP) * Math.min(1, dt * (phase === 'opening' ? 1.6 : 8));
  const ang = doorP * 1.85; W.doors[0].rotation.y = ang; W.doors[1].rotation.y = -ang;
  W.inLight.intensity = 10 * smooth(0, .4, doorP); W.doorGlow.material.opacity = smooth(0, .3, doorP) * (1 - smooth(.35, .8, doorP)) * .35;
  const inside = phase === 'opening' ? smooth(.02, .3, doorP) : (phase === 'inside' || phase === 'leaving') ? 1 : 0;
  updateInterior(IN, wt, dt, inside, () => { });
  if (inside) { exMul *= lerp(1, .72, inside); renderer.toneMappingExposure = exposureBase * exMul; W.hemi.intensity += .45 * inside; W.hemi.color.lerp(tmpC.set(0xffe2c0), inside); W.hemi.groundColor.lerp(tmpC.set(0x7a4a3a), inside); }
  // clouds fade as we sink beneath them
  const cv = smooth(40, 100, camPos.y); W.clouds.grp.visible = cv > .01;
  W.clouds.grp.children.forEach(s => { s.position.x += dt * 1.4; if (s.position.x > 280) s.position.x = -280; s.material.opacity = s.userData.base * cv; s.material.color.setRGB(1.35, lerp(1.08, .8, d), lerp(.9, .7, d)); });
  updateBirds(W.birds, T * TS); updatePeople(W.people, wt); updateDiyas(); updateLanterns(dt);
  W.gardenLight.position.set(camPos.x, 2.4, camPos.z - 9);
  // captions
  if (phase === 'journey') caps.forEach(c => c.e.classList.toggle('on', T >= c.a && T < c.b)); else caps.forEach(c => c.e.classList.remove('on'));
  // ambience
  soundClock += dt; if (soundClock > .25) { soundClock = 0; musicFor(); const y = camPos.y, near = smooth(45, 6, camPos.z);
    if (phase === 'intro') sound.set({ wind: .03, air: 0, water: 0, hall: 0, night: 0, birds: 0 });
    else if (phase === 'journey' || phase === 'door') sound.set({ wind: .022 * (1 - .5 * d), air: 0, birds: (1 - smooth(.35, .65, d)) * smooth(90, 30, y), water: 0, night: .006 * smooth(.55, .9, d), hall: .07 * near });
    else if (phase === 'opening' || phase === 'inside' || phase === 'leaving') sound.set({ hall: phase === 'opening' ? .16 : .1, water: .0, night: 0, wind: 0, air: 0, birds: 0 });
    else sound.set({ hall: .03, water: .06, night: .007, wind: 0, air: 0, birds: 0 }); }
  if (window.__raw) renderer.render(scene, camera); else composer.render(dt);
}
requestAnimationFrame(loop);
window.__dbg = { W, scene, renderer, setT: t => { T = t; wt = t; if (phase === 'intro') { phase = 'journey'; body.classList.add('go'); } }, open: openDoors, final: () => toFinal(true), adv: s => { wt += s; }, get phase() { return phase; }, camera };
