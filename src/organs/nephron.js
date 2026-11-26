import * as THREE from 'three';
import { Section } from '../scene/section.js';
import { organic, curve, taperTube, mesh, merge, gradientAlong } from '../scene/helpers.js';
import { seeded } from '../scene/noise.js';

// Model nefron mengikuti tata letak diagram buku/3D umum:
// kapsul Bowman + tubulus proksimal berkelok di kiri atas, lengkung Henle panjang (U),
// tubulus distal berkelok di kanan atas, tubulus kolektivus lurus di kanan,
// pembuluh darah dengan kapiler "anak tangga" di sekitar lengkung Henle.
// Koordinat ditulis dalam piksel gambar acuan lalu diubah ke satuan 3D.
const P = (x, y, z = 0) => new THREE.Vector3((x - 180) / 90, (300 - y) / 90, z);
const path = (pts, tension = 0.5) => curve(pts.map(([x, y, z]) => P(x, y, z || 0)), false, tension);

/** Partikel bergerak pelan sepanjang lintasan, warnanya berubah sesuai posisi. */
function flow(pathCurve, n, size, colors, speed) {
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.3, emissive: '#2a1a00', emissiveIntensity: 0.4 }), n);
  inst.userData.noPick = true;
  const cs = colors.map((c) => new THREE.Color(c));
  const col = new THREE.Color(), m4 = new THREE.Matrix4();
  const colorAt = (u) => {
    const f = u * (cs.length - 1), i = Math.min(cs.length - 2, Math.floor(f));
    return col.copy(cs[i]).lerp(cs[i + 1], f - i);
  };
  return {
    mesh: inst,
    update(t) {
      for (let i = 0; i < n; i++) {
        const u = (t * speed + i / n) % 1;
        const p = pathCurve.getPointAt(u);
        m4.makeTranslation(p.x, p.y, p.z);
        inst.setMatrixAt(i, m4);
        inst.setColorAt(i, colorAt(u));
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.instanceColor.needsUpdate = true;
    },
  };
}

/** Partikel berpindah antara tubulus dan pembuluh (filtrasi / reabsorpsi / augmentasi). */
function transfer(pairs, size, color, speed) {
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 10, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.35 }), pairs.length);
  inst.userData.noPick = true;
  const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  return {
    mesh: inst,
    update(t) {
      pairs.forEach(([a, b], i) => {
        const u = (t * speed + i * 0.37) % 1;
        const k = Math.sin(Math.PI * u); // muncul → bergerak → menghilang
        p.copy(a).lerp(b, u);
        m4.compose(p, q, s.setScalar(Math.max(0.001, k)));
        inst.setMatrixAt(i, m4);
      });
      inst.instanceMatrix.needsUpdate = true;
    },
  };
}

export function buildNephron() {
  const rnd = seeded(77);
  const group = new THREE.Group();
  const gold = (c = '#d98a26') => organic(c, { rough: 0.34, clearcoat: 0.8, clearcoatRough: 0.25, sheen: 0.2, bump: 0.5, bumpKind: 'fine' });
  const vessel = (c) => organic(c, { rough: 0.3, clearcoat: 0.85, bump: 0 });
  const tubules = [];
  const addT = (m) => { tubules.push(m); group.add(m); return m; };
  const R = 0.085, THIN = 0.048; // jari-jari tubulus tebal & tipis

  // ---------- Kapsul Bowman + glomerulus ----------
  const C = P(128, 150);
  const capR = 0.3;
  const open = new THREE.Vector3(1, 0.25, 0).normalize(); // kutub vaskular menghadap kanan (tempat arteriol)
  const capMat = gold('#dc9430');
  const cupGeo = new THREE.SphereGeometry(capR, 64, 40, 0, Math.PI * 2, 0.62, Math.PI - 0.62);
  const cup = mesh(cupGeo, capMat, 'kapsul-bowman');
  cup.position.copy(C);
  cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), open);
  const lipR = capR * Math.sin(0.62);
  const lip = mesh(new THREE.TorusGeometry(lipR, 0.028, 12, 48), capMat, 'kapsul-bowman');
  lip.position.copy(C).addScaledVector(open, capR * Math.cos(0.62));
  lip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), open);
  group.add(cup, lip);
  // glomerulus: lengkung-lengkung kapiler merah memancar dari kutub vaskular
  const gIn = C.clone().addScaledVector(open, capR * 0.95).add(new THREE.Vector3(0, 0.03, 0));
  const gOut = C.clone().addScaledVector(open, capR * 0.95).add(new THREE.Vector3(0, -0.05, 0.02));
  const gGeos = [];
  const loops = [];
  for (let l = 0; l < 9; l++) {
    const a = (l / 9) * Math.PI * 2;
    const tip = C.clone().add(new THREE.Vector3(-0.05 + Math.cos(a) * 0.1, Math.sin(a) * 0.17, Math.sin(a * 2) * 0.12));
    const c = curve([gIn, gIn.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, 0.04, 0.03)), tip, gOut.clone().lerp(tip, 0.5).add(new THREE.Vector3(0, -0.04, -0.03)), gOut]);
    loops.push(c);
    gGeos.push(taperTube(c, 0.026, 0.026, 60, 8));
  }
  group.add(mesh(merge(gGeos), organic('#c5262f', { rough: 0.3, clearcoat: 0.9, bump: 0 }), 'glomerulus'));

  // ---------- Tubulus kontortus proksimal (berkelok di kiri atas) ----------
  const pct = path([[106, 136], [92, 116], [80, 92], [86, 66], [106, 58], [118, 78], [132, 60], [148, 46], [162, 62], [152, 86], [130, 100], [104, 112], [96, 140], [100, 170], [112, 196]]);
  addT(mesh(taperTube(pct, R, R, 300, 16), gold(), 'tubulus-proksimal'));

  // ---------- Lengkung Henle ----------
  const desc = path([[112, 196], [114, 290], [115, 400], [116, 520]]);
  const tDesc = 0.3; // bagian tebal → tipis
  addT(mesh(taperTube(desc, (t) => (t < tDesc ? R : t < tDesc + 0.03 ? R - (R - THIN) * ((t - tDesc) / 0.03) : THIN), 0, 140, 14), gold(), 'bagian-menurun'));
  const loop = path([[116, 520], [122, 545], [145, 552], [168, 545], [174, 520]]);
  addT(mesh(taperTube(loop, THIN, THIN, 40, 14), gold(), 'lengkung-henle'));
  const asc = path([[174, 520], [175, 420], [175, 300], [174, 205]]);
  const tAsc = 0.45; // tipis → tebal (bagian menaik tebal)
  addT(mesh(taperTube(asc, (t) => (t < tAsc ? THIN : t < tAsc + 0.03 ? THIN + (R - THIN) * ((t - tAsc) / 0.03) : R), 0, 140, 14), gold(), 'bagian-menaik'));

  // ---------- Tubulus kontortus distal (berkelok di kanan atas, menyentuh kutub vaskular) ----------
  const dct = path([[174, 205], [170, 180], [158, 165], [170, 140], [192, 122], [184, 92], [174, 66], [192, 46], [214, 56], [210, 84], [226, 102], [242, 86], [236, 60], [250, 46], [262, 70]]);
  addT(mesh(taperTube(dct, R, R, 300, 16), gold(), 'tubulus-distal'));

  // ---------- Tubulus kolektivus (pengumpul) + cabang dari nefron lain ----------
  const cd = path([[262, 30], [262, 300], [262, 560]]);
  const CDR = 0.1;
  addT(mesh(taperTube(cd, CDR, CDR * 1.1, 120, 18), gold(), 'tubulus-kolektivus'));
  const branches = [
    taperTube(path([[262, 240], [285, 228], [305, 222]]), 0.07, 0.065, 24, 12),
    taperTube(path([[262, 410], [245, 400], [230, 398]]), 0.07, 0.065, 24, 12),
    taperTube(path([[262, 480], [285, 470], [300, 452]]), 0.07, 0.065, 24, 12),
  ];
  addT(mesh(merge(branches), gold(), 'tubulus-kolektivus'));

  // ---------- Pembuluh darah ----------
  // Arteriol aferen: masuk dari atas menuju glomerulus (darah kotor, merah)
  const aff = curve([P(166, 18, 0.05), P(166, 90, 0.08), P(164, 128, 0.1), gIn]);
  group.add(mesh(taperTube(aff, 0.03, 0.03, 60, 10), vessel('#c8222c'), 'arteriol-aferen'));
  // Arteriol eferen: keluar dari glomerulus lalu turun di sisi lengkung Henle bagian menaik
  const eff = curve([gOut, P(170, 168, 0.12), P(188, 180, 0.12), P(190, 260, 0.1), P(190, 400, 0.1), P(188, 500, 0.08), P(176, 528, 0.12)]);
  group.add(mesh(taperTube(eff, 0.026, 0.026, 140, 10), vessel('#c42530'), 'arteriol-eferen'));
  // kapiler di bawah lengkung (merah → biru) menyambung ke pembuluh balik
  const bottom = curve([P(176, 528, 0.12), P(150, 538, 0.14), P(118, 530, 0.12), P(100, 505, 0.1)]);
  // Pembuluh balik (venula): naik di sisi kiri menuju atas (darah bersih, biru)
  const ven = curve([P(100, 505, 0.1), P(96, 400, 0.1), P(95, 260, 0.08), P(94, 120, 0.06), P(93, 18, 0.04)]);
  group.add(mesh(taperTube(ven, 0.03, 0.03, 120, 10), vessel('#2e4fbf'), 'venula'));
  // anak tangga kapiler peritubulus (menyilang di depan/belakang tubulus)
  const capGeos = [gradientAlong(taperTube(bottom, 0.026, 0.026, 40, 8), '#c42530', '#3a4fbf')];
  const rungYs = [250, 300, 340, 395, 440, 480];
  const rungs = [];
  rungYs.forEach((y, i) => {
    const zz = i % 2 ? 0.16 : -0.16;
    const a = eff.getPointAt(Math.min(0.98, 0.18 + (y - 200) / 360));
    const b = ven.getPointAt(Math.max(0.02, 1 - (y - 18) / 487));
    const c = curve([a, P(166, y + 6, zz), P(145, y + 14, zz * 1.2), P(122, y + 8, zz), b]);
    rungs.push(c);
    capGeos.push(gradientAlong(taperTube(c, 0.02, 0.02, 40, 8), '#c42530', '#3a4fbf'));
  });
  group.add(mesh(merge(capGeos), organic('#ffffff', { vertexColors: true, rough: 0.3, clearcoat: 0.85, bump: 0 }), 'kapiler-peritubulus'));

  // ---------- Animasi proses (pelan) ----------
  // 1) Darah: arteriol aferen → glomerulus → arteriol eferen → kapiler → pembuluh balik
  const bPts = [];
  const sb = (c, n) => { for (let i = 0; i <= n; i++) bPts.push(c.getPointAt(i / n)); };
  sb(aff, 16); sb(loops[2], 14); sb(eff, 50); sb(bottom, 10); sb(ven, 40);
  const blood = flow(new THREE.CatmullRomCurve3(bPts), 36, 0.034, ['#e2343c', '#d8303f', '#b03a6a', '#3a55c4', '#3050c0'], 0.012);
  // 2) Filtrat → urine: kapsul (filtrasi) → proksimal (urine primer) → Henle → distal (urine sekunder → sesungguhnya) → kolektivus (turun)
  const fPts = [C.clone()];
  const sf = (c, n, a = 0, b = 1) => { for (let i = 0; i <= n; i++) fPts.push(c.getPointAt(a + (b - a) * (i / n))); };
  sf(pct, 90); sf(desc, 40); sf(loop, 10); sf(asc, 40); sf(dct, 90); sf(cd, 40, 0.15, 1);
  const urine = flow(new THREE.CatmullRomCurve3(fPts), 70, 0.04, ['#fff7d6', '#fff1a8', '#ffe066', '#f5c518', '#e09a00'], 0.009);
  // 3) Filtrasi: zat keluar dari glomerulus ke ruang kapsul
  const filtPairs = loops.slice(0, 6).map((c) => [c.getPointAt(0.5), C.clone().add(new THREE.Vector3(-0.2, (rnd() - 0.5) * 0.2, 0))]);
  const filtration = transfer(filtPairs, 0.028, '#ffe98a', 0.08);
  // 4) Reabsorpsi: air & zat berguna kembali dari tubulus ke darah (bagian menurun → pembuluh balik, proksimal → kapiler)
  const reabPairs = [
    ...[0.35, 0.5, 0.65, 0.8].map((t) => [desc.getPointAt(t), ven.getPointAt(1 - (0.35 + t * 0.55))]),
    ...[0.75, 0.85, 0.95].map((t) => [pct.getPointAt(t), P(100, 150 + t * 40, 0.15)]),
  ];
  const reabsorption = transfer(reabPairs, 0.026, '#5ec8f0', 0.06);
  // 5) Augmentasi: zat sisa dari darah (eferen) ditambahkan ke tubulus distal
  const augPairs = [0.05, 0.12, 0.2].map((t) => [eff.getPointAt(t), dct.getPointAt(t + 0.02)]);
  const augmentation = transfer(augPairs, 0.026, '#b84bd8', 0.05);
  for (const a of [blood, urine, filtration, reabsorption, augmentation]) group.add(a.mesh);

  // ---------- Penampang: tubulus & kapsul dibelah (z = 0) → aliran urine di dalamnya terlihat ----------
  const section = new Section(group, new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), { size: 9 });
  section.clip(cup, lip, tubules);
  let inner = true;
  const setInner = (on) => { inner = on; section.setEnabled(on); };
  setInner(true);

  const anchors = {
    'arteriol-aferen': aff.getPointAt(0.25),
    'arteriol-eferen': eff.getPointAt(0.12),
    'tubulus-proksimal': pct.getPointAt(0.18),
    'kapsul-bowman': C.clone().add(new THREE.Vector3(-0.22, -0.18, 0.1)),
    glomerulus: C.clone().add(new THREE.Vector3(0.02, 0.06, 0.12)),
    'tubulus-distal': dct.getPointAt(0.78),
    'bagian-menurun': desc.getPointAt(0.55),
    'bagian-menaik': asc.getPointAt(0.35),
    'lengkung-henle': loop.getPointAt(0.5),
    'tubulus-kolektivus': cd.getPointAt(0.72),
    'kapiler-peritubulus': rungs[3].getPointAt(0.5),
    venula: ven.getPointAt(0.55),
  };

  return {
    group,
    anchors,
    section,
    innerLabel: ['Penampang', 'Utuh'],
    setInner,
    getInner: () => inner,
    frame: { center: P(178, 318), radius: 3.75, dir: new THREE.Vector3(0.12, 0.05, 1) },
    update(t) {
      blood.update(t);
      urine.update(t);
      filtration.update(t);
      reabsorption.update(t);
      augmentation.update(t);
    },
  };
}
