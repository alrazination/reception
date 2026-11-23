// Names, the time-aware greeting, countdown and the link maker.
const $ = id => document.getElementById(id);
export const P = new URLSearchParams(location.search);
export const BASE = location.origin + location.pathname.replace(/index\.html$/, '');
export const NAME = (P.get('to') || '').replace(/\s+/g, ' ').trim().slice(0, 48);
const START = Date.UTC(2027, 0, 10, 11, 30), FIN = Date.UTC(2027, 0, 10, 14, 30), DAY0 = Date.UTC(2027, 0, 9, 18, 30); // 5 to 8 PM India time
let skew = 0;
{ const ov = P.get('now'); if (ov) { const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(ov) ? ov : ov + '+05:30'); if (!isNaN(d)) skew = d - Date.now(); } }
const now = () => Date.now() + skew;
export const state = () => { const n = now(); return n >= FIN ? 'after' : n >= START ? 'live' : n >= DAY0 ? 'today' : 'before'; };

export function initUI() {
  if (NAME) document.title = 'Walimah · For ' + NAME;
  const greet = () => {
    const s = state(), days = Math.ceil((DAY0 - now()) / 864e5);
    document.body.classList.toggle('live', s === 'live'); document.body.classList.toggle('after', s === 'after');
    $('s1').textContent = s === 'after' ? 'With heartfelt thanks' : 'Assalamu alaikum';
    $('s2').textContent = NAME || (s === 'after' ? 'Dear guest' : 'You are warmly invited');
    $('s3').textContent = s === 'after' ? 'Thank you for celebrating with us' : (NAME ? 'You are warmly invited to our Walimah' : 'to the Walimah of our family');
    $('s4').textContent = s === 'after' ? '' : s === 'live' ? 'We are celebrating right now' : s === 'today' ? 'Today is the day, in shaa Allah' : days <= 1 ? 'Tomorrow, in shaa Allah' : days + ' days to go, in shaa Allah';
    $('eh').textContent = s === 'after' ? (NAME ? 'JazakAllahu khairan, ' + NAME : 'JazakAllahu khairan for celebrating with us')
      : (NAME ? NAME + ', we would love to see you there' : 'We would love to see you there');
  };
  greet();
  let last = '';
  const tick = () => {
    const ms = Math.max(0, START - now()), s = Math.floor(ms / 1e3);
    [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].forEach((v, i) => { const e = $('cd' + i), t = (i && v < 10 ? '0' : '') + v; if (e.textContent !== t) e.textContent = t; });
    const st = state(); if (st !== last) { last = st; greet(); }
  };
  tick(); setInterval(tick, 1000);
  $('replay').onclick = e => { e.preventDefault(); location.href = BASE + (NAME ? '?to=' + encodeURIComponent(NAME).replace(/%20/g, '+') : ''); };
  if (P.has('make')) maker();
}

function maker() {
  document.documentElement.classList.add('make');
  const msg = (n, u) => 'Assalamu alaikum' + (n ? ' ' + n : '') + ' 🌸\n\nWith hearts full of joy, we invite you to the Walimah of Razin & Sahar and Razeen & Naeema.\n\nSunday, 10 January 2027 · 5 to 8 PM\nEvento Auditorium, Athani\n\nOpen your invitation (best with sound on):\n' + u;
  const link = n => n ? BASE + '?to=' + encodeURIComponent(n).replace(/%20/g, '+') : BASE;
  const copy = (t, b) => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => b.textContent = o, 1200); }).catch(() => prompt('Copy this:', t));
  const row = n => { const u = link(n), d = document.createElement('div'); d.className = 'row';
    d.innerHTML = '<b></b><code></code><button>Copy link</button><a class="mb" target="_blank" rel="noopener">Send on WhatsApp</a><a class="mb ghost" target="_blank" rel="noopener">Preview</a>';
    d.querySelector('b').textContent = n || 'Anyone'; d.querySelector('code').textContent = u; d.querySelector('button').onclick = function () { copy(u, this); };
    const a = d.querySelectorAll('a'); a[0].href = 'https://wa.me/?text=' + encodeURIComponent(msg(n, u)); a[1].href = u; return d; };
  const KEY = 'walimah-links'; let saved = []; try { saved = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) { } };
  const draw = () => { const L = $('list'); L.innerHTML = ''; saved.forEach(n => L.appendChild(row(n))); };
  $('genrow').replaceWith(row('')); draw();
  $('mk').onclick = () => { $('names').value.split(/\n/).map(s => s.replace(/\s+/g, ' ').trim().slice(0, 48)).filter(Boolean).reverse().forEach(n => { if (saved.indexOf(n) < 0) saved.unshift(n); }); $('names').value = ''; save(); draw(); };
  $('cpall').onclick = function () { copy(saved.map(n => n + ': ' + link(n)).join('\n'), this); };
  $('clr').onclick = () => { if (confirm('Clear the saved list of names on this device?')) { saved = []; save(); draw(); } };
}
