// pendant shape — round/oval disc with a bail (loop) for necklace chain
// single QR face on front, flat back, decorative beveled edge

import * as THREE from 'three';
import { registerShape } from '../state.js';
import { pushTri, pushQuad, flipGeometryNormals } from '../geometry.js';
import { getQRModules } from '../qr.js';
import state from '../state.js';

const PENDANT_SEGMENTS = 64; // circumference resolution
const BAIL_SEGMENTS = 24;    // bail ring resolution
const BAIL_TUBE_SEGMENTS = 12;

function buildPendantDisc(radius, thickness, depth, qrData) {
  const positions = [];
  const normals = [];

  // front face with QR engrave
  const frontN = new THREE.Vector3(0, 0, 1);
  const halfT = thickness / 2;

  if (qrData && !qrData.error) {
    const { grid, count } = qrData;
    const totalModules = count + 6;
    const quietZone = Math.floor((totalModules - count) / 2);
    // inscribed square inside circle
    const qrSize = radius * Math.SQRT2 * 0.82;
    const halfQR = qrSize / 2;

    function cellDark(row, col) {
      const qr = row - quietZone;
      const qc = col - quietZone;
      if (qr < 0 || qr >= count || qc < 0 || qc >= count) return false;
      return grid[qr][qc] === 1;
    }

    // build QR grid on front face, clipped to circle
    for (let row = 0; row < totalModules; row++) {
      for (let col = 0; col < totalModules; col++) {
        const isDark = cellDark(row, col);
        const d = isDark ? -depth : 0;
        const x0 = (col / totalModules - 0.5) * qrSize;
        const x1 = ((col + 1) / totalModules - 0.5) * qrSize;
        const y0 = (0.5 - row / totalModules) * qrSize;
        const y1 = (0.5 - (row + 1) / totalModules) * qrSize;

        // skip if entirely outside circle
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        if (cx * cx + cy * cy > radius * radius * 0.95) continue;

        const p00 = new THREE.Vector3(x0, y0, halfT + d);
        const p10 = new THREE.Vector3(x1, y0, halfT + d);
        const p11 = new THREE.Vector3(x1, y1, halfT + d);
        const p01 = new THREE.Vector3(x0, y1, halfT + d);
        pushQuad(positions, normals, p00, p10, p11, p01, frontN);

        // walls between different depths
        if (col < totalModules - 1) {
          const rightDark = cellDark(row, col + 1);
          if (isDark !== rightDark) {
            const dR = rightDark ? -depth : 0;
            const wA = new THREE.Vector3(x1, y0, halfT + d);
            const wB = new THREE.Vector3(x1, y1, halfT + d);
            const wC = new THREE.Vector3(x1, y1, halfT + dR);
            const wD = new THREE.Vector3(x1, y0, halfT + dR);
            const wn = d < dR ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(1, 0, 0);
            pushQuad(positions, normals, wA, wB, wC, wD, wn);
          }
        }
        if (row < totalModules - 1) {
          const belowDark = cellDark(row + 1, col);
          if (isDark !== belowDark) {
            const dB = belowDark ? -depth : 0;
            const wA = new THREE.Vector3(x1, y1, halfT + d);
            const wB = new THREE.Vector3(x0, y1, halfT + d);
            const wC = new THREE.Vector3(x0, y1, halfT + dB);
            const wD = new THREE.Vector3(x1, y1, halfT + dB);
            const wn = d < dB ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0);
            pushQuad(positions, normals, wA, wB, wC, wD, wn);
          }
        }
      }
    }

    // fill area outside QR but inside circle (front face)
    for (let i = 0; i < PENDANT_SEGMENTS; i++) {
      const a0 = (i / PENDANT_SEGMENTS) * Math.PI * 2;
      const a1 = ((i + 1) / PENDANT_SEGMENTS) * Math.PI * 2;
      const ox0 = Math.cos(a0) * radius;
      const oy0 = Math.sin(a0) * radius;
      const ox1 = Math.cos(a1) * radius;
      const oy1 = Math.sin(a1) * radius;
      // outer ring triangles connecting circle edge to QR boundary
      const ix0 = Math.cos(a0) * halfQR * 0.7;
      const iy0 = Math.sin(a0) * halfQR * 0.7;
      const ix1 = Math.cos(a1) * halfQR * 0.7;
      const iy1 = Math.sin(a1) * halfQR * 0.7;
      const pa = new THREE.Vector3(ox0, oy0, halfT);
      const pb = new THREE.Vector3(ox1, oy1, halfT);
      const pc = new THREE.Vector3(ix1, iy1, halfT);
      const pd = new THREE.Vector3(ix0, iy0, halfT);
      pushQuad(positions, normals, pa, pb, pc, pd, frontN);
    }
  } else {
    // blank front face — tessellated disc
    for (let i = 0; i < PENDANT_SEGMENTS; i++) {
      const a0 = (i / PENDANT_SEGMENTS) * Math.PI * 2;
      const a1 = ((i + 1) / PENDANT_SEGMENTS) * Math.PI * 2;
      const pa = new THREE.Vector3(0, 0, halfT);
      const pb = new THREE.Vector3(Math.cos(a0) * radius, Math.sin(a0) * radius, halfT);
      const pc = new THREE.Vector3(Math.cos(a1) * radius, Math.sin(a1) * radius, halfT);
      pushTri(positions, normals, pa, pb, pc, frontN);
    }
  }

  // back face
  const backN = new THREE.Vector3(0, 0, -1);
  for (let i = 0; i < PENDANT_SEGMENTS; i++) {
    const a0 = (i / PENDANT_SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / PENDANT_SEGMENTS) * Math.PI * 2;
    const pa = new THREE.Vector3(0, 0, -halfT);
    const pb = new THREE.Vector3(Math.cos(a1) * radius, Math.sin(a1) * radius, -halfT);
    const pc = new THREE.Vector3(Math.cos(a0) * radius, Math.sin(a0) * radius, -halfT);
    pushTri(positions, normals, pa, pb, pc, backN);
  }

  // edge (cylinder wall)
  for (let i = 0; i < PENDANT_SEGMENTS; i++) {
    const a0 = (i / PENDANT_SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / PENDANT_SEGMENTS) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const edgeN = new THREE.Vector3((c0 + c1) / 2, (s0 + s1) / 2, 0).normalize();
    const pa = new THREE.Vector3(c0 * radius, s0 * radius, halfT);
    const pb = new THREE.Vector3(c1 * radius, s1 * radius, halfT);
    const pc = new THREE.Vector3(c1 * radius, s1 * radius, -halfT);
    const pd = new THREE.Vector3(c0 * radius, s0 * radius, -halfT);
    pushQuad(positions, normals, pa, pb, pc, pd, edgeN);
  }

  // beveled edge ring on front (print-friendly chamfer)
  const bevel = Math.min(thickness * 0.15, 0.8);
  if (bevel > 0.05) {
    const ir = radius - bevel;
    for (let i = 0; i < PENDANT_SEGMENTS; i++) {
      const a0 = (i / PENDANT_SEGMENTS) * Math.PI * 2;
      const a1 = ((i + 1) / PENDANT_SEGMENTS) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);
      const bn = new THREE.Vector3((c0 + c1) / 2, (s0 + s1) / 2, 0.5).normalize();
      const pa = new THREE.Vector3(c0 * ir, s0 * ir, halfT);
      const pb = new THREE.Vector3(c1 * ir, s1 * ir, halfT);
      const pc = new THREE.Vector3(c1 * radius, s1 * radius, halfT - bevel);
      const pd = new THREE.Vector3(c0 * radius, s0 * radius, halfT - bevel);
      pushQuad(positions, normals, pa, pb, pc, pd, bn);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function buildBail(radius, thickness) {
  // torus-shaped bail at the top of the pendant
  // positioned so the pendant hangs naturally
  const bailRadius = radius * 0.18;     // ring radius
  const tubeRadius = thickness * 0.35;  // tube thickness
  const positions = [];
  const normals = [];

  const centerY = radius + bailRadius * 0.4;

  for (let i = 0; i < BAIL_SEGMENTS; i++) {
    const a0 = (i / BAIL_SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / BAIL_SEGMENTS) * Math.PI * 2;

    for (let j = 0; j < BAIL_TUBE_SEGMENTS; j++) {
      const b0 = (j / BAIL_TUBE_SEGMENTS) * Math.PI * 2;
      const b1 = ((j + 1) / BAIL_TUBE_SEGMENTS) * Math.PI * 2;

      const point = (a, b) => {
        const x = (bailRadius + tubeRadius * Math.cos(b)) * Math.cos(a);
        const y = centerY + (bailRadius + tubeRadius * Math.cos(b)) * Math.sin(a);
        const z = tubeRadius * Math.sin(b);
        return new THREE.Vector3(x, y, z);
      };

      const norm = (a, b) => {
        return new THREE.Vector3(
          Math.cos(b) * Math.cos(a),
          Math.cos(b) * Math.sin(a),
          Math.sin(b)
        ).normalize();
      };

      const p00 = point(a0, b0);
      const p10 = point(a1, b0);
      const p11 = point(a1, b1);
      const p01 = point(a0, b1);
      const n = norm((a0 + a1) / 2, (b0 + b1) / 2);
      pushQuad(positions, normals, p00, p10, p11, p01, n);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function build(params, materials) {
  const { size, depth, normalsFlipped } = params;
  const radius = size / 2;
  const thickness = Math.max(size * 0.08, 3); // min 3mm for print strength
  const warnings = [];
  const meshes = [];
  let totalTris = 0;
  let hasQR = false;

  // only use first URL for pendant (single front face)
  const url = state.urls.find(u => u && u.trim()) || '';
  let qrData = null;
  if (url) {
    qrData = getQRModules(url);
    if (qrData && qrData.error) {
      warnings.push({ face: 'Front', msg: qrData.error });
      qrData = null;
    } else if (qrData) {
      hasQR = true;
      const qrSize = radius * Math.SQRT2 * 0.82;
      const pitch = qrSize / (qrData.count + 6);
      if (pitch < 0.8) {
        warnings.push({ face: 'Front', msg: `Module pitch ${pitch.toFixed(2)}mm — QR may not scan. Use shorter URL or bigger pendant.` });
      }
    }
  }

  if (thickness < 2.5) {
    warnings.push({ face: 'All', msg: 'Pendant too thin for reliable printing — increase size.' });
  }
  if (size < 25) {
    warnings.push({ face: 'All', msg: 'Pendant under 25mm — QR may be too small to scan.' });
  }

  // disc body
  const discGeo = buildPendantDisc(radius, thickness, depth, qrData);
  if (normalsFlipped) flipGeometryNormals(discGeo);
  const discMesh = new THREE.Mesh(discGeo, materials.matDefault);
  discMesh.castShadow = params.shadowsOn;
  discMesh.receiveShadow = params.shadowsOn;
  discMesh.userData.faceIndex = 0;
  meshes.push(discMesh);
  totalTris += discGeo.attributes.position.count / 3;

  // bail loop
  const bailGeo = buildBail(radius, thickness);
  if (normalsFlipped) flipGeometryNormals(bailGeo);
  const bailMesh = new THREE.Mesh(bailGeo, materials.matDefault);
  bailMesh.castShadow = params.shadowsOn;
  bailMesh.receiveShadow = params.shadowsOn;
  bailMesh.userData.faceIndex = -1;
  meshes.push(bailMesh);
  totalTris += bailGeo.attributes.position.count / 3;

  if (materials.matOverlay) {
    meshes.push(new THREE.Mesh(discGeo, materials.matOverlay));
    meshes.push(new THREE.Mesh(bailGeo, materials.matOverlay));
  }

  return { meshes, warnings, triCount: totalTris, hasQR };
}

registerShape('pendant', {
  name: 'Pendant',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="14" r="7"/><path d="M12 7V3"/><circle cx="12" cy="2" r="1.5" fill="none"/></svg>',
  maxFaces: 1,
  urlLabel: 'QR URL',
  build,
  getGroundY: (size) => -(size / 2) - (size * 0.18) - 0.5,
  sizeRange: { min: 20, max: 80, default: 35, step: 1 },
  sizeLabel: 'Pendant Diameter',
  sizeHint: 'Recommend 30mm+ for scannable QR codes',
  hasEdges: false,
});

export default {};
