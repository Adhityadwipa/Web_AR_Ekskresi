import * as THREE from 'three';
import { Section } from '../scene/section.js';
import { organic, curve, taperTube, mesh, merge, gradientAlong } from '../scene/helpers.js';
import { seeded } from '../scene/noise.js';

/** Buat jalur berkelok-kelok (convoluted) mengikuti kurva dasar. */
function convolute(base, { amp = 0.12, freq = 6, n = 140, rnd, phase = 0 }) {
  const pts = [];
  const up = new THREE.Vector3(0, 0, 1);
  const p1 = rnd() * 6, p2 = rnd() * 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = base.getPointAt(t);
    const tan = base.getTangentAt(t);
    const a = new THREE.Vector3().crossVectors(tan, up).normalize();
    if (a.lengthSq() < 0.01) a.set(1, 0, 0);
    const b = new THREE.Vector3().crossVectors(tan, a).normalize();
    const env = Math.sin(Math.PI * t) ** 0.4; // ujung tetap di jalur
    const w = t * freq * Math.PI * 2 + phase;
    p.addScaledVector(a, Math.sin(w + p1) * amp * env).addScaledVector(b, Math.cos(w * 0.7 + p2) * amp * env);
    pts.push(p);
  }
  return curve(pts, false, 0.5);
}

export function buildNephron() {
  const rnd = seeded(77);
  const group = new THREE.Group();
  const G = new THREE.Vector3(-0.7, 1.0, 0);

  // ---- Glomerulus: gulungan kapiler ----
  const gp = [new THREE.Vector3(-1.05, 1.22, 0)];
  let cur = G.clone().add(new THREE.Vector3(-0.15, 0.1, 0));
  for (let i = 0; i < 46; i++) {
    const step = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.14);
    const nxt = cur.clone().add(step);
    if (nxt.distanceTo(G) > 0.26) nxt.lerp(G, 0.45);
    gp.push(nxt);
    cur = nxt;
  }
  gp.push(new THREE.Vector3(-1.05, 0.88, 0.06));
  const gCurve = curve(gp, false, 0.5);
  const glom = mesh(gradientAlong(taperTube(gCurve, 0.045, 0.04, 420, 8), '#e0343e', '#b8283a'), organic('#ffffff', { vertexColors: true, rough: 0.3, clearcoat: 0.8, bump: 0 }), 'glomerulus');
  group.add(glom);

  // ---- Kapsul Bowman: mangkuk terbuka ke kutub vaskular ----
  const cupGeo = new THREE.SphereGeometry(0.46, 64, 40, 0, Math.PI * 2, 0.62, Math.PI - 0.62);
  const cup = mesh(cupGeo, organic('#f1cf9c', { rough: 0.3, clearcoat: 0.9, side: THREE.DoubleSide, bump: 0.8, bumpKind: 'cells' }), 'kapsul-bowman');
  cup.position.copy(G);
  cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0.25, 0).normalize());
  group.add(cup);

  // ---- Arteriol aferen (besar) & eferen (kecil) ----
  const aff = curve([[-2.2, 1.55, -0.1], [-1.7, 1.35, 0], [-1.25, 1.25, 0], [-1.05, 1.22, 0]]);
  const eff = curve([[-1.05, 0.88, 0.06], [-1.3, 0.7, 0.1], [-1.65, 0.45, 0.2], [-1.8, 0.0, 0.25]]);
  group.add(mesh(taperTube(aff, 0.085, 0.06, 40, 16), organic('#d3313b', { rough: 0.3, clearcoat: 0.8, bump: 0.4 }), 'arteriol-aferen'));
  group.add(mesh(gradientAlong(taperTube(eff, 0.05, 0.045, 40, 14), '#c42c3c', '#a53358'), organic('#ffffff', { vertexColors: true, rough: 0.3, clearcoat: 0.8, bump: 0.4 }), 'arteriol-eferen'));

  // ---- Tubulus ----
  const pctBase = curve([[-0.25, 0.95, 0], [0.2, 1.25, 0.1], [0.8, 1.15, 0.0], [1.25, 0.85, 0.05], [1.35, 0.4, 0]]);
  const pct = convolute(pctBase, { amp: 0.17, freq: 5, rnd });
  const henle = curve([[1.35, 0.4, 0], [1.38, -0.5, 0], [1.36, -1.6, 0], [1.22, -2.15, 0], [1.02, -2.2, 0], [0.92, -1.8, 0], [0.88, -0.6, 0], [0.82, 0.45, 0]], false, 0.4);
  const dctBase = curve([[0.82, 0.45, 0], [0.25, 0.5, 0.25], [-0.35, 0.55, 0.32], [0.05, 1.2, 0.35], [0.7, 1.75, 0.2], [1.5, 1.85, 0.05], [2.15, 1.65, 0]]);
  const dct = convolute(dctBase, { amp: 0.12, freq: 4, rnd, phase: 1.3 });
  const cd = curve([[2.15, 2.3, 0], [2.15, 1.65, 0], [2.18, 0, 0], [2.2, -1.6, 0], [2.22, -2.6, 0]]);

  const tubMat = (c) => organic(c, { rough: 0.3, clearcoat: 0.85, sheen: 0.6, bump: 0.6, bumpKind: 'fine' });
  const tubules = [];
  const addT = (m) => { tubules.push(m); group.add(m); return m; };
  addT(mesh(taperTube(pct, 0.075, 0.07, 360, 12), tubMat('#ee9147'), 'tubulus-proksimal'));
  addT(mesh(taperTube(henle, (t) => (t < 0.55 ? 0.045 : 0.045 + (t - 0.55) * 0.07), 0, 160, 12), tubMat('#eec043'), 'lengkung-henle'));
  addT(mesh(taperTube(dct, 0.065, 0.065, 300, 12), tubMat('#4fb27f'), 'tubulus-distal'));
  addT(mesh(taperTube(cd, 0.12, 0.14, 80, 18), tubMat('#9479d6'), 'tubulus-kolektivus'));
  // nefron lain yang bermuara ke tubulus kolektivus
  const others = [];
  for (const y of [0.9, -0.3]) others.push(taperTube(curve([[2.9, y + 0.5, -0.2], [2.6, y + 0.25, -0.1], [2.25, y, 0]]), 0.05, 0.06, 20, 10));
  addT(mesh(merge(others), tubMat('#4fb27f'), 'tubulus-distal'));

  // ---- Kapiler peritubulus & vasa recta ----
  const capGeos = [];
  const helix = (base, r, turns, off) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const p = base.getPointAt(t);
      const tan = base.getTangentAt(t);
      const a = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 0, 1)).normalize();
      const b = new THREE.Vector3().crossVectors(tan, a).normalize();
      const w = t * turns * Math.PI * 2 + off;
      pts.push(p.addScaledVector(a, Math.cos(w) * r).addScaledVector(b, Math.sin(w) * r));
    }
    return curve(pts);
  };
  const vr1 = curve([[-1.8, 0.0, 0.25], [-0.6, -0.1, 0.3], [1.15, -0.2, 0.22], [1.2, -1.9, 0.2], [1.1, -2.45, 0.18]]);
  const vr2 = curve([[1.1, -2.45, 0.18], [0.75, -2.2, 0.22], [0.68, -0.6, 0.25], [0.2, -0.2, 0.3], [-0.8, 0.15, 0.4], [-2.3, 0.2, 0.3]]);
  capGeos.push(gradientAlong(taperTube(vr1, 0.03, 0.025, 120, 8), '#b03447', '#7b3f8f'));
  capGeos.push(gradientAlong(taperTube(vr2, 0.025, 0.035, 120, 8), '#7b3f8f', '#3c5fc1'));
  capGeos.push(gradientAlong(taperTube(helix(pctBase, 0.24, 6, 0), 0.016, 0.016, 260, 6), '#b8304a', '#5a4aa8'));
  capGeos.push(gradientAlong(taperTube(helix(dctBase, 0.2, 5, 1.5), 0.016, 0.016, 220, 6), '#9a3a6a', '#3c5fc1'));
  group.add(mesh(merge(capGeos), organic('#ffffff', { vertexColors: true, rough: 0.3, clearcoat: 0.7, bump: 0 }), 'kapiler-peritubulus'));

  // ---- Partikel filtrat: aliran urine primer → sekunder → sesungguhnya ----
  const path = [];
  const sample = (c, n, from = 0, to = 1) => { for (let i = 0; i <= n; i++) path.push(c.getPointAt(from + (to - from) * (i / n))); };
  path.push(G.clone().add(new THREE.Vector3(0.1, 0, 0)));
  sample(pct, 90); sample(henle, 50); sample(dct, 80); sample(cd, 40, 0.2, 1);
  const flow = new THREE.CatmullRomCurve3(path);
  const N = 70;
  const parts = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 12, 10), new THREE.MeshStandardMaterial({ roughness: 0.25, emissive: '#6b4a00', emissiveIntensity: 0.8 }), N);
  parts.userData.noPick = true;
  const cA = new THREE.Color('#fff6cf'), cB = new THREE.Color('#f5b301'), col = new THREE.Color();
  for (let i = 0; i < N; i++) parts.setColorAt(i, cA);
  group.add(parts);

  // Penampang: tubulus & kapsul Bowman dibelah (z = 0) → rongga & aliran filtrat terlihat
  const section = new Section(group, new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), { size: 8 });
  section.clip(cup, tubules);
  let inner = true;
  const setInner = (on) => { inner = on; section.setEnabled(on); };
  setInner(true);

  const anchors = {
    glomerulus: G.clone().add(new THREE.Vector3(-0.1, 0.42, 0.2)),
    'kapsul-bowman': G.clone().add(new THREE.Vector3(-0.25, -0.42, 0.2)),
    'arteriol-aferen': aff.getPointAt(0.35),
    'arteriol-eferen': eff.getPointAt(0.7),
    'tubulus-proksimal': pct.getPointAt(0.55).add(new THREE.Vector3(0, 0.12, 0.1)),
    'lengkung-henle': henle.getPointAt(0.5).add(new THREE.Vector3(0, 0.05, 0.1)),
    'tubulus-distal': dct.getPointAt(0.62).add(new THREE.Vector3(0, 0.1, 0.12)),
    'tubulus-kolektivus': cd.getPointAt(0.65).add(new THREE.Vector3(0.1, 0, 0.1)),
    'kapiler-peritubulus': vr2.getPointAt(0.25).add(new THREE.Vector3(0, 0, 0.05)),
  };

  return {
    group,
    anchors,
    section,
    innerLabel: ['Penampang', 'Utuh'],
    setInner,
    getInner: () => inner,
    frame: { center: new THREE.Vector3(0.3, -0.15, 0), radius: 3.2 },
    update(t) {
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < N; i++) {
        const u = (t * 0.045 + i / N) % 1;
        const p = flow.getPointAt(u);
        m4.makeTranslation(p.x, p.y, p.z);
        parts.setMatrixAt(i, m4);
        col.copy(cA).lerp(cB, Math.min(1, u * 1.3));
        parts.setColorAt(i, col);
      }
      parts.instanceMatrix.needsUpdate = true;
      parts.instanceColor.needsUpdate = true;
    },
  };
}
