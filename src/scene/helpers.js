import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm, seeded } from './noise.js';

// ---------- Tekstur prosedural ----------
const texCache = new Map();

function canvasTexture(key, size, draw, { srgb = false, repeat = 1 } = {}) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** Peta bump bernoise (tileable kira-kira) untuk permukaan organik. */
export function bumpTexture(kind = 'organic') {
  return canvasTexture('bump-' + kind, 256, (ctx, n) => {
    const img = ctx.createImageData(n, n);
    const sc = kind === 'fine' ? 22 : kind === 'cells' ? 14 : 7;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        // noise yang di-tile dengan memetakan ke torus 4D sederhana (2 lingkaran)
        const a = (x / n) * Math.PI * 2, b = (y / n) * Math.PI * 2;
        const r = sc / (Math.PI * 2);
        let v = fbm(Math.cos(a) * r + 11, Math.sin(a) * r + 3, Math.cos(b) * r + Math.sin(b) * r * 0.7, 4);
        if (kind === 'cells') v = Math.abs(v) * -1.6 + 0.4;
        const g = Math.max(0, Math.min(255, 128 + v * 190));
        const i = (y * n + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { repeat: kind === 'fine' ? 3 : 2 });
}

/** Garis-garis (striasi) untuk piramida ginjal / otot. */
export function stripeTexture(base = '#7d2a22', line = '#5b1b16', count = 40) {
  return canvasTexture(`stripe-${base}-${line}-${count}`, 256, (ctx, n) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, n, n);
    const rnd = seeded(5);
    for (let i = 0; i < count; i++) {
      const x = (i / count) * n + rnd() * 3;
      ctx.strokeStyle = line;
      ctx.globalAlpha = 0.35 + rnd() * 0.4;
      ctx.lineWidth = 1 + rnd() * 2.2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= n; y += 16) ctx.lineTo(x + Math.sin(y * 0.05 + i) * 1.5, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, { srgb: true });
}

/** Tekstur bintik/butiran (korteks ginjal, hati). */
export function speckleTexture(base, dot, density = 900, key = '') {
  return canvasTexture(`speck-${base}-${dot}-${density}-${key}`, 256, (ctx, n) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, n, n);
    const rnd = seeded(9 + density);
    for (let i = 0; i < density; i++) {
      ctx.fillStyle = dot;
      ctx.globalAlpha = 0.15 + rnd() * 0.45;
      ctx.beginPath();
      ctx.arc(rnd() * n, rnd() * n, 0.6 + rnd() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, { srgb: true });
}

/** Tekstur sel lemak (hipodermis). */
export function fatTexture() {
  return canvasTexture('fat', 512, (ctx, n) => {
    ctx.fillStyle = '#e7c46a';
    ctx.fillRect(0, 0, n, n);
    const rnd = seeded(21);
    for (let i = 0; i < 160; i++) {
      const x = rnd() * n, y = rnd() * n, r = 14 + rnd() * 22;
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(0.75, '#f3d98a');
      g.addColorStop(1, '#c99a3c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { srgb: true });
}

/** Serat kolagen bergelombang (dermis). */
export function fiberTexture() {
  return canvasTexture('fiber', 512, (ctx, n) => {
    ctx.fillStyle = '#f2b8a8';
    ctx.fillRect(0, 0, n, n);
    const rnd = seeded(33);
    for (let i = 0; i < 220; i++) {
      ctx.strokeStyle = rnd() > 0.5 ? '#e59a8a' : '#fbd3c6';
      ctx.globalAlpha = 0.35 + rnd() * 0.4;
      ctx.lineWidth = 1 + rnd() * 2.5;
      const y0 = rnd() * n, x0 = rnd() * n, len = 60 + rnd() * 140, ph = rnd() * 6;
      ctx.beginPath();
      for (let t = 0; t <= len; t += 4) {
        const x = x0 + t, y = y0 + Math.sin(t * 0.06 + ph) * 6;
        t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, { srgb: true });
}

// ---------- Material ----------
export function organic(color, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: o.vertexColors ? 0xffffff : color,
    roughness: o.rough ?? 0.5,
    metalness: 0,
    clearcoat: o.clearcoat ?? 0.35,
    clearcoatRoughness: o.clearcoatRough ?? 0.4,
    sheen: o.sheen ?? 0.35,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.45),
    bumpMap: o.bump === 0 ? null : bumpTexture(o.bumpKind || 'organic'),
    bumpScale: o.bump ?? 1.2,
    map: o.map || null,
    vertexColors: !!o.vertexColors,
    transparent: (o.opacity ?? 1) < 1 || !!o.transparent,
    opacity: o.opacity ?? 1,
    depthWrite: (o.opacity ?? 1) >= 1,
    side: o.side ?? THREE.FrontSide,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    transmission: o.transmission ?? 0,
    thickness: o.thickness ?? 0,
    ior: 1.35,
  });
  m.userData.baseOpacity = m.opacity;
  m.userData.baseEmissive = m.emissive.clone();
  return m;
}

// ---------- Geometri ----------
export function deform(geo, fn) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    fn(v, i);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function curve(points, closed = false, tension = 0.5) {
  return new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), closed, 'catmullrom', tension);
}

/** Tube dengan radius berubah dari r0 → r1 (atau fungsi r(t)). */
export function taperTube(c, r0, r1 = r0, segments = 48, radial = 10) {
  const g = new THREE.TubeGeometry(c, segments, 1, radial, false);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const rf = typeof r0 === 'function' ? r0 : (t) => r0 + (r1 - r0) * t;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const P = c.getPointAt(t);
    const r = rf(t);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(P).multiplyScalar(r).add(P);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Warnai geometri tube sepanjang panjangnya (uv.x) dengan gradien. */
export function gradientAlong(geo, c0, c1) {
  const uv = geo.attributes.uv;
  const cols = new Float32Array(uv.count * 3);
  const a = new THREE.Color(c0), b = new THREE.Color(c1), t = new THREE.Color();
  for (let i = 0; i < uv.count; i++) {
    t.copy(a).lerp(b, uv.getX(i));
    cols.set([t.r, t.g, t.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

export function merge(geos) {
  const clean = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    // pastikan atribut seragam
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  const hasColor = clean.some((g) => g.attributes.color);
  if (hasColor) clean.forEach((g) => { if (!g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); });
  return mergeGeometries(clean, false);
}

/** Tandai mesh sebagai bagian (part) yang dapat dipilih. */
export function part(mesh, partId, o = {}) {
  mesh.userData.partId = partId;
  if (o.shell) mesh.userData.shell = true; // pembungkus transparan → bisa "ditembus" saat memilih
  if (o.resolver) mesh.userData.resolver = o.resolver;
  mesh.castShadow = o.shadow ?? true;
  mesh.receiveShadow = true;
  return mesh;
}

export function mesh(geo, mat, partId, o) {
  const m = new THREE.Mesh(geo, mat);
  return partId ? part(m, partId, o) : m;
}

/** Arah acak tegak lurus terhadap vektor d. */
export function perpendicular(d, rnd) {
  const a = Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const p1 = new THREE.Vector3().crossVectors(d, a).normalize();
  const p2 = new THREE.Vector3().crossVectors(d, p1).normalize();
  const ang = rnd() * Math.PI * 2;
  return p1.multiplyScalar(Math.cos(ang)).add(p2.multiplyScalar(Math.sin(ang)));
}

/**
 * Pohon percabangan (bronkus, pembuluh darah) → daftar segmen {curve, r0, r1, depth}.
 * `inside(p)` membatasi agar cabang tetap di dalam volume organ.
 */
export function branchTree({ start, dir, len, radius, depth, maxDepth, rnd, inside, spread = 0.55, shrink = 0.78, rshrink = 0.7, out = [], tips = [] }) {
  const d = dir.clone().normalize();
  const end = start.clone().addScaledVector(d, len);
  const mid = start.clone().lerp(end, 0.5).addScaledVector(perpendicular(d, rnd), len * 0.08);
  out.push({ curve: new THREE.QuadraticBezierCurve3(start.clone(), mid, end.clone()), r0: radius, r1: radius * 0.86, depth });
  if (depth >= maxDepth) { tips.push({ p: end.clone(), d }); return { out, tips }; }
  const base = perpendicular(d, rnd);
  for (let k = 0; k < 2; k++) {
    let best = null;
    for (let tries = 0; tries < 8; tries++) {
      const side = base.clone().multiplyScalar(k === 0 ? 1 : -1).applyAxisAngle(d, (rnd() - 0.5) * 1.2);
      const nd = d.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread) * (0.8 + rnd() * 0.5)).normalize();
      const probe = end.clone().addScaledVector(nd, len * shrink);
      if (!inside || inside(probe)) { best = nd; break; }
    }
    if (!best) { tips.push({ p: end.clone(), d }); continue; }
    branchTree({ start: end, dir: best, len: len * shrink * (0.85 + rnd() * 0.3), radius: radius * rshrink, depth: depth + 1, maxDepth, rnd, inside, spread, shrink, rshrink, out, tips });
  }
  return { out, tips };
}

export function treeGeometry(segs, filter = () => true, radial = 8) {
  const geos = segs.filter(filter).map((s) => taperTube(s.curve, s.r0, s.r1, s.depth < 2 ? 16 : 8, radial));
  return geos.length ? merge(geos) : new THREE.BufferGeometry();
}
