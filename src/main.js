import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildWorld, U, updatePeople, updateBirds, spawnPetals, updatePetals, clearPetals, smooth, clamp, lerp } from './world.js';
import { createSound } from './sound.js';
import { buildInterior, updateInterior, setSeatCard } from './interior.js';
import { initUI, P, NAME, I18N, t } from './ui.js';

const $ = id => document.getElementById(id);
const body = document.body;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const progress = p => { try { window.__boot && window.__boot.set(p); } catch (_) { } };
const breathe = () => new Promise(r => setTimeout(r, 0)); // let the page paint (and the ring move) between heavy steps
const hooks = {};
initUI({ onLang: () => hooks.lang && hooks.lang() });
if (P.has('make')) await new Promise(() => { }); // the link maker needs no 3D

// ---------- renderer ----------
const canvas = $('gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); }
catch (e) { body.classList.add('nogl', 'final', 'go'); throw e; }
const mobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
const low = P.has('low') || (mobile && ((navigator.deviceMemory || 4) <= 3 || (navigator.hardwareConcurrency || 4) <= 4));
let DPR = Math.min(devicePixelRatio || 1, low ? 1 : P.has('hq') ? 2 : 1.75); // ?hq: full resolution, for rendering the poster
renderer.setPixelRatio(DPR);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = !low; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, .1, 9000);
let W_ = innerWidth, H_ = innerHeight;
const rsz = [Math.min(1024, Math.round(W_ * DPR * .5)), Math.min(1024, Math.round(H_ * DPR * .5))];
progress(.32);
// the doors and the place card are drawn with these fonts
await Promise.race([Promise.all(['700 60px Lora', 'italic 500 34px Lora', '400 90px "Great Vibes"'].map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 2500))]).catch(() => { });
await breathe();
const W = buildWorld(scene, renderer, { low, dpr: DPR, reflectSize: rsz });
progress(.48); await breathe();
const IN = buildInterior(W.hall, { dpr: DPR });
progress(.56); await breathe();

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .4, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());
// colour grade: vignette, grain, the white flash, and inside the hall a soft blur at the top and bottom of the frame
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uWhite: { value: 0 }, uTilt: { value: 0 }, uAsp: { value: 1 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform sampler2D tDiffuse;uniform float uTime,uWhite,uTilt,uAsp;varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){vec4 c=texture2D(tDiffuse,vUv);
    float k=uTilt*smoothstep(.12,.46,abs(vUv.y-.5));
    if(k>.003){vec2 r=k*vec2(.012/uAsp,.012);float a0=h(vUv*731.)*6.2832;vec3 s=c.rgb;
      for(int i=0;i<12;i++){float fi=float(i);float a=a0+fi*2.39996;float rr=sqrt((fi+.5)/12.);s+=texture2D(tDiffuse,vUv+vec2(cos(a),sin(a))*rr*r).rgb;}
      c.rgb=s/13.;}
    vec2 q=vUv-.5;c.rgb*=1.-dot(q,q)*.85;c.rgb+=(h(vUv*vec2(812.,613.)+fract(uTime))-.5)*.022;
    c.rgb=mix(c.rgb,vec3(1.,.97,.9),uWhite);gl_FragColor=c;}`
});
composer.addPass(grade);

// ---------- framing ----------
let sheetH = 0, sheetTarget = 0;
function fovFor(aspect) { const h = 64 * Math.PI / 180; return clamp(2 * Math.atan(Math.tan(h / 2) / aspect) * 180 / Math.PI, 42, 80); }
function resize() {
  W_ = innerWidth; H_ = innerHeight; renderer.setSize(W_, H_, false); composer.setPixelRatio(DPR); composer.setSize(W_, H_); grade.uniforms.uAsp.value = W_ / H_;
  frame_();
}
function frame_() { // keep the scene composed in the part of the screen not covered by the card
  const vis = Math.max(H_ * .3, H_ - sheetH); camera.aspect = W_ / vis; camera.fov = fovFor(W_ / vis);
  if (sheetH > 1) camera.setViewOffset(W_, vis, 0, 0, W_, H_); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- the journey: from above the garden at golden hour, over the flower arch, to the doors ----------
const TJ = 30, TS = 50 / TJ; // the journey runs at 30 seconds; world timings were authored for 50
const V3 = a => new THREE.Vector3(...a);
const camCurve = new THREE.CatmullRomCurve3([[0, 10.5, 154], [-1.6, 7.6, 138], [-2.4, 5.6, 124], [0, 4.4, 108], [2.2, 2.9, 62], [0, 2.2, 26], [0, 1.75, 7.6]].map(V3), false, 'centripetal');
const lookCurve = new THREE.CatmullRomCurve3([[0, 6.8, -30], [0, 6.2, -32], [0, 5.4, -28], [0, 4.4, -14], [0, 4, -6], [0, 3.4, -2], [0, 2.95, -1]].map(V3));
const lens = camCurve.getLengths(600), total = lens[600];
const uAt = i => lens[Math.round(i / 6 * 600)] / total;
// time -> distance along the path, monotone and smooth (slow start, unhurried glide, gentle stop)
const knots = [[0, 0], [4.5, uAt(1)], [9.5, uAt(3)], [21, uAt(5)], [TJ, 1]];
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
}

// ---------- sky light on the gold and stone: a few moments baked once, then blended (no rebuilds during the journey) ----------
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(W.sky.geometry, W.sky.material).copy(W.sky));
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(4000, 24, 12), W.nightMat));
const ENVK = low ? [.3, 1] : [0, .42, .72, 1], envs = [];
{ const pm = new THREE.PMREMGenerator(renderer);
  for (const k of ENVK) { applySky(k); envs.push(pm.fromScene(envScene, 0, 1, 10000)); progress(.56 + .14 * envs.length / ENVK.length); await breathe(); }
  pm.dispose(); }
const envMix = new THREE.WebGLCubeRenderTarget(envs[0].width, { minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: false, type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: false });
envs[0].texture.mipmaps.forEach(m => envMix.texture.mipmaps.push({ width: m.width, height: m.height }));
envMix.texture.isPMREMTexture = true; envMix.texture.name = 'PMREM';
const mixMat = new THREE.ShaderMaterial({ name: 'EnvBlend', uniforms: { a: { value: null }, b: { value: null }, w: { value: 0 }, lod: { value: 0 } }, vertexShader: THREE.ShaderLib.cube.vertexShader,
  fragmentShader: 'uniform samplerCube a,b;uniform float w,lod;varying vec3 vWorldDirection;void main(){vec3 n=normalize(vWorldDirection);gl_FragColor=vec4(mix(textureLod(a,n,lod).rgb,textureLod(b,n,lod).rgb,w),1.);}',
  side: THREE.BackSide, blending: THREE.NoBlending, depthTest: false, depthWrite: false });
const mixBox = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), mixMat), mixCam = new THREE.CubeCamera(1, 10, envMix);
let mixLod = 0, mixKey = -1, envCur = null;
function mixPass(lod) { const s = envMix.width >> lod; mixMat.uniforms.lod.value = lod; mixCam.activeMipmapLevel = lod; envMix.viewport.set(0, 0, s, s); mixCam.update(renderer, mixBox); envMix.viewport.set(0, 0, envMix.width, envMix.height); }
function setEnv(d) {
  let i = 0; while (i < ENVK.length - 2 && d > ENVK[i + 1]) i++;
  const w = clamp((d - ENVK[i]) / (ENVK[i + 1] - ENVK[i])), lv = envMix.texture.mipmaps.length; let tex;
  if (w < .004) tex = envs[i].texture; else if (w > .996) tex = envs[i + 1].texture;
  else { // refresh one mip level of the blend per frame; all of them when the blend has just started
    mixMat.uniforms.a.value = envs[i].texture; mixMat.uniforms.b.value = envs[i + 1].texture; mixMat.uniforms.w.value = w;
    if (mixKey !== i || envCur !== envMix.texture) { mixKey = i; for (let l = 0; l < lv; l++) mixPass(l); } else { mixLod = (mixLod + 1) % lv; mixPass(mixLod); }
    tex = envMix.texture; }
  if (tex !== envCur) { envCur = tex; scene.environment = tex; scene.environmentIntensity = .55; }
}

// ---------- state ----------
let phase = 'intro', T = 0, wt = 0, doorP = 0, doorTarget = 0, openAt = -1, finalAt = -1, insideAt = -1, leaveAt = -1, d = 0;
const sound = createSound();
const caps = [...document.querySelectorAll('.cap:not(.in)')].map(e => ({ e, a: +e.dataset.a, b: +e.dataset.b }));
const capsIn = [...document.querySelectorAll('.cap.in')].map(e => ({ e, a: +e.dataset.a, b: +e.dataset.b }));
function begin(withSound) {
  if (phase !== 'intro') return;
  if (withSound) sound.enable(true);
  phase = 'journey'; T = -1.7; body.classList.add('opening'); setSoundBtn();
  setTimeout(() => body.classList.add('go'), 1500);
}
$('skip').onclick = () => { if (phase === 'final') return; sound.prime(); toFinal(true); };
const setSoundBtn = () => { const on = sound.on(); $('snd').setAttribute('aria-pressed', on); body.classList.toggle('soundon', on); $('sndl').textContent = t(on ? 'soundOn' : 'soundOff'); };
$('snd').onclick = () => { sound.enable(!sound.on()); setSoundBtn(); musicFor(); };
$('dooropen').onclick = () => openDoors();
$('cont').onclick = () => { if (phase === 'inside') { phase = 'leaving'; leaveAt = wt; stopStroll(); body.classList.remove('joinon'); } };
$('goin').onclick = () => { if (phase === 'final') { phase = 'entering'; enterAt = wt; body.classList.remove('joinmini'); } };
$('walk').onclick = () => startStroll();
function restart() {
  phase = 'journey'; T = 0; wt = 0; doorP = 0; doorTarget = 0; openAt = insideAt = leaveAt = finalAt = -1; dragYaw = dragPitch = 0; stopStroll();
  body.classList.remove('door', 'final', 'inside', 'joinon', 'joinmini', 'tapped'); body.classList.add('go');
  W.diyas.list.forEach(l => l.lit = -1); LN.list.length = 0; bgSpawned = 0; bgClock = 0; clearPetals(W.petals);
  LN.o.scale.setScalar(0); LN.o.updateMatrix(); for (let i = 0; i < LN.n; i++) LN.mesh.setMatrixAt(i, LN.o.matrix); LN.mesh.instanceMatrix.needsUpdate = true;
  sheetTarget = 0; window.scrollTo(0, 0);
}
for (const id of ['replay2']) $(id).onclick = e => { e.preventDefault(); e.stopImmediatePropagation(); restart(); };
// slide the cards down (or back up) with the grip or a swipe
$('jgrip').onclick = () => { body.classList.toggle('joinmini'); measureSheet(); };
for (const [el, cls] of [[$('join'), 'joinmini']]) { let y0 = null;
  el.addEventListener('pointerdown', e => { y0 = e.clientY; });
  el.addEventListener('pointerup', e => { if (y0 === null) return; const dy = e.clientY - y0; y0 = null; if (dy > 45) body.classList.add(cls); else if (dy < -45) body.classList.remove(cls); measureSheet(); }); }
function measureSheet() { const f = body.classList.contains('final'), m = body.classList.contains('joinmini'); sheetTarget = f ? (m ? 64 : $('join').getBoundingClientRect().height + 12) : 0; }
addEventListener('resize', measureSheet);
I18N.on(() => requestAnimationFrame(measureSheet));

function openDoors() {
  if (phase !== 'door') return; phase = 'opening'; openAt = wt; doorTarget = 1; body.classList.remove('door');
  spawnPetals(W.petals, wt);
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
  phase = 'final'; finalAt = wt; T = TJ; doorP = 1; stopStroll(); body.classList.remove('door', 'intro', 'joinon', 'inside', 'joinmini'); body.classList.add('go', 'final');
  clearPetals(W.petals);
  requestAnimationFrame(() => { measureSheet(); });
  setSoundBtn();
}

// ---------- input: drag to look around, slide the doors, tap the sky for a lantern, walk the hall ----------
let yaw = 0, pitch = 0, dragYaw = 0, dragPitch = 0, gx = 0, gy = 0, cx = 0, cy = 0, ptr = null;
canvas.addEventListener('pointerdown', e => { ptr = { x: e.clientX, y: e.clientY, t: performance.now(), y0: dragYaw, p0: dragPitch, sy: sYaw, sp: sPitch, moved: 0 }; try { canvas.setPointerCapture(e.pointerId); } catch (_) { } });
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && !ptr) { gx = (e.clientX / innerWidth - .5) * 1.2; gy = (e.clientY / innerHeight - .5) * 1.2; }
  if (!ptr) return; const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.moved = Math.max(ptr.moved, Math.hypot(dx, dy));
  if (phase === 'door') { doorTarget = clamp(Math.abs(dx) / (innerWidth * .38)) * .55; if (doorTarget > .5) openDoors(); return; }
  if (stroll) { sYaw = ptr.sy + dx / innerWidth * 3.2; sPitch = clamp(ptr.sp + dy / innerHeight * 1.6, -.6, .5); walkTo = null; return; }
  dragYaw = clamp(ptr.y0 + dx / innerWidth * 1.6, -.9, .9); dragPitch = clamp(ptr.p0 + dy / innerHeight * .9, -.35, .45);
});
const up = e => {
  if (!ptr) return; const tap = ptr.moved < 8 && performance.now() - ptr.t < 500;
  if (phase === 'door') { if (doorTarget > .16 || tap) openDoors(); else doorTarget = 0; }
  else if (phase === 'final' && tap) release(e.clientX, e.clientY);
  else if (phase === 'inside' && tap) floorTap(e.clientX, e.clientY);
  ptr = null;
};
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
addEventListener('keydown', e => { if (phase === 'door' && (e.key === 'Enter' || e.key === ' ')) openDoors(); held.add(e.key.toLowerCase()); });
addEventListener('keyup', e => held.delete(e.key.toLowerCase()));

// ---------- strolling around the hall: drag to look, the pad (or arrow keys) to walk, tap the floor to go there ----------
const EYE = 2.05, held = new Set(), walker = new THREE.Vector3(), joy = { x: 0, y: 0 };
let stroll = false, sYaw = 0, sPitch = 0, walkTo = null, stepPh = 0, enterAt = -1, arrivedAt = -99;
const ROOM = [-14.2, 14.2, -15.7, -1.6], ROWS = [[-6.4, -.55, -15.15, -8], [.55, 6.4, -15.15, -8]], TABLES = [[7.6, -4.4], [11.2, -7.6], [7.4, -10.6], [-4.2, -4.6]];
function collide(p) {
  p.x = clamp(p.x, ROOM[0], ROOM[1]); p.z = clamp(p.z, ROOM[2], ROOM[3]);
  for (const [a, b, c, e] of ROWS) if (p.x > a && p.x < b && p.z > c && p.z < e) { const m = Math.min(p.x - a, b - p.x, p.z - c, e - p.z);
    if (m === p.x - a) p.x = a; else if (m === b - p.x) p.x = b; else if (m === p.z - c) p.z = c; else p.z = e; }
  for (const [x, z] of TABLES) { const dx = p.x - x, dz = p.z - z, r = Math.hypot(dx, dz); if (r < 2.05) { const k = 2.05 / Math.max(r, 1e-4); p.x = x + dx * k; p.z = z + dz * k; } }
}
function startStroll() {
  if (phase !== 'inside') return; stroll = true; walkTo = null;
  walker.copy(camera.position); walker.y = EYE; collide(walker); const f = camera.getWorldDirection(tmp);
  sYaw = Math.atan2(-f.x, -f.z); sPitch = clamp(Math.asin(clamp(f.y, -1, 1)), -.6, .5); dragYaw = dragPitch = 0;
  capsIn.forEach(c => c.e.classList.remove('on')); body.classList.add('stroll', 'joinon', 'joinmini');
}
function stopStroll() { stroll = false; walkTo = null; joy.x = joy.y = 0; body.classList.remove('stroll'); }
function floorTap(px, py) {
  v2.set(px / innerWidth * 2 - 1, -(py / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera);
  const o = ray.ray.origin, dv = ray.ray.direction; if (dv.y > -.02) return; const k = (.45 - o.y) / dv.y; if (k > 25) return;
  if (!stroll) startStroll(); walkTo = new THREE.Vector3(o.x + dv.x * k, EYE, o.z + dv.z * k); collide(walkTo);
}
function updateWalk(dt) {
  let fwd = -joy.y, side = joy.x;
  if (held.has('arrowup') || held.has('w')) fwd = 1; if (held.has('arrowdown') || held.has('s')) fwd = -1;
  if (held.has('a')) side = -1; if (held.has('d')) side = 1;
  if (held.has('arrowleft')) sYaw += dt * 1.6; if (held.has('arrowright')) sYaw -= dt * 1.6;
  const sp = 1.8, fx = -Math.sin(sYaw), fz = -Math.cos(sYaw), rx = Math.cos(sYaw), rz = -Math.sin(sYaw); let mx = 0, mz = 0;
  if (Math.abs(fwd) + Math.abs(side) > .08) { walkTo = null; mx = (fx * fwd + rx * side) * sp * dt; mz = (fz * fwd + rz * side) * sp * dt; }
  else if (walkTo) { const dx = walkTo.x - walker.x, dz = walkTo.z - walker.z, dd = Math.hypot(dx, dz);
    if (dd < .12) walkTo = null; else { const st = Math.min(dd, sp * dt); mx = dx / dd * st; mz = dz / dd * st;
      let da = Math.atan2(-dx, -dz) - sYaw; da = Math.atan2(Math.sin(da), Math.cos(da)); sYaw += da * Math.min(1, dt * 2.4); } }
  const px = walker.x, pz = walker.z; walker.x += mx; walker.z += mz; collide(walker);
  const moved = Math.hypot(walker.x - px, walker.z - pz); if (moved > 1e-4) stepPh += moved * 5.5; else if (walkTo) walkTo = null;
}
{ const J = $('joy'), K = J.firstElementChild; let id = null;
  const mv = e => { const r = J.getBoundingClientRect(); let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; const m = Math.hypot(x, y), RJ = 40;
    if (m > RJ) { x *= RJ / m; y *= RJ / m; } joy.x = x / RJ; joy.y = y / RJ; K.style.transform = `translate(${x}px,${y}px)`; };
  const end = e => { if (e.pointerId !== id) return; id = null; joy.x = joy.y = 0; K.style.transform = ''; };
  J.addEventListener('pointerdown', e => { id = e.pointerId; try { J.setPointerCapture(id); } catch (_) { } mv(e); e.preventDefault(); });
  J.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
  J.addEventListener('pointerup', end); J.addEventListener('pointercancel', end); }

// ---------- lanterns ----------
const LN = W.lanterns, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
function spawn(i, x, y, z, v, s, guest) { LN.list[i] = { x, y0: y, z, v, s, born: wt, ph: Math.random() * 9, guest, px: x, py: y, pz: z }; }
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
    o.position.set(l.x + Math.sin(age * .35 + l.ph) * 1.5, y, l.z + Math.cos(age * .3 + l.ph) * 1.2); l.px = o.position.x; l.py = y; l.pz = o.position.z;
    o.rotation.set(Math.sin(age * .8 + l.ph) * .08, age * .2, Math.cos(age * .7 + l.ph) * .08);
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

// ---------- the guest's place card in the hall ----------
async function drawSeat() {
  const name = NAME || t('seatGuest'), label = t('seatFor'), ml = I18N.lang === 'ml';
  const font = ml ? "600 36px 'Noto Serif Malayalam', Manjari, serif" : '600 26px Lora, Georgia, serif';
  try { await Promise.race([Promise.all([document.fonts.load('400 90px "Great Vibes"', name), document.fonts.load('600 36px "Noto Serif Malayalam"', name + label), document.fonts.load(font, label)]), new Promise(r => setTimeout(r, 2500))]); } catch (_) { }
  setSeatCard(IN, name, label, font);
}
hooks.lang = () => drawSeat();

// ---------- inside the hall: in through the doors, down the aisle to the reserved seat, then a look around ----------
const inKeys = [ // [seconds inside, camera, where it looks]
  [0, [0, 2.05, -3], [0, 2.6, -20]],
  [3.4, [0, 2.06, -5.4], [0, 2.4, -20]],
  [7.6, [-.5, 1.8, -13.22], [IN.seat.x, IN.seat.y + .01, IN.seat.z]],
  [12, [-.47, 1.77, -13.3], [IN.seat.x, IN.seat.y, IN.seat.z]],
  [16, [.15, 2.1, -12.3], [4.6, 1.6, -9]],
  [22.5, [.4, 2.15, -11.6], [-6.5, 1.5, -8.6]],
  [29, [.5, 2.2, -11], [0, 2.5, -20]],
];
const inPos = new THREE.CatmullRomCurve3(inKeys.map(k => V3(k[1])), false, 'centripetal'), inLk = new THREE.CatmullRomCurve3(inKeys.map(k => V3(k[2])), false, 'centripetal');
function inU(it) { let i = 0; while (i < inKeys.length - 2 && it > inKeys[i + 1][0]) i++; return (i + smooth(inKeys[i][0], inKeys[i + 1][0], it)) / (inKeys.length - 1); }

// ---------- the loop ----------
const camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3(), drift = new THREE.Vector3();
const doorPos = camCurve.getPointAt(1), doorLook = lookCurve.getPoint(1);
let last = performance.now(), soundClock = 0, frames = 0, slow = 0, shown = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now; const tt = now / 1000; U.time.value = tt; grade.uniforms.uTime.value = tt;
  if (phase !== 'intro') wt += dt;
  if (phase === 'journey') { T += dt; if (T >= TJ) { T = TJ; phase = 'door'; body.classList.add('door'); } }
  // adapt quality if the phone struggles
  if (phase !== 'intro' && frames < 120) { frames++; slow += dt > 1 / 28 ? 1 : 0; if (frames === 120 && slow > 70 && DPR > 1) { DPR = 1; renderer.setPixelRatio(1); resize(); } }
  d = phase === 'final' || phase === 'entering' ? 1 : phase === 'intro' ? 0 : Math.max(sunsetAt(Math.max(T, 0)), phase === 'door' || phase === 'opening' ? 1 : 0);
  applySky(d); setEnv(d);
  // camera
  let white = 0, exMul = 1, tilt = 0;
  drift.set(Math.sin(tt * .1) * 1.6, Math.sin(tt * .13) * .6, 0);
  if (phase === 'intro') { camPos.copy(camCurve.getPointAt(0)).add(drift); look.copy(lookCurve.getPoint(0)); }
  else if (phase === 'journey' || phase === 'door') { camPos.copy(camCurve.getPointAt(uOf(T))); if (T < 3) camPos.addScaledVector(drift, 1 - smooth(-1.7, 3, T)); look.copy(lookCurve.getPoint(clamp(T / TJ))); if (phase === 'door') camPos.y += Math.sin(tt * .9) * .025; }
  else if (phase === 'opening') { const e = clamp((wt - openAt - 1.2) / 4.6); const ee = e * e * (3 - 2 * e);
    camPos.copy(doorPos).lerp(inPos.getPoint(0), ee); look.copy(doorLook).lerp(inLk.getPoint(0), ee);
    exMul = 1 + Math.sin(e * Math.PI) * .9; if (e >= 1) { phase = 'inside'; insideAt = wt; body.classList.add('inside'); } }
  else if (stroll && phase === 'inside') { updateWalk(dt); camPos.copy(walker); camPos.y += Math.abs(Math.sin(stepPh)) * .025;
    look.set(walker.x - Math.sin(sYaw) * Math.cos(sPitch), walker.y + Math.sin(sPitch), walker.z - Math.cos(sYaw) * Math.cos(sPitch));
    tilt = .4; white = 1 - smooth(0, 1.1, wt - arrivedAt); }
  else if (phase === 'inside' || phase === 'leaving') { const it = wt - insideAt, u = inU(it), hold = smooth(6.6, 7.6, it) * (1 - smooth(11.8, 12.8, it));
    camPos.copy(inPos.getPoint(u)); camPos.y += Math.sin(wt * .7) * .02 * (1 - hold);
    look.copy(inLk.getPoint(u)).add(tmp.set(Math.sin(wt * .23) * .35, Math.sin(wt * .31) * .12, 0).multiplyScalar(1 - hold));
    capsIn.forEach(c => c.e.classList.toggle('on', phase === 'inside' && it >= c.a && it < c.b));
    if (it > 12.8 && phase === 'inside') body.classList.add('joinon');
    tilt = smooth(1.2, 3.5, it);
    if (phase === 'leaving') { const l = (wt - leaveAt) / 1.4; white = smooth(0, 1, l); if (l >= 1) toFinal(false); } }
  else if (phase === 'final' || phase === 'entering') { const f = wt - finalAt; white = phase === 'entering' ? smooth(0, .8, wt - enterAt) : 1 - smooth(.2, 2.2, f);
    if (phase === 'entering' && wt - enterAt >= .85) { // through the doors again, straight into walking around
      phase = 'inside'; insideAt = wt - 40; arrivedAt = wt; stroll = true; walkTo = null; walker.set(0, EYE, -3.2); sYaw = 0; sPitch = -.03; sheetTarget = 0;
      body.classList.remove('final'); body.classList.add('inside', 'joinon', 'stroll', 'joinmini'); }
    camPos.set(Math.sin(wt * .06) * 5, 2.1 + Math.sin(wt * .11) * .25, 46 + Math.sin(wt * .045) * 3); look.set(0, 8.5, -24); doorTarget = 1; }
  sheetH += (sheetTarget - sheetH) * Math.min(1, dt * 5); if (Math.abs(sheetTarget - sheetH) > .5 || (sheetH > 0 && !camera.view)) frame_();
  if (window.__shot) { camPos.fromArray(window.__shot.pos); look.fromArray(window.__shot.look); } // fixed framing for rendering the poster
  camera.position.copy(camPos); camera.lookAt(look);
  cx += (gx - cx) * .05; cy += (gy - cy) * .05;
  if (!ptr) { dragYaw *= Math.pow(.25, dt); dragPitch *= Math.pow(.25, dt); }
  yaw = stroll ? 0 : dragYaw - cx * .14; pitch = stroll ? 0 : -dragPitch + cy * .08;
  camera.rotateY(yaw); camera.rotateX(pitch);
  renderer.toneMappingExposure = exposureBase * exMul; grade.uniforms.uWhite.value = white;
  // doors, and the warm light leaking through them as we arrive
  doorP += (doorTarget - doorP) * Math.min(1, dt * (phase === 'opening' ? 1.6 : 8));
  const ang = doorP * 1.85; W.doors[0].rotation.y = ang; W.doors[1].rotation.y = -ang;
  W.inLight.intensity = 10 * smooth(0, .4, doorP); W.doorGlow.material.opacity = smooth(0, .3, doorP) * (1 - smooth(.35, .8, doorP)) * .35;
  const seam = smooth(.5, .95, d) * (1 - smooth(.012, .07, doorP)) * (phase === 'final' || phase === 'entering' ? 0 : 1), pulse = .84 + .16 * Math.sin(tt * 2.2);
  W.seam.mat.opacity = seam * pulse; W.seam.halo.opacity = seam * pulse * .6;
  const inside = phase === 'opening' ? smooth(.02, .3, doorP) : (phase === 'inside' || phase === 'leaving') ? 1 : 0;
  updateInterior(IN, wt, dt, inside, () => { });
  if (inside) { exMul *= lerp(1, .72, inside); renderer.toneMappingExposure = exposureBase * exMul; W.hemi.intensity += .45 * inside; W.hemi.color.lerp(tmpC.set(0xffe2c0), inside); W.hemi.groundColor.lerp(tmpC.set(0x7a4a3a), inside); }
  grade.uniforms.uTilt.value = tilt * inside;
  // clouds fade as we sink beneath them
  const cv = smooth(40, 100, camPos.y); W.clouds.grp.visible = cv > .01;
  if (W.clouds.grp.visible) W.clouds.grp.children.forEach(s => { s.position.x += dt * 1.4; if (s.position.x > 280) s.position.x = -280; s.material.opacity = s.userData.base * cv; s.material.color.setRGB(1.35, lerp(1.08, .8, d), lerp(.9, .7, d)); });
  updateBirds(W.birds, T * TS); updatePeople(W.people, wt); updateDiyas(); updateLanterns(dt); updatePetals(W.petals, wt, dt);
  W.gardenLight.position.set(camPos.x, 2.4, camPos.z - 9);
  // captions
  if (phase === 'journey') caps.forEach(c => c.e.classList.toggle('on', T >= c.a && T < c.b)); else caps.forEach(c => c.e.classList.remove('on'));
  if (phase !== 'inside') capsIn.forEach(c => c.e.classList.remove('on'));
  // ambience
  soundClock += dt; if (soundClock > .25) { soundClock = 0; musicFor(); const y = camPos.y, near = smooth(45, 6, camPos.z);
    if (phase === 'intro') sound.set({ wind: .03, air: 0, water: 0, hall: 0, night: 0, birds: 0 });
    else if (phase === 'journey' || phase === 'door') sound.set({ wind: .022 * (1 - .5 * d), air: 0, birds: .7 * smooth(110, 25, y), water: 0, night: 0, hall: .07 * near });
    else if (phase === 'opening' || phase === 'inside' || phase === 'leaving') sound.set({ hall: phase === 'opening' ? .16 : .1, water: .0, night: 0, wind: 0, air: 0, birds: 0 });
    else sound.set({ hall: .03, water: .06, night: 0, wind: 0, air: 0, birds: .55 }); }
  if (window.__raw) renderer.render(scene, camera); else composer.render(dt);
  if (!shown) { shown = true; body.classList.add('shown'); }
}

// ---------- get everything onto the GPU before the guest opens the envelope ----------
function uploadTextures() {
  const seen = new Set(), up = v => { if (v && v.isTexture && !v.isRenderTargetTexture && !seen.has(v)) { seen.add(v); try { renderer.initTexture(v); } catch (_) { } } };
  scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach(m => { for (const k in m) up(m[k]); if (m.uniforms) for (const k in m.uniforms) up(m.uniforms[k].value); }); });
}
async function precompile() { // both lighting setups (the garden, and the garden with the hall's lights on), into the composer's target
  const rt = composer.renderTarget1, run = hall => { IN.group.visible = hall; const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt);
    const p = renderer.compileAsync(scene, camera); renderer.setRenderTarget(prev); IN.group.visible = false; return p; };
  await Promise.race([Promise.all([run(true), run(false)]), new Promise(r => setTimeout(r, 8000))]).catch(() => { });
}
applySky(0); setEnv(0);
await drawSeat(); uploadTextures(); progress(.78); await breathe();
requestAnimationFrame(loop);
await precompile();
progress(1);
body.classList.add('ready');
window.__app = { begin };
const st = P.get('t'); if (st !== null) { body.classList.add('go', 'opening'); phase = 'journey'; T = parseFloat(st) || 0; wt = T; if (T >= TJ + 5) toFinal(true); }
if (reduce && phase === 'intro') toFinal(true);
if (window.__pending && phase === 'intro') begin(window.__pending === 'sound');
window.__dbg = { W, IN, scene, renderer, camera, envs, begin, setT: t2 => { T = t2; wt = t2; if (phase === 'intro') { phase = 'journey'; body.classList.add('go', 'opening'); } }, open: openDoors, final: () => toFinal(true), adv: s => { wt += s; }, get phase() { return phase; }, get wt() { return wt; }, get programs() { return renderer.info.programs.length; } };
