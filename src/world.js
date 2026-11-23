// The world: sky, garden, palms, reflecting pool, lamps, the hall, families, lanterns.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const U = { time: { value: 0 } };
const PI = Math.PI;
let seed = 11;
export const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const R = (a, b) => a + rnd() * (b - a);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
export const lerp = (a, b, t) => a + (b - a) * t;

function hash(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) { let s = 0, a = .5, f = 1; for (let i = 0; i < 5; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s; }

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}
const rep = (t, x, y) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };
const hdr = (r, g, b) => new THREE.Color(r, g, b); // linear, can exceed 1 so it blooms

// ---------- textures ----------
function speckle(base, n, lo, hi, size = 256, streak = 0) {
  return canvasTex(size, size, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const v = lo + Math.random() * (hi - lo); g.fillStyle = `rgba(${v},${v},${v},${.25 + Math.random() * .35})`;
      const x = Math.random() * w, y = Math.random() * h;
      if (streak) { g.save(); g.translate(x, y); g.rotate(-PI / 2 + (Math.random() - .5) * .8); g.fillRect(0, 0, streak * (0.5 + Math.random()), 1); g.restore(); }
      else g.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  });
}
function frondTexture() {
  return canvasTex(64, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.lineCap = 'round';
    for (let y = h - 6; y > 6; y -= 2.6) {
      const s = 1 - y / h, L = 30 * Math.pow(Math.sin(PI * Math.min(1, s * 1.08 + .04)), .7);
      if (L < 3) continue;
      for (const side of [-1, 1]) {
        const gr = 95 + Math.random() * 60, rd = 40 + Math.random() * 40 + s * 30;
        g.strokeStyle = `rgb(${rd},${gr},${30 + Math.random() * 25})`; g.lineWidth = 1.6 + Math.random();
        g.beginPath(); g.moveTo(32, y); g.quadraticCurveTo(32 + side * L * .5, y - L * .18, 32 + side * L, y - L * .5 + Math.random() * 3); g.stroke();
      }
    }
    g.strokeStyle = '#8a8a3a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(32, h); g.lineTo(32, 0); g.stroke();
  });
}
function trunkTexture() {
  return canvasTex(64, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9b8a74'); gr.addColorStop(.8, '#7d6b57'); gr.addColorStop(1, '#4e4134');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(40,30,20,${Math.random() * .25})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1); }
  });
}
function jaliTexture(people) {
  // a glowing arched window: warm interior seen through a carved lattice
  return canvasTex(128, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h * .55, 4, w / 2, h * .55, h * .7);
    gr.addColorStop(0, '#fff1c4'); gr.addColorStop(.45, '#ffc469'); gr.addColorStop(1, '#a8531f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (people) { g.fillStyle = 'rgba(70,30,20,.55)';
      for (let i = 0; i < 4; i++) { const x = 14 + Math.random() * (w - 28), s = .8 + Math.random() * .5, y = h - 10;
        g.beginPath(); g.ellipse(x, y - 70 * s, 9 * s, 10 * s, 0, 0, 2 * PI); g.fill();
        g.beginPath(); g.moveTo(x - 16 * s, y); g.quadraticCurveTo(x - 14 * s, y - 60 * s, x, y - 62 * s); g.quadraticCurveTo(x + 14 * s, y - 60 * s, x + 16 * s, y); g.fill(); } }
    g.strokeStyle = 'rgba(60,25,10,.92)'; g.lineWidth = 3.2;
    const c = 22;
    for (let y = -c; y < h + c; y += c) for (let x = -c; x < w + c; x += c) {
      const ox = ((y / c) % 2) * c / 2;
      g.beginPath();
      for (let k = 0; k < 8; k++) { const a = k * PI / 4, r = k % 2 ? 6 : 11; g.lineTo(x + ox + Math.cos(a) * r, y + Math.sin(a) * r); }
      g.closePath(); g.stroke();
    }
    g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
}
function hallTexture() {
  // the back wall of the hall: floral stage, fairy lights, families gathered
  return canvasTex(1024, 512, (g, w, h) => {
    let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a2a24'); gr.addColorStop(.5, '#c9744a'); gr.addColorStop(1, '#f5c27a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    gr = g.createRadialGradient(w / 2, h * .45, 10, w / 2, h * .45, 360); gr.addColorStop(0, 'rgba(255,246,214,1)'); gr.addColorStop(.5, 'rgba(255,214,150,.6)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // floral arch on stage
    for (let i = 0; i < 700; i++) { const a = PI + Math.random() * PI, r = 170 + Math.random() * 26;
      g.fillStyle = ['#ffd1dc', '#fff4f0', '#ffb3c2', '#f7e1a8', '#c9e3b8'][i % 5]; g.beginPath(); g.arc(w / 2 + Math.cos(a) * r, h * .62 + Math.sin(a) * r, 3 + Math.random() * 4, 0, 2 * PI); g.fill(); }
    // fairy light curtains
    for (let x = 20; x < w; x += 14) for (let y = 0; y < h * .55; y += 18 + Math.random() * 10) {
      g.fillStyle = 'rgba(255,240,200,.95)'; g.beginPath(); g.arc(x + Math.sin(y) * 2, y, 1.6, 0, 2 * PI); g.fill(); }
    // families silhouettes
    for (let i = 0; i < 26; i++) { const x = Math.random() * w, s = .7 + Math.random() * .6, y = h + 4, kid = Math.random() < .25 ? .6 : 1;
      g.fillStyle = `rgba(${60 + Math.random() * 30},${25 + Math.random() * 20},${25},.9)`;
      g.beginPath(); g.ellipse(x, y - 96 * s * kid, 12 * s * kid, 13 * s * kid, 0, 0, 2 * PI); g.fill();
      g.beginPath(); g.moveTo(x - 22 * s * kid, y); g.quadraticCurveTo(x - 20 * s * kid, y - 80 * s * kid, x, y - 84 * s * kid); g.quadraticCurveTo(x + 20 * s * kid, y - 80 * s * kid, x + 22 * s * kid, y); g.fill(); }
  });
}
function signTexture() {
  return canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = '#23484d'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d8b867'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#f0d58f'; g.font = '700 44px Lora, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('EVENTO AUDITORIUM', w / 2, h / 2 + 2);
  });
}
function doorTexture() {
  return canvasTex(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#e8d6b0'); gr.addColorStop(1, '#f7ecd4');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#b08a45'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) g.strokeRect(14, 20 + i * 76, w - 28, 64);
    g.fillStyle = '#b8924d'; for (let y = 10; y < h; y += 16) for (let x = 8; x < w; x += 24) { g.beginPath(); g.arc(x, y, 1.8, 0, 2 * PI); g.fill(); }
  });
}
function cloudTexture() {
  // a soft cumulus puff: bright top, shaded base
  return canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 34; i++) {
      const x = 50 + Math.random() * 156, y = 120 + (Math.random() - .5) * 60 - Math.pow(1 - Math.abs(x - 128) / 80, 2) * 40, r = 22 + Math.random() * 36;
      const gr = g.createRadialGradient(x, y - r * .3, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.6, 'rgba(236,228,236,.55)'); gr.addColorStop(1, 'rgba(220,210,225,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 2 * PI); g.fill();
    }
    const fade = g.createLinearGradient(0, 150, 0, 210); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = fade; g.fillRect(0, 150, w, 106);
  });
}
function moonTexture() {
  return canvasTex(256, 256, (g, w, h) => {
    let gr = g.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, 'rgba(255,246,214,.35)'); gr.addColorStop(1, 'rgba(255,246,214,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(128, 128, 46, 0, 2 * PI); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(148, 116, 42, 0, 2 * PI); g.fill();
  });
}
function silhouetteTexture() {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#2a1816';
    for (let i = 0; i < 5; i++) { const x = 30 + i * 48 + Math.random() * 10, s = .8 + Math.random() * .35, kid = i === 2 ? .62 : 1, y = h;
      g.beginPath(); g.ellipse(x, y - 98 * s * kid, 11 * s * kid, 12 * s * kid, 0, 0, 2 * PI); g.fill();
      g.beginPath(); g.moveTo(x - 20 * s * kid, y); g.quadraticCurveTo(x - 19 * s * kid, y - 82 * s * kid, x, y - 86 * s * kid); g.quadraticCurveTo(x + 19 * s * kid, y - 82 * s * kid, x + 20 * s * kid, y); g.fill(); }
  });
}

// ---------- geometry helpers ----------
function archShape(path, cx, y0, w, h) {
  const hs = h - w * .72;
  path.moveTo(cx - w / 2, y0); path.lineTo(cx + w / 2, y0); path.lineTo(cx + w / 2, y0 + hs);
  path.quadraticCurveTo(cx + w / 2, y0 + h - w * .18, cx, y0 + h);
  path.quadraticCurveTo(cx - w / 2, y0 + h - w * .18, cx - w / 2, y0 + hs);
  path.lineTo(cx - w / 2, y0); return path;
}
function archFrame(cx, y0, w, h, t, depth) {
  const s = archShape(new THREE.Shape(), cx, y0 - .01, w + t * 2, h + t * 1.4);
  s.holes.push(archShape(new THREE.Path(), cx, y0, w, h));
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 14 });
}

export function buildWorld(scene, renderer, opts) {
  const W = {};
  const low = opts.low;
  // ---------- sky ----------
  const sky = new Sky(); sky.scale.setScalar(4500); sky.renderOrder = -3; scene.add(sky);
  const su = sky.material.uniforms;
  su.turbidity.value = 5.5; su.rayleigh.value = 2.4; su.mieCoefficient.value = .006; su.mieDirectionalG.value = .88;
  su.cloudCoverage.value = .32; su.cloudDensity.value = .45; su.cloudScale.value = .00022; su.cloudSpeed.value = .00004;
  // scale the physical sky into a range that leaves room for lamps and lanterns to glow
  su.uGain = { value: .17 };
  sky.material.fragmentShader = 'uniform float uGain;\n' + sky.material.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );', 'gl_FragColor = vec4( min( texColor * uGain, vec3( 2.4 ) ), 1.0 );');
  W.sky = sky;
  const nightMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { uOp: { value: 0 } },
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uOp;varying vec3 vP;void main(){float y=clamp(vP.y,0.,1.);vec3 top=vec3(.012,.018,.07),mid=vec3(.05,.06,.19),hor=vec3(.16,.13,.28);vec3 c=mix(hor,mid,smoothstep(0.,.18,y));c=mix(c,top,smoothstep(.18,.7,y));gl_FragColor=vec4(c,uOp);}'
  });
  const night = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), nightMat); night.renderOrder = -2; scene.add(night);
  W.nightMat = nightMat;
  // stars
  { const n = 1800, p = new Float32Array(n * 3), s = new Float32Array(n), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 * PI, v = Math.acos(1 - Math.random() * .95); const r = 3600;
      p[i * 3] = r * Math.sin(v) * Math.cos(u); p[i * 3 + 1] = r * Math.cos(v) + 40; p[i * 3 + 2] = r * Math.sin(v) * Math.sin(u); s[i] = Math.pow(Math.random(), 3) * 3 + 1; ph[i] = Math.random() * 6.28; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('size', new THREE.BufferAttribute(s, 1)); g.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, uniforms: { uOp: { value: 0 }, uTime: U.time, uPx: { value: opts.dpr } },
      vertexShader: 'attribute float size;attribute float ph;uniform float uTime,uPx;varying float vA;void main(){vA=.55+.45*sin(uTime*(1.+ph*.3)+ph*7.);gl_PointSize=size*uPx;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float uOp;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vec3(1.,.97,.9)*1.6,a*vA*uOp);}' });
    const st = new THREE.Points(g, m); st.renderOrder = -1; st.frustumCulled = false; scene.add(st); W.starMat = m; }
  // moon
  { const m = new THREE.SpriteMaterial({ map: moonTexture(), transparent: true, depthWrite: false, fog: false, opacity: 0, color: hdr(1.6, 1.55, 1.4) });
    const s = new THREE.Sprite(m); s.position.set(-1100, 900, -2400); s.scale.setScalar(230); s.renderOrder = -1; scene.add(s); W.moonMat = m; }

  // ---------- light ----------
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x4b5a3c, .7); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc27a, 3); sun.castShadow = !low;
  sun.shadow.mapSize.set(low ? 512 : 2048, low ? 512 : 2048); const sc = sun.shadow.camera;
  sc.left = -45; sc.right = 45; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 400; sun.shadow.bias = -.0004; sun.shadow.normalBias = .04;
  sun.target.position.set(0, 0, 50); scene.add(sun, sun.target);
  const moon = new THREE.DirectionalLight(0x9fb4ff, 0); moon.position.set(-60, 80, -120); scene.add(moon);
  W.hemi = hemi; W.sun = sun; W.moon = moon;
  scene.fog = new THREE.FogExp2(0xf2c39a, .0026);

  // ---------- ground ----------
  const ground = new THREE.PlaneGeometry(1500, 1500, 150, 150); ground.rotateX(-PI / 2);
  { const p = ground.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const gx = Math.max(0, Math.abs(x) - 34), gz = Math.max(0, z - 150, -140 - z), away = Math.hypot(gx, gz);
      const h = (fbm(x * .007 + 3, z * .007) - .42) * 46 * smooth(6, 170, away) + Math.max(0, away - 260) * .14;
      p.setY(i, Math.max(h, -1.5));
      const n = fbm(x * .04 + 9, z * .04), dry = smooth(.55, .8, fbm(x * .01, z * .01 + 4));
      c.setRGB(lerp(.24, .36, n) + dry * .12, lerp(.40, .50, n) - dry * .02, lerp(.16, .2, n), THREE.SRGBColorSpace);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    ground.setAttribute('color', new THREE.BufferAttribute(col, 3)); ground.computeVertexNormals(); }
  const grassTex = rep(speckle('#d8d8d8', 9000, 120, 255, 256, 6), 380, 380);
  const g = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, map: grassTex, roughness: 1 }));
  g.receiveShadow = true; g.position.z = 60; scene.add(g);
  // re-center the noise so the garden stays flat
  ground.translate(0, 0, 0);

  // ---------- reflecting pool ----------
  const PZ0 = 8, PZ1 = 110, PW = 5;
  const waterShader = {
    name: 'Pool', uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: U.time },
    vertexShader: `uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vW;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){vUv=textureMatrix*vec4(position,1.);vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform vec3 color;uniform sampler2D tDiffuse;uniform float uTime;varying vec4 vUv;varying vec3 vW;
      #include <logdepthbuf_pars_fragment>
      void main(){
      #include <logdepthbuf_fragment>
      vec2 d=vec2(sin(vW.z*1.7+uTime*1.2)+sin(vW.x*3.1+vW.z*.6-uTime*.8),cos(vW.z*2.3-uTime*.9)+sin(vW.x*2.2+uTime*1.4))*.0028;
      vec4 uv=vUv;uv.xy+=d*uv.w;vec3 r=texture2DProj(tDiffuse,uv).rgb;
      vec3 V=normalize(cameraPosition-vW);float fr=.35+.65*pow(1.-max(V.y,0.),3.);
      gl_FragColor=vec4(r*color*fr+vec3(.004,.012,.016),1.);}`
  };
  const rs = opts.reflectSize;
  const water = new Reflector(new THREE.PlaneGeometry(PW, PZ1 - PZ0), { textureWidth: rs[0], textureHeight: rs[1], color: 0xc8d6e0, shader: waterShader, multisample: 0, clipBias: .003 });
  water.rotateX(-PI / 2); water.position.set(0, .14, (PZ0 + PZ1) / 2); scene.add(water); W.water = water;
  const stoneTex = rep(speckle('#e2d2b4', 5000, 150, 255), 2, 40);
  const stone = new THREE.MeshStandardMaterial({ color: 0xe8d6b6, map: stoneTex, roughness: .85 });
  const coping = [];
  for (const sx of [-1, 1]) { const b = new THREE.BoxGeometry(.55, .32, PZ1 - PZ0 + 1.1); b.translate(sx * (PW / 2 + .275), .16, (PZ0 + PZ1) / 2); coping.push(b); }
  for (const z of [PZ0 - .275, PZ1 + .275]) { const b = new THREE.BoxGeometry(PW + 1.1, .32, .55); b.translate(0, .16, z); coping.push(b); }
  const cop = new THREE.Mesh(mergeGeometries(coping), stone); cop.receiveShadow = cop.castShadow = true; scene.add(cop);

  // ---------- paths, plaza, hedges ----------
  const gravel = new THREE.MeshStandardMaterial({ color: 0xcaa27c, map: rep(speckle('#c9c9c9', 12000, 90, 255), 3, 80), roughness: 1 });
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.4, PZ1 - PZ0 + 14), gravel); p.rotation.x = -PI / 2; p.position.set(sx * 4.95, .025, (PZ0 + PZ1) / 2 + 5); p.receiveShadow = true; scene.add(p); }
  const tiles = canvasTex(256, 256, (g2, w, h) => { g2.fillStyle = '#e9dcc4'; g2.fillRect(0, 0, w, h); g2.strokeStyle = 'rgba(120,95,60,.35)'; g2.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g2.beginPath(); g2.moveTo(i * 64, 0); g2.lineTo(i * 64, h); g2.stroke(); g2.beginPath(); g2.moveTo(0, i * 64); g2.lineTo(w, i * 64); g2.stroke(); }
    g2.strokeStyle = 'rgba(176,138,69,.5)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g2.beginPath(); g2.moveTo(i * 64 + 32, j * 64 + 12); g2.lineTo(i * 64 + 52, j * 64 + 32); g2.lineTo(i * 64 + 32, j * 64 + 52); g2.lineTo(i * 64 + 12, j * 64 + 32); g2.closePath(); g2.stroke(); } });
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(34, 9), new THREE.MeshStandardMaterial({ map: rep(tiles, 8.5, 2.25), roughness: .7, metalness: 0 }));
  plaza.rotation.x = -PI / 2; plaza.position.set(0, .03, 4.4); plaza.receiveShadow = true; scene.add(plaza);
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x3f6b33, map: rep(speckle('#bdbdbd', 9000, 40, 255), 1, 30), roughness: 1 });
  const hedges = [];
  for (const sx of [-1, 1]) for (let z = 12; z < 112; z += 10.5) { const b = new THREE.BoxGeometry(.8, .75, 9); b.translate(sx * 7.1, .375, z + 4.5); hedges.push(b); }
  const hedge = new THREE.Mesh(mergeGeometries(hedges), hedgeMat); hedge.castShadow = hedge.receiveShadow = true; scene.add(hedge);
  // flowers on the hedges
  { const n = 900, m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.075, 0), new THREE.MeshStandardMaterial({ roughness: .7 }), n), o = new THREE.Object3D(), c = new THREE.Color();
    const pal = ['#f7b6c8', '#fff3ef', '#f5a3b8', '#ffd7a8', '#ffffff', '#e889a8'];
    for (let i = 0; i < n; i++) { const sx = rnd() < .5 ? -1 : 1; let z = R(12, 111); if (((z - 12) % 10.5) > 9) z -= 1.5;
      o.position.set(sx * 7.1 + R(-.42, .42), R(.55, .8), z); o.scale.setScalar(R(.7, 1.4)); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(pal[i % pal.length])); }
    scene.add(m); }

  // ---------- palms ----------
  const frondTex = frondTexture(), trunkTex = rep(trunkTexture(), 1, 4);
  function addWind(mat, flutter) {
    mat.onBeforeCompile = s => {
      s.uniforms.uTime = U.time;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
        vec2 ph=vec2(0.);
        #ifdef USE_INSTANCING
        ph=vec2(instanceMatrix[3][0],instanceMatrix[3][2]);
        #endif
        float hh=max(position.y,0.)/11.;
        float sw=sin(uTime*.75+ph.x*.13+ph.y*.07)*.7+sin(uTime*1.7+ph.y*.21)*.25;
        transformed.x+=sw*hh*hh*.5;transformed.z+=cos(uTime*.55+ph.x*.1)*hh*hh*.28;
        ${flutter ? 'float rr=length(position.xz-vec2(2.2,0.));transformed.y+=sin(uTime*3.3+position.x*1.9+position.z*1.4+ph.x)*.055*rr;' : ''}`);
    };
  }
  const H = 11;
  const trunkParts = [], frondParts = [];
  const lean = y => 2.2 * Math.pow(y / H, 2);
  for (let i = 0; i < 14; i++) {
    const y0 = i / 14 * H, y1 = (i + 1) / 14 * H, p0 = new THREE.Vector3(lean(y0), y0, 0), p1 = new THREE.Vector3(lean(y1), y1, 0);
    const len = p0.distanceTo(p1), r0 = .24 - .08 * (y0 / H), r1 = .24 - .08 * (y1 / H);
    const c = new THREE.CylinderGeometry(r1, r0 * 1.04, len, 9, 1, true);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()));
    c.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, 0); trunkParts.push(c);
  }
  const top = new THREE.Vector3(lean(H), H, 0);
  { const s = new THREE.SphereGeometry(.3, 8, 6); s.translate(top.x, top.y - .05, 0); trunkParts.push(s);
    for (let k = 0; k < 6; k++) { const a = k / 6 * 2 * PI; const s2 = new THREE.SphereGeometry(.14, 7, 5); s2.translate(top.x + Math.cos(a) * .28, top.y - .32 - (k % 2) * .1, Math.sin(a) * .28); trunkParts.push(s2); } }
  for (let k = 0; k < 15; k++) {
    const len = R(3.8, 5.2), width = R(1.1, 1.45), droop = R(.28, .5), e = R(-.12, .62), a = k / 15 * 2 * PI + R(-.15, .15);
    const segs = 12, pos = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) { const s = i / segs, x = s * len, y = -droop * s * s * len, w = width * (0.3 + .7 * Math.sin(PI * Math.min(1, s * 1.1 + .05))) * (1 - .35 * s), f = .32 * w;
      pos.push(x, y + f, -w / 2, x, y, 0, x, y + f, w / 2); uv.push(0, s, .5, s, 1, s); }
    for (let i = 0; i < segs; i++) { const a0 = i * 3, b = (i + 1) * 3; idx.push(a0, b, a0 + 1, a0 + 1, b, b + 1, a0 + 1, b + 1, a0 + 2, a0 + 2, b + 1, b + 2); }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setIndex(idx);
    fg.rotateZ(e); fg.rotateY(a); fg.translate(top.x, top.y, top.z); fg.computeVertexNormals(); frondParts.push(fg);
  }
  const trunkGeo = mergeGeometries(trunkParts.map(p => p.index ? p.toNonIndexed() : p).map(p => { p.deleteAttribute('normal'); return p; }));
  trunkGeo.computeVertexNormals();
  const frondGeo = mergeGeometries(frondParts);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xb8a68e, map: trunkTex, roughness: .95 }); addWind(trunkMat, false);
  const frondMat = new THREE.MeshStandardMaterial({ map: frondTex, alphaTest: .45, side: THREE.DoubleSide, roughness: .75, color: 0xe8f0d0 }); addWind(frondMat, true);
  const palms = [];
  for (const sx of [-1, 1]) for (let z = 10; z < 125; z += 9) palms.push([sx * R(10.5, 12), z + R(-1.5, 1.5), R(.85, 1.25), sx > 0 ? R(2.6, 3.6) : R(-.5, .5)]);
  for (let i = 0; i < 40; i++) { let x, z; do { x = R(-40, 40); z = R(-62, -6); } while (Math.abs(x) < 19 && z > -26); palms.push([x, z, R(.9, 1.4), R(0, 6.28)]); } // grove around the hall
  for (let i = 0; i < 150; i++) { let x, z; do { x = R(-320, 320); z = R(-260, 420); } while (Math.abs(x) < 28 && z > -90 && z < 170); palms.push([x, z, R(.9, 1.5), R(0, 6.28)]); }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length), fronds = new THREE.InstancedMesh(frondGeo, frondMat, palms.length);
  fronds.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: frondTex, alphaTest: .45 });
  { const o = new THREE.Object3D(); palms.forEach((p, i) => { o.position.set(p[0], groundY(p[0], p[1]), p[1]); o.rotation.set(0, p[3], 0); o.scale.setScalar(p[2]); o.updateMatrix(); trunks.setMatrixAt(i, o.matrix); fronds.setMatrixAt(i, o.matrix); }); }
  trunks.castShadow = fronds.castShadow = true; trunks.frustumCulled = fronds.frustumCulled = false; scene.add(trunks, fronds);
  function groundY(x, z) {
    const zz = z - 60; // ground mesh is shifted by +60
    const gx = Math.max(0, Math.abs(x) - 34), gz = Math.max(0, zz - 150, -140 - zz), away = Math.hypot(gx, gz);
    return Math.max((fbm(x * .007 + 3, zz * .007) - .42) * 46 * smooth(6, 170, away) + Math.max(0, away - 260) * .14, -1.5);
  }
  // broad-leaf trees in the distance
  { const parts = []; for (let k = 0; k < 6; k++) { const s = new THREE.IcosahedronGeometry(R(2.2, 3.2), 1); s.translate(R(-2, 2), R(4, 7), R(-2, 2)); parts.push(s); }
    const tg = mergeGeometries(parts); const tr = new THREE.CylinderGeometry(.25, .4, 5, 6); tr.translate(0, 2.5, 0);
    const n = 90, cm = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0x35572c, roughness: 1, flatShading: true }), n), tm = new THREE.InstancedMesh(tr, new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 1 }), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { let x, z; do { x = R(-300, 300); z = R(-240, 400); } while (Math.abs(x) < 30 && z > -70 && z < 170); o.position.set(x, groundY(x, z) - .3, z); o.rotation.y = R(0, 6); o.scale.setScalar(R(.8, 1.6)); o.updateMatrix(); cm.setMatrixAt(i, o.matrix); tm.setMatrixAt(i, o.matrix); }
    cm.castShadow = true; scene.add(cm, tm); }

  // ---------- lamps ----------
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, emissive: 0xffc77a, emissiveIntensity: 0, roughness: .6 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x3b3026, roughness: .5, metalness: .6 });
  const lampPos = []; for (const sx of [-1, 1]) for (let z = 14; z < 110; z += 10.5) lampPos.push([sx * 6.45, z]);
  lampPos.push([-3.7, 1.9], [3.7, 1.9]);
  { const post = new THREE.CylinderGeometry(.05, .08, 2.4, 6); post.translate(0, 1.2, 0); const cap = new THREE.ConeGeometry(.24, .22, 6); cap.translate(0, 2.88, 0);
    const head = new THREE.CylinderGeometry(.17, .14, .42, 6); head.translate(0, 2.6, 0);
    const pm = new THREE.InstancedMesh(mergeGeometries([post, cap]), bronze, lampPos.length), hm = new THREE.InstancedMesh(head, lampHeadMat, lampPos.length), o = new THREE.Object3D();
    lampPos.forEach((p, i) => { o.position.set(p[0], 0, p[1]); o.updateMatrix(); pm.setMatrixAt(i, o.matrix); hm.setMatrixAt(i, o.matrix); });
    pm.castShadow = true; scene.add(pm, hm); }
  W.lampHeadMat = lampHeadMat;
  // diyas along the pool, lit one by one
  { const bowl = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(.08, .01), new THREE.Vector2(.1, .05), new THREE.Vector2(.07, .06)], 10);
    const flame = new THREE.SphereGeometry(.03, 8, 6); flame.scale(1, 2.4, 1); flame.translate(0, .1, 0);
    const di = []; for (const sx of [-1, 1]) for (let z = PZ0 + .6; z < PZ1; z += 1.7) di.push([sx * (PW / 2 + .28), z]);
    const bm = new THREE.InstancedMesh(bowl, new THREE.MeshStandardMaterial({ color: 0xa4552e, roughness: .9 }), di.length);
    const fm = new THREE.InstancedMesh(flame, new THREE.MeshBasicMaterial({ color: hdr(5, 2.6, .8), fog: false }), di.length);
    const o = new THREE.Object3D(); di.forEach((p, i) => { o.position.set(p[0], .32, p[1]); o.updateMatrix(); bm.setMatrixAt(i, o.matrix); o.scale.setScalar(0); o.updateMatrix(); fm.setMatrixAt(i, o.matrix); });
    fm.frustumCulled = false; scene.add(bm, fm);
    W.diyas = { list: di.map(p => ({ x: p[0], z: p[1], lit: -1, ph: Math.random() * 9 })), mesh: fm, o };
  }

  // ---------- floral arch at the garden entrance ----------
  { const AZ = 113, r = 8.6;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(r, .16, 8, 48, PI), new THREE.MeshStandardMaterial({ color: 0xc9a24f, metalness: .7, roughness: .35 }));
    arch.position.set(0, 0, AZ); arch.castShadow = true; scene.add(arch);
    const n = 1100, fl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.11, 0), new THREE.MeshStandardMaterial({ roughness: .7 }), n), o = new THREE.Object3D(), c = new THREE.Color();
    const pal = ['#fbd2dc', '#ffffff', '#f6a8bd', '#ffe1c2', '#5f8f4a', '#4c7a3c', '#e98aa6'];
    for (let i = 0; i < n; i++) { const a = R(0, PI), rr = r + R(-.35, .35); o.position.set(Math.cos(a) * rr, Math.sin(a) * rr, AZ + R(-.35, .35)); o.scale.setScalar(R(.45, 1)); o.rotation.set(R(0, 6), R(0, 6), 0); o.updateMatrix(); fl.setMatrixAt(i, o.matrix); fl.setColorAt(i, c.set(pal[i % pal.length])); }
    fl.castShadow = true; scene.add(fl);
    const bulbs = []; for (let i = 0; i <= 44; i++) { const a = i / 44 * PI; bulbs.push([Math.cos(a) * (r - .45), Math.sin(a) * (r - .45), AZ + .3]); }
    W.archBulbs = bulbs; }

  // ---------- the hall ----------
  const hall = new THREE.Group(); scene.add(hall); W.hall = hall;
  const plaster = new THREE.MeshStandardMaterial({ color: 0xf3eadb, roughness: .88 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b25e, metalness: .85, roughness: .32 });
  const DW = 3.8, DH = 5.8, DY = .45, FD = .8; // door width/height/base, facade depth
  const wins = []; for (const x of [-4.9, -8.4, -11.9, 4.9, 8.4, 11.9]) wins.push([x, 1.2, 2.3, 4.2]);
  const up = []; for (const x of [-4.9, -8.4, -11.9, 4.9, 8.4, 11.9]) up.push([x, 6.1, 1.3, 1.9]);
  { const s = new THREE.Shape(); s.moveTo(-15, 0); s.lineTo(15, 0); s.lineTo(15, 9); s.lineTo(-15, 9); s.lineTo(-15, 0);
    s.holes.push(archShape(new THREE.Path(), 0, DY, DW, DH)); [...wins, ...up].forEach(w => s.holes.push(archShape(new THREE.Path(), w[0], w[1], w[2], w[3])));
    const fg = new THREE.ExtrudeGeometry(s, { depth: FD, bevelEnabled: false, curveSegments: 14 }); fg.translate(0, 0, -FD);
    const f = new THREE.Mesh(fg, plaster); f.castShadow = f.receiveShadow = true; hall.add(f);
    const frames = [archFrame(0, DY, DW, DH, .32, .22)]; [...wins, ...up].forEach(w => frames.push(archFrame(w[0], w[1], w[2], w[3], .16, .14)));
    const fm = new THREE.Mesh(mergeGeometries(frames), gold); fm.position.z = .02; hall.add(fm);
    // pilasters between bays
    const pil = []; for (const x of [-14.6, -10.15, -6.65, -2.9, 2.9, 6.65, 10.15, 14.6]) { const b = new THREE.BoxGeometry(.5, 9, .3); b.translate(x, 4.5, .12); pil.push(b); }
    const pm = new THREE.Mesh(mergeGeometries(pil), plaster); pm.castShadow = true; hall.add(pm);
  }
  // body of the hall (open at the front so the doors can swing in)
  { const body = new THREE.Group(); const D = 20, Wd = 30, Ht = 9;
    const walls = [[Wd, Ht, 0, Ht / 2, -FD - D, 0], [D, Ht, -Wd / 2, Ht / 2, -FD - D / 2, PI / 2], [D, Ht, Wd / 2, Ht / 2, -FD - D / 2, -PI / 2]];
    walls.forEach(w => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w[0], w[1]), new THREE.MeshStandardMaterial({ color: 0xf3eadb, roughness: .9, side: THREE.DoubleSide })); m.position.set(w[2], w[3], w[4]); m.rotation.y = w[5]; m.castShadow = true; body.add(m); });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(Wd + .6, .5, D + FD + .2), plaster); roof.position.set(0, Ht + .25, -(D + FD) / 2); roof.castShadow = true; body.add(roof);
    const band = new THREE.Mesh(new THREE.BoxGeometry(Wd + .2, .16, .2), gold); band.position.set(0, 8.55, .1); body.add(band);
    const par = []; for (let x = -14.5; x <= 14.6; x += 1.45) { const c = new THREE.ConeGeometry(.22, .55, 4); c.rotateY(PI / 4); c.translate(x, 9.78, .05); par.push(c); }
    const pp = new THREE.Mesh(mergeGeometries(par), plaster); body.add(pp);
    hall.add(body);
    // interior
    const carpet = canvasTex(256, 256, (g2, w, h) => { g2.fillStyle = '#5e1822'; g2.fillRect(0, 0, w, h); g2.strokeStyle = 'rgba(230,180,90,.55)'; g2.lineWidth = 3; for (let i = 0; i < 4; i++) { g2.strokeRect(20 + i * 6, 20 + i * 6, w - 40 - i * 12, h - 40 - i * 12); } });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(Wd - .2, D), new THREE.MeshStandardMaterial({ map: rep(carpet, 3, 2), roughness: .9 })); floor.rotation.x = -PI / 2; floor.position.set(0, DY, -FD - D / 2); body.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(Wd, D), new THREE.MeshStandardMaterial({ color: 0xf6e2c4, roughness: .9 })); ceil.rotation.x = PI / 2; ceil.position.set(0, Ht - .05, -FD - D / 2); body.add(ceil);
    const chand = []; for (const z of [-5, -10, -15]) for (const x of [-7, 0, 7]) for (let k = 0; k < 10; k++) { const a = k / 10 * 2 * PI, s = new THREE.SphereGeometry(.09, 6, 4); s.translate(x + Math.cos(a) * .7, 7.2 - (k % 2) * .25, z + Math.sin(a) * .7); chand.push(s); }
    body.add(new THREE.Mesh(mergeGeometries(chand), new THREE.MeshBasicMaterial({ color: hdr(3, 2.2, 1.2) })));
    const inLight = new THREE.PointLight(0xffc27a, 0, 34, 1.6); inLight.position.set(0, 5, -8); body.add(inLight); W.inLight = inLight;
  }
  // windows: glowing jali
  { const tA = jaliTexture(true), tB = jaliTexture(false);
    const winMat = [new THREE.MeshStandardMaterial({ color: 0x1a0d06, emissive: 0xffffff, emissiveMap: tA, emissiveIntensity: .2, roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x1a0d06, emissive: 0xffffff, emissiveMap: tB, emissiveIntensity: .2, roughness: 1 })];
    wins.forEach(w => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w[2], w[3]), winMat[0]); m.position.set(w[0], w[1] + w[3] / 2, -FD + .12); hall.add(m); });
    up.forEach(w => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w[2], w[3]), winMat[1]); m.position.set(w[0], w[1] + w[3] / 2, -FD + .12); hall.add(m); });
    W.winMats = winMat; }
  // sign
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1), new THREE.MeshStandardMaterial({ map: signTexture(), roughness: .6, emissive: 0xffffff, emissiveMap: signTexture(), emissiveIntensity: .05 }));
    m.position.set(0, 7.55, .26); hall.add(m); W.signMat = m.material; }
  // dome, drum, finial with crescent, corner kiosks
  { const drum = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 2.2, 32), plaster); drum.position.set(0, 10.6, -10.8); drum.castShadow = true; hall.add(drum);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.25, .12, 6, 40), gold); ring.rotation.x = PI / 2; ring.position.set(0, 11.7, -10.8); hall.add(ring);
    const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24, a = t * PI / 2; let r = 4.4 * Math.cos(a) * (1 + .18 * Math.sin(t * PI)); if (t > .85) r *= 1 - (t - .85) * 2.2; pts.push(new THREE.Vector2(Math.max(r, .02), 5.4 * Math.sin(a))); }
    const dome = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), gold); dome.position.set(0, 11.7, -10.8); dome.castShadow = true; hall.add(dome);
    const fin = new THREE.Group(); const f1 = new THREE.Mesh(new THREE.CylinderGeometry(.06, .1, 1.6, 8), gold); f1.position.y = .8;
    const f2 = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), gold); f2.position.y = .9;
    const cr = new THREE.Mesh(new THREE.TorusGeometry(.42, .07, 6, 24, PI * 1.25), gold); cr.position.y = 2.1; cr.rotation.z = -PI * .125 - PI / 2;
    fin.add(f1, f2, cr); fin.position.set(0, 17.05, -10.8); hall.add(fin);
    const kiosk = []; for (const x of [-14, 14]) for (const z of [-1.2, -19.6]) {
      for (const dx of [-.55, .55]) for (const dz of [-.55, .55]) { const p = new THREE.CylinderGeometry(.08, .08, 1.5, 6); p.translate(x + dx, 10.25, z + dz); kiosk.push(p); }
      const sl = new THREE.BoxGeometry(1.5, .14, 1.5); sl.translate(x, 11.05, z); kiosk.push(sl); }
    hall.add(new THREE.Mesh(mergeGeometries(kiosk), plaster));
    const kd = []; for (const x of [-14, 14]) for (const z of [-1.2, -19.6]) { const d = new THREE.SphereGeometry(.75, 16, 8, 0, 2 * PI, 0, PI / 2); d.scale(1, 1.25, 1); d.translate(x, 11.1, z); kd.push(d); }
    const kdm = new THREE.Mesh(mergeGeometries(kd), gold); kdm.castShadow = true; hall.add(kdm);
  }
  // steps and planters
  { const st = []; for (let i = 0; i < 3; i++) { const b = new THREE.BoxGeometry(7 - i * .6, .15, .5); b.translate(0, .075 + i * .15, 1.25 - i * .5); st.push(b); }
    const s = new THREE.Mesh(mergeGeometries(st), stone); s.receiveShadow = s.castShadow = true; hall.add(s);
    const pots = [], fl = []; for (const x of [-2.6, 2.6, -13, 13]) { const p = new THREE.CylinderGeometry(.45, .32, .8, 12); p.translate(x, .4, 1.4); pots.push(p);
      for (let k = 0; k < 60; k++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * .5, f = new THREE.IcosahedronGeometry(.09, 0); f.translate(x + Math.cos(a) * r, .85 + rnd() * .35 * (1 - r), 1.4 + Math.sin(a) * r); fl.push(f); } }
    hall.add(new THREE.Mesh(mergeGeometries(pots), new THREE.MeshStandardMaterial({ color: 0xb06a3e, roughness: .8 })));
    const flm = new THREE.Mesh(mergeGeometries(fl), new THREE.MeshStandardMaterial({ color: 0xf4a6bd, roughness: .7 })); flm.castShadow = true; hall.add(flm); }
  // the doors
  { const dt = doorTexture();
    const half = new THREE.Shape(); const w = DW / 2, h = DH, hs = h - DW * .72;
    half.moveTo(0, 0); half.lineTo(w, 0); half.lineTo(w, h); half.quadraticCurveTo(0, h - DW * .18, 0, hs); half.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(half, { depth: .12, bevelEnabled: false, curveSegments: 12 });
    { const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w, p.getY(i) / h); }
    const mat = new THREE.MeshStandardMaterial({ map: dt, roughness: .55, metalness: .1, side: THREE.DoubleSide });
    const L = new THREE.Group(), Rr = new THREE.Group(); const ml = new THREE.Mesh(geo, mat), mr = new THREE.Mesh(geo, mat); mr.scale.x = -1;
    ml.position.z = mr.position.z = -.06; ml.castShadow = mr.castShadow = true;
    L.add(ml); Rr.add(mr); L.position.set(-w, DY, -.35); Rr.position.set(w, DY, -.35); hall.add(L, Rr);
    W.doors = [L, Rr];
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(DW, DH), new THREE.MeshBasicMaterial({ color: hdr(1.6, 1.1, .6), transparent: true, opacity: 0, depthWrite: false }));
    glow.position.set(0, DY + DH / 2, -.5); hall.add(glow); W.doorGlow = glow;
  }
  // string lights
  { const pts = [];
    const strand = (a, b, sag, n) => { for (let i = 0; i <= n; i++) { const t = i / n; pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) - Math.sin(t * PI) * sag, lerp(a[2], b[2], t)]); } };
    for (let x = -15; x < 15; x += 3) strand([x, 8.35, .35], [x + 3, 8.35, .35], .45, 8);
    strand([-1.5, 8.2, .4], [-6.45, 2.9, 14], 1.2, 26); strand([1.5, 8.2, .4], [6.45, 2.9, 14], 1.2, 26);
    strand([-6, 8.2, .4], [-6.45, 2.9, 24.5], 1.6, 34); strand([6, 8.2, .4], [6.45, 2.9, 24.5], 1.6, 34);
    W.archBulbs.forEach(b => pts.push(b));
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 6, 4), new THREE.MeshBasicMaterial({ color: hdr(1, .8, .5) }), pts.length), o = new THREE.Object3D();
    pts.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); scene.add(m); W.bulbMat = m.material; }
  // warm pools of light at the door (no shadows: cheap)
  const doorLight = new THREE.PointLight(0xffb866, 0, 26, 1.7); doorLight.position.set(0, 3.2, 3); scene.add(doorLight); W.doorLight = doorLight;
  const gardenLight = new THREE.PointLight(0xffb866, 0, 30, 1.8); gardenLight.position.set(0, 2.2, 40); scene.add(gardenLight); W.gardenLight = gardenLight;

  // ---------- families ----------
  W.people = buildFamilies(scene);
  // ---------- birds ----------
  W.birds = buildBirds(scene);
  // ---------- clouds (for the opening) ----------
  { const tex = cloudTexture(), grp = new THREE.Group(), mats = [];
    for (let i = 0; i < 60; i++) { const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: R(.75, 1) });
      const s = new THREE.Sprite(m); const big = R(50, 120); s.scale.set(big * 1.7, big, 1);
      s.position.set(R(-300, 300), R(88, 128), R(-60, 520)); s.userData.base = m.opacity; grp.add(s); mats.push(m); }
    scene.add(grp); W.clouds = { grp, mats }; }
  // ---------- fireflies ----------
  { const n = 260, p = new Float32Array(n * 3), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = R(-26, 26); p[i * 3 + 1] = R(.3, 3.2); p[i * 3 + 2] = R(-4, 120); ph[i] = R(0, 100); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(p, 3)); gg.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.time, uOp: { value: 0 }, uPx: { value: opts.dpr } },
      vertexShader: 'attribute float ph;uniform float uTime,uPx;varying float vA;void main(){vec3 q=position+vec3(sin(uTime*.3+ph)*1.4,sin(uTime*.5+ph*1.3)*.5,cos(uTime*.25+ph*.7)*1.4);vA=pow(max(0.,sin(uTime*1.3+ph*3.)),6.);vec4 mv=modelViewMatrix*vec4(q,1.);gl_PointSize=uPx*90./-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float uOp;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=pow(smoothstep(.5,0.,d),2.);gl_FragColor=vec4(vec3(1.4,1.3,.45)*2.,a*vA*uOp);}' });
    const pts = new THREE.Points(gg, m); pts.frustumCulled = false; scene.add(pts); W.fireflyMat = m; }
  // ---------- sky lanterns ----------
  { const geo = new THREE.LatheGeometry([new THREE.Vector2(.2, 0), new THREE.Vector2(.27, .12), new THREE.Vector2(.31, .45), new THREE.Vector2(.26, .82), new THREE.Vector2(.02, .9)], 10);
    const n = 140, m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: hdr(3.2, 1.55, .5), fog: false }), n);
    m.frustumCulled = false; scene.add(m);
    const o = new THREE.Object3D(); o.scale.setScalar(0); o.updateMatrix(); for (let i = 0; i < n; i++) m.setMatrixAt(i, o.matrix);
    W.lanterns = { mesh: m, list: [], o, n, next: 0, bg: 90 }; }
  return W;
}

// ---------- families walking toward the hall ----------
const skin = [0xc99068, 0xb57d55, 0xd9a679, 0x9c6a48];
const abaya = [0x3b2a4a, 0x5a2a3a, 0x1f2c4a, 0x2a2a2e, 0x2f4a4a, 0x6a4a3a];
const hijab = [0xf3e6d8, 0xf2c6cf, 0xcfe0d6, 0xe8d3a8, 0xd9c4e8, 0xffffff];
const thobe = [0xffffff, 0xcfe0f2, 0xf3ead6, 0xd9eadf, 0xf2d9de, 0xc9ced6, 0xa9c2de];
const pants = [0x2b2f3a, 0x3a3a40, 0x4a4036, 0x1f2a3a, 0x5a5650];
const kidc = [0xff8a65, 0x6fb7a8, 0xf7c948, 0xb08bd6, 0x7fb3e8, 0xf49ab8];
const std = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 });
export function makePerson(kind, i) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const sk = std(skin[i % skin.length]);
  if (kind === 'w') {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.17, .34, 1.42, 12), std(abaya[i % abaya.length])); b.position.y = .71; body.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 10), std(hijab[i % hijab.length])); h.position.set(0, 1.56, .0); h.scale.set(1, 1.08, 1.05); body.add(h);
    const d = new THREE.Mesh(new THREE.ConeGeometry(.26, .38, 12), h.material); d.position.y = 1.36; body.add(d);
    const f = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), sk); f.position.set(0, 1.55, -.07); f.scale.set(.95, 1.1, .7); body.add(f);
    for (const s of [-1, 1]) { const ar = new THREE.Group(); const am = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, .6, 8), b.material); am.position.y = -.3; ar.add(am); ar.position.set(s * .23, 1.36, 0); body.add(ar); g.userData['arm' + s] = ar; }
  } else if (kind === 'm') {
    // shirt and trousers
    const pm = std(pants[i % pants.length]);
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.08, .075, .86, 8), pm); l.position.set(s * .1, .43, 0); body.add(l); g.userData['leg' + s] = l; }
    const hip = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .16, 12), pm); hip.position.y = .86; body.add(hip);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.21, .2, .62, 12), std(thobe[i % thobe.length])); b.position.y = 1.18; body.add(b);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(.23, 12, 8), b.material); sh.scale.set(1, .4, .8); sh.position.y = 1.46; body.add(sh);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.115, 12, 10), sk); hd.position.y = 1.65; body.add(hd);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8, 0, 2 * PI, 0, PI / 2), std(0x1c1410)); hair.position.set(0, 1.67, .012); hair.rotation.x = .25; body.add(hair);
    if (i % 2) { const beard = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), std(0x1c1410)); beard.position.set(0, 1.58, -.06); beard.scale.set(1, .75, .7); body.add(beard); }
    for (const s of [-1, 1]) { const a = new THREE.Group(); const am = new THREE.Mesh(new THREE.CylinderGeometry(.055, .06, .6, 8), b.material); am.position.y = -.3; a.add(am); a.position.set(s * .25, 1.44, 0); body.add(a); g.userData['arm' + s] = a; }
  } else {
    const c = kidc[i % kidc.length]; const b = new THREE.Mesh(new THREE.CylinderGeometry(.13, .19, .62, 10), std(c)); b.position.y = .62; body.add(b);
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .34, 6), std(0x4a5a7a)); l.position.set(s * .07, .16, 0); body.add(l); g.userData['leg' + s] = l; }
    for (const s of [-1, 1]) { const ar = new THREE.Group(); const am = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .38, 6), b.material); am.position.y = -.19; ar.add(am); ar.position.set(s * .16, .88, 0); body.add(ar); g.userData['arm' + s] = ar; }
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), sk); hd.position.y = 1.03; body.add(hd);
    const hr = new THREE.Mesh(new THREE.SphereGeometry(.125, 12, 6, 0, 2 * PI, 0, PI / 2), std(i % 2 ? 0x2a1d16 : hijab[i % hijab.length])); hr.position.y = 1.05; body.add(hr);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.body = body; g.userData.kind = kind; g.userData.ph = Math.random() * 6;
  return g;
}

function buildFamilies(scene) {
  const person = makePerson;
  const fams = [
    { side: -1, z: 58, list: ['m', 'w', 'k', 'k'] }, { side: 1, z: 66, list: ['w', 'w', 'k'] }, { side: -1, z: 84, list: ['m', 'w', 'k'] },
    { side: 1, z: 92, list: ['m', 'w', 'w', 'k', 'k'] }, { side: -1, z: 104, list: ['m', 'm'] }, { side: 1, z: 40, list: ['m', 'w', 'k'] }, { side: -1, z: 30, list: ['w', 'w', 'k', 'k'] },
  ];
  const walkers = []; let n = 0;
  fams.forEach((f, fi) => f.list.forEach((k, j) => {
    const p = person(k, n++); const col = j % 2, row = Math.floor(j / 2);
    p.userData.x0 = f.side * 4.95 + (col ? .45 : -.45) + (k === 'k' ? (Math.random() - .5) * .6 : 0);
    p.userData.z0 = f.z + row * 1.1 + Math.random() * .3; p.userData.v = .82 + fi % 3 * .05; p.userData.run = k === 'k' && Math.random() < .5;
    scene.add(p); walkers.push(p);
  }));
  // a gathering already chatting on the plaza
  const idle = []; [[-8.5, 4, ['m', 'm', 'k']], [8.2, 3.6, ['w', 'w', 'w', 'k']], [-5.2, 6.2, ['w', 'k']]].forEach((gq, gi) => gq[2].forEach((k, j) => {
    const p = person(k, n++); const a = j / gq[2].length * 2 * PI + gi; p.position.set(gq[0] + Math.cos(a) * .75, 0, gq[1] + Math.sin(a) * .75);
    p.rotation.y = Math.atan2(gq[0] - p.position.x, gq[1] - p.position.z) + PI; p.userData.idle = true; scene.add(p); idle.push(p); }));
  return { walkers, idle };
}
export function updatePeople(P, t) {
  for (const p of P.walkers) {
    const u = p.userData, d = u.v * t, z = u.z0 - d;
    const k = u.kind === 'k', ph = u.ph + t * (k ? 9 : 5.6);
    p.position.set(u.x0 + (u.run ? Math.sin(t * 1.3 + u.ph) * .7 : 0), 0, Math.max(z, 2.4));
    u.body.position.y = Math.abs(Math.sin(ph)) * (k ? .07 : .035);
    u.body.rotation.z = Math.sin(ph) * .035;
    if (u['arm-1']) { u['arm-1'].rotation.x = Math.sin(ph) * .35; u['arm1'].rotation.x = -Math.sin(ph) * .35; }
    if (u['leg-1']) { u['leg-1'].rotation.x = Math.sin(ph) * .6; u['leg1'].rotation.x = -Math.sin(ph) * .6; }
    p.visible = z > 2.6;
  }
  for (const p of P.idle) { const u = p.userData; u.body.rotation.z = Math.sin(t * .9 + u.ph) * .03; u.body.position.y = u.kind === 'k' ? Math.abs(Math.sin(t * 6 + u.ph)) * .08 : 0;
    if (u['arm-1']) { u['arm-1'].rotation.x = Math.sin(t * 1.7 + u.ph) * .4 - .2; } }
}

function buildBirds(scene) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x2a2230, side: THREE.DoubleSide });
  const wing = new THREE.BufferGeometry(); wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -.25, 1.3, 0, .1, 0, 0, .35], 3));
  const birds = [];
  for (let i = 0; i < 11; i++) {
    const b = new THREE.Group(); const body = new THREE.Mesh(new THREE.ConeGeometry(.12, .9, 5), mat); body.rotation.x = PI / 2; b.add(body);
    const l = new THREE.Mesh(wing, mat), r = new THREE.Mesh(wing, mat); r.scale.x = -1; b.add(l, r);
    const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
    b.userData = { l, r, off: new THREE.Vector3(side * row * 2.4, R(-.4, .4), row * 2.2), ph: R(0, 6) };
    b.scale.setScalar(1.6); scene.add(b); birds.push(b);
  }
  return birds;
}
export function updateBirds(B, t) {
  // the flock crosses the golden sky from left to right
  const x = -170 + t * 11, base = new THREE.Vector3(x, 52 + Math.sin(t * .2) * 4, 118 - t * .8);
  for (const b of B) { const u = b.userData; b.position.copy(base).add(u.off); b.rotation.y = -PI / 2 + .08;
    const f = Math.sin(t * 7 + u.ph) * .7; u.l.rotation.z = f; u.r.rotation.z = -f; b.visible = t < 32; }
}
