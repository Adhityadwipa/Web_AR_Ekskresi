import * as THREE from 'three';
import { Section } from '../scene/section.js';
import { spongeTexture } from '../scene/helpers.js';
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
  const hilumR = new THREE.Vector3(-0.58, 0.62, 0);
  const hilumL = new THREE.Vector3(0.7, 0.74, 0);
  const main = [
    { curve: new THREE.QuadraticBezierCurve3(carina, new THREE.Vector3(-0.22, 0.98, 0), hilumR), r0: 0.12, r1: 0.1, depth: 0 },
    { curve: new THREE.QuadraticBezierCurve3(carina, new THREE.Vector3(0.32, 1.08, 0), hilumL), r0: 0.115, r1: 0.095, depth: 0 },
  ];
  const bronchiMat = organic('#efe0cf', { rough: 0.42, clearcoat: 0.5, bump: 0.5, bumpKind: 'fine' });
  const bronchioleMat = organic('#f3cfc0', { rough: 0.4, clearcoat: 0.5, bump: 0.4, bumpKind: 'fine' });
  const mainMesh = mesh(treeGeometry(main, () => true, 16), bronchiMat, 'bronkus');
  g.add(mainMesh);

  // Pohon bronkus per paru, tepat di bidang potong (z = 0) agar terlihat utuh pada penampang.
  // Batas paru diambil dari garis tepi irisan paru (bukan elips kasar) → cabang tidak keluar dari paru.
  const outline = (side) => {
    const pts = [];
    for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; const v = new THREE.Vector3(Math.cos(a), Math.sin(a), 0); lungPoint(v, side); pts.push(new THREE.Vector2(v.x * 0.84 + side * LUNG_X, v.y * 0.9 - 0.02)); }
    return pts;
  };
  const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
  const polys = { [-1]: outline(-1), 1: outline(1) };
  const flat = (side) => (p) => inPoly(polys[side], p.x, p.y);
  const trees = {};
  for (const [side, hil, dirs] of [
    [-1, hilumR, [new THREE.Vector3(-0.35, 1, 0.02), new THREE.Vector3(-1, -0.15, 0.02), new THREE.Vector3(-0.15, -1, -0.02)]],
    [1, hilumL, [new THREE.Vector3(0.4, 0.9, 0.02), new THREE.Vector3(0.2, -1, -0.02)]],
  ]) {
    const segs = [];
    const tips = [];
    for (const d of dirs) branchTree({ tips, start: hil, dir: d, len: 0.38, radius: 0.07, depth: 1, maxDepth: 6, rnd, inside: flat(side), spread: 0.5, shrink: 0.8, rshrink: 0.72, out: segs, planar: true });
    // ratakan ke bidang z = 0 (cabang berada di bidang irisan)
    for (const sg of segs) for (const k of ['v0', 'v1', 'v2']) if (sg.curve[k]) sg.curve[k].z = 0;
    const big = mesh(treeGeometry(segs, (x) => x.depth <= 2, 14), bronchiMat.clone(), 'bronkus');
    const small = mesh(treeGeometry(segs, (x) => x.depth > 2, 8), bronchioleMat.clone(), 'bronkiolus');
    big.visible = small.visible = false; // hanya tampak saat penampang
    g.add(big, small);
    // kantong alveolus kecil di ujung bronkiolus (tampak pada irisan, bisa diklik)
    const alv = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 12, 10), organic('#f2a3a6', { rough: 0.35, clearcoat: 0.7, bump: 0 }), tips.length * 5);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (const tp of tips) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; m4.makeTranslation(tp.p.x + tp.d.x * 0.03 + Math.cos(a) * 0.03, tp.p.y + tp.d.y * 0.03 + Math.sin(a) * 0.03, 0); alv.setMatrixAt(k++, m4); }
    part(alv, 'alveolus');
    alv.visible = false;
    g.add(alv);
    const deep = segs.filter((x) => x.depth >= 3).map((x) => x.curve.getPoint(0.5)).sort((u, v) => Math.abs(u.z) - Math.abs(v.z) || Math.abs(v.x) - Math.abs(u.x))[0];
    trees[side] = { big, small, deep, alv, tip: tips[Math.floor(tips.length / 2)]?.p };
  }
  return { group: g, trachea: [rings, tube, larynx], main: mainMesh, trees, carina, hilumR, hilumL };
}

function buildVessels() {
  const g = new THREE.Group();
  const blue = organic('#4f74c9', { rough: 0.35, clearcoat: 0.7, bump: 0.4 });
  const red = organic('#c8363f', { rough: 0.35, clearcoat: 0.7, bump: 0.4 });
  // Arteri pulmonalis (darah kaya CO₂) & vena pulmonalis (kaya O₂) menuju hilus paru
  const trunk = curve([[0.12, 0.1, 0.02], [0.12, 0.6, 0.02], [0.06, 0.9, 0.0]]);
  g.add(mesh(taperTube(trunk, 0.12, 0.11, 24, 16), blue, 'arteri-pulmonalis'));
  const arts = [
    curve([[0.06, 0.9, 0.0], [-0.25, 0.84, 0.0], [-0.45, 0.72, 0.0], [-0.62, 0.55, 0.0]]),
    curve([[0.06, 0.9, 0.0], [0.35, 0.88, 0.0], [0.58, 0.8, 0.0], [0.74, 0.62, 0.0]]),
  ];
  for (const c of arts) g.add(mesh(taperTube(c, 0.085, 0.06, 32, 14), blue, 'arteri-pulmonalis'));
  const veins = [
    [[-0.6, 0.42, 0.0], [-0.38, 0.32, 0.0], [-0.1, 0.24, 0.0]],
    [[-0.6, 0.16, 0.0], [-0.38, 0.18, 0.0], [-0.1, 0.2, 0.0]],
    [[0.66, 0.5, 0.0], [0.42, 0.36, 0.0], [0.14, 0.26, 0.0]],
    [[0.66, 0.24, 0.0], [0.42, 0.22, 0.0], [0.14, 0.2, 0.0]],
  ];
  for (const p of veins) g.add(mesh(taperTube(curve(p), 0.055, 0.07, 24, 12), red, 'vena-pulmonalis'));
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
      p.z = Math.min(p.z, -0.26) - 0.03; // kapiler melilit di sisi luar-belakang kantong, rongga depan tetap terlihat
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
      const u = (t * 0.05 + s.o) % 1; // CO₂: kapiler → alveolus → bronkiolus (dihembuskan)
      // CO₂: dari luar (kapiler) → pusat alveolus → naik ke bronkiolus
      if (u < 0.5) p.copy(s.c).addScaledVector(s.dir, 0.32 * (1 - u * 2));
      else p.copy(s.c).lerp(new THREE.Vector3(0, 1.0, 0), (u - 0.5) * 2);
      m4.makeTranslation(p.x, p.y, p.z);
      co2.setMatrixAt(i, m4);
      // O₂: arah sebaliknya
      const w = (t * 0.05 + s.o + 0.5) % 1; // O₂: bronkiolus → alveolus → kapiler
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
  const air = buildAirways(rnd);
  const vessels = buildVessels();
  const diaphragm = buildDiaphragm();
  chest.add(air.group, vessels, lungR, lungL, diaphragm);

  const inset = buildAlveolusInset(rnd);
  inset.group.position.set(2.45, 0.35, 0.2);
  inset.group.visible = false; // perbesaran hanya muncul saat alveolus dipilih
  inset.group.scale.setScalar(0.95);
  group.add(inset.group);

  // ---- Penampang: paru dibelah pada bidang frontal (z = 0), separuh depan dibuang ----
  const section = new Section(chest, new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), { size: 6 });
  const sponge = () => new THREE.MeshStandardMaterial({ map: spongeTexture(), roughness: 0.75, bumpMap: spongeTexture(), bumpScale: 2 });
  section.cap(lungR, sponge(), [air.trees[-1].big, air.trees[-1].small]);
  section.cap(lungL, sponge(), [air.trees[1].big, air.trees[1].small]);
  section.clip(air.trachea, air.main, vessels);

  let inner = true;
  const setInner = (on) => {
    inner = on;
    for (const t of Object.values(air.trees)) t.big.visible = t.small.visible = t.alv.visible = on;
    section.setEnabled(on);
  };
  setInner(true);

  // titik label di tepi lateral (bidang z = 0) → tepat di permukaan pada kedua mode
  const edge = (side, y) => { const v = new THREE.Vector3(side, y, 0).normalize(); lungPoint(v, side); return v.multiplyScalar(1.01).add(new THREE.Vector3(side * LUNG_X, 0, 0)); };
  const anchors = {
    trakea: new THREE.Vector3(0.16, 1.85, 0),
    bronkus: new THREE.QuadraticBezierCurve3(air.carina, new THREE.Vector3(0.32, 1.08, 0), air.hilumL).getPoint(0.55),
    bronkiolus: air.trees[-1].deep.clone(),
    'lobus-atas-kanan': edge(-1, 0.8),
    'lobus-tengah-kanan': edge(-1, 0.02),
    'lobus-bawah-kanan': edge(-1, -0.6),
    'lobus-atas-kiri': edge(1, 0.6),
    'lobus-bawah-kiri': edge(1, -0.6),
    diafragma: new THREE.Vector3(0, -1.32, 0.95),
    'arteri-pulmonalis': new THREE.Vector3(0.12, 0.45, 0),
    'vena-pulmonalis': new THREE.Vector3(-0.3, 0.27, 0),
    alveolus: (air.trees[1].tip || new THREE.Vector3(1.2, -0.3, 0)).clone(),
    'kapiler-alveolus': new THREE.Vector3(2.85, 0.05, 0.45),
  };
  // anchor yang ikut bernapas
  const chestAnchors = new Set(Object.keys(anchors).filter((k) => k !== 'kapiler-alveolus'));

  return {
    group,
    anchors,
    section,
    innerOnly: ['bronkiolus', 'alveolus'],
    pinVisible: (id) => id !== 'kapiler-alveolus' || inset.group.visible,
    onSelect(pid) {
      const show = pid === 'alveolus' || pid === 'kapiler-alveolus';
      const was = inset.group.visible;
      inset.group.visible = show;
      if (show) return { focusPin: 'kapiler-alveolus' };
      return was ? { reframe: true } : null;
    },
    anchorParent: (id) => (chestAnchors.has(id) ? chest : group),
    innerLabel: ['Penampang', 'Utuh'],
    setInner,
    getInner: () => inner,
    frame: { center: new THREE.Vector3(0.05, 0.3, 0), radius: 2.75 },
    insetBillboard: inset.ring,
    update(t) {
      const s = Math.sin(t * 0.6); // ±10 detik per napas: mengembang = diafragma turun (inspirasi)
      const k = 1 + 0.022 * s;
      lungR.scale.set(k, 1 + 0.03 * s, k);
      lungL.scale.copy(lungR.scale);
      diaphragm.position.y = -0.03 - 0.06 * s;
      inset.update(t);
    },
  };
}
