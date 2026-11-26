// Names, the time-aware greeting, countdown, replies (RSVP), calendar, sharing, duas and the link maker.
// Words come from window.WORDS and settings from window.INVITE, both at the bottom of index.html.
const $ = id => document.getElementById(id);
export const P = new URLSearchParams(location.search);
export const BASE = location.origin + location.pathname.replace(/index\.html$/, '');
export const NAME = (P.get('to') || '').replace(/\s+/g, ' ').trim().slice(0, 48);
export const I18N = window.I18N || { lang: 'en', t: k => k, on() { }, set() { }, apply() { } };
export const t = (...a) => I18N.t(...a);
const CFG = window.INVITE || {};
const START = Date.UTC(2027, 0, 10, 11, 30), FIN = Date.UTC(2027, 0, 10, 14, 30), DAY0 = Date.UTC(2027, 0, 9, 18, 30); // 5 to 8 PM India time
let skew = 0;
{ const ov = P.get('now'); if (ov) { const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(ov) ? ov : ov + '+05:30'); if (!isNaN(d)) skew = d - Date.now(); } }
const now = () => Date.now() + skew;
export const state = () => { const n = now(); return n >= FIN ? 'after' : n >= START ? 'live' : n >= DAY0 ? 'today' : 'before'; };
const enc = s => encodeURIComponent(s).replace(/%20/g, '+');
export const personalLink = (name, lang) => BASE + (name || lang === 'ml' ? '?' : '') + (name ? 'to=' + enc(name) : '') + (name && lang === 'ml' ? '&' : '') + (lang === 'ml' ? 'lang=ml' : '');
const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const waTo = text => 'https://wa.me/' + String(CFG.rsvpNumber || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text);

export function initUI(hooks = {}) {
  const body = document.body;
  if (NAME) document.title = 'Walimah · For ' + NAME;
  if (apple) body.classList.add('apple');
  document.querySelectorAll('a.wagroup').forEach(a => a.href = CFG.whatsappGroup || '#');
  document.querySelectorAll('a.maplink').forEach(a => a.href = CFG.map || '#');

  // ---------- replies ----------
  const RK = 'walimah-rsvp'; const R = { yes: true, n: 2, name: NAME, sent: false };
  try { Object.assign(R, JSON.parse(localStorage.getItem(RK) || '{}')); } catch (_) { }
  if (NAME && !R.name) R.name = NAME;
  const saveR = () => { try { localStorage.setItem(RK, JSON.stringify(R)); } catch (_) { } };
  const rsvpText = () => { const who = (R.name || '').trim(); return R.yes ? t('rsvpYes', who, R.n) : t('rsvpNo', who); };
  const drawR = () => { $('ry').classList.toggle('on', R.yes); $('rn').classList.toggle('on', !R.yes); $('rcount').hidden = !R.yes; $('rnum').textContent = R.n; $('rsend').href = waTo(rsvpText()); };
  const rsvpLabel = () => { $('rsvpl').textContent = R.sent ? t('rsvpSent') : t('rsvpBtn'); };

  // ---------- greeting and countdown ----------
  const greet = () => {
    const s = state(), days = Math.ceil((DAY0 - now()) / 864e5);
    for (const k of ['live', 'after', 'today']) body.classList.toggle(k, s === k);
    $('s1').textContent = t(s === 'after' ? 'greetAfter' : 'greet');
    if (!NAME) $('envname').textContent = t(s === 'after' ? 'envGuestAfter' : 'envGuest');
    $('s4').textContent = s === 'after' ? t('thanks') : s === 'live' ? t('liveNow') : s === 'today' ? t('today') : days <= 1 ? t('tomorrow') : t('daysToGo', days);
    $('eh').textContent = s === 'after' ? (NAME ? t('ehAfterName', NAME) : t('ehAfter')) : (NAME ? t('ehName', NAME) : t('eh'));
    $('seatname').textContent = NAME || t('seatAnon');
    $('sndl').textContent = t(body.classList.contains('soundon') ? 'soundOn' : 'soundOff');
    rsvpLabel(); drawR();
  };
  I18N.on(() => { greet(); hooks.onLang && hooks.onLang(); });
  greet();
  let last = '';
  const tick = () => {
    const ms = Math.max(0, START - now()), s = Math.floor(ms / 1e3);
    [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].forEach((v, i) => { const e = $('cd' + i), x = (i && v < 10 ? '0' : '') + v; if (e.textContent !== x) e.textContent = x; });
    const st = state(); if (st !== last) { last = st; greet(); }
  };
  tick(); setInterval(tick, 1000);

  // ---------- sheets ----------
  const openM = id => { $(id).classList.add('open'); };
  const closeM = id => { $(id).classList.remove('open'); };
  document.querySelectorAll('.modal').forEach(m => { m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) closeM(m.id); }); });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => closeM(m.id)); });

  $('rsvp').onclick = () => { $('rname').value = R.name || ''; drawR(); openM('rsvpM'); };
  $('ry').onclick = () => { R.yes = true; drawR(); };
  $('rn').onclick = () => { R.yes = false; drawR(); };
  $('rminus').onclick = () => { R.n = Math.max(1, R.n - 1); drawR(); };
  $('rplus').onclick = () => { R.n = Math.min(40, R.n + 1); drawR(); };
  $('rname').oninput = e => { R.name = e.target.value.slice(0, 48); drawR(); };
  $('rsend').onclick = () => { R.sent = true; saveR(); rsvpLabel(); setTimeout(() => closeM('rsvpM'), 500); };

  $('calbtn').onclick = () => {
    const link = personalLink(NAME, I18N.lang);
    $('calg').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(t('calEvent')) + '&dates=20270110T113000Z/20270110T143000Z&location=' + encodeURIComponent(t('venue')) + '&details=' + encodeURIComponent(t('calDetails', link, CFG.map || ''));
    $('cali').href = I18N.lang === 'ml' ? 'walimah-ml.ics' : 'walimah.ics';
    openM('calM');
  };
  $('calM').querySelectorAll('a').forEach(a => a.addEventListener('click', () => setTimeout(() => closeM('calM'), 400)));

  $('sharebtn').onclick = () => {
    const url = personalLink('', I18N.lang), text = t('shareText');
    if (navigator.share) { navigator.share({ title: 'Walimah', text, url }).catch(e => { if (!e || e.name !== 'AbortError') open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank'); }); return; }
    open('https://wa.me/?text=' + encodeURIComponent(text + '\n' + url), '_blank');
  };

  $('duabtn').onclick = () => { openM('duaM'); setTimeout(() => { try { $('duatext').focus(); } catch (_) { } }, 350); };
  let toastT = 0;
  $('duasend').onclick = () => {
    const v = $('duatext').value.replace(/\s+/g, ' ').trim().slice(0, 90); if (!v) { $('duatext').focus(); return; }
    closeM('duaM'); $('duatext').value = ''; hooks.onDua && hooks.onDua(v);
    $('toastwa').href = waTo(t('duaMsg', v, R.name || NAME || '')); $('toast').classList.add('on'); document.body.classList.add('toasting'); clearTimeout(toastT); toastT = setTimeout(() => { $('toast').classList.remove('on'); document.body.classList.remove('toasting'); }, 8000);
  };

  if (P.has('make')) maker();
}

function maker() {
  document.documentElement.classList.add('make');
  let lang = 'en';
  const msg = (n, u) => lang === 'ml'
    ? 'അസ്സലാമു അലൈക്കും' + (n ? ' ' + n : '') + ' 🌸\n\nറസിൻ & സഹർ, റസീൻ & നഈമ എന്നിവരുടെ വലീമ സൽക്കാരത്തിലേക്ക് നിങ്ങളെ സ്നേഹപൂർവ്വം ക്ഷണിക്കുന്നു.\n\n2027 ജനുവരി 10, ഞായറാഴ്ച · വൈകിട്ട് 5 മുതൽ 8 വരെ\nഇവന്റോ ഓഡിറ്റോറിയം, അമരമ്പലം\n\nക്ഷണക്കത്ത് തുറക്കൂ (ശബ്ദം ഓൺ ചെയ്ത് കാണുന്നതാണ് നല്ലത്):\n' + u
    : 'Assalamu alaikum' + (n ? ' ' + n : '') + ' 🌸\n\nWith hearts full of joy, we invite you to the Walimah of Razin & Sahar and Razeen & Naeema.\n\nSunday, 10 January 2027 · 5 to 8 PM\nEvento Auditorium, Amarambalam\n\nOpen your invitation (best with sound on):\n' + u;
  const copy = (x, b) => (navigator.clipboard ? navigator.clipboard.writeText(x) : Promise.reject()).then(() => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => b.textContent = o, 1200); }).catch(() => prompt('Copy this:', x));
  const row = n => { const u = personalLink(n, lang), d = document.createElement('div'); d.className = 'row';
    d.innerHTML = '<b></b><code></code><button>Copy link</button><a class="mb" target="_blank" rel="noopener">Send on WhatsApp</a><a class="mb ghost" target="_blank" rel="noopener">Preview</a>';
    d.querySelector('b').textContent = n || 'Anyone'; d.querySelector('code').textContent = u; d.querySelector('button').onclick = function () { copy(u, this); };
    const a = d.querySelectorAll('a'); a[0].href = 'https://wa.me/?text=' + encodeURIComponent(msg(n, u)); a[1].href = u; return d; };
  const KEY = 'walimah-links'; let saved = []; try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) { } };
  const draw = () => { const g = $('genrow'); g.replaceChildren(...row('').childNodes); const L = $('list'); L.innerHTML = ''; saved.forEach(n => L.appendChild(row(n))); };
  const pick = l => { lang = l; $('mken').classList.toggle('on', l === 'en'); $('mkml').classList.toggle('on', l === 'ml'); draw(); };
  $('mken').onclick = () => pick('en'); $('mkml').onclick = () => pick('ml');
  draw();
  $('mk').onclick = () => { $('names').value.split(/\n/).map(s => s.replace(/\s+/g, ' ').trim().slice(0, 48)).filter(Boolean).reverse().forEach(n => { if (saved.indexOf(n) < 0) saved.unshift(n); }); $('names').value = ''; save(); draw(); };
  $('cpall').onclick = function () { copy(saved.map(n => n + ': ' + personalLink(n, lang)).join('\n'), this); };
  $('clr').onclick = () => { if (confirm('Clear the saved list of names on this device?')) { saved = []; save(); draw(); } };
}
