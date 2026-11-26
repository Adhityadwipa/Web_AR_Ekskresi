import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PARTS } from '../data/knowledge.js';
import { buildLungs } from '../organs/lungs.js';
import { buildKidneys } from '../organs/kidney.js';
import { buildNephron } from '../organs/nephron.js';
import { buildLiver } from '../organs/liver.js';
import { buildSkin } from '../organs/skin.js';

const BUILDERS = { paru: buildLungs, ginjal: buildKidneys, nefron: buildNephron, hati: buildLiver, kulit: buildSkin };
const ease = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

export class Viewer extends EventTarget {
  constructor(container) {
    super();
    this.container = container;
    this.models = new Map();
    this.current = null;
    this.hoverId = null;
    this.selectedId = null;
    this.showLabels = true;
    this.mode = '3d'; // '3d' | 'camera' | 'xr'
    this.timer = new THREE.Timer();
    this.elapsed = 0;
    this.tweens = [];
    this._initRenderer();
    this._initScene();
    this._initEvents();
    this.renderer.setAnimationLoop((t, frame) => this._tick(frame));
  }

  _initRenderer() {
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.xr.enabled = true;
    r.localClippingEnabled = true; // dipakai untuk penampang organ
    r.setClearColor(0x000000, 0);
    r.domElement.className = 'gl';
    this.container.appendChild(r.domElement);

    const l = (this.labels = new CSS2DRenderer());
    l.domElement.className = 'labels';
    this.container.appendChild(l.domElement);
  }

  _initScene() {
    const scene = (this.scene = new THREE.Scene());
    const pm = new THREE.PMREMGenerator(this.renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.85;

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.01, 200);
    this.camera.position.set(0, 0.6, 9);

    const hemi = new THREE.HemisphereLight('#fff6ee', '#d9c9c0', 0.9);
    const key = (this.key = new THREE.DirectionalLight('#fff4e8', 2.2));
    key.position.set(3.5, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 25 });
    const rim = new THREE.DirectionalLight('#cfe3ff', 1.1);
    rim.position.set(-5, 2.5, -4);
    scene.add(hemi, key, rim);

    // root yang dapat dipindah (AR) — berisi organ aktif + bayangan
    this.root = new THREE.Group();
    scene.add(this.root);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.16 }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.receiveShadow = true;
    this.shadow.userData.noPick = true;
    this.root.add(this.shadow);

    const c = (this.controls = new OrbitControls(this.camera, this.renderer.domElement));
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.rotateSpeed = 0.8;
    c.minDistance = 0.45;
    c.maxDistance = 22;
    c.screenSpacePanning = true;
    c.zoomToCursor = true; // zoom mengikuti posisi kursor → mudah memperbesar bagian tertentu
    c.zoomSpeed = 1.1;
    c.panSpeed = 0.9;
    c.autoRotate = true;
    c.autoRotateSpeed = 0.6;
    c.addEventListener('start', () => { this.dispatchEvent(new Event('interact')); });

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.resize();
  }

  _initEvents() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved < 6 && performance.now() - down.t < 500) {
        const hit = this.pick(this._ndc(e));
        this.select(hit ? hit.partId : null, { source: 'click' });
      }
      down = null;
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || this.mode !== '3d') return;
      this._pendingHover = this._ndc(e);
      this._hoverClient = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('pointerleave', () => { this._pendingHover = null; this._setHover(null); });
    // klik ganda: perbesar ke bagian yang diklik
    el.addEventListener('dblclick', (e) => {
      const hit = this.pick(this._ndc(e));
      if (hit) { this.select(hit.partId, { source: 'click' }); this.focusPoint(hit.point); }
    });
    new ResizeObserver(() => this.resize()).observe(this.container);
  }

  _ndc(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    if (this.renderer.xr.isPresenting) return;
    this.renderer.setSize(w, h, false);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.current && !this._userMoved) this.frame(false);
  }

  // ---------- Model ----------
  _ensure(id) {
    if (this.models.has(id)) return this.models.get(id);
    const m = BUILDERS[id]();
    m.id = id;
    // material yang dipakai bersama di-clone agar highlight per bagian tidak bocor
    const uses = new Map();
    m.group.traverse((o) => { if (o.isMesh && o.material) uses.set(o.material, (uses.get(o.material) || 0) + 1); });
    m.group.traverse((o) => {
      if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
      if (uses.get(o.material) > 1) {
        const base = o.material;
        o.material = base.clone();
        o.material.userData = { ...base.userData };
      }
      if (!o.material.userData.baseEmissive && o.material.emissive) o.material.userData.baseEmissive = o.material.emissive.clone();
    });
    // terapkan ulang mode (penampang) setelah material di-clone
    m.section?.remember();
    m.setInner?.(m.getInner?.() ?? true);
    // bounding & label
    const box = new THREE.Box3().setFromObject(m.group);
    m.floorY = box.min.y;
    m.pins = new Map();
    for (const [pid, pos] of Object.entries(m.anchors)) {
      const info = PARTS[pid];
      if (!info) continue;
      const div = document.createElement('button');
      div.className = 'pin';
      div.type = 'button';
      div.innerHTML = `<span class="pin-dot"></span><span class="pin-line"></span><span class="pin-text">${info.name}</span>`;
      div.setAttribute('aria-label', info.name);
      div.addEventListener('pointerdown', (e) => e.stopPropagation());
      div.addEventListener('click', (e) => { e.stopPropagation(); this.select(pid, { source: 'pin', focus: true }); });
      div.addEventListener('pointerenter', () => { this.hoverId = pid; });
      div.addEventListener('pointerleave', () => { if (this.hoverId === pid) this.hoverId = null; });
      const obj = new CSS2DObject(div);
      obj.position.copy(pos);
      (m.anchorParent ? m.anchorParent(pid) : m.group).add(obj);
      m.pins.set(pid, obj);
    }
    this.models.set(id, m);
    return m;
  }

  async show(id) {
    if (this.current?.id === id) return this.current;
    const prev = this.current;
    // beri kesempatan UI menampilkan loading
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    const m = this._ensure(id);
    this.selectedId = null;
    this.hoverId = null;
    if (prev) {
      const pg = prev.group;
      this._tween(0.35, (t) => { pg.scale.setScalar(1 - 0.25 * ease(t)); this._setOpacity(prev, 1 - t); }, () => { if (this.current !== prev) this.root.remove(pg); pg.scale.setScalar(1); this._setOpacity(prev, 1); });
    }
    this.root.add(m.group);
    this.current = m;
    this.shadow.position.y = m.floorY - 0.02;
    this._applyLabels();
    m.group.scale.setScalar(0.6);
    this._tween(0.7, (t) => m.group.scale.setScalar(0.6 + 0.4 * easeBack(t)));
    this._userMoved = false;
    if (this.mode === '3d') this.frame(true);
    this._resetHighlights();
    this.dispatchEvent(new CustomEvent('model', { detail: { id } }));
    return m;
  }

  _setOpacity(m, k) {
    m.group.traverse((o) => {
      if (o.isMesh && o.material && o.material.userData && !o.userData.sectionHelper) {
        const base = o.material.userData.baseOpacity ?? 1;
        o.material.transparent = k < 1 || base < 1;
        o.material.opacity = base * k;
      }
    });
  }

  frame(animate = true) {
    const m = this.current;
    if (!m) return;
    const { center, radius } = m.frame;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect);
    const wide = this.camera.aspect > 1.15;
    const dist = (radius / Math.sin(Math.min(fov, hfov) / 2)) * (wide ? 1.12 : 0.9);
    const dir = (m.frame.dir || new THREE.Vector3(0.18, 0.12, 1)).clone().normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    // geser bidikan agar model tidak tertutup judul (kiri atas) dan dock (bawah)
    const target = center.clone().addScaledVector(right, wide ? -radius * 0.22 : 0).add(new THREE.Vector3(0, -radius * (wide ? 0.08 : 0.16), 0));
    const pos = target.clone().addScaledVector(dir, dist);
    this._moveCamera(pos, target, animate ? 0.9 : 0);
  }

  _moveCamera(pos, target, dur) {
    if (!dur) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    const p0 = this.camera.position.clone(), t0 = this.controls.target.clone();
    this._tween(dur, (t) => {
      const k = ease(t);
      this.camera.position.lerpVectors(p0, pos, k);
      this.controls.target.lerpVectors(t0, target, k);
    });
  }

  focusPart(pid) {
    const m = this.current;
    if (!m || !m.pins.has(pid) || this.mode !== '3d') return;
    const obj = m.pins.get(pid);
    const wp = obj.getWorldPosition(new THREE.Vector3());
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const dist = Math.max(2.2, m.frame.radius * 1.05);
    this.controls.autoRotate = false;
    this._userMoved = true;
    this._moveCamera(wp.clone().addScaledVector(dir, dist), wp, 0.9);
  }

  /** Perbesar ke sebuah titik dunia (mis. hasil klik ganda). */
  focusPoint(p) {
    if (this.mode !== '3d') return;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const dist = Math.max(this.controls.minDistance * 2, this.camera.position.distanceTo(this.controls.target) * 0.45);
    this.controls.autoRotate = false;
    this._userMoved = true;
    this.dispatchEvent(new Event('interact'));
    this._moveCamera(p.clone().addScaledVector(dir, dist), p.clone(), 0.7);
  }

  /** Zoom bertahap (k < 1 = mendekat). */
  zoom(k) {
    const c = this.controls;
    const off = this.camera.position.clone().sub(c.target);
    const len = THREE.MathUtils.clamp(off.length() * k, c.minDistance, c.maxDistance);
    this._userMoved = true;
    this._moveCamera(c.target.clone().add(off.setLength(len)), c.target.clone(), 0.35);
  }

  /** Mode geser: seret satu jari/klik kiri untuk menggeser kamera, bukan memutar. */
  setPanMode(on) {
    const c = this.controls;
    c.mouseButtons.LEFT = on ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    c.mouseButtons.RIGHT = on ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
    c.touches.ONE = on ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    this.panMode = on;
  }

  /** Tata letak label: garis penanda dari titik bagian ke kotak nama, disebar keluar & tidak bertumpuk. */
  _layoutPins() {
    const m = this.current;
    if (!m || this.renderer.xr.isPresenting) return;
    const el = this.renderer.domElement;
    const W = el.clientWidth, H = el.clientHeight;
    const toPx = (v) => { v.project(this.camera); return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H }; };
    const c = toPx(m.group.localToWorld(m.frame.center.clone()));
    const items = [];
    for (const [pid, obj] of m.pins) {
      if (!obj.visible) continue;
      const p = toPx(obj.getWorldPosition(new THREE.Vector3()));
      let dx = p.x - c.x, dy = (p.y - c.y) * 0.5;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) dx = 1;
      const len = Math.hypot(dx, dy);
      const L = pid === this.selectedId ? 64 : 52;
      const side = dx < 0 ? -1 : 1;
      items.push({ obj, p, side, ex: p.x + (dx / len) * L + side * 14, ey: p.y + (dy / len) * L });
    }
    for (const side of [-1, 1]) {
      const col = items.filter((i) => i.side === side).sort((a, b) => a.ey - b.ey);
      for (let i = 1; i < col.length; i++) if (col[i].ey - col[i - 1].ey < 24) col[i].ey = col[i - 1].ey + 24;
    }
    for (const it of items) {
      const ox = it.ex - it.p.x, oy = it.ey - it.p.y;
      const len = Math.hypot(ox, oy), ang = Math.atan2(oy, ox);
      const e = it.obj.element;
      const line = e.children[1], text = e.children[2];
      line.style.width = len.toFixed(1) + 'px';
      line.style.transform = `rotate(${ang.toFixed(3)}rad)`;
      text.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) translate(${it.side < 0 ? '-100%' : '0'}, -50%)`;
      e.classList.toggle('left', it.side < 0);
    }
  }

  // ---------- Kontrol tampilan ----------
  setLabels(on) { this.showLabels = on; this._applyLabels(); }
  _applyLabels() {
    for (const m of this.models.values()) {
      for (const [pid, obj] of m.pins) {
        const minor = m.minorPins?.includes(pid);
        const inner = m.getInner?.();
        const hidden = (m.innerOnly?.includes(pid) && !inner) || (m.outerOnly?.includes(pid) && inner);
        obj.visible = m === this.current && !hidden && ((this.showLabels && !minor) || pid === this.selectedId);
        obj.element.classList.toggle('is-active', pid === this.selectedId);
      }
    }
  }
  setInner(on) { this.current?.setInner(on); this._applyLabels(); }
  getInner() { return this.current?.getInner(); }
  setAutoRotate(on) { this.controls.autoRotate = on; }
  reset() { this._userMoved = false; this.select(null); this.frame(true); }

  // ---------- Picking ----------
  _pickables() {
    const out = [];
    this.current?.group.traverse((o) => {
      if ((o.isMesh || o.isInstancedMesh) && !o.userData.noPick && o.userData.partId) out.push(o);
    });
    return out;
  }

  _visible(o) {
    for (let p = o; p; p = p.parent) if (!p.visible) return false;
    return true;
  }

  /** Raycast → {partId, point} dengan aturan "tembus" untuk pembungkus transparan. */
  pick(ndc, camera = this.camera) {
    if (!this.current) return null;
    this.raycaster.setFromCamera(ndc, camera);
    return this._pickRay();
  }
  pickRay(origin, dir) {
    if (!this.current) return null;
    this.raycaster.set(origin, dir);
    return this._pickRay();
  }
  _pickRay() {
    const hits = this.raycaster.intersectObjects(this._pickables(), false).filter((h) => this._visible(h.object));
    let fallback = null;
    for (const h of hits) {
      const o = h.object;
      const transparent = o.material && o.material.opacity < 0.95;
      if (o.userData.shell && transparent) { if (!fallback) fallback = h; continue; }
      if (o.material?.clippingPlanes && this.current.section?.isClipped(h.point)) continue; // bagian yang terpotong
      return this._hitToPart(h);
    }
    return fallback ? this._hitToPart(fallback) : null;
  }
  _hitToPart(h) {
    const o = h.object;
    let pid = o.userData.partId;
    if (o.userData.resolver) pid = o.userData.resolver(o.worldToLocal(h.point.clone()));
    return { partId: pid, point: h.point };
  }

  // ---------- Highlight ----------
  _resetHighlights() {
    for (const m of this.models.values()) {
      m.group.traverse((o) => {
        if (o.isMesh && o.material?.emissive && o.material.userData.baseEmissive) {
          o.material.emissive.copy(o.material.userData.baseEmissive);
          o.material.emissiveIntensity = 1;
        }
      });
    }
  }
  _paint() {
    if (!this.current) return;
    const t = this.elapsed;
    const pulse = 0.55 + 0.25 * Math.sin(t * 4);
    this.current.group.traverse((o) => {
      if (!o.isMesh || !o.material?.emissive || !o.material.userData.baseEmissive) return;
      const pid = o.userData.partId;
      const sel = pid && pid === this.selectedId;
      const hov = pid && pid === this.hoverId;
      if (o.userData.resolver) {
        // seluruh paru/hati: sorot ringan saja bila lobusnya dipilih
        const lobes = [this.selectedId, this.hoverId];
        const mine = lobes.some((l) => l && o.userData.resolverIds?.includes(l));
        o.material.emissive.copy(o.material.userData.baseEmissive);
        if (mine) o.material.emissive.add(new THREE.Color('#6a2a12').multiplyScalar(sel ? pulse : 0.6));
        return;
      }
      o.material.emissive.copy(o.material.userData.baseEmissive);
      if (sel) o.material.emissive.add(new THREE.Color('#ffb36b').multiplyScalar(0.55 * pulse));
      else if (hov) o.material.emissive.add(new THREE.Color('#ffd2a8').multiplyScalar(0.22));
    });
  }

  _setHover(pid) {
    if (pid === this.hoverId) return;
    this.hoverId = pid;
    this.renderer.domElement.style.cursor = pid ? 'pointer' : '';
    this.dispatchEvent(new CustomEvent('hover', { detail: { partId: pid, client: this._hoverClient } }));
  }

  select(pid, { source = 'api', focus = false } = {}) {
    this.selectedId = pid;
    this._applyLabels();
    if (pid && focus) this.focusPart(pid);
    this.dispatchEvent(new CustomEvent('select', { detail: { partId: pid, source } }));
  }

  // ---------- Mode kamera / AR ----------
  setMode(mode) {
    this.mode = mode;
    this.controls.enabled = mode !== 'xr';
    this.shadow.visible = true;
    this.container.classList.toggle('is-camera', mode === 'camera');
    if (mode === '3d') { this.root.position.set(0, 0, 0); this.root.scale.setScalar(1); this.root.quaternion.identity(); this.frame(true); }
    if (mode === 'camera') { this.root.position.set(0, 0, 0); this.root.scale.setScalar(1); this.frame(true); this.controls.autoRotate = false; }
  }

  /** Tempatkan organ pada pose (matriks hit-test) di ruang nyata. */
  placeAt(matrix, sizeMeters = 0.35) {
    const m = this.current;
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    matrix.decompose(pos, q, s);
    const scale = sizeMeters / (m.frame.radius * 2);
    this.root.scale.setScalar(scale);
    this.root.position.copy(pos).add(new THREE.Vector3(0, -m.floorY * scale, 0));
    // hadapkan ke kamera (hanya rotasi Y)
    const cam = this.renderer.xr.getCamera();
    const cp = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const yaw = Math.atan2(cp.x - pos.x, cp.z - pos.z);
    this.root.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.placed = true;
  }

  _gaze() {
    let cam = this.camera;
    if (this.renderer.xr.isPresenting) cam = this.renderer.xr.getCamera();
    const o = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    const d = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(cam.matrixWorld)).normalize();
    const hit = this.pickRay(o, d);
    const pid = hit?.partId || null;
    if (pid !== this.gazeId) {
      this.gazeId = pid;
      this.dispatchEvent(new CustomEvent('gaze', { detail: { partId: pid } }));
    }
  }

  // ---------- Loop ----------
  _tween(dur, fn, done) { this.tweens.push({ t: 0, dur, fn, done }); }

  _tick(frame) {
    if (frame && this.onXRFrame) this.onXRFrame(frame);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = (this.elapsed += dt);
    this.tweens = this.tweens.filter((tw) => {
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) { tw.done?.(); return false; }
      return true;
    });
    if (this.current) {
      this.current.section?.update();
      this.current.update?.(t, dt);
      const cam = this.renderer.xr.isPresenting ? this.renderer.xr.getCamera() : this.camera;
      if (this.current.insetBillboard) {
        const ring = this.current.insetBillboard;
        const pq = ring.parent.getWorldQuaternion(new THREE.Quaternion());
        const cq = new THREE.Quaternion().setFromRotationMatrix(cam.matrixWorld);
        ring.quaternion.copy(pq.invert().multiply(cq));
      }
    }
    if (this._pendingHover && this.mode === '3d') {
      const hit = this.pick(this._pendingHover);
      this._setHover(hit?.partId || null);
      this._pendingHover = null;
    }
    if (this.mode !== '3d' && (this._gazeT = (this._gazeT || 0) + dt) > 0.15) { this._gazeT = 0; this._gaze(); }
    this._paint();
    if (this.mode !== 'xr') this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (!this.renderer.xr.isPresenting) { this._layoutPins(); this.labels.render(this.scene, this.camera); }
  }
}
