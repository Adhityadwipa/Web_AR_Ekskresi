import * as THREE from 'three';
import { organic, deform, curve, taperTube, mesh, part, branchTree, treeGeometry, gradientAlong, merge, stripeTexture } from '../scene/helpers.js';
import { fbm, seeded, smoothstep, worley3 } from '../scene/noise.js';

const LUNG_X = 0.98;

/** Bentuk paru-paru dari bola satuan. side: -1 = paru kanan (kiri layar), +1 = paru kiri. */
function lungPoint(v, side) {
  const { x, y, z } = v;
  const n = 1 + 0.03 * fbm(x * 2.2 + side * 5, y * 2.2, z * 2.2, 3);
  const t = (y + 1) / 2;
  const taper = 0.42 + 0.58 * Math.sin(Math.min(1, (1 - t) * 1.25 + 0.12) * Math.PI / 2);
  let X = x * 0.96 * taper * n;
  let Z = z * 1.0 * taper * n;
  let Y = y * 1.48 * n;
  // sisi medial lebih rata (menghadap jantung/mediastinum)
  const med = -side * X;
  if (med > 0) X += side * med * 0.55;
  if (Z > 0) Z *= 0.88;
  // dasar cekung mengikuti kubah diafragma
  const r2 = (X * X) / 0.42 + (Z * Z) / 0.7;
  const floor = -1.5 + 0.5 * Math.max(0, 1 - r2);
  if (Y < floor) Y = floor + (Y - floor) * 0.12;
  // takik jantung pada paru kiri
  if (side > 0) {
    const g = Math.exp(-((Y + 0.5) ** 2) / 0.16) * smoothstep(-0.15, 0.45, Z) * smoothstep(-0.25, 0.15, med);
    X += 0.3 * g;
  }
  v.set(X, Y, Z);
}

// Fisura (celah antarlobus)
const OBL_N = new THREE.Vector3(0, 1, 1.05).normalize();
function fissure(p, side) {
  const d = (p.y + 0.3) * OBL_N.y + p.z * OBL_N.z;
  const h = side < 0 && d > 0 && p.z > -0.25 ? p.y - 0.28 : 99;
  return { d, h };
}
function lobeOf(p, side) {
  const { d, h } = fissure(p, side);
  if (side < 0) {
    if (d < 0) return 'lobus-bawah-kanan';
    return h < 0 ? 'lobus-tengah-kanan' : 'lobus-atas-kanan';
  }
  return d < 0 ? 'lobus-bawah-kiri' : 'lobus-atas-kiri';
}

function buildLung(side) {
  const geo = new THREE.SphereGeometry(1, 128, 96);
  deform(geo, (v) => lungPoint(v, side));
  // alur fisura + warna per lobus
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const base = new THREE.Color('#d9857a');
  const tints = { atas: new THREE.Color('#dc8a7f'), tengah: new THREE.Color('#d47f75'), bawah: new THREE.Color('#cc776e') };
  const dark = new THREE.Color('#8a3438');
  const cell = new THREE.Color('#a94a4c');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const { d, h } = fissure(v, side);
    const g = Math.max(Math.exp(-((d / 0.035) ** 2)), Math.exp(-((h / 0.035) ** 2)));
    const k = 1 - 0.07 * g;
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
    const lobe = lobeOf(v, side);
    c.copy(tints[lobe.split('-')[1]] || base);
    // pola mosaik lobulus paru: garis poligon gelap di antara lobulus + bercak halus
    const [f1, f2] = worley3(v.x * 7 + side * 3, v.y * 7, v.z * 7);
    const edge = 1 - smoothstep(0.0, 0.09, f2 - f1);
    const m = fbm(v.x * 9, v.y * 9, v.z * 9, 3);
    c.offsetHSL(0, 0.03 * m, m * 0.09);
    c.lerp(cell, edge * 0.55);
    c.lerp(dark, g * 0.8);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const mat = organic('#d9857a', { vertexColors: true, rough: 0.5, clearcoat: 0.55, clearcoatRough: 0.3, sheen: 0.2, bump: 0.9, side: THREE.DoubleSide });
  const m = mesh(geo, mat, side < 0 ? 'lobus-atas-kanan' : 'lobus-atas-kiri', { shell: true, resolver: (local) => lobeOf(local, side) });
  m.userData.resolverIds = side < 0 ? ['lobus-atas-kanan', 'lobus-tengah-kanan', 'lobus-bawah-kanan'] : ['lobus-atas-kiri', 'lobus-bawah-kiri'];
  m.position.x = side * LUNG_X;
  m.renderOrder = 2;
  return m;
}

function insideLung(p) {
  for (const side of [-1, 1]) {
    const x = (p.x - side * LUNG_X) / 0.74, y = (p.y + 0.05) / 1.28, z = p.z / 0.8;
    if (x * x + y * y + z * z < 0.82) return true;
  }
  return false;
}

function buildAirways(rnd) {
  const g = new THREE.Group();
  // Trakea: cincin tulang rawan berbentuk C + membran
  const ringGeos = [];
  for (let i = 0; i < 13; i++) {
    const r = new THREE.TorusGeometry(0.16, 0.027, 10, 40, Math.PI * 1.55);
    r.rotateZ(-0.275 * Math.PI); // celah huruf C menghadap ke belakang
    r.rotateX(Math.PI / 2);
    r.translate(0, 1.22 + i * 0.088, 0.0);
    ringGeos.push(r);
  }
  const rings = mesh(merge(ringGeos), organic('#f1e6d8', { rough: 0.38, clearcoat: 0.6, bumpKind: 'fine', bump: 0.6 }), 'trakea');
  const tube = mesh(new THREE.CylinderGeometry(0.15, 0.155, 1.2, 32, 1, true).translate(0, 1.8, 0), organic('#e3b2a8', { rough: 0.5, side: THREE.DoubleSide }), 'trakea');
  const larynx = mesh(deform(new THREE.SphereGeometry(0.24, 32, 24), (v) => v.set(v.x * 1.05, v.y * 0.75, v.z * 0.9 + Math.max(0, v.z) * 0.25)).translate(0, 2.45, 0.02), organic('#efdcc8', { rough: 0.4 }), 'trakea');
  g.add(rings, tube, larynx);

  // Bronkus utama: kanan lebih pendek & tegak, kiri lebih panjang & mendatar
  const carina = new THREE.Vector3(0, 1.18, 0);
  const hilumR = new THREE.Vector3(-0.58, 0.62, -0.02);
  const hilumL = new THREE.Vector3(0.7, 0.74, -0.02);
  const segs = [];
  segs.push({ curve: new THREE.QuadraticBezierCurve3(carina, new THREE.Vector3(-0.22, 0.98, 0), hilumR), r0: 0.12, r1: 0.1, depth: 0 });
  segs.push({ curve: new THREE.QuadraticBezierCurve3(carina, new THREE.Vector3(0.32, 1.08, 0), hilumL), r0: 0.115, r1: 0.095, depth: 0 });
  const lobar = [
    [hilumR, new THREE.Vector3(-0.35, 1, 0.05)],
    [hilumR, new THREE.Vector3(-0.35, -0.25, 0.9)],
    [hilumR, new THREE.Vector3(-0.15, -1, -0.35)],
    [hilumL, new THREE.Vector3(0.35, 0.9, 0.25)],
    [hilumL, new THREE.Vector3(0.2, -1, -0.3)],
  ];
  const tips = [];
  for (const [s, d] of lobar) {
    branchTree({ start: s, dir: d, len: 0.42, radius: 0.075, depth: 1, maxDepth: 5, rnd, inside: insideLung, spread: 0.5, shrink: 0.8, rshrink: 0.72, out: segs, tips });
  }
  const bronchiMat = organic('#efe0cf', { rough: 0.42, clearcoat: 0.5, bump: 0.5, bumpKind: 'fine' });
  g.add(mesh(treeGeometry(segs, (s) => s.depth <= 1, 14), bronchiMat, 'bronkus'));
  g.add(mesh(treeGeometry(segs, (s) => s.depth > 1, 7), organic('#f3d3c2', { rough: 0.4, clearcoat: 0.5, bump: 0.4, bumpKind: 'fine' }), 'bronkiolus'));

  // Kantong alveolus di setiap ujung bronkiolus
  const sph = new THREE.SphereGeometry(0.03, 10, 8);
  const per = 7;
  const inst = new THREE.InstancedMesh(sph, organic('#ff9fa8', { rough: 0.35, clearcoat: 0.7, sheen: 0.8, bump: 0 }), tips.length * per);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let k = 0;
  for (const t of tips) {
    for (let i = 0; i < per; i++) {
      const off = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(0.035).addScaledVector(t.d, 0.03);
      const s = 0.75 + rnd() * 0.6;
      m4.compose(t.p.clone().add(off), q, sc.set(s, s, s));
      inst.setMatrixAt(k++, m4);
    }
  }
  part(inst, 'alveolus');
  g.add(inst);
  return g;
}

function buildVessels() {
  const g = new THREE.Group();
  const blue = organic('#4f74c9', { rough: 0.35, clearcoat: 0.7, bump: 0.4 });
  const red = organic('#c8363f', { rough: 0.35, clearcoat: 0.7, bump: 0.4 });
  const trunk = curve([[0.1, 0.3, 0.42], [0.1, 0.75, 0.3], [0.05, 0.95, 0.12]]);
  g.add(mesh(taperTube(trunk, 0.12, 0.11, 24, 16), blue, 'arteri-pulmonalis'));
  const arts = [
    curve([[0.05, 0.95, 0.12], [-0.25, 0.86, 0.12], [-0.46, 0.66, 0.08], [-0.62, 0.45, 0.05]]),
    curve([[0.05, 0.95, 0.12], [0.35, 0.9, 0.05], [0.6, 0.72, 0.06], [0.74, 0.5, 0.0]]),
  ];
  for (const c of arts) g.add(mesh(taperTube(c, 0.085, 0.05, 32, 14), blue, 'arteri-pulmonalis'));
  const veins = [
    [[-0.58, 0.48, 0.12], [-0.35, 0.36, 0.16], [-0.08, 0.3, 0.12]],
    [[-0.6, 0.18, 0.08], [-0.35, 0.22, 0.12], [-0.08, 0.27, 0.1]],
    [[0.62, 0.52, 0.1], [0.38, 0.38, 0.14], [0.1, 0.3, 0.12]],
    [[0.62, 0.22, 0.06], [0.38, 0.24, 0.1], [0.1, 0.27, 0.1]],
  ];
  for (const p of veins) g.add(mesh(taperTube(curve(p), 0.05, 0.07, 24, 12), red, 'vena-pulmonalis'));
  return g;
}


function buildDiaphragm() {
  const geo = new THREE.RingGeometry(0.001, 1, 120, 40);
  geo.rotateX(-Math.PI / 2);
  deform(geo, (v) => {
    const x = v.x * 2.0, z = v.z * 1.0;
    const dome = (cx) => 0.52 * Math.exp(-(((x - cx) ** 2) / 0.3 + (z * z) / 0.55));
    const r = Math.hypot(v.x, v.z);
    const y = -1.58 + Math.max(dome(-LUNG_X), dome(LUNG_X)) * 0.95 + 0.12 * Math.exp(-(x * x) / 0.15 - (z * z) / 0.4) - 0.1 * smoothstep(0.75, 1, r);
    v.set(x, y, z);
  });
  const tex = stripeTexture('#9a3f36', '#74281f', 70);
  tex.repeat.set(3, 1);
  const mat = organic('#ffffff', { map: tex, rough: 0.6, clearcoat: 0.3, side: THREE.DoubleSide, bump: 0.8 });
  // warnai bagian tengah (tendon sentral) lebih terang
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const t = Math.exp(-(x * x) / 0.25 - (z * z) / 0.3);
    const c = new THREE.Color('#ffffff').lerp(new THREE.Color('#f2e2d2').multiplyScalar(1.6), t * 0.9);
    cols.set([c.r, c.g, c.b], i * 3);
    // uv radial agar serat otot memancar
    const a = Math.atan2(z, x) / (Math.PI * 2) + 0.5;
    uv.setXY(i, a * 6, Math.hypot(x, z));
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  mat.vertexColors = true;
  const m = mesh(geo, mat, 'diafragma');
  m.position.y = -0.03;
  return m;
}

/** Perbesaran kantong alveolus + kapiler + partikel CO₂/O₂. */
function buildAlveolusInset(rnd) {
  const g = new THREE.Group();
  const C = new THREE.Vector3(0, 0, 0);
  // kantong alveolus dibelah: setengah bola terbuka ke depan → rongga alveolus terlihat
  const centers = [new THREE.Vector3(0, -0.02, 0)];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    centers.push(new THREE.Vector3(Math.cos(a) * 0.4, Math.sin(a) * 0.4 - 0.02, -0.05 - rnd() * 0.06));
  }
  const outer = organic('#d9707e', { rough: 0.35, clearcoat: 0.9, clearcoatRough: 0.2, sheen: 0.8, bump: 1.2, bumpKind: 'cells', side: THREE.FrontSide });
  const innerM = organic('#f4d9a6', { rough: 0.4, clearcoat: 0.6, sheen: 0.5, bump: 1.4, bumpKind: 'cells', side: THREE.BackSide });
  const rimM = organic('#e48f95', { rough: 0.35, clearcoat: 0.8, bump: 0 });
  for (const p of centers) {
    const r = 0.21 + rnd() * 0.04;
    const hemi = new THREE.SphereGeometry(r, 44, 30, Math.PI, Math.PI); // z ≤ 0 → terbuka ke depan
    const o = mesh(hemi, outer, 'alveolus', { shadow: false });
    const i = mesh(hemi.clone().scale(0.93, 0.93, 0.93), innerM, 'alveolus', { shadow: false });
    const rim = mesh(new THREE.TorusGeometry(r * 0.965, r * 0.045, 8, 48), rimM, 'alveolus', { shadow: false });
    for (const m of [o, i, rim]) { m.position.copy(p); g.add(m); }
  }
  // gerombolan alveolus utuh di belakang (seperti buah anggur)
  const grape = organic('#a5485f', { rough: 0.35, clearcoat: 0.9, sheen: 0.8, bump: 1.2, bumpKind: 'cells' });
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, rr = 0.2 + rnd() * 0.4;
    const s = mesh(new THREE.SphereGeometry(0.15 + rnd() * 0.06, 28, 20), grape, 'alveolus', { shadow: false });
    s.position.set(Math.cos(a) * rr, Math.sin(a) * rr - 0.05, -0.3 - rnd() * 0.2);
    g.add(s);
  }
  // panah O₂ (masuk ke darah) & CO₂ (keluar ke alveolus)
  const arrow = (from, to, color) => {
    const d = to.clone().sub(from), len = d.length();
    const a = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: color, emissiveIntensity: 0.25 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len * 0.75, 16), m);
    shaft.position.y = len * 0.375;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.055, len * 0.25, 20), m);
    head.position.y = len * 0.875;
    a.add(shaft, head);
    a.position.copy(from);
    a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    a.traverse((o) => { o.userData.noPick = true; });
    g.add(a);
  };
  arrow(new THREE.Vector3(-0.32, 0.1, 0.12), new THREE.Vector3(0.36, 0.26, 0.12), '#e2453b');
  arrow(new THREE.Vector3(0.36, 0.06, 0.16), new THREE.Vector3(-0.32, -0.1, 0.16), '#3b8be2');
  // bronkiolus terminal
  const br = curve([[0, 0.25, 0], [0.05, 0.6, 0.05], [0.0, 0.95, -0.02]]);
  g.add(mesh(taperTube(br, 0.11, 0.13, 24, 16), organic('#f3ddd0', { rough: 0.4, clearcoat: 0.6 }), 'bronkiolus'));
  // jaring kapiler: biru (CO₂ tinggi) → merah (O₂ tinggi)
  const capGeos = [];
  for (let i = 0; i < 16; i++) {
    const a = centers[Math.floor(rnd() * centers.length)], b = centers[Math.floor(rnd() * centers.length)];
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const p = a.clone().lerp(b, t);
      const out = p.clone().sub(C).normalize();
      p.addScaledVector(out, 0.2 + 0.03 * Math.sin(k * 2 + i));
      p.add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.08));
      p.z = Math.min(p.z, -0.04) - 0.05; // kapiler melilit di sisi belakang, rongga depan tetap terlihat
      pts.push(p);
    }
    capGeos.push(gradientAlong(taperTube(curve(pts), 0.016, 0.016, 40, 6), '#3f5fc4', '#d7343f'));
  }
  const cap = mesh(merge(capGeos), organic('#ffffff', { vertexColors: true, rough: 0.35, clearcoat: 0.6, bump: 0 }), 'kapiler-alveolus');
  g.add(cap);
  // partikel CO₂ (abu) keluar dari kapiler → alveolus → bronkiolus
  const n = 26;
  const pGeo = new THREE.SphereGeometry(0.022, 8, 6);
  const co2 = new THREE.InstancedMesh(pGeo, new THREE.MeshStandardMaterial({ color: '#8d93a6', roughness: 0.4, emissive: '#2b2f3a' }), n);
  const o2 = new THREE.InstancedMesh(pGeo, new THREE.MeshStandardMaterial({ color: '#ff5a5f', roughness: 0.4, emissive: '#5a1014' }), n);
  co2.userData.noPick = o2.userData.noPick = true;
  const seeds = Array.from({ length: n }, () => ({ c: centers[Math.floor(rnd() * centers.length)].clone(), o: rnd(), dir: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize() }));
  g.add(co2, o2);
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3();
  const update = (t) => {
    seeds.forEach((s, i) => {
      const u = (t * 0.18 + s.o) % 1;
      // CO₂: dari luar (kapiler) → pusat alveolus → naik ke bronkiolus
      if (u < 0.5) p.copy(s.c).addScaledVector(s.dir, 0.32 * (1 - u * 2));
      else p.copy(s.c).lerp(new THREE.Vector3(0, 1.0, 0), (u - 0.5) * 2);
      m4.makeTranslation(p.x, p.y, p.z);
      co2.setMatrixAt(i, m4);
      // O₂: arah sebaliknya
      const w = (t * 0.18 + s.o + 0.5) % 1;
      if (w < 0.5) p.set(0, 1.0, 0).lerp(s.c, w * 2);
      else p.copy(s.c).addScaledVector(s.dir, 0.32 * (w - 0.5) * 2);
      m4.makeTranslation(p.x, p.y, p.z);
      o2.setMatrixAt(i, m4);
    });
    co2.instanceMatrix.needsUpdate = o2.instanceMatrix.needsUpdate = true;
  };
  // cincin lensa perbesaran
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.008, 8, 96), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }));
  ring.userData.noPick = true;
  ring.userData.billboard = true;
  g.add(ring);
  return { group: g, update, ring };
}

export function buildLungs() {
  const rnd = seeded(42);
  const group = new THREE.Group();
  const chest = new THREE.Group();
  group.add(chest);

  const lungR = buildLung(-1);
  const lungL = buildLung(1);
  const airways = buildAirways(rnd);
  const vessels = buildVessels();
  const diaphragm = buildDiaphragm();
  chest.add(airways, vessels, lungR, lungL, diaphragm);

  const inset = buildAlveolusInset(rnd);
  inset.group.position.set(2.6, 0.35, 0.2);
  inset.group.scale.setScalar(0.95);
  group.add(inset.group);

  const lungMats = [lungR.material, lungL.material];
  let inner = true;
  const setInner = (on) => {
    inner = on;
    for (const m of lungMats) {
      m.opacity = on ? 0.33 : 1;
      m.transparent = on;
      m.depthWrite = !on;
      m.userData.baseOpacity = m.opacity;
      m.needsUpdate = true;
    }
  };
  setInner(false);

  const anchors = {
    trakea: new THREE.Vector3(0, 2.0, 0.17),
    bronkus: new THREE.Vector3(-0.32, 0.85, 0.12),
    bronkiolus: new THREE.Vector3(1.05, -0.35, 0.3),
    'lobus-atas-kanan': new THREE.Vector3(-1.4, 0.75, 0.5),
    'lobus-tengah-kanan': new THREE.Vector3(-1.4, -0.3, 0.62),
    'lobus-bawah-kanan': new THREE.Vector3(-1.55, -0.75, -0.35),
    'lobus-atas-kiri': new THREE.Vector3(1.4, 0.7, 0.5),
    'lobus-bawah-kiri': new THREE.Vector3(1.58, -0.8, -0.3),
    diafragma: new THREE.Vector3(0, -1.32, 0.95),
    'arteri-pulmonalis': new THREE.Vector3(0.12, 0.6, 0.45),
    'vena-pulmonalis': new THREE.Vector3(-0.3, 0.3, 0.22),
    alveolus: new THREE.Vector3(2.6, 0.75, 0.55),
    'kapiler-alveolus': new THREE.Vector3(3.0, 0.05, 0.45),
  };
  // anchor yang ikut bernapas
  const chestAnchors = new Set(Object.keys(anchors).filter((k) => !['alveolus', 'kapiler-alveolus'].includes(k)));

  return {
    group,
    anchors,
    anchorParent: (id) => (chestAnchors.has(id) ? chest : group),
    innerLabel: ['Transparan', 'Utuh'],
    setInner,
    getInner: () => inner,
    frame: { center: new THREE.Vector3(0.7, 0.3, 0), radius: 3.15 },
    insetBillboard: inset.ring,
    update(t) {
      const s = Math.sin(t * 1.25);
      const k = 1 + 0.022 * s;
      lungR.scale.set(k, 1 + 0.03 * s, k);
      lungL.scale.copy(lungR.scale);
      diaphragm.position.y = -0.03 - 0.06 * s;
      inset.update(t);
    },
  };
}
