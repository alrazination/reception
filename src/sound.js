// Ambient sound, generated live in the browser. No music, no audio files.
export function createSound() {
  let AC = null, M, REV, on = false;
  const amb = {};
  const S = {};
  const PENTA = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.5, 1479.98, 1760];
  S.PENTA = PENTA;
  function init() {
    if (AC) return true;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) { }
    AC = new C(); M = AC.createGain(); M.gain.value = 0; M.connect(AC.destination);
    const len = AC.sampleRate * 3.6 | 0, ib = AC.createBuffer(2, len, AC.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ib.getChannelData(c); for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 3.2); }
    REV = AC.createConvolver(); REV.buffer = ib; const rg = AC.createGain(); rg.gain.value = .6; REV.connect(rg); rg.connect(M);
    const nb = AC.createBuffer(1, AC.sampleRate * 4, AC.sampleRate), nd = nb.getChannelData(0); let l = 0;
    for (let j = 0; j < nd.length; j++) { l = (l + .02 * (Math.random() * 2 - 1)) / 1.02; nd[j] = l * 3.5; }
    const wb = AC.createBuffer(1, AC.sampleRate * 3, AC.sampleRate), wd = wb.getChannelData(0); for (let j = 0; j < wd.length; j++) wd[j] = Math.random() * 2 - 1;
    const noise = (buf) => { const s = AC.createBufferSource(); s.buffer = buf || nb; s.loop = true; s.start(0, Math.random() * 2); return s; };
    const lfo = (f, amt, target, type) => { const o = AC.createOscillator(); o.type = type || 'sine'; o.frequency.value = f; const g = AC.createGain(); g.gain.value = amt; o.connect(g); g.connect(target); o.start(); };
    const bus = (name, toRev) => { const g = AC.createGain(); g.gain.value = 0; g.connect(M); if (toRev) g.connect(REV); amb[name] = g; return g; };
    // wind
    // the hall: many voices, softly
    { const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 1.1; const g = AC.createGain(); g.gain.value = .5;
      noise().connect(f); f.connect(g); g.connect(bus('hall', true)); lfo(3.1, .28, g.gain); lfo(4.7, .18, g.gain); lfo(.19, 160, f.frequency); }
    // crickets
    { const o = AC.createOscillator(); o.frequency.value = 4400; const c1 = AC.createGain(); c1.gain.value = .5; const c2 = AC.createGain(); c2.gain.value = .5;
      o.connect(c1); c1.connect(c2); c2.connect(bus('night', true)); o.start(); lfo(31, .5, c1.gain, 'square'); lfo(.75, .5, c2.gain, 'square'); }
    birds(); return true;
  }
  let birdy = 0;
  function birds() {
    setTimeout(birds, 1500 + Math.random() * 4200);
    if (!on || birdy < .05) return;
    const t = AC.currentTime, f = 2400 + Math.random() * 1600, n = 2 + (Math.random() * 4 | 0);
    const pn = AC.createStereoPanner ? AC.createStereoPanner() : null; if (pn) { pn.pan.value = Math.random() * 1.6 - .8; pn.connect(M); pn.connect(REV); }
    for (let k = 0; k < n; k++) { const o = AC.createOscillator(), g = AC.createGain(), s = t + k * (.09 + Math.random() * .08);
      o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * (1.2 + Math.random() * .3), s + .06); o.frequency.exponentialRampToValueAtTime(f * .9, s + .1);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.03 * birdy, s + .012); g.gain.exponentialRampToValueAtTime(.0001, s + .11);
      o.connect(g); g.connect(pn || M); o.start(s); o.stop(s + .13); }
  }
  function bell(f, when, v, dec) {
    if (!AC || !on) return; const t = when || AC.currentTime; dec = dec || 3;
    [[1, 1], [2.01, .35], [3, .14], [4.2, .06]].forEach(p => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f * p[0];
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * p[1], t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dec / p[0]);
      o.connect(g); g.connect(M); g.connect(REV); o.start(t); o.stop(t + dec + .1); });
  }
  S.chimes = (notes, gap, v, dec, delay) => { if (!AC || !on) return; const t = AC.currentTime + (delay || 0); notes.forEach((f, i) => bell(f, t + i * gap, v, dec)); };
  S.bell = (f, v, dec) => bell(f, 0, v, dec);
  S.swell = () => { // warm open chord when the doors open
    if (!AC || !on) return; const t = AC.currentTime;
    [293.66, 440, 587.33, 739.99, 880].forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.028 / (1 + i * .3), t + 1.6); g.gain.exponentialRampToValueAtTime(.0001, t + 7);
      o.connect(g); g.connect(M); g.connect(REV); o.start(t); o.stop(t + 7.2); });
  };
  // the nasheed: streamed from nasheed.mp3 if it is there, mixed in softly
  const music = new Audio(); music.src = 'nasheed.mp3'; music.loop = true; music.preload = 'auto'; music.setAttribute('playsinline', ''); music.crossOrigin = 'anonymous'; let mg = null, mf = null, mw = null, musicLv = 0, musicOk = true;
  music.addEventListener('error', () => { musicOk = false; });
  function hookMusic() { if (mg || !AC || !musicOk) return; try { const src = AC.createMediaElementSource(music); mf = AC.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 700; mf.Q.value = .5; mg = AC.createGain(); mg.gain.value = 0; mw = AC.createGain(); mw.gain.value = .5; src.connect(mf); mf.connect(mg); mg.connect(M); mg.connect(mw); mw.connect(REV); } catch (_) { mg = null; } }
  // distance: quieter, duller and more echoing when far; full and clear when near
  S.musicMix = (lv, cutoff, wet) => { musicLv = lv; if (!AC || !on || !musicOk) return; hookMusic(); const t = AC.currentTime;
    if (mg) { mg.gain.setTargetAtTime(lv, t, .9); mf.frequency.setTargetAtTime(cutoff, t, .9); mw.gain.setTargetAtTime(wet, t, .9); } else music.volume = Math.min(1, lv);
    if (lv > 0 && music.paused) music.play().catch(() => { }); };
  S.music = (lv) => { musicLv = lv; if (!AC || !on || !musicOk) return; hookMusic(); if (mg) mg.gain.setTargetAtTime(lv, AC.currentTime, 1.4); else music.volume = Math.min(1, lv); if (lv > 0 && music.paused) music.play().catch(() => { }); };
  S.startMusic = () => { if (!musicOk) return; hookMusic(); if (mg) mg.gain.value = 0; music.play().catch(() => { }); };
  S.applause = (dur = 2.2, v = .05) => { // a burst of clapping and cheering from the hall
    if (!AC || !on) return; const t0 = AC.currentTime, wb = AC.createBuffer(1, AC.sampleRate * .05, AC.sampleRate), d = wb.getChannelData(0);
    for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / (AC.sampleRate * .008));
    for (let i = 0; i < 70; i++) { const s = AC.createBufferSource(); s.buffer = wb; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 1800; f.Q.value = .9;
      const g = AC.createGain(); const at = t0 + Math.pow(Math.random(), 1.4) * dur; g.gain.value = v * (1 - (at - t0) / dur * .7);
      s.connect(f); f.connect(g); g.connect(M); g.connect(REV); s.start(at); } };
  S.buzz = () => { if (!AC || !on) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.value = 880;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.04, t + .01); g.gain.setValueAtTime(.04, t + .22); g.gain.exponentialRampToValueAtTime(.0001, t + .4); o.connect(g); g.connect(M); o.start(t); o.stop(t + .45); };
  S.set = (lv) => { if (!AC) return; const t = AC.currentTime; for (const k in lv) if (amb[k]) amb[k].gain.setTargetAtTime(lv[k], t, .9); if ('birds' in lv) birdy = lv.birds; };
  S.enable = (v) => { if (v && !init()) return false; on = v; if (!AC) return false; if (v) { AC.resume(); hookMusic(); if (musicOk) music.play().catch(() => { }); if (mg) mg.gain.setTargetAtTime(musicLv, AC.currentTime, 1.4); } else setTimeout(() => { if (!on) music.pause(); }, 900); M.gain.setTargetAtTime(v ? .9 : 0, AC.currentTime, v ? .7 : .2); return true; };
  S.prime = () => init();
  S.on = () => on;
  document.addEventListener('visibilitychange', () => { if (AC && on) document.hidden ? AC.suspend() : AC.resume(); });
  return S;
}
