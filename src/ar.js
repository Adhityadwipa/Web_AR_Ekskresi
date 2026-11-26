import * as THREE from 'three';

/**
 * AR dua jalur:
 *  1. WebXR immersive-ar (Android Chrome, dsb.) dengan hit-test: organ ditaruh di permukaan nyata.
 *  2. Mode kamera (fallback, mis. iPhone/laptop): video kamera di belakang model 3D.
 * Pada kedua mode, titik bidik di tengah layar menentukan bagian yang "diamati" (gaze).
 */
export class ARController extends EventTarget {
  constructor(viewer, { overlay, video }) {
    super();
    this.viewer = viewer;
    this.overlay = overlay;
    this.video = video;
    this.session = null;
    this.stream = null;
    this.size = 0.4; // meter
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.075, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }),
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 24).rotateX(-Math.PI / 2), this.reticle.material);
    this.reticle.add(dot);
  }

  async support() {
    let xr = false;
    try { xr = !!(navigator.xr && (await navigator.xr.isSessionSupported('immersive-ar'))); } catch { xr = false; }
    const camera = !!navigator.mediaDevices?.getUserMedia;
    return { xr, camera, secure: window.isSecureContext };
  }

  async start() {
    const s = await this.support();
    if (s.xr) return this.startXR();
    if (s.camera) return this.startCamera();
    throw new Error(s.secure ? 'Perangkat ini tidak mendukung AR maupun kamera.' : 'AR membutuhkan koneksi HTTPS.');
  }

  async startXR() {
    const v = this.viewer;
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'light-estimation'],
      domOverlay: { root: this.overlay },
    });
    this.session = session;
    v.renderer.xr.setReferenceSpaceType('local');
    await v.renderer.xr.setSession(session);
    const viewerSpace = await session.requestReferenceSpace('viewer');
    this.hitSource = await session.requestHitTestSource({ space: viewerSpace });
    v.scene.add(this.reticle);
    v.root.visible = false;
    v.placed = false;
    v.setMode('xr');
    v.onXRFrame = (frame) => this._onFrame(frame);
    // ketukan pada UI overlay tidak boleh dianggap "select" di dunia AR
    this.overlay.querySelectorAll('[data-xr-ui]').forEach((el) => el.addEventListener('beforexrselect', (e) => e.preventDefault()));
    session.addEventListener('select', () => {
      if (!this.reticle.visible) return;
      v.placeAt(this.reticle.matrix, this.size);
      v.root.visible = true;
      this.dispatchEvent(new CustomEvent('placed'));
    });
    session.addEventListener('end', () => this._endXR());
    this.dispatchEvent(new CustomEvent('state', { detail: { mode: 'xr' } }));
    return 'xr';
  }

  _onFrame(frame) {
    if (!frame || !this.hitSource) return;
    const ref = this.viewer.renderer.xr.getReferenceSpace();
    const hits = frame.getHitTestResults(this.hitSource);
    if (hits.length) {
      const pose = hits[0].getPose(ref);
      this.reticle.visible = true;
      this.reticle.matrix.fromArray(pose.transform.matrix);
    } else this.reticle.visible = false;
    if (this._found !== this.reticle.visible) {
      this._found = this.reticle.visible;
      this.dispatchEvent(new CustomEvent('surface', { detail: { found: this._found } }));
    }
  }

  _endXR() {
    const v = this.viewer;
    this.hitSource?.cancel?.();
    this.hitSource = null;
    this.session = null;
    v.onXRFrame = null;
    v.scene.remove(this.reticle);
    v.root.visible = true;
    v.setMode('3d');
    v.resize();
    this.dispatchEvent(new CustomEvent('state', { detail: { mode: '3d' } }));
  }

  async startCamera() {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => {});
    this.viewer.setMode('camera');
    this.dispatchEvent(new CustomEvent('state', { detail: { mode: 'camera' } }));
    return 'camera';
  }

  scaleBy(k) {
    const v = this.viewer;
    if (v.mode === 'xr') {
      this.size = Math.min(2, Math.max(0.1, this.size * k));
      if (v.placed) {
        const floor = v.current.floorY;
        const old = v.root.scale.x;
        const s = this.size / (v.current.frame.radius * 2);
        v.root.position.y += floor * (old - s);
        v.root.scale.setScalar(s);
      }
    } else if (v.mode === 'camera') {
      v.camera.position.sub(v.controls.target).multiplyScalar(1 / k).add(v.controls.target);
    }
  }

  async stop() {
    if (this.session) { await this.session.end(); return; }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      this.video.srcObject = null;
    }
    this.viewer.setMode('3d');
    this.dispatchEvent(new CustomEvent('state', { detail: { mode: '3d' } }));
  }
}
