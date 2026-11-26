import * as THREE from 'three';
import { organic, deform, curve, taperTube, mesh, merge, fatTexture, fiberTexture, speckleTexture } from '../scene/helpers.js';
import { fbm, seeded } from '../scene/noise.js';

// Balok penampang kulit. Sumbu y: atas = permukaan.
const W = 3.2, D = 2.2;
const Y_HYPO = [-1.35, -0.45];
const Y_DERM = [-0.45, 0.55];
const EPI = [
  { id: 'stratum-basale', h: 0.05, color: '#8a5236' },
  { id: 'stratum-spinosum', h: 0.08, color: '#d99a7e' },
  { id: 'stratum-granulosum', h: 0.04, color: '#c58566' },
  { id: 'stratum-lusidum', h: 0.025, color: '#f6e4d6' },
  { id: 'stratum-korneum', h: 0.07, color: '#e9c3a2' },
];

function layerBox(y0, y1, mat, id, opts = {}) {
  const g = new THREE.BoxGeometry(W, y1 - y0, D, 40, 1, 28);
  g.translate(0, (y0 + y1) / 2, 0);
  const m = mesh(g, mat, id, { shell: true, ...opts });
  return m;
}

export function buildSkin() {
  const rnd = seeded(5);
  const group = new THREE.Group();

  // ---- Hipodermis (lemak) ----
  const fat = fatTexture();
  const hypoMat = organic('#ffffff', { map: fat, rough: 0.45, clearcoat: 0.5, opacity: 0.55, bump: 0.8, side: THREE.DoubleSide });
  fat.repeat.set(2, 1);
  group.add(layerBox(Y_HYPO[0], Y_HYPO[1], hypoMat, 'hipodermis'));
  // gumpalan lemak 3D
  const lob = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 18, 14), organic('#f4d27e', { rough: 0.3, clearcoat: 0.8, sheen: 0.6, bump: 0.5 }), 90);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < 90; i++) {
    const p = new THREE.Vector3((rnd() - 0.5) * (W - 0.3), Y_HYPO[0] + 0.15 + rnd() * 0.6, (rnd() - 0.5) * (D - 0.3));
    const k = 0.7 + rnd() * 0.6;
    m4.compose(p, q, s.set(k, k * 0.85, k));
    lob.setMatrixAt(i, m4);
  }
  lob.userData.partId = 'hipodermis';
  group.add(lob);

  // ---- Dermis ----
  const fib = fiberTexture();
  fib.repeat.set(2, 1.2);
  const dermMat = organic('#ffffff', { map: fib, rough: 0.5, clearcoat: 0.4, opacity: 0.42, bump: 0.6, side: THREE.DoubleSide });
  group.add(layerBox(Y_DERM[0], Y_DERM[1], dermMat, 'dermis'));

  // ---- Epidermis berlapis dengan papila dermis bergelombang ----
  let y = Y_DERM[1];
  const epiMeshes = [];
  for (const L of EPI) {
    const g = new THREE.BoxGeometry(W, L.h, D, 80, 1, 56);
    g.translate(0, y + L.h / 2, 0);
    const top = L.id === 'stratum-korneum';
    deform(g, (v) => {
      const wav = 0.03 * Math.sin(v.x * 7) * Math.cos(v.z * 6) + (top ? 0.012 * fbm(v.x * 6, 0, v.z * 6, 3) : 0);
      v.y += wav;
    });
    const mat = top
      ? organic('#ffffff', { map: speckleTexture('#e7bf9c', '#b98463', 700, 'korneum'), rough: 0.62, clearcoat: 0.15, bump: 2.2, bumpKind: 'fine' })
      : organic(L.color, { rough: 0.5, clearcoat: 0.3, bump: 0.8, bumpKind: 'cells' });
    const m = mesh(g, mat, L.id);
    epiMeshes.push(m);
    group.add(m);
    y += L.h;
  }
  const SURF = y; // permukaan kulit

  // ---- Folikel rambut + kelenjar minyak + otot penegak rambut ----
  const follGeos = [], hairGeos = [], bulbGeos = [], sebGeos = [], musGeos = [];
  const hairs = [[-1.05, -0.5], [0.1, 0.55], [1.05, -0.35], [-0.35, -0.75]];
  hairs.forEach(([hx, hz], i) => {
    const tilt = 0.28 + rnd() * 0.12;
    const bottom = new THREE.Vector3(hx - 0.25, Y_HYPO[1] - 0.15, hz);
    const top = new THREE.Vector3(hx + Math.tan(tilt) * 0.2, SURF, hz);
    const c = curve([bottom, bottom.clone().lerp(top, 0.5).add(new THREE.Vector3(0.02, 0, 0)), top]);
    follGeos.push(taperTube(c, 0.085, 0.07, 30, 16));
    const tip = top.clone().add(new THREE.Vector3(0.38 + rnd() * 0.2, 1.0 + rnd() * 0.4, 0.05));
    const hc = curve([bottom.clone().add(new THREE.Vector3(0, 0.05, 0)), top, top.clone().lerp(tip, 0.5).add(new THREE.Vector3(0.05, 0.05, 0)), tip]);
    hairGeos.push(taperTube(hc, (t) => 0.032 * (1 - t * 0.6), 0, 60, 8));
    const bulb = new THREE.SphereGeometry(0.12, 24, 18);
    bulb.scale(1, 1.25, 1);
    bulb.translate(bottom.x, bottom.y, bottom.z);
    bulbGeos.push(bulb);
    // kelenjar minyak (sebasea) — gerombolan bulat
    const mid = c.getPointAt(0.62);
    for (let k = 0; k < 6; k++) {
      const b = new THREE.SphereGeometry(0.07 + rnd() * 0.03, 14, 10);
      b.translate(mid.x - 0.14 - rnd() * 0.1, mid.y - 0.05 + (rnd() - 0.5) * 0.14, mid.z + (rnd() - 0.5) * 0.14);
      sebGeos.push(b);
    }
    // otot penegak rambut
    const m0 = c.getPointAt(0.45);
    const mc = curve([m0.clone().add(new THREE.Vector3(-0.05, 0, 0)), m0.clone().add(new THREE.Vector3(-0.3, 0.25, 0.02)), new THREE.Vector3(m0.x - 0.55, Y_DERM[1] - 0.02, m0.z)]);
    musGeos.push(taperTube(mc, (t) => 0.022 + 0.018 * Math.sin(Math.PI * t), 0, 20, 8));
  });
  group.add(mesh(merge(follGeos), organic('#e8b9a0', { rough: 0.35, clearcoat: 0.7, opacity: 0.55, bump: 0.6 }), 'folikel-rambut'));
  group.add(mesh(merge(bulbGeos), organic('#c47a5c', { rough: 0.4, clearcoat: 0.6, bump: 0.8, bumpKind: 'cells' }), 'folikel-rambut'));
  group.add(mesh(merge(hairGeos), organic('#2c1d17', { rough: 0.32, clearcoat: 0.8, bump: 0 }), 'rambut'));
  group.add(mesh(merge(sebGeos), organic('#f2cf6b', { rough: 0.3, clearcoat: 0.8, sheen: 0.8, bump: 0.6, bumpKind: 'cells' }), 'kelenjar-minyak'));
  group.add(mesh(merge(musGeos), organic('#c5444a', { rough: 0.45, clearcoat: 0.4, bump: 0.6 }), 'otot-penegak-rambut'));

  // ---- Kelenjar keringat: gulungan + saluran spiral ke pori ----
  const coilGeos = [], ductGeos = [], poreGeos = [];
  const pores = [];
  const glands = [[-0.55, 0.35], [0.7, 0.4], [-1.25, 0.6], [0.45, -0.7], [1.3, 0.75]];
  glands.forEach(([gx, gz], i) => {
    const center = new THREE.Vector3(gx, Y_DERM[0] + 0.05, gz);
    const pts = [];
    for (let k = 0; k <= 140; k++) {
      const t = k / 140;
      const a = t * Math.PI * 2 * 6;
      const r = 0.11 + 0.04 * Math.sin(t * 17);
      pts.push(new THREE.Vector3(center.x + Math.cos(a) * r + (rnd() - 0.5) * 0.02, center.y + (t - 0.5) * 0.22 + 0.04 * Math.sin(a * 0.5), center.z + Math.sin(a) * r));
    }
    const coil = curve(pts);
    coilGeos.push(taperTube(coil, 0.035, 0.035, 500, 8));
    const start = pts[pts.length - 1];
    const dpts = [];
    for (let k = 0; k <= 60; k++) {
      const t = k / 60;
      const yy = start.y + (SURF - start.y) * t;
      const spiral = t > 0.72 ? (t - 0.72) / 0.28 : 0; // bagian spiral menembus epidermis
      const a = spiral * Math.PI * 6;
      dpts.push(new THREE.Vector3(start.x + 0.05 * Math.sin(t * 5) + Math.cos(a) * 0.04 * spiral, yy, start.z + Math.sin(a) * 0.04 * spiral));
    }
    ductGeos.push(taperTube(curve(dpts), 0.022, 0.026, 120, 8));
    const pore = new THREE.TorusGeometry(0.04, 0.012, 8, 20).rotateX(Math.PI / 2);
    const top = dpts[dpts.length - 1];
    pore.translate(top.x, SURF + 0.03, top.z);
    poreGeos.push(pore);
    pores.push(top.clone().setY(SURF + 0.03));
  });
  group.add(mesh(merge(coilGeos), organic('#6fb4d6', { rough: 0.28, clearcoat: 0.9, sheen: 0.5, bump: 0.6, bumpKind: 'fine' }), 'kelenjar-keringat'));
  group.add(mesh(merge(ductGeos), organic('#86c5e3', { rough: 0.28, clearcoat: 0.9, bump: 0 }), 'pori'));
  group.add(mesh(merge(poreGeos), organic('#7c4a35', { rough: 0.5, bump: 0 }), 'pori'));

  // Tetes keringat di permukaan (beranimasi)
  const drops = pores.map((p) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#dff4ff', roughness: 0.05, transmission: 0.9, thickness: 0.1, ior: 1.33, clearcoat: 1, transparent: true, opacity: 0.9 }));
    d.position.copy(p);
    d.userData.partId = 'pori';
    group.add(d);
    return d;
  });

  // ---- Pembuluh darah: arteri & vena + lengkung kapiler ke papila ----
  const art = [], vein = [];
  const plexus = (yy, zz, r, arr, wob) => {
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const x = -W / 2 + (k / 12) * W;
      pts.push(new THREE.Vector3(x, yy + Math.sin(k * 1.3 + wob) * 0.04, zz + Math.cos(k * 0.9 + wob) * 0.05));
    }
    arr.push(taperTube(curve(pts), r, r, 120, 10));
  };
  plexus(Y_DERM[0] + 0.02, -0.25, 0.045, art, 0);
  plexus(Y_DERM[0] + 0.0, 0.05, 0.05, vein, 1.4);
  plexus(Y_DERM[1] - 0.2, -0.45, 0.025, art, 2.1);
  plexus(Y_DERM[1] - 0.22, -0.15, 0.028, vein, 0.6);
  for (let k = 0; k < 9; k++) {
    const x = -W / 2 + 0.25 + k * ((W - 0.5) / 8);
    const a0 = new THREE.Vector3(x, Y_DERM[1] - 0.2, -0.45), v0 = new THREE.Vector3(x + 0.06, Y_DERM[1] - 0.22, -0.15);
    const loop = curve([a0, new THREE.Vector3(x, Y_DERM[1] - 0.02, -0.35), new THREE.Vector3(x + 0.04, Y_DERM[1] + 0.02, -0.28), new THREE.Vector3(x + 0.07, Y_DERM[1] - 0.04, -0.22), v0]);
    const g = taperTube(loop, 0.012, 0.012, 30, 6);
    (k % 2 ? vein : art).push(g);
    // penghubung vertikal antar pleksus
    if (k % 3 === 0) {
      art.push(taperTube(curve([new THREE.Vector3(x, Y_DERM[0] + 0.02, -0.25), new THREE.Vector3(x + 0.05, -0.05, -0.35), new THREE.Vector3(x, Y_DERM[1] - 0.2, -0.45)]), 0.02, 0.02, 30, 6));
      vein.push(taperTube(curve([new THREE.Vector3(x + 0.1, Y_DERM[0], 0.05), new THREE.Vector3(x + 0.12, -0.05, -0.05), new THREE.Vector3(x + 0.06, Y_DERM[1] - 0.22, -0.15)]), 0.022, 0.022, 30, 6));
    }
  }
  group.add(mesh(merge(art), organic('#d4313b', { rough: 0.3, clearcoat: 0.8, bump: 0 }), 'pembuluh-darah-kulit'));
  group.add(mesh(merge(vein), organic('#3c5fc2', { rough: 0.3, clearcoat: 0.8, bump: 0 }), 'pembuluh-darah-kulit'));

  // ---- Saraf + reseptor (Pacini & Meissner) ----
  const nerve = [];
  const n1 = curve([[-W / 2, -0.75, 0.7], [-0.6, -0.65, 0.6], [0.4, -0.7, 0.75], [W / 2, -0.6, 0.65]]);
  nerve.push(taperTube(n1, 0.03, 0.03, 80, 8));
  const recGeos = [];
  for (const [x, z] of [[-0.9, 0.62], [0.95, 0.7]]) {
    const p = n1.getPointAt((x + W / 2) / W);
    nerve.push(taperTube(curve([p, new THREE.Vector3(x, -0.95, z)]), 0.018, 0.018, 12, 6));
    for (let l = 0; l < 4; l++) { // Pacini: berlapis seperti bawang
      const e = new THREE.SphereGeometry(0.07 + l * 0.035, 20, 14);
      e.scale(1, 1.6, 1);
      e.translate(x, -1.05, z);
      recGeos.push(e);
    }
  }
  for (const x of [-0.2, 0.55]) { // Meissner di papila dermis
    const base = n1.getPointAt((x + W / 2) / W);
    const top = new THREE.Vector3(x, Y_DERM[1] - 0.04, 0.55);
    nerve.push(taperTube(curve([base, new THREE.Vector3(x + 0.05, 0, 0.6), top]), 0.014, 0.014, 30, 6));
    const mz = new THREE.SphereGeometry(0.05, 16, 12);
    mz.scale(1, 1.7, 1);
    mz.translate(top.x, top.y, top.z);
    recGeos.push(mz);
  }
  group.add(mesh(merge(nerve), organic('#f1d34f', { rough: 0.35, clearcoat: 0.6, bump: 0 }), 'saraf-kulit'));
  group.add(mesh(merge(recGeos), organic('#f6e7b4', { rough: 0.3, clearcoat: 0.8, opacity: 0.6, bump: 0 }), 'saraf-kulit'));

  // posisikan sehingga model terpusat
  group.position.y = 0.1;

  const layerMats = [hypoMat, dermMat];
  let inner = true;
  const setInner = (on) => {
    inner = on;
    hypoMat.opacity = on ? 0.55 : 1;
    dermMat.opacity = on ? 0.42 : 1;
    for (const m of layerMats) {
      m.transparent = on;
      m.depthWrite = !on;
      m.userData.baseOpacity = m.opacity;
      m.needsUpdate = true;
    }
  };
  setInner(true);

  const at = (x, yy, z) => new THREE.Vector3(x, yy, z); // koordinat lokal grup
  let ey = Y_DERM[1];
  const epiY = {};
  for (const L of EPI) { epiY[L.id] = ey + L.h / 2; ey += L.h; }
  const anchors = {
    'stratum-korneum': at(-W / 2 + 0.25, epiY['stratum-korneum'] + 0.04, D / 2),
    'stratum-lusidum': at(-W / 2 + 0.35, epiY['stratum-lusidum'], D / 2),
    'stratum-granulosum': at(-W / 2 + 0.65, epiY['stratum-granulosum'], D / 2),
    'stratum-spinosum': at(-W / 2 + 0.95, epiY['stratum-spinosum'], D / 2),
    'stratum-basale': at(W / 2 - 0.35, epiY['stratum-basale'], D / 2),
    dermis: at(W / 2, 0.1, D / 2),
    hipodermis: at(W / 2, -0.95, D / 2),
    'kelenjar-keringat': at(glands[0][0], Y_DERM[0] + 0.1, glands[0][1] + 0.15),
    pori: pores[1].clone().add(new THREE.Vector3(0, 0.12, 0)),
    rambut: at(0.45, SURF + 0.85, 0.55),
    'folikel-rambut': at(hairs[2][0] - 0.2, -0.25, hairs[2][1]),
    'kelenjar-minyak': at(hairs[1][0] - 0.25, 0.05, hairs[1][1]),
    'otot-penegak-rambut': at(hairs[0][0] - 0.45, 0.32, hairs[0][1]),
    'pembuluh-darah-kulit': at(-1.3, Y_DERM[0] + 0.05, -0.25),
    'saraf-kulit': at(0.95, -1.0, 0.7),
  };

  return {
    group,
    anchors,
    minorPins: ['stratum-lusidum', 'stratum-granulosum', 'stratum-spinosum'],
    innerLabel: ['Transparan', 'Padat'],
    setInner,
    getInner: () => inner,
    frame: { center: new THREE.Vector3(0, 0, 0), radius: 2.55 },
    update(t) {
      drops.forEach((d, i) => {
        const u = (t * 0.25 + i * 0.21) % 1; // tumbuh lalu menguap
        const k = u < 0.7 ? 0.3 + u : 1 - (u - 0.7) * 3.2;
        d.scale.set(k, k * 0.7, k);
        d.material.opacity = 0.9 * Math.min(1, k * 1.5);
      });
    },
  };
}
