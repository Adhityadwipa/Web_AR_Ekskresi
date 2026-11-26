import * as THREE from 'three';
import { Section } from '../scene/section.js';
import { organic, deform, curve, taperTube, mesh, merge, stripeTexture, speckleTexture } from '../scene/helpers.js';
import { fbm, smoothstep } from '../scene/noise.js';

/** Bentuk kacang ginjal. Hilum menghadap sumbu -x (medial). */
function kidneyPoint(v) {
  const { x, y, z } = v;
  const n = 1 + 0.018 * fbm(x * 3 + 7, y * 3, z * 3, 3);
  let X = x * 0.6, Y = y * 1.0, Z = z * 0.42;
  const h = Math.exp(-(y * y) / 0.1) * smoothstep(0.1, -0.85, x);
  X += 0.3 * h;
  Z *= 1 - 0.35 * h;
  v.set(X * n, Y * n, Z * n);
}

function outlinePoints(steps = 160) {
  const pts = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    v.set(Math.cos(a), Math.sin(a), 0);
    kidneyPoint(v);
    pts.push(new THREE.Vector2(v.x, v.y));
  }
  return pts;
}

function shapeFrom(pts, scale = 1, center = new THREE.Vector2(0, 0)) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => {
    const q = p.clone().sub(center).multiplyScalar(scale).add(center);
    i ? s.lineTo(q.x, q.y) : s.moveTo(q.x, q.y);
  });
  s.closePath();
  return s;
}

/** Bentuk 2D yang ditonjolkan (bevel) agar penampang tampak 3D seperti model peraga. */
function raised(shape, mat, partId, z, h = 0.03, bevel = 0.018) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: h, bevelSize: bevel, bevelSegments: 5, curveSegments: 22 });
  const m = mesh(g, mat, partId, { shadow: false });
  m.position.z = z;
  return m;
}

function flat(shapeOrGeo, mat, partId, z) {
  const g = shapeOrGeo.isBufferGeometry ? shapeOrGeo : new THREE.ShapeGeometry(shapeOrGeo, 24);
  const m = mesh(g, mat, partId, { shadow: false });
  m.position.z = z;
  return m;
}

function ellipse(cx, cy, rx, ry, rot = 0) {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, rot);
  return s;
}

function capsule2D(a, b, w) {
  const d = b.clone().sub(a);
  const n = new THREE.Vector2(-d.y, d.x).normalize().multiplyScalar(w / 2);
  const s = new THREE.Shape();
  s.moveTo(a.x + n.x, a.y + n.y);
  s.lineTo(b.x + n.x, b.y + n.y);
  s.lineTo(b.x - n.x, b.y - n.y);
  s.lineTo(a.x - n.x, a.y - n.y);
  s.closePath();
  return s;
}

/** Satu ginjal lengkap dengan penampang membujur. */
function buildKidney() {
  const g = new THREE.Group();
  const shellMat = organic('#7a2c22', { rough: 0.33, clearcoat: 0.85, clearcoatRough: 0.2, sheen: 0.4, bump: 1.3, side: THREE.DoubleSide });
  const back = mesh(deform(new THREE.SphereGeometry(1, 112, 80, Math.PI, Math.PI), kidneyPoint), shellMat, 'kapsul-ginjal');
  const front = mesh(deform(new THREE.SphereGeometry(1, 112, 80, 0, Math.PI), kidneyPoint), shellMat.clone(), 'kapsul-ginjal');
  g.add(back, front);

  // ---- Penampang (coronal section) ----
  const section = new THREE.Group();
  const out = outlinePoints();
  const C = new THREE.Vector2(-0.14, 0);
  section.add(flat(shapeFrom(out, 1), new THREE.MeshStandardMaterial({ color: '#5a1f18', roughness: 0.5 }), 'kapsul-ginjal', 0.001));
  const cortexMat = new THREE.MeshPhysicalMaterial({ map: speckleTexture('#8a3426', '#55180f', 1600, 'cortex'), roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35 });
  cortexMat.map.repeat.set(2.5, 2.5);
  section.add(flat(shapeFrom(out, 0.965, new THREE.Vector2(0.02, 0)), cortexMat, 'korteks', 0.002));
  section.add(flat(ellipse(-0.2, 0, 0.21, 0.36), new THREE.MeshStandardMaterial({ color: '#3d1510', roughness: 0.7 }), 'pelvis-renalis', 0.003)); // rongga sinus (gelap)

  // jarak dari C ke tepi pada arah tertentu
  const radiusAt = (ang) => {
    let best = 0, bestDiff = 9;
    for (const p of out) {
      const d = p.clone().sub(C);
      let diff = Math.abs(Math.atan2(d.y, d.x) - ang);
      diff = Math.min(diff, Math.PI * 2 - diff);
      if (diff < bestDiff) { bestDiff = diff; best = d.length(); }
    }
    return best;
  };

  const pyrTex = stripeTexture('#c4804f', '#965530', 46);
  pyrTex.repeat.set(1.6, 1);
  const pyrMat = new THREE.MeshPhysicalMaterial({ map: pyrTex, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.25, bumpMap: pyrTex, bumpScale: 0.6 });
  const pelvisMat = new THREE.MeshPhysicalMaterial({ color: '#dcae6e', roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25 });
  const angles = [-138, -100, -62, -22, 18, 58, 98, 138].map((d) => (d * Math.PI) / 180);
  const apexes = [];
  angles.forEach((a) => {
    const R = radiusAt(a);
    const dir = new THREE.Vector2(Math.cos(a), Math.sin(a));
    const apexD = 0.26, L = R * 0.8 - apexD;
    const hw = 0.3 * R * 0.8 * 0.5;
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(-hw * 0.5, L * 0.45, -hw, L);
    s.quadraticCurveTo(0, L * 1.1, hw, L);
    s.quadraticCurveTo(hw * 0.5, L * 0.45, 0, 0);
    const m = raised(s, pyrMat, 'medula', 0.006, 0.045, 0.012);
    const apex = C.clone().addScaledVector(dir, apexD);
    m.position.set(apex.x, apex.y, 0.006);
    m.rotation.z = a - Math.PI / 2;
    section.add(m);
    apexes.push({ apex, dir, a, R });
    // kaliks minor (mangkuk di ujung papila)
    section.add(raised(ellipse(apex.x - dir.x * 0.025, apex.y - dir.y * 0.025, 0.06, 0.042, a + Math.PI / 2), pelvisMat, 'pelvis-renalis', 0.005, 0.025, 0.012));
    // kaliks → pelvis
    section.add(raised(capsule2D(apex.clone().addScaledVector(dir, -0.03), new THREE.Vector2(-0.22, 0), 0.05), pelvisMat, 'pelvis-renalis', 0.0045, 0.025, 0.012));
  });
  section.add(raised(ellipse(-0.24, 0, 0.11, 0.19), pelvisMat, 'pelvis-renalis', 0.0046, 0.03, 0.015));
  section.add(raised(capsule2D(new THREE.Vector2(-0.24, -0.04), new THREE.Vector2(-0.42, -0.1), 0.1), pelvisMat, 'pelvis-renalis', 0.0046, 0.03, 0.015));

  // pembuluh di penampang: interlobaris → arkuata → interlobularis
  const artGeos = [], veinGeos = [];
  const at = (a, r, off = 0) => new THREE.Vector3(C.x + Math.cos(a + off) * r, C.y + Math.sin(a + off) * r, 0.035);
  for (let i = 0; i < apexes.length - 1; i++) {
    const a = (apexes[i].a + apexes[i + 1].a) / 2;
    const R = radiusAt(a);
    artGeos.push(taperTube(curve([at(a, 0.2, 0.03), at(a, R * 0.5, 0.03), at(a, R * 0.79, 0.02)]), 0.022, 0.015, 20, 8));
    veinGeos.push(taperTube(curve([at(a, 0.2, -0.03), at(a, R * 0.5, -0.03), at(a, R * 0.8, -0.02)]), 0.022, 0.016, 20, 8));
  }
  for (const p of apexes) {
    const pts = [], vts = [];
    for (let k = -4; k <= 4; k++) {
      const a = p.a + k * 0.085;
      const R = radiusAt(a) * 0.8;
      pts.push(at(a, R + 0.012));
      vts.push(at(a, R - 0.008));
      if (k % 2 === 0) {
        const Ro = radiusAt(a);
        artGeos.push(taperTube(curve([at(a, R + 0.012), at(a + 0.01, R + (Ro - R) * 0.5), at(a, Ro * 0.94)]), 0.007, 0.004, 10, 5));
      }
    }
    artGeos.push(taperTube(curve(pts), 0.014, 0.014, 30, 6));
    veinGeos.push(taperTube(curve(vts), 0.015, 0.015, 30, 6));
  }
  artGeos.push(taperTube(curve([[-0.42, 0.1, 0.04], [-0.25, 0.14, 0.045], [-0.12, 0.1, 0.035]]), 0.034, 0.022, 16, 10));
  veinGeos.push(taperTube(curve([[-0.42, 0.0, 0.04], [-0.26, -0.12, 0.045], [-0.12, -0.08, 0.035]]), 0.036, 0.024, 16, 10));
  const red = organic('#d1303a', { rough: 0.3, clearcoat: 0.8, bump: 0 });
  const blue = organic('#3f63c2', { rough: 0.3, clearcoat: 0.8, bump: 0 });
  section.add(mesh(merge(artGeos), red, 'arteri-renalis', { shadow: false }));
  section.add(mesh(merge(veinGeos), blue, 'vena-renalis', { shadow: false }));
  g.add(section);

  // kelenjar adrenal (anak ginjal)
  const adr = new THREE.ConeGeometry(0.42, 0.5, 4, 1);
  deform(adr, (v) => v.set(v.x * (1 + 0.1 * Math.sin(v.y * 9)), v.y, v.z * 0.4));
  const adrenal = mesh(adr, organic('#e2a443', { rough: 0.5, clearcoat: 0.3, bump: 1.4, bumpKind: 'fine' }), 'kelenjar-adrenal');
  adrenal.position.set(0.0, 1.13, -0.02);
  adrenal.rotation.z = 0.35;
  g.add(adrenal);

  return {
    group: g,
    front,
    section,
    hilum: new THREE.Vector3(-0.33, 0.06, 0),
    hilumV: new THREE.Vector3(-0.33, -0.02, 0.05),
    pelvisOut: new THREE.Vector3(-0.38, -0.12, -0.02),
    pyr: apexes[2],
  };
}

export function buildKidneys() {
  const group = new THREE.Group();
  const s = 0.96;
  const L = buildKidney(); // ginjal kiri → sisi kanan layar
  L.group.position.set(1.32, 0.62, 0);
  L.group.scale.setScalar(s);
  L.group.rotation.z = 0.16;
  const R = buildKidney(); // ginjal kanan (lebih rendah karena hati)
  R.group.position.set(-1.32, 0.36, 0);
  R.group.scale.set(-s, s, s);
  R.group.rotation.z = -0.16;
  group.add(L.group, R.group);
  group.updateMatrixWorld(true);

  const red = organic('#c9313b', { rough: 0.3, clearcoat: 0.8, bump: 0.5 });
  const blue = organic('#3b5fbf', { rough: 0.3, clearcoat: 0.8, bump: 0.5 });
  // aorta & vena kava inferior + percabangan iliaka
  const AX = 0.12, VX = -0.17, Z = -0.22;
  group.add(mesh(taperTube(curve([[AX, 1.25, Z], [AX, 0.6, Z], [AX + 0.02, -0.75, Z], [AX + 0.02, -0.95, Z]]), 0.075, 0.068, 40, 20), red, 'aorta'));
  group.add(mesh(taperTube(curve([[VX, 1.25, Z], [VX, 0.6, Z], [VX - 0.02, -0.75, Z], [VX - 0.02, -0.95, Z]]), 0.085, 0.078, 40, 20), blue, 'vena-kava'));
  for (const sd of [-1, 1]) {
    group.add(mesh(taperTube(curve([[AX + 0.02, -0.92, Z], [AX + 0.02 + sd * 0.25, -1.3, Z], [AX + sd * 0.6, -1.75, Z - 0.05]]), 0.055, 0.045, 24, 12), red, 'aorta'));
    group.add(mesh(taperTube(curve([[VX - 0.02, -0.92, Z - 0.06], [VX + sd * 0.28, -1.3, Z - 0.08], [VX + sd * 0.62, -1.75, Z - 0.1]]), 0.06, 0.05, 24, 12), blue, 'vena-kava'));
  }

  const W = (k, v) => k.group.localToWorld(v.clone());
  const vesselsFor = (K, side) => {
    const h = W(K, K.hilum), hv = W(K, K.hilumV);
    const a0 = new THREE.Vector3(AX + side * 0.08, h.y + 0.05, Z + 0.02);
    const v0 = new THREE.Vector3(VX + (side > 0 ? 0.1 : -0.1), hv.y - 0.02, Z + 0.06);
    const art = curve([a0, a0.clone().lerp(h, 0.5).add(new THREE.Vector3(0, 0.04, -0.04)), h.clone().add(new THREE.Vector3(0, 0, -0.03))]);
    const vein = curve([v0, v0.clone().lerp(hv, 0.5).add(new THREE.Vector3(0, -0.02, 0.1)), hv]);
    group.add(mesh(taperTube(art, 0.055, 0.045, 32, 14), red, 'arteri-renalis'));
    group.add(mesh(taperTube(vein, 0.065, 0.055, 32, 14), blue, 'vena-renalis'));
    return { art, vein };
  };
  const vL = vesselsFor(L, 1);
  const vR = vesselsFor(R, -1);

  // ureter, kandung kemih, uretra
  const B = new THREE.Vector3(0, -2.02, 0.05);
  const ureterMat = organic('#d9a866', { rough: 0.3, clearcoat: 0.75, bump: 0.6, bumpKind: 'fine' });
  const ureterMeshes = [];
  const ureters = [L, R].map((K, i) => {
    const sd = i === 0 ? 1 : -1;
    const p0 = W(K, K.pelvisOut);
    const c = curve([p0, p0.clone().add(new THREE.Vector3(sd * -0.08, -0.35, 0.02)), new THREE.Vector3(sd * 0.75, -0.85, 0.08), new THREE.Vector3(sd * 0.55, -1.5, 0.08), new THREE.Vector3(sd * 0.28, -1.88, 0.05)]);
    const um0 = mesh(taperTube(c, 0.062, 0.05, 64, 14), ureterMat, 'ureter');
    ureterMeshes.push(um0);
    group.add(um0);
    return c;
  });

  const bladderGeo = deform(new THREE.SphereGeometry(0.46, 64, 48), (v) => {
    const y = v.y;
    v.x *= 1.1 - 0.25 * smoothstep(0, -0.46, y);
    v.z *= 0.95 - 0.2 * smoothstep(0, -0.46, y);
    if (y > 0.12) v.y = 0.12 + (y - 0.12) * 0.55;
  });
  const bladder = mesh(bladderGeo, organic('#d98f86', { rough: 0.4, clearcoat: 0.8, sheen: 0.5, bump: 1.6 }), 'kandung-kemih');
  bladder.position.copy(B);
  // isi urine: bangun tertutup (bagian bola + permukaan cairan) → bisa diberi tutup irisan
  const ug = new THREE.SphereGeometry(0.38, 48, 32, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58);
  const capG = new THREE.CircleGeometry(0.38 * Math.sin(Math.PI * 0.42), 48).rotateX(-Math.PI / 2).translate(0, 0.38 * Math.cos(Math.PI * 0.42), 0);
  const urine = mesh(merge([ug, capG]), new THREE.MeshPhysicalMaterial({ color: '#f2c94c', roughness: 0.15, clearcoat: 1 }), 'kandung-kemih', { shadow: false });
  urine.position.copy(B).add(new THREE.Vector3(0, -0.02, 0));
  urine.scale.set(1.05, 1, 0.9);
  urine.visible = false;
  group.add(bladder, urine);
  const urethra = curve([[0, -2.42, 0.06], [0, -2.7, 0.05], [0, -3.0, 0.05]]);
  const urethraMesh = mesh(taperTube(urethra, 0.055, 0.04, 24, 12), ureterMat, 'uretra');
  group.add(urethraMesh);
  // Penampang saluran kemih: kandung kemih, ureter & uretra dibelah pada z = 0.04
  const section = new Section(group, new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.04), { size: 8 });
  section.cap(urine, new THREE.MeshStandardMaterial({ color: '#f0c440', roughness: 0.3 }));
  section.clip(bladder, ureterMeshes, urethraMesh);

  // tetesan urine bergerak di ureter
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd84d', emissive: '#a07a00', emissiveIntensity: 0.5, roughness: 0.2 }), 12);
  drops.userData.noPick = true;
  group.add(drops);

  let inner = true;
  const setInner = (on) => {
    inner = on;
    for (const K of [L, R]) {
      K.front.visible = !on;
      K.section.visible = on;
    }
    urine.visible = drops.visible = on;
    section.setEnabled(on);
  };
  setInner(true);

  const anchors = {
    korteks: W(L, new THREE.Vector3(0.5, 0.42, 0.02)),
    medula: W(L, new THREE.Vector3(-0.14 + Math.cos(L.pyr.a) * 0.45, Math.sin(L.pyr.a) * 0.45, 0.02)),
    'pelvis-renalis': W(L, new THREE.Vector3(-0.22, 0.02, 0.02)),
    'kapsul-ginjal': W(R, new THREE.Vector3(0.55, -0.55, 0.12)),
    'kelenjar-adrenal': W(R, new THREE.Vector3(0.05, 1.2, 0.1)),
    'arteri-renalis': vR.art.getPointAt(0.45).add(new THREE.Vector3(0, 0.06, 0)),
    'vena-renalis': vL.vein.getPointAt(0.5).add(new THREE.Vector3(0, -0.05, 0.05)),
    aorta: new THREE.Vector3(AX, 1.1, Z + 0.1),
    'vena-kava': new THREE.Vector3(VX, 0.98, Z + 0.1),
    ureter: ureters[1].getPointAt(0.55),
    'kandung-kemih': B.clone().add(new THREE.Vector3(0.3, 0.1, 0.3)),
    uretra: urethra.getPointAt(0.7),
  };

  return {
    group,
    anchors,
    section,
    innerOnly: ['korteks', 'medula', 'pelvis-renalis'],
    innerLabel: ['Penampang', 'Utuh'],
    setInner,
    getInner: () => inner,
    frame: { center: new THREE.Vector3(0, -0.25, 0), radius: 2.85 },
    update(t) {
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < 12; i++) {
        const c = ureters[i % 2];
        const u = ((t * 0.04 + (i >> 1) / 6) % 1); // ginjal → ureter → kandung kemih (pelan)
        const p = c.getPointAt(u);
        m4.makeTranslation(p.x, p.y, p.z + 0.01);
        drops.setMatrixAt(i, m4);
      }
      drops.instanceMatrix.needsUpdate = true;
    },
  };
}
