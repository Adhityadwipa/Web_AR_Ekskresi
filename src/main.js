import './styles.css';
import { Viewer } from './scene/viewer.js';
import { ARController } from './ar.js';
import { Chat, md } from './chat/chat.js';
import { ORGANS, PARTS, MODELS } from './data/knowledge.js';
import { ctx, setCtx, onCtx, observedPart } from './state.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

const ICONS = {
  paru: '<svg viewBox="0 0 24 24"><path d="M12 3v7.5M12 10.5c-1.3 1.2-2.6 1.5-2.6 1.5M12 10.5c1.3 1.2 2.6 1.5 2.6 1.5"/><path d="M9.4 7.2C6.3 6.8 4 11 4 15.6 4 18.6 5.4 20 7.4 20c2 0 2.6-1.4 2.6-3.8V10"/><path d="M14.6 7.2c3.1-.4 5.4 3.8 5.4 8.4 0 3-1.4 4.4-3.4 4.4s-2.6-1.4-2.6-3.8V10"/></svg>',
  ginjal: '<svg viewBox="0 0 24 24"><path d="M9.5 3.5C6.2 3.5 4 7 4 12s2.2 8.5 5.5 8.5c2.3 0 3.2-1.8 3.2-3.4 0-2-1.8-2.7-1.8-5.1s1.8-3.1 1.8-5.1c0-1.6-.9-3.4-3.2-3.4Z"/><path d="M12.4 12H15c1.8 0 2.6 1.6 2.6 3.4V21"/><path d="M14.5 9.5 19 7M14.5 14.5 19 16"/></svg>',
  nefron: '<svg viewBox="0 0 24 24"><circle cx="7" cy="6.5" r="3"/><path d="M9.8 7.8c1.6.8 2.6-.2 3.8-1.2s3-.4 3 1.6-2 2.4-2 4.3v5.8c0 1.6-2.2 1.6-2.2 0V12"/><path d="M19.5 3v18"/></svg>',
  hati: '<svg viewBox="0 0 24 24"><path d="M3.5 9.2C3.5 6 6.8 4.5 12 4.5s9.2 1.4 8.6 4c-.5 2.3-3.1 3.2-5.2 5.6S12.3 19.5 9 19.5c-3.6 0-5.5-5-5.5-10.3Z"/><path d="M12 4.8c.6 3 .3 5.4-1.1 8.3"/><path d="M8.8 19.4c.4-1.6 1.6-2.4 2.8-2.2"/></svg>',
  kulit: '<svg viewBox="0 0 24 24"><path d="M3 8.5 12 4l9 4.5-9 4.5Z"/><path d="M3 8.5v3.5l9 4.5 9-4.5V8.5"/><path d="M3 12v4.5L12 21l9-4.5V12"/><path d="M14 6.5c.3-1.5 1-2.6 2-3.3"/></svg>',
};
const SUBTITLE = { paru: 'CO₂ & uap air', ginjal: 'Urine', nefron: 'Unit ginjal', hati: 'Empedu & urea', kulit: 'Keringat' };
const HEAD = {
  nefron: { name: 'Nefron', latin: 'Unit fungsional ginjal', tag: 'Tempat filtrasi, reabsorpsi, dan augmentasi pembentuk urine' },
};

// ---------- Inisialisasi ----------
const viewer = new Viewer($('#canvasHost'));
const chat = new Chat($('#chat'), { onAction });
const ar = new ARController(viewer, { overlay: app, video: $('#camFeed') });

const toastEl = $('#toast');
let toastT;
function toast(msg, ms = 3200) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), ms);
}

// ---------- Dock organ ----------
const dock = $('#dock');
MODELS.forEach((m) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'dock-btn';
  b.dataset.model = m.id;
  b.style.setProperty('--c', ORGANS[m.organ].color);
  b.innerHTML = `<span class="ico">${ICONS[m.id]}</span><span>${m.label}<small>${SUBTITLE[m.id]}</small></span>`;
  b.addEventListener('click', () => showModel(m.id));
  dock.appendChild(b);
});

let switching = null;
async function showModel(id, { part } = {}) {
  if (switching) await switching;
  const m = MODELS.find((x) => x.id === id);
  if (!m) return;
  dock.querySelectorAll('.dock-btn').forEach((b) => b.classList.toggle('is-on', b.dataset.model === id));
  const O = ORGANS[m.organ];
  document.documentElement.style.setProperty('--organ', O.color);
  const loading = setTimeout(() => $('#loading').classList.add('show'), 120);
  switching = viewer.show(id);
  await switching;
  switching = null;
  clearTimeout(loading);
  $('#loading').classList.remove('show');

  const h = HEAD[id] || { name: O.name, latin: O.latin, tag: O.tagline };
  const head = $('#organHead');
  head.classList.remove('swap');
  void head.offsetWidth;
  head.classList.add('swap');
  $('#organIndex').textContent = String(MODELS.indexOf(m) + 1).padStart(2, '0');
  $('#organName').textContent = h.name;
  $('#organLatin').textContent = h.latin;
  $('#organTag').textContent = h.tag;
  syncInnerTool();
  hidePartCard();
  setCtx({ model: id, organ: m.organ, part: null, gaze: null });
  try { history.replaceState(null, '', `?organ=${id}`); } catch { /* abaikan */ }
  if (part) viewer.select(part, { source: 'chat', focus: true });
}

function syncInnerTool() {
  const t = $('#toolInner');
  const labels = viewer.current?.innerLabel;
  t.hidden = !labels;
  if (!labels) return;
  const on = viewer.getInner();
  t.classList.toggle('is-on', on);
  $('#toolInnerText').textContent = labels[0];
}

// ---------- Interaksi 3D ----------
const tip = $('#hoverTip');
viewer.addEventListener('hover', (e) => {
  const { partId, client } = e.detail;
  if (!partId || !client) { tip.classList.remove('show'); return; }
  tip.textContent = PARTS[partId]?.name || partId;
  tip.style.left = client.x + 'px';
  tip.style.top = client.y + 'px';
  tip.classList.add('show');
});
window.addEventListener('pointermove', (e) => {
  if (tip.classList.contains('show')) { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; }
});

viewer.addEventListener('select', (e) => {
  const pid = e.detail.partId;
  setCtx({ part: pid });
  if (pid) showPartCard(pid); else hidePartCard();
});
viewer.addEventListener('interact', () => {
  viewer.setAutoRotate(false);
  $('#toolRotate').classList.remove('is-on');
});

const hud = $('#arHud');
viewer.addEventListener('gaze', (e) => {
  const pid = e.detail.partId;
  setCtx({ gaze: pid });
  hud.classList.toggle('locked', !!pid);
  $('#gazeText').textContent = pid ? `Diamati: ${PARTS[pid].name}` : 'Arahkan titik tengah ke organ';
  if (pid && navigator.vibrate && ctx.mode !== '3d') navigator.vibrate(8);
});

function showPartCard(pid) {
  const P = PARTS[pid];
  if (!P) return;
  $('#partName').textContent = P.name;
  $('#partLatin').textContent = P.latin || '';
  $('#partDesc').innerHTML = md(P.desc + (ctx.level === 'sma' && P.sma ? `\n\n**SMA:** ${P.sma}` : ''));
  $('#partDot').style.background = ORGANS[P.organ].color;
  $('#partCard').hidden = false;
}
function hidePartCard() { $('#partCard').hidden = true; }
$('#partClose').addEventListener('click', () => viewer.select(null));
$('#partAsk').addEventListener('click', () => {
  openChat();
  chat.send('Jelaskan bagian ini lebih lanjut');
});

// ---------- Tools ----------
$('#toolLabels').addEventListener('click', (e) => {
  const on = !e.currentTarget.classList.contains('is-on');
  e.currentTarget.classList.toggle('is-on', on);
  viewer.setLabels(on);
});
$('#toolInner').addEventListener('click', () => {
  viewer.setInner(!viewer.getInner());
  syncInnerTool();
});
$('#toolRotate').addEventListener('click', (e) => {
  const on = !e.currentTarget.classList.contains('is-on');
  e.currentTarget.classList.toggle('is-on', on);
  viewer.setAutoRotate(on);
});
$('#toolReset').addEventListener('click', () => viewer.reset());
$('#toolZoomIn').addEventListener('click', () => viewer.zoom(0.72));
$('#toolZoomOut').addEventListener('click', () => viewer.zoom(1.38));
$('#toolPan').addEventListener('click', (e) => {
  const on = !viewer.panMode;
  viewer.setPanMode(on);
  e.currentTarget.classList.toggle('is-on', on);
  toast(on ? 'Mode geser aktif: seret untuk menggeser kamera.' : 'Mode putar aktif: seret untuk memutar organ.');
});
$('#partZoom').addEventListener('click', () => { const pid = ctx.part; if (pid) viewer.focusPart(pid); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { viewer.select(null); app.classList.remove('chat-open'); }
});

// ---------- Jenjang ----------
document.querySelectorAll('.level button').forEach((b) => {
  b.classList.toggle('is-on', b.dataset.level === ctx.level);
  b.addEventListener('click', () => {
    document.querySelectorAll('.level button').forEach((x) => x.classList.toggle('is-on', x === b));
    setCtx({ level: b.dataset.level });
    toast(b.dataset.level === 'sma' ? 'Jenjang SMA: jawaban lebih mendalam (reaksi, hormon, mekanisme).' : 'Jenjang SMP: jawaban ringkas dan sederhana.');
    const pid = observedPart();
    if (pid && !$('#partCard').hidden) showPartCard(pid);
  });
});

// ---------- Chat (mobile sheet) ----------
function openChat() { if (isMobile()) app.classList.add('chat-open'); setTimeout(() => !isMobile() || $('#chatInput').blur(), 0); }
$('#chatToggle').addEventListener('click', () => app.classList.toggle('chat-open'));
$('#chatClose').addEventListener('click', () => app.classList.remove('chat-open'));

function onAction(a) {
  if (isMobile()) app.classList.remove('chat-open');
  if (a.type === 'show') showModel(a.model);
  if (a.type === 'focus') {
    if (ctx.model === a.model) viewer.select(a.part, { source: 'chat', focus: true });
    else showModel(a.model, { part: a.part });
  }
}

onCtx((c) => chat.updateContext(c));

// ---------- AR ----------
const modeBtns = document.querySelectorAll('.mode-switch button');
modeBtns.forEach((b) => b.addEventListener('click', async () => {
  if (b.dataset.mode === '3d') { if (ctx.mode !== '3d') await ar.stop(); return; }
  if (ctx.mode !== '3d') return;
  try {
    await ar.start();
  } catch (err) {
    console.warn(err);
    toast(err?.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera untuk mode AR.' : err.message || 'AR tidak dapat dimulai di perangkat ini.', 4200);
  }
}));
ar.addEventListener('state', (e) => {
  const mode = e.detail.mode;
  setCtx({ mode, gaze: null });
  app.classList.toggle('in-ar', mode !== '3d');
  app.classList.toggle('in-xr', mode === 'xr');
  app.classList.toggle('is-camera', mode === 'camera');
  modeBtns.forEach((b) => b.classList.toggle('is-on', (b.dataset.mode === '3d') === (mode === '3d')));
  hud.classList.remove('locked');
  $('#arHint').hidden = false;
  $('#arHint').textContent = mode === 'xr'
    ? 'Gerakkan ponsel perlahan untuk mendeteksi permukaan, lalu ketuk untuk menaruh organ.'
    : mode === 'camera'
      ? 'Mode kamera AR: arahkan titik tengah ke bagian organ — asisten akan tahu apa yang kamu amati.'
      : '';
  if (mode === 'camera') setTimeout(() => { $('#arHint').hidden = true; }, 6000);
  // di AR label disembunyikan agar pandangan bersih; label bagian yang dibidik tetap muncul lewat chip
  viewer.setLabels(mode === '3d' && $('#toolLabels').classList.contains('is-on'));
  if (mode === '3d') { viewer.setAutoRotate($('#toolRotate').classList.contains('is-on')); }
});
ar.addEventListener('surface', (e) => {
  if (!viewer.placed) $('#arHint').textContent = e.detail.found ? 'Permukaan ditemukan — ketuk layar untuk menaruh organ.' : 'Mencari permukaan datar…';
});
ar.addEventListener('placed', () => {
  $('#arHint').textContent = 'Arahkan titik tengah ke bagian organ, lalu tanyakan ke asisten. Ketuk lagi untuk memindahkan.';
  setTimeout(() => { $('#arHint').hidden = true; }, 5000);
});
$('#arExit').addEventListener('click', () => ar.stop());
$('#arSmaller').addEventListener('click', () => ar.scaleBy(1 / 1.25));
$('#arBigger').addEventListener('click', () => ar.scaleBy(1.25));
$('#arAsk').addEventListener('click', () => {
  app.classList.add('chat-open');
  chat.send(observedPart() ? 'Ini bagian apa dan apa fungsinya?' : 'Jelaskan organ ini');
});

// ---------- Mulai ----------
if (isMobile()) { // layar sempit: label disembunyikan dulu agar tidak menumpuk
  $('#toolLabels').classList.remove('is-on');
  viewer.setLabels(false);
}
const start = new URLSearchParams(location.search).get('organ');
showModel(MODELS.some((m) => m.id === start) ? start : 'paru');
