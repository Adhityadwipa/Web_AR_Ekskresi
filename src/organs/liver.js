import * as THREE from 'three';
import { Section } from '../scene/section.js';
import { organic, liverCutTexture, deform, curve, taperTube, mesh, merge, branchTree, treeGeometry } from '../scene/helpers.js';
import { fbm, seeded, smoothstep } from '../scene/noise.js';

const X0 = 0.25; // posisi ligamen falsiformis (parameter bola)

function liverPoint(v) {
  const { x, y, z } = v;
  const n = 1 + 0.022 * fbm(x * 2.5 + 3, y * 2.5, z * 2.5, 3);
  const L = smoothstep(-0.3, 1.0, x); // 0 = lobus kanan tebal, 1 = ujung lobus kiri tipis
  const thick = 1 - 0.74 * L;
  let X = x * 1.65;
  let Y;
  if (y >= 0) Y = y * 0.95 * thick;
  else Y = y * 0.5 * thick + 0.28 * Math.max(0, z) * -y - 0.16 * (1 - L) * -y;
  let Z = z * 0.95 * (1 - 0.35 * L) * (z < 0 ? 1.05 : 1);
  Y -= 0.16 * L;
  // alur di garis ligamen falsiformis (permukaan atas-depan)
  const gr = Math.exp(-(((x - X0) / 0.06) ** 2)) * smoothstep(-0.3, 0.4, y + z);
  Y *= 1 - 0.05 * gr;
  Z *= 1 - 0.04 * gr;
  v.set(X * n, Y * n, Z * n);
}

function insideLiver(p) {
  const L = smoothstep(-0.3, 1.0, p.x / 1.65);
  const thick = 0.95 * (1 - 0.74 * L);
  const top = thick * 0.72 - 0.16 * L, bottom = -thick * 0.3 - 0.16 * L;
  const zr = 0.95 * (1 - 0.35 * L);
  return p.y > bottom && p.y < top && (p.x / 1.55) ** 2 + (p.z / zr) ** 2 < 0.7;
}

function buildLobule() {
  const g = new THREE.Group();
  // lempeng dasar padat; lempeng sel hati & pembuluh berdiri di atasnya (seperti irisan mikroskop)
  const hex = mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.06, 6, 1).translate(0, -0.18, 0), organic('#9c4a36', { rough: 0.45, clearcoat: 0.6, bump: 1.2, bumpKind: 'cells' }), 'lobulus');
  g.add(hex);
  const plates = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const b = new THREE.BoxGeometry(0.46, 0.3, 0.022, 8, 1, 1);
    deform(b, (v) => v.set(v.x, v.y, v.z + Math.sin(v.x * 18 + i) * 0.012));
    b.translate(0.32, 0, 0);
    b.rotateY(a);
    plates.push(b);
  }
  g.add(mesh(merge(plates), organic('#c9705a', { rough: 0.5, clearcoat: 0.3, bump: 1.2, bumpKind: 'cells' }), 'lobulus'));
  g.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.44, 24), organic('#4565c4', { rough: 0.3, clearcoat: 0.8, bump: 0 }), 'vena-hepatika'));
  const pv = [], ha = [], bd = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const c = new THREE.Vector3(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
    const t = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.07);
    pv.push(new THREE.CylinderGeometry(0.05, 0.05, 0.42, 14).translate(c.x, 0, c.z));
    ha.push(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 10).translate(c.x + t.x, 0, c.z + t.z));
    bd.push(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 10).translate(c.x - t.x, 0, c.z - t.z));
  }
  g.add(mesh(merge(pv), organic('#6a52b0', { rough: 0.3, clearcoat: 0.8, bump: 0 }), 'vena-porta'));
  g.add(mesh(merge(ha), organic('#d2343c', { rough: 0.3, clearcoat: 0.8, bump: 0 }), 'arteri-hepatika'));
  g.add(mesh(merge(bd), organic('#4f9a4c', { rough: 0.3, clearcoat: 0.8, bump: 0 }), 'saluran-empedu'));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.008, 8, 96), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }));
  ring.userData.noPick = true;
  g.add(ring);
  return { group: g, ring };
}

export function buildLiver() {
  const rnd = seeded(11);
  const group = new THREE.Group();

  // ---- Hati ----
  const geo = deform(new THREE.SphereGeometry(1, 160, 110), liverPoint);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), base = new THREE.Color('#8a4a33'), dark = new THREE.Color('#4a2216');
  const X0w = X0 * 1.65;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    c.copy(base).offsetHSL(0.008 * fbm(x * 4, y * 4, z * 4), 0.05 * fbm(x * 3 + 9, y * 3, z * 3), 0.07 * fbm(x * 7 + 2, y * 7, z * 7, 3));
    const gr = Math.exp(-(((x - X0w) / 0.05) ** 2)) * (y > -0.1 ? 1 : 0.4);
    c.lerp(dark, gr * 0.6);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const liverMat = organic('#8a4a33', { vertexColors: true, rough: 0.4, clearcoat: 0.75, clearcoatRough: 0.28, sheen: 0.25, bump: 1.6, side: THREE.DoubleSide });
  const liver = mesh(geo, liverMat, 'lobus-kanan-hati', { shell: true, resolver: (p) => (p.x < X0w ? 'lobus-kanan-hati' : 'lobus-kiri-hati') });
  liver.userData.resolverIds = ['lobus-kanan-hati', 'lobus-kiri-hati'];
  liver.renderOrder = 2;
  group.add(liver);

  // Ligamen falsiformis mengikuti permukaan
  const lig = [];
  const r = Math.sqrt(1 - X0 * X0);
  for (let a = -0.15; a <= 2.15; a += 0.08) {
    const v = new THREE.Vector3(X0, Math.cos(a) * r, Math.sin(a) * r);
    liverPoint(v);
    v.multiplyScalar(1.012);
    lig.push(v);
  }
  const ligCurve = curve(lig);
  group.add(mesh(taperTube(ligCurve, (t) => 0.012 + 0.02 * Math.sin(Math.PI * t), 0, 80, 8), organic('#f0c9b6', { rough: 0.4, clearcoat: 0.6, bump: 0 }), 'ligamen-falsiformis'));

  // ---- Kantong empedu ----
  const gbProfile = [[0, -0.42], [0.13, -0.4], [0.19, -0.3], [0.2, -0.14], [0.17, 0.04], [0.11, 0.2], [0.065, 0.31], [0.05, 0.4]].map(([a, b]) => new THREE.Vector2(a, b));
  const gbGeo = new THREE.LatheGeometry(gbProfile, 48);
  const gb = mesh(gbGeo, organic('#5d6b3c', { rough: 0.25, clearcoat: 1, clearcoatRough: 0.12, sheen: 0.4, bump: 0.6 }), 'kantong-empedu');
  gb.position.set(-0.32, -0.4, 0.38);
  gb.rotation.set(-1.05, 0, 0.25);
  group.add(gb);
  group.updateMatrixWorld(true);
  const gbNeck = gb.localToWorld(new THREE.Vector3(0, 0.4, 0));

  // ---- Saluran & pembuluh di porta hepatis ----
  const green = organic('#4f9a4c', { rough: 0.3, clearcoat: 0.85, bump: 0.4 });
  const purple = organic('#5e4fb0', { rough: 0.3, clearcoat: 0.85, bump: 0.4 });
  const red = organic('#d2343c', { rough: 0.3, clearcoat: 0.85, bump: 0.4 });
  const blue = organic('#3d5fc0', { rough: 0.3, clearcoat: 0.85, bump: 0.4 });
  const J = new THREE.Vector3(-0.08, -0.72, 0.2);
  const hepDuct = curve([[-0.02, -0.3, 0.02], [-0.06, -0.5, 0.12], J]);
  const cystic = curve([gbNeck, gbNeck.clone().lerp(J, 0.5).add(new THREE.Vector3(0.05, -0.05, 0)), J]);
  const cbd = curve([J, [-0.05, -1.0, 0.25], [0.02, -1.35, 0.22]]);
  group.add(mesh(merge([taperTube(hepDuct, 0.04, 0.045, 20, 10), taperTube(cystic, 0.035, 0.04, 24, 10), taperTube(cbd, 0.05, 0.045, 24, 12)]), green, 'saluran-empedu'));
  const portal = curve([[0.22, -1.4, -0.08], [0.14, -0.9, -0.06], [0.08, -0.5, -0.04], [0.06, -0.3, -0.04]]);
  group.add(mesh(taperTube(portal, 0.1, 0.09, 40, 18), purple, 'vena-porta'));
  const artery = curve([[0.75, -1.15, 0.05], [0.45, -0.85, 0.12], [0.15, -0.55, 0.12], [0.06, -0.33, 0.06]]);
  group.add(mesh(taperTube(artery, 0.04, 0.035, 40, 10), red, 'arteri-hepatika'));
  const ivc = curve([[-0.15, -1.4, -0.68], [-0.14, -0.3, -0.7], [-0.12, 0.6, -0.62], [-0.12, 1.25, -0.6]]);
  group.add(mesh(taperTube(ivc, 0.14, 0.14, 40, 20), blue, 'vena-kava-hati'));

  // ---- Percabangan pembuluh di dalam hati: tepat di bidang irisan (z = 0) ----
  const outline = [];
  for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2; const v = new THREE.Vector3(Math.cos(a), Math.sin(a), 0); liverPoint(v); outline.push(v); }
  const cx = outline.reduce((s0, v) => s0 + v.x, 0) / outline.length, cy = outline.reduce((s0, v) => s0 + v.y, 0) / outline.length;
  const poly = outline.map((v) => new THREE.Vector2(cx + (v.x - cx) * 0.86, cy + (v.y - cy) * 0.78));
  const inPoly = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
  const innerGroup = new THREE.Group();
  const deepPts = {};
  const trees = (id, start, dirs, rad, depth, mat, zOff = 0) => {
    const segs = [];
    for (const d of dirs) branchTree({ start, dir: d, len: 0.34, radius: rad, depth: 0, maxDepth: depth, rnd, inside: (p) => inPoly(p.x, p.y), spread: 0.55, shrink: 0.82, rshrink: 0.74, out: segs, planar: true });
    for (const sg of segs) for (const k of ['v0', 'v1', 'v2']) if (sg.curve[k]) sg.curve[k].z = zOff;
    deepPts[id] = segs.filter((x) => x.depth >= 2).map((x) => x.curve.getPoint(0.5))[3] || start;
    const m = mesh(treeGeometry(segs, () => true, 10), mat.clone(), id);
    innerGroup.add(m);
    return m;
  };
  const porta = new THREE.Vector3(0.06, -0.2, 0);
  const holes = [
    trees('vena-porta', porta, [new THREE.Vector3(-1, 0.35, 0), new THREE.Vector3(1, 0.45, 0)], 0.075, 5, purple),
    trees('saluran-empedu', porta.clone().add(new THREE.Vector3(-0.05, 0.03, 0)), [new THREE.Vector3(-1, 0.05, 0), new THREE.Vector3(1, 0.1, 0)], 0.035, 4, green, 0.01),
    trees('arteri-hepatika', porta.clone().add(new THREE.Vector3(0.05, -0.02, 0)), [new THREE.Vector3(-1, -0.1, 0), new THREE.Vector3(1, -0.05, 0)], 0.028, 4, red, -0.01),
    trees('vena-hepatika', new THREE.Vector3(-0.12, 0.38, 0), [new THREE.Vector3(-1, 0.1, 0), new THREE.Vector3(-0.1, -1, 0), new THREE.Vector3(1, 0.05, 0)], 0.08, 5, blue),
  ];
  group.add(innerGroup);

  // ---- Penampang: hati dibelah pada bidang frontal z = 0 (struktur luar di bawah hati tetap utuh) ----
  const section = new Section(group, new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), { size: 6 });
  section.cap(liver, new THREE.MeshStandardMaterial({ map: liverCutTexture(), roughness: 0.6, bumpMap: liverCutTexture(), bumpScale: 1.5 }), holes);
  const ligMesh = group.children.find((o) => o.userData.partId === 'ligamen-falsiformis');
  if (ligMesh) section.clip(ligMesh);

  // ---- Perbesaran lobulus ----
  const lob = buildLobule();
  lob.group.position.set(2.55, 0.55, 0);
  lob.group.rotation.x = 0.55;
  lob.group.scale.setScalar(0.85);
  group.add(lob.group);

  let inner = true;
  const setInner = (on) => {
    inner = on;
    innerGroup.visible = on;
    section.setEnabled(on);
  };
  setInner(true);

  const anchors = {
    'lobus-kanan-hati': new THREE.Vector3(-1.55, 0.25, 0),
    'lobus-kiri-hati': new THREE.Vector3(1.45, -0.12, 0),
    'vena-hepatika': deepPts['vena-hepatika'].clone(),
    'ligamen-falsiformis': ligCurve.getPointAt(0.45),
    'kantong-empedu': gb.localToWorld(new THREE.Vector3(0.2, -0.3, 0)),
    'saluran-empedu': cbd.getPointAt(0.5),
    'vena-porta': portal.getPointAt(0.25),
    'arteri-hepatika': artery.getPointAt(0.3),
    'vena-kava-hati': ivc.getPointAt(0.92),
    lobulus: new THREE.Vector3(2.55, 1.05, 0.3),
  };

  return {
    group,
    anchors,
    section,
    innerOnly: ['vena-hepatika'],
    outerOnly: ['ligamen-falsiformis'],
    innerLabel: ['Penampang', 'Utuh'],
    setInner,
    getInner: () => inner,
    frame: { center: new THREE.Vector3(0.75, -0.1, 0), radius: 2.85 },
    insetBillboard: lob.ring,
    update() {},
  };
}
