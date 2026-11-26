// Store konteks global: apa yang sedang diamati pengguna.
// model  : id model 3D yang tampil (paru, ginjal, nefron, hati, kulit)
// organ  : organ pengetahuan (nefron → ginjal)
// part   : bagian yang dipilih (klik/ketuk/pin)
// gaze   : bagian yang berada di tengah pandangan kamera (mode AR/kamera)
// mode   : '3d' | 'camera' | 'xr'
// level  : 'smp' | 'sma'
const listeners = new Set();

export const ctx = {
  model: 'paru',
  organ: 'paru',
  part: null,
  gaze: null,
  mode: '3d',
  level: localStorageGet('exar.level') || 'smp',
  trail: [], // jejak organ/bagian yang baru diamati (terbaru di depan)
};

function localStorageGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}

export function setCtx(patch) {
  const prev = { ...ctx };
  Object.assign(ctx, patch);
  const focus = observedPart();
  const key = `${ctx.organ}:${focus || ''}`;
  if (ctx.trail[0] !== key && (ctx.organ !== prev.organ || focus)) {
    ctx.trail.unshift(key);
    ctx.trail.length = Math.min(ctx.trail.length, 8);
  }
  if (patch.level) { try { localStorage.setItem('exar.level', patch.level); } catch { /* abaikan */ } }
  listeners.forEach((f) => f(ctx, prev));
}

export function onCtx(f) {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** Bagian yang sedang "diamati": di AR/kamera = yang dibidik; selain itu = yang dipilih. */
export function observedPart(c = ctx) {
  if (c.mode !== '3d' && c.gaze) return c.gaze;
  return c.part;
}
