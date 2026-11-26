import * as THREE from 'three';
import { Section } from '../scene/section.js';
import { organic, curve, taperTube, mesh, merge, gradientAlong } from '../scene/helpers.js';
import { seeded } from '../scene/noise.js';

// Tata letak (satuan bebas): korteks di atas (y > 0.25), medula di bawah.
const BORDER_Y = 0.25;

/** Jalur berkelok (convoluted) di sekitar kurva dasar. */
function convolute(base, { amp = 0.12, freq = 6, n = 160, rnd, phase = 0, zAmp = 0.6 }) {
  const pts = [];
  const up = new THREE.Vector3(0, 0, 1);
  const p1 = rnd() * 6, p2 = rnd() * 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = base.getPointAt(t);
    const tan = base.getTangentAt(t);
    const a = new THREE.Vector3().crossVectors(tan, up).normalize();
    const env = Math.sin(Math.PI * t) ** 0.4; // ujung tetap pada jalurnya
    const w = t * freq * Math.PI * 2 + phase;
    p.addScaledVector(a, Math.sin(w + p1) * amp * env);
    p.z += Math.cos(w * 0.8 + p2) * amp * zAmp * env;
    pts.push(p);
  }
  return curve(pts, false, 0.5);
}

/** Kapiler yang melilit sebuah kurva (heliks). */
function helixAround(base, r, turns, phase, { from = 0, to = 1, n = 200 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = from + (to - from) * (i / n);
    const p = base.getPointAt(t);
    const tan = base.getTangentAt(t);
    const a = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 0, 1)).normalize();
    const b = new THREE.Vector3().crossVectors(tan, a).normalize();
    const w = (i / n) * turns * Math.PI * 2 + phase;
    pts.push(p.addScaledVector(a, Math.cos(w) * r).addScaledVector(b, Math.sin(w) * r));
  }
  return curve(pts);
}

/** Partikel yang bergerak pelan di sepanjang lintasan, warnanya berubah sesuai posisi. */
function flowParticles(path, n, size, c0, c1, speed) {
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.3, emissive: '#222', emissiveIntensity: 0.4 }), n);
  inst.userData.noPick = true;
  const a = new THREE.Color(c0), b = new THREE.Color(c1), col = new THREE.Color();
  for (let i = 0; i < n; i++) inst.setColorAt(i, a);
  const m4 = new THREE.Matrix4();
  return {
    mesh: inst,
    update(t) {
      for (let i = 0; i < n; i++) {
        const u = (t * speed + i / n) % 1;
        const p = path.getPointAt(u);
        m4.makeTranslation(p.x, p.y, p.z);
        inst.setMatrixAt(i, m4);
        inst.setColorAt(i, col.copy(a).lerp(b, u));
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.instanceColor.needsUpdate = true;
    },
  };
}

export function buildNephron() {
  const rnd = seeded(77);
  const group = new THREE.Group();
  const vesselMat = (c) => organic(c, { rough: 0.3, clearcoat: 0.85, bump: 0.5 });
  const red = '#c9303a', blue = '#3d5fbf';

  // ---------- Pembuluh besar: arteri/vena arkuata & interlobularis ----------
  const arcA = curve([[-3.0, BORDER_Y + 0.05, -0.55], [0, BORDER_Y, -0.6], [3.0, BORDER_Y + 0.05, -0.55]]);
  const arcV = curve([[-3.0, BORDER_Y - 0.18, -0.35], [0, BORDER_Y - 0.2, -0.4], [3.0, BORDER_Y - 0.18, -0.35]]);
  const iA = curve([[-2.0, BORDER_Y, -0.58], [-2.02, 1.2, -0.4], [-2.0, 2.5, -0.3]]);
  const iV = curve([[-2.5, 2.5, -0.15], [-2.48, 1.2, -0.2], [-2.5, BORDER_Y - 0.19, -0.37]]);
  group.add(mesh(merge([taperTube(arcA, 0.11, 0.11, 60, 16), taperTube(iA, 0.08, 0.06, 40, 14)]), vesselMat(red), 'arteri-interlobularis'));
  group.add(mesh(merge([taperTube(arcV, 0.13, 0.13, 60, 16), taperTube(iV, 0.07, 0.09, 40, 14)]), vesselMat(blue), 'vena-interlobularis'));

  // ---------- Korpuskel ginjal: glomerulus + kapsul Bowman ----------
  const G = new THREE.Vector3(-0.95, 1.65, 0);
  const aff = curve([iA.getPointAt(0.78), [-1.7, 1.95, -0.15], [-1.4, 1.82, -0.02], [-1.22, 1.74, 0]]);
  const affMesh = mesh(taperTube(aff, 0.075, 0.065, 50, 16), vesselMat(red), 'arteriol-aferen');
  group.add(affMesh);
  // glomerulus: beberapa lengkung kapiler yang membentuk bola
  const gPaths = [];
  const loops = [];
  for (let l = 0; l < 7; l++) {
    const pts = [new THREE.Vector3(-1.22, 1.74, 0)];
    let cur = G.clone().add(new THREE.Vector3(-0.12, 0.05, 0));
    for (let i = 0; i < 14; i++) {
      const step = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.11);
      const nxt = cur.clone().add(step);
      if (nxt.distanceTo(G) > 0.25) nxt.lerp(G, 0.45);
      pts.push(nxt);
      cur = nxt;
    }
    pts.push(new THREE.Vector3(-1.22, 1.56, 0.04));
    const c = curve(pts);
    loops.push(c);
    gPaths.push(gradientAlong(taperTube(c, 0.032, 0.03, 120, 8), '#d8343d', '#b62c45'));
  }
  group.add(mesh(merge(gPaths), organic('#ffffff', { vertexColors: true, rough: 0.3, clearcoat: 0.85, bump: 0 }), 'glomerulus'));
  const eff = curve([[-1.22, 1.56, 0.04], [-1.45, 1.42, 0.12], [-1.55, 1.2, 0.2], [-1.4, 1.0, 0.25]]);
  group.add(mesh(gradientAlong(taperTube(eff, 0.05, 0.045, 40, 14), '#b8304a', '#a33a5c'), organic('#ffffff', { vertexColors: true, rough: 0.3, clearcoat: 0.85, bump: 0.4 }), 'arteriol-eferen'));
  // kapsul Bowman: mangkuk berdinding ganda, terbuka ke kutub vaskular (kiri)
  const capsuleMat = organic('#efd2a4', { rough: 0.35, clearcoat: 0.8, side: THREE.DoubleSide, bump: 1, bumpKind: 'cells' });
  const outer = new THREE.SphereGeometry(0.42, 64, 40, 0, Math.PI * 2, 0.55, Math.PI - 0.55);
  const cup = mesh(outer, capsuleMat, 'kapsul-bowman');
  cup.position.copy(G);
  cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0.15, 0).normalize());
  const rim = mesh(new THREE.TorusGeometry(0.42 * Math.sin(0.55), 0.03, 10, 48), capsuleMat, 'kapsul-bowman');
  rim.position.copy(G).add(new THREE.Vector3(-1, 0.15, 0).normalize().multiplyScalar(0.42 * Math.cos(0.55)));
  rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0.15, 0).normalize());
  group.add(cup, rim);

  // ---------- Tubulus ----------
  const tubMat = (c) => organic(c, { rough: 0.32, clearcoat: 0.85, sheen: 0.5, bump: 0.8, bumpKind: 'fine' });
  const tubules = [];
  const addT = (m) => { tubules.push(m); group.add(m); return m; };
  const pctBase = curve([[-0.55, 1.62, 0], [0.0, 2.05, 0.05], [0.75, 1.95, 0], [1.2, 1.5, 0.05], [1.05, 1.05, 0], [1.4, 0.75, 0]]);
  const pct = convolute(pctBase, { amp: 0.17, freq: 5.5, rnd, zAmp: 0.4 });
  const henle = curve([[1.4, 0.75, 0], [1.42, -0.4, 0], [1.42, -1.9, 0], [1.3, -2.45, 0], [1.08, -2.5, 0], [0.96, -2.1, 0], [0.92, -0.9, 0], [0.9, 0.2, 0], [0.88, 0.85, 0]], false, 0.4);
  const dctBase = curve([[0.88, 0.85, 0], [0.2, 1.05, 0.04], [-0.6, 1.2, 0.04], [-0.25, 1.5, 0.04], [0.5, 2.3, 0.02], [1.4, 2.4, 0], [2.25, 2.15, 0]]);
  const dct = convolute(dctBase, { amp: 0.12, freq: 4, rnd, phase: 1.3, zAmp: 0.25 });
  const cd = curve([[2.3, 2.7, 0], [2.3, 2.15, 0], [2.33, 0.3, 0], [2.36, -1.6, 0], [2.4, -2.9, 0]]);
  addT(mesh(taperTube(pct, 0.08, 0.075, 420, 14), tubMat('#e5975a'), 'tubulus-proksimal'));
  // lengkung Henle: bagian turun tipis, bagian naik menebal
  addT(mesh(taperTube(henle, (t) => (t < 0.62 ? 0.045 : 0.045 + Math.min(1, (t - 0.62) / 0.12) * 0.025), 0, 200, 12), tubMat('#e8bf4e'), 'lengkung-henle'));
  addT(mesh(taperTube(dct, 0.068, 0.068, 340, 12), tubMat('#6db38a'), 'tubulus-distal'));
  addT(mesh(taperTube(cd, 0.12, 0.16, 100, 18), tubMat('#a68fd8'), 'tubulus-kolektivus'));
  const others = [];
  for (const y of [1.2, -0.2, -1.4]) others.push(taperTube(curve([[3.0, y + 0.45, -0.15], [2.7, y + 0.2, -0.05], [2.38, y, 0]]), 0.05, 0.065, 20, 10));
  addT(mesh(merge(others), tubMat('#6db38a'), 'tubulus-distal'));

  // ---------- Kapiler peritubulus & vasa recta (darah: merah → ungu → biru) ----------
  const capGeos = [];
  const capPCT = helixAround(pctBase, 0.26, 7, 0);
  const capPCT2 = helixAround(pctBase, 0.26, 7, Math.PI);
  const capDCT = helixAround(dctBase, 0.22, 6, 1.2);
  capGeos.push(gradientAlong(taperTube(curve([eff.getPointAt(1), [-1.0, 1.3, 0.3], capPCT.getPointAt(0)]), 0.022, 0.02, 30, 6), '#a33a5c', '#9b3c63'));
  for (const c of [capPCT, capPCT2]) capGeos.push(gradientAlong(taperTube(c, 0.018, 0.018, 360, 6), '#a93a58', '#6b4a9c'));
  capGeos.push(gradientAlong(taperTube(capDCT, 0.018, 0.018, 300, 6), '#8a4280', '#4a5bb5'));
  // jembatan antar-lilitan → tampak seperti jaring
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const a = capPCT.getPointAt(t), b = capPCT2.getPointAt(t);
    capGeos.push(gradientAlong(taperTube(curve([a, a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0, 0.12)), b]), 0.012, 0.012, 12, 5), '#a03c5e', '#7a4690'));
  }
  // kapiler mengalir ke vena interlobularis
  const toVein = curve([capDCT.getPointAt(1), [-0.5, 2.6, 0.1], [-1.6, 2.55, -0.1], iV.getPointAt(0.08)]);
  capGeos.push(gradientAlong(taperTube(toVein, 0.024, 0.03, 60, 8), '#4a5bb5', blue));
  // vasa recta: lengkung jepit rambut di samping lengkung Henle
  const vrDown = curve([[-1.4, 1.0, 0.25], [0.0, 0.7, 0.3], [1.18, 0.4, 0.28], [1.2, -1.6, 0.28], [1.18, -2.55, 0.25]]);
  const vrUp = curve([[1.18, -2.55, 0.25], [0.78, -2.45, 0.28], [0.72, -0.9, 0.3], [0.65, BORDER_Y - 0.1, 0.1], [0.2, BORDER_Y - 0.19, -0.3]]);
  capGeos.push(gradientAlong(taperTube(vrDown, 0.026, 0.024, 120, 8), '#a83a5a', '#7a4690'));
  capGeos.push(gradientAlong(taperTube(vrUp, 0.024, 0.03, 120, 8), '#7a4690', blue));
  group.add(mesh(merge(capGeos), organic('#ffffff', { vertexColors: true, rough: 0.3, clearcoat: 0.8, bump: 0 }), 'kapiler-peritubulus'));

  // ---------- Aliran (pelan, arah benar) ----------
  // Filtrat: kapsul Bowman → tubulus proksimal → Henle (turun lalu naik) → tubulus distal → tubulus kolektivus (turun)
  const fPts = [G.clone().add(new THREE.Vector3(0.25, 0, 0))];
  const sample = (c, n, a = 0, b = 1) => { for (let i = 0; i <= n; i++) fPts.push(c.getPointAt(a + (b - a) * (i / n))); };
  sample(pct, 120); sample(henle, 70); sample(dct, 110); sample(cd, 50, 0.12, 1);
  const filtrate = flowParticles(new THREE.CatmullRomCurve3(fPts), 60, 0.038, '#fff4c2', '#f0a500', 0.012);
  // Darah: arteri interlobularis → arteriol aferen → glomerulus → arteriol eferen → kapiler peritubulus → vena
  const bPts = [];
  const sb = (c, n, a = 0, b = 1) => { for (let i = 0; i <= n; i++) bPts.push(c.getPointAt(a + (b - a) * (i / n))); };
  sb(iA, 10, 0.4, 0.78); sb(aff, 12); sb(loops[0], 30); sb(eff, 12); sb(capPCT, 120); sb(capDCT, 80); sb(toVein, 20);
  const blood = flowParticles(new THREE.CatmullRomCurve3(bPts), 45, 0.03, '#e0303a', '#3d5fbf', 0.01);
  group.add(filtrate.mesh, blood.mesh);

  // ---------- Penampang: kapsul & tubulus dibelah (z = 0) ----------
  const section = new Section(group, new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), { size: 8 });
  section.clip(cup, rim, tubules);
  let inner = true;
  const setInner = (on) => { inner = on; section.setEnabled(on); };
  setInner(true);

  const anchors = {
    glomerulus: G.clone().add(new THREE.Vector3(0, 0.05, 0)),
    'kapsul-bowman': G.clone().add(new THREE.Vector3(0.15, -0.38, 0.05)),
    'arteriol-aferen': aff.getPointAt(0.45),
    'arteriol-eferen': eff.getPointAt(0.6),
    'tubulus-proksimal': pct.getPointAt(0.5),
    'lengkung-henle': henle.getPointAt(0.42),
    'tubulus-distal': dct.getPointAt(0.66),
    'tubulus-kolektivus': cd.getPointAt(0.6),
    'kapiler-peritubulus': vrDown.getPointAt(0.62),
    'arteri-interlobularis': iA.getPointAt(0.45),
    'vena-interlobularis': iV.getPointAt(0.3),
  };

  return {
    group,
    anchors,
    section,
    innerLabel: ['Penampang', 'Utuh'],
    setInner,
    getInner: () => inner,
    frame: { center: new THREE.Vector3(0.1, 0.3, 0), radius: 4.0 },
    update(t) {
      filtrate.update(t);
      blood.update(t);
    },
  };
}
