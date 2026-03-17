// cube shape — the original QR cube geometry engine
// this file is intentionally dense — it's the proven geometry core, do not refactor

import * as THREE from 'three';
import { registerShape, FACE_TABLE } from '../state.js';
import { pushTri, pushQuad, buildWall, flipGeometryNormals } from '../geometry.js';
import { getQRModules, distributeURLs } from '../qr.js';
import state from '../state.js';

function buildFaceGeometry(faceIndex, qrData, size, depth, inset, uniformTotal) {
  const face = FACE_TABLE[faceIndex];
  const n = new THREE.Vector3(...face.normal);
  const u = new THREE.Vector3(...face.uAxis);
  const v = new THREE.Vector3(...face.vAxis);
  const half = size / 2;
  const center = n.clone().multiplyScalar(half);
  const innerHalf = half - (inset || 0);
  const innerSize = innerHalf * 2;
  if (!qrData || qrData.error) {
    return buildBlankFace(center, u, v, n, innerSize, uniformTotal);
  }
  const { grid, count } = qrData;
  const totalModules = uniformTotal || (count + 8);
  const quietZone = Math.floor((totalModules - count) / 2);
  const positions = [];
  const normals = [];
  function cellDark(row, col) { const qr = row - quietZone; const qc = col - quietZone; if (qr < 0 || qr >= count || qc < 0 || qc >= count) return false; return grid[qr][qc] === 1; }
  function cellDepth(row, col) { return cellDark(row, col) ? -depth : 0; }
  for (let row = 0; row < totalModules; row++) {
    for (let col = 0; col < totalModules; col++) {
      const d = cellDepth(row, col);
      const u0 = (col / totalModules - 0.5) * innerSize;
      const u1 = ((col + 1) / totalModules - 0.5) * innerSize;
      const v0 = (0.5 - row / totalModules) * innerSize;
      const v1 = (0.5 - (row + 1) / totalModules) * innerSize;
      const p00 = center.clone().add(u.clone().multiplyScalar(u0)).add(v.clone().multiplyScalar(v0)).add(n.clone().multiplyScalar(d));
      const p10 = center.clone().add(u.clone().multiplyScalar(u1)).add(v.clone().multiplyScalar(v0)).add(n.clone().multiplyScalar(d));
      const p11 = center.clone().add(u.clone().multiplyScalar(u1)).add(v.clone().multiplyScalar(v1)).add(n.clone().multiplyScalar(d));
      const p01 = center.clone().add(u.clone().multiplyScalar(u0)).add(v.clone().multiplyScalar(v1)).add(n.clone().multiplyScalar(d));
      pushQuad(positions, normals, p00, p10, p11, p01, n);
      if (col < totalModules - 1) { const dRight = cellDepth(row, col + 1); if (d !== dRight) { buildWall(positions, normals, center, u, v, n, u1, v0, v1, d, dRight, 'right'); } }
      if (row < totalModules - 1) { const dBelow = cellDepth(row + 1, col); if (d !== dBelow) { buildWall(positions, normals, center, u, v, n, u0, u1, v1, d, dBelow, 'bottom'); } }
    }
  }
  // border walls for engraved edge modules
  for (let col = 0; col < totalModules; col++) { const d = cellDepth(0, col); if (d !== 0) { const uL = (col / totalModules - 0.5) * innerSize; const uR = ((col + 1) / totalModules - 0.5) * innerSize; const vTop = 0.5 * innerSize; const pA = center.clone().add(u.clone().multiplyScalar(uL)).add(v.clone().multiplyScalar(vTop)).add(n.clone().multiplyScalar(0)); const pB = center.clone().add(u.clone().multiplyScalar(uR)).add(v.clone().multiplyScalar(vTop)).add(n.clone().multiplyScalar(0)); const pC = center.clone().add(u.clone().multiplyScalar(uR)).add(v.clone().multiplyScalar(vTop)).add(n.clone().multiplyScalar(d)); const pD = center.clone().add(u.clone().multiplyScalar(uL)).add(v.clone().multiplyScalar(vTop)).add(n.clone().multiplyScalar(d)); pushQuad(positions, normals, pA, pB, pC, pD, v.clone().negate()); } }
  for (let col = 0; col < totalModules; col++) { const d = cellDepth(totalModules - 1, col); if (d !== 0) { const uL = (col / totalModules - 0.5) * innerSize; const uR = ((col + 1) / totalModules - 0.5) * innerSize; const vBot = -0.5 * innerSize; const pA = center.clone().add(u.clone().multiplyScalar(uR)).add(v.clone().multiplyScalar(vBot)).add(n.clone().multiplyScalar(0)); const pB = center.clone().add(u.clone().multiplyScalar(uL)).add(v.clone().multiplyScalar(vBot)).add(n.clone().multiplyScalar(0)); const pC = center.clone().add(u.clone().multiplyScalar(uL)).add(v.clone().multiplyScalar(vBot)).add(n.clone().multiplyScalar(d)); const pD = center.clone().add(u.clone().multiplyScalar(uR)).add(v.clone().multiplyScalar(vBot)).add(n.clone().multiplyScalar(d)); pushQuad(positions, normals, pA, pB, pC, pD, v.clone()); } }
  for (let row = 0; row < totalModules; row++) { const d = cellDepth(row, 0); if (d !== 0) { const uL = -0.5 * innerSize; const vT = (0.5 - row / totalModules) * innerSize; const vB = (0.5 - (row + 1) / totalModules) * innerSize; const pA = center.clone().add(u.clone().multiplyScalar(uL)).add(v.clone().multiplyScalar(vB)).add(n.clone().multiplyScalar(0)); const pB = center.clone().add(u.clone().multiplyScalar(uL)).add(v.clone().multiplyScalar(vT)).add(n.clone().multiplyScalar(0)); const pC = center.clone().add(u.clone().multiplyScalar(uL)).add(v.clone().multiplyScalar(vT)).add(n.clone().multiplyScalar(d)); const pD = center.clone().add(u.clone().multiplyScalar(uL)).add(v.clone().multiplyScalar(vB)).add(n.clone().multiplyScalar(d)); pushQuad(positions, normals, pA, pB, pC, pD, u.clone()); } }
  for (let row = 0; row < totalModules; row++) { const d = cellDepth(row, totalModules - 1); if (d !== 0) { const uR = 0.5 * innerSize; const vT = (0.5 - row / totalModules) * innerSize; const vB = (0.5 - (row + 1) / totalModules) * innerSize; const pA = center.clone().add(u.clone().multiplyScalar(uR)).add(v.clone().multiplyScalar(vT)).add(n.clone().multiplyScalar(0)); const pB = center.clone().add(u.clone().multiplyScalar(uR)).add(v.clone().multiplyScalar(vB)).add(n.clone().multiplyScalar(0)); const pC = center.clone().add(u.clone().multiplyScalar(uR)).add(v.clone().multiplyScalar(vB)).add(n.clone().multiplyScalar(d)); const pD = center.clone().add(u.clone().multiplyScalar(uR)).add(v.clone().multiplyScalar(vT)).add(n.clone().multiplyScalar(d)); pushQuad(positions, normals, pA, pB, pC, pD, u.clone().negate()); } }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function buildBlankFace(center, u, v, n, size, subdivisions) {
  const positions = [];
  const normals = [];
  const N = subdivisions || 1;
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const u0 = (col / N - 0.5) * size;
      const u1 = ((col + 1) / N - 0.5) * size;
      const v0 = (0.5 - row / N) * size;
      const v1 = (0.5 - (row + 1) / N) * size;
      const p00 = center.clone().add(u.clone().multiplyScalar(u0)).add(v.clone().multiplyScalar(v0));
      const p10 = center.clone().add(u.clone().multiplyScalar(u1)).add(v.clone().multiplyScalar(v0));
      const p11 = center.clone().add(u.clone().multiplyScalar(u1)).add(v.clone().multiplyScalar(v1));
      const p01 = center.clone().add(u.clone().multiplyScalar(u0)).add(v.clone().multiplyScalar(v1));
      pushQuad(positions, normals, p00, p10, p11, p01, n);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function buildEdgeTreatment(size, C, mode, uniformN) {
  if (C <= 0 || mode === 'none') return null;
  const positions = [];
  const normals = [];
  const half = size / 2;
  const edgeHalf = half - C;
  const EDGE_PAIRS = [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]];
  for (const [fi, fj] of EDGE_PAIRS) {
    const n1 = new THREE.Vector3(...FACE_TABLE[fi].normal);
    const n2 = new THREE.Vector3(...FACE_TABLE[fj].normal);
    const edgeDir = new THREE.Vector3().crossVectors(n1, n2).normalize();
    const N = uniformN;
    if (mode === 'chamfer') {
      for (let k = 0; k < N; k++) { const tA = (k / N - 0.5) * 2 * edgeHalf; const tB = ((k + 1) / N - 0.5) * 2 * edgeHalf; const a = n1.clone().multiplyScalar(half).add(n2.clone().multiplyScalar(edgeHalf)).add(edgeDir.clone().multiplyScalar(tA)); const b = n1.clone().multiplyScalar(half).add(n2.clone().multiplyScalar(edgeHalf)).add(edgeDir.clone().multiplyScalar(tB)); const c = n1.clone().multiplyScalar(edgeHalf).add(n2.clone().multiplyScalar(half)).add(edgeDir.clone().multiplyScalar(tB)); const d = n1.clone().multiplyScalar(edgeHalf).add(n2.clone().multiplyScalar(half)).add(edgeDir.clone().multiplyScalar(tA)); const norm = n1.clone().add(n2).normalize(); pushQuad(positions, normals, a, b, c, d, norm); }
    } else if (mode === 'fillet') {
      const segments = 8;
      const centerLine = n1.clone().multiplyScalar(half - C).add(n2.clone().multiplyScalar(half - C));
      for (let k = 0; k < N; k++) { const tA = (k / N - 0.5) * 2 * edgeHalf; const tB = ((k + 1) / N - 0.5) * 2 * edgeHalf; for (let s = 0; s < segments; s++) { const t0 = (s / segments) * Math.PI / 2; const t1 = ((s + 1) / segments) * Math.PI / 2; const r0 = centerLine.clone().add(n1.clone().multiplyScalar(C * Math.cos(t0))).add(n2.clone().multiplyScalar(C * Math.sin(t0))); const r1 = centerLine.clone().add(n1.clone().multiplyScalar(C * Math.cos(t1))).add(n2.clone().multiplyScalar(C * Math.sin(t1))); const a = r0.clone().add(edgeDir.clone().multiplyScalar(tA)); const b = r0.clone().add(edgeDir.clone().multiplyScalar(tB)); const c = r1.clone().add(edgeDir.clone().multiplyScalar(tB)); const d = r1.clone().add(edgeDir.clone().multiplyScalar(tA)); const mt = (t0 + t1) / 2; const norm = n1.clone().multiplyScalar(Math.cos(mt)).add(n2.clone().multiplyScalar(Math.sin(mt))).normalize(); pushQuad(positions, normals, a, b, c, d, norm); } }
    }
  }
  // corner caps
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const norm = new THREE.Vector3(sx, sy, sz).normalize();
        if (mode === 'chamfer') {
          const p1 = new THREE.Vector3(sx * half, sy * edgeHalf, sz * edgeHalf);
          const p2 = new THREE.Vector3(sx * edgeHalf, sy * half, sz * edgeHalf);
          const p3 = new THREE.Vector3(sx * edgeHalf, sy * edgeHalf, sz * half);
          const ab = new THREE.Vector3().subVectors(p2, p1); const ac = new THREE.Vector3().subVectors(p3, p1); const cross = new THREE.Vector3().crossVectors(ab, ac);
          if (cross.dot(norm) >= 0) { pushTri(positions, normals, p1, p2, p3, norm); } else { pushTri(positions, normals, p1, p3, p2, norm); }
        } else if (mode === 'fillet') {
          const center = new THREE.Vector3(sx * (half - C), sy * (half - C), sz * (half - C));
          const nX = new THREE.Vector3(sx, 0, 0); const nY = new THREE.Vector3(0, sy, 0); const nZ = new THREE.Vector3(0, 0, sz);
          const segs = 4;
          for (let i = 0; i < segs; i++) { const phi0 = (i / segs) * Math.PI / 2; const phi1 = ((i + 1) / segs) * Math.PI / 2; for (let j = 0; j < segs; j++) { const t0 = (j / segs) * Math.PI / 2; const t1 = ((j + 1) / segs) * Math.PI / 2; const pt = (ph, th) => { const cosPh = Math.cos(ph), sinPh = Math.sin(ph), cosTh = Math.cos(th), sinTh = Math.sin(th); return center.clone().add(nX.clone().multiplyScalar(C * cosPh * cosTh)).add(nY.clone().multiplyScalar(C * sinPh)).add(nZ.clone().multiplyScalar(C * cosPh * sinTh)); }; const nm = (ph, th) => { const cosPh = Math.cos(ph), sinPh = Math.sin(ph), cosTh = Math.cos(th), sinTh = Math.sin(th); return new THREE.Vector3(sx * cosPh * cosTh, sy * sinPh, sz * cosPh * sinTh).normalize(); }; const a = pt(phi0, t0), b = pt(phi0, t1), c = pt(phi1, t1), d = pt(phi1, t0); const midPhi = (phi0 + phi1) / 2, midT = (t0 + t1) / 2; pushQuad(positions, normals, a, b, c, d, nm(midPhi, midT)); } }
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

// build the cube — returns { meshes, warnings, triCount, hasQR }
function build(params, materials) {
  const { size, depth, edgeMode, edgeSize, normalsFlipped } = params;
  const faceURLs = distributeURLs();
  const warnings = [];
  const meshes = [];

  if (size < 32) {
    warnings.push({ face: 'All', msg: 'Cube under 32mm — may be too small for most printers.' });
  }

  let hasAnyQR = false;
  let totalTris = 0;
  const faceQRData = [];
  let maxQRCount = 0;

  for (let i = 0; i < 6; i++) {
    const url = faceURLs[i];
    let qrData = null;
    if (url) {
      qrData = getQRModules(url);
      if (qrData && qrData.error) {
        warnings.push({ face: FACE_TABLE[i].name, msg: qrData.error });
        qrData = null;
      } else if (qrData) {
        hasAnyQR = true;
        if (qrData.count > maxQRCount) maxQRCount = qrData.count;
        const effectiveSize = edgeMode !== 'none' ? size - 2 * edgeSize : size;
        const pitch = effectiveSize / (qrData.count + 8);
        if (pitch < 1.0) {
          warnings.push({ face: FACE_TABLE[i].name, msg: `Module pitch ${pitch.toFixed(2)}mm — may be too small to print. Use a shorter URL or larger cube.` });
        }
      }
    }
    faceQRData.push(qrData);
  }

  const uniformTotal = maxQRCount > 0 ? maxQRCount + 8 : 29;
  const shadowsOn = params.shadowsOn;

  for (let i = 0; i < 6; i++) {
    const qrData = faceQRData[i];
    const inset = edgeMode !== 'none' ? edgeSize : 0;
    const geo = buildFaceGeometry(i, qrData, size, depth, inset, uniformTotal);
    if (normalsFlipped) flipGeometryNormals(geo);
    const mesh = new THREE.Mesh(geo, materials.matDefault);
    mesh.castShadow = shadowsOn;
    mesh.receiveShadow = shadowsOn;
    mesh.userData.faceIndex = i;
    meshes.push(mesh);
    totalTris += geo.attributes.position.count / 3;
    if (materials.matOverlay) {
      const overlay = new THREE.Mesh(geo, materials.matOverlay);
      overlay.userData.faceIndex = -2;
      meshes.push(overlay);
    }
  }

  if (edgeMode !== 'none' && edgeSize > 0) {
    const edgeGeo = buildEdgeTreatment(size, edgeSize, edgeMode, uniformTotal);
    if (edgeGeo) {
      if (normalsFlipped) flipGeometryNormals(edgeGeo);
      const edgeMesh = new THREE.Mesh(edgeGeo, materials.matDefault);
      edgeMesh.castShadow = shadowsOn;
      edgeMesh.receiveShadow = shadowsOn;
      edgeMesh.userData.faceIndex = -1;
      meshes.push(edgeMesh);
      totalTris += edgeGeo.attributes.position.count / 3;
      if (materials.matOverlay) {
        const edgeOverlay = new THREE.Mesh(edgeGeo, materials.matOverlay);
        edgeOverlay.userData.faceIndex = -2;
        meshes.push(edgeOverlay);
      }
    }
  }

  return { meshes, warnings, triCount: totalTris, hasQR: hasAnyQR };
}

registerShape('cube', {
  name: 'Cube',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L22 8V16L12 22L2 16V8Z"/><line x1="12" y1="22" x2="12" y2="8"/><line x1="22" y1="8" x2="12" y2="14"/><line x1="2" y1="8" x2="12" y2="14"/></svg>',
  maxFaces: 6,
  urlLabel: 'URLs (up to 6)',
  build,
  getGroundY: (size) => -(size / 2) - 0.05,
  sizeRange: { min: 20, max: 200, default: 44, step: 1 },
  sizeLabel: 'Cube Size',
  sizeHint: 'Larger = more detail and easier to scan',
  hasEdges: true,
});

export default {};
