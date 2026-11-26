import * as THREE from 'three';

/**
 * Penampang (potongan) organ yang padat, tanpa transparansi.
 *
 * - Semua mesh yang didaftarkan dipotong oleh satu bidang (clipping plane).
 * - Setiap "solid" (organ tertutup, mis. paru/hati) diberi tutup potongan (cap)
 *   menggunakan stencil buffer, sehingga permukaan irisan tampak padat dan bertekstur.
 * - "holes" (saluran di dalam solid, mis. bronkus/pembuluh) mengurangi stencil,
 *   sehingga saluran tampak terbelah dan rongganya terlihat.
 *
 * Bidang didefinisikan di koordinat lokal grup organ dan diperbarui ke dunia setiap
 * frame (agar tetap benar saat organ dipindah di AR).
 */
export class Section {
  constructor(group, localPlane, { size = 8 } = {}) {
    this.group = group;
    this.local = localPlane.clone();
    this.world = localPlane.clone();
    this.planes = [this.world];
    this.size = size;
    this.clipped = new Set();
    this.helpers = [];
    this.enabled = false;
    this.order = 10;
  }

  /** Daftarkan mesh agar ikut terpotong. */
  clip(...meshes) {
    for (const m of meshes.flat()) m.traverse?.((o) => { if (o.isMesh && !o.userData.noClip) this.clipped.add(o); });
    return this;
  }

  /** Tambahkan tutup potongan untuk mesh tertutup `solid`, dengan saluran `holes` di dalamnya. */
  cap(solid, capMaterial, holes = []) {
    const base = this.order;
    this.order += 3;
    const stencilMat = (side, op) => new THREE.MeshBasicMaterial({
      side, colorWrite: false, depthWrite: false, depthTest: false,
      stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc,
      stencilFail: op, stencilZFail: op, stencilZPass: op,
    });
    const addStencil = (mesh, invert) => {
      for (const [side, op] of [[THREE.BackSide, invert ? THREE.DecrementWrapStencilOp : THREE.IncrementWrapStencilOp], [THREE.FrontSide, invert ? THREE.IncrementWrapStencilOp : THREE.DecrementWrapStencilOp]]) {
        const s = new THREE.Mesh(mesh.geometry, stencilMat(side, op));
        s.renderOrder = base;
        s.userData = { noPick: true, sectionHelper: true, stencil: true };
        s.castShadow = s.receiveShadow = false;
        s.visible = false;
        if (mesh.isInstancedMesh) continue;
        mesh.add(s);
        this.helpers.push(s);
      }
    };
    addStencil(solid, false);
    for (const h of holes) addStencil(h, true);

    const mat = capMaterial;
    Object.assign(mat, {
      stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp,
      side: THREE.DoubleSide,
    });
    const capMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), mat);
    const n = this.local.normal.clone();
    capMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().negate());
    capMesh.position.copy(n).multiplyScalar(-this.local.constant);
    capMesh.renderOrder = base + 1;
    capMesh.userData = { noPick: true, sectionHelper: true, cap: true };
    capMesh.onAfterRender = (renderer) => renderer.clearStencil();
    capMesh.visible = false;
    this.group.add(capMesh);
    this.helpers.push(capMesh);
    this.clip(solid, holes);
    return capMesh;
  }

  /** Dipanggil setelah material di-clone oleh viewer. */
  setEnabled(on) {
    this.enabled = on;
    for (const m of this.clipped) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        mat.clippingPlanes = on ? this.planes : null;
        mat.clipShadows = true;
        if (on) mat.side = THREE.DoubleSide;
        else if (mat.userData.origSide !== undefined) mat.side = mat.userData.origSide;
        mat.needsUpdate = true;
      }
    }
    for (const h of this.helpers) {
      h.visible = on;
      if (h.userData.stencil) { h.material.clippingPlanes = on ? this.planes : null; h.material.needsUpdate = true; }
    }
  }

  /** Simpan sisi asli material sebelum diubah menjadi DoubleSide. */
  remember() {
    for (const m of this.clipped) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) if (mat.userData.origSide === undefined) mat.userData.origSide = mat.side;
    }
  }

  update() {
    this.group.updateWorldMatrix(true, false);
    this.world.copy(this.local).applyMatrix4(this.group.matrixWorld);
  }

  /** Apakah titik dunia berada di sisi yang terpotong (tidak terlihat)? */
  isClipped(p) {
    return this.enabled && this.world.distanceToPoint(p) < 0;
  }
}
