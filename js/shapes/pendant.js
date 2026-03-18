// pendant shape — round disc with integrated bail for necklace chain
// QR is a proper square centered on the front face, not clipped to circle
// bail design inspired by real jewelry — solid integrated loop

import * as THREE from 'three';
import { registerShape } from '../state.js';
import { pushTri, pushQuad, flipGeometryNormals } from '../geometry.js';
import { getQRModules } from '../qr.js';
import state from '../state.js';

const DISC_SEGS = 64;
const BAIL_RING_SEGS = 32;
const BAIL_TUBE_SEGS = 16;

function buildPendantDisc(radius, thickness, depth, qrData) {
  const positions = [];
  const normals = [];
  const frontN = new THREE.Vector3(0, 0, 1);
  const backN = new THREE.Vector3(0, 0, -1);
  const halfT = thickness / 2;

  // QR is a square inscribed in the disc with margin
  const qrHalf = radius * 0.65; // square half-size, leaves a nice border ring

  if (qrData && !qrData.error) {
    const { grid, count } = qrData;
    const totalModules = count + 4;
    const quietZone = Math.floor((totalModules - count) / 2);
    const qrSize = qrHalf * 2;

    function cellDark(row, col) {
      const qr = row - quietZone;
      const qc = col - quietZone;
      if (qr < 0 || qr >= count || qc < 0 || qc >= count) return false;
      return grid[qr][qc] === 1;
    }

    // QR grid — always a perfect square, centered on front face
    for (let row = 0; row < totalModules; row++) {
      for (let col = 0; col < totalModules; col++) {
        const isDark = cellDark(row, col);
        const d = isDark ? -depth : 0;
        const x0 = (col / totalModules - 0.5) * qrSize;
        const x1 = ((col + 1) / totalModules - 0.5) * qrSize;
        const y0 = (0.5 - row / totalModules) * qrSize;
        const y1 = (0.5 - (row + 1) / totalModules) * qrSize;

        pushQuad(positions, normals,
          new THREE.Vector3(x0, y0, halfT + d),
          new THREE.Vector3(x1, y0, halfT + d),
          new THREE.Vector3(x1, y1, halfT + d),
          new THREE.Vector3(x0, y1, halfT + d),
          frontN);

        // depth walls
        if (col < totalModules - 1 && isDark !== cellDark(row, col + 1)) {
          const dR = cellDark(row, col + 1) ? -depth : 0;
          pushQuad(positions, normals,
            new THREE.Vector3(x1, y0, halfT + d),
            new THREE.Vector3(x1, y1, halfT + d),
            new THREE.Vector3(x1, y1, halfT + dR),
            new THREE.Vector3(x1, y0, halfT + dR),
            d < dR ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(1, 0, 0));
        }
        if (row < totalModules - 1 && isDark !== cellDark(row + 1, col)) {
          const dB = cellDark(row + 1, col) ? -depth : 0;
          pushQuad(positions, normals,
            new THREE.Vector3(x1, y1, halfT + d),
            new THREE.Vector3(x0, y1, halfT + d),
            new THREE.Vector3(x0, y1, halfT + dB),
            new THREE.Vector3(x1, y1, halfT + dB),
            d < dB ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0));
        }
      }
    }

    // border ring — fill between QR square edge and disc circle
    // top edge of QR to circle
    const N = 32;
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const x0 = -qrHalf + t0 * qrSize, x1 = -qrHalf + t1 * qrSize;
      // top strip
      const cyT = qrHalf;
      const yEdgeT0 = Math.sqrt(Math.max(0, radius * radius - x0 * x0));
      const yEdgeT1 = Math.sqrt(Math.max(0, radius * radius - x1 * x1));
      if (yEdgeT0 > cyT && yEdgeT1 > cyT) {
        pushQuad(positions, normals,
          new THREE.Vector3(x0, cyT, halfT), new THREE.Vector3(x1, cyT, halfT),
          new THREE.Vector3(x1, yEdgeT1, halfT), new THREE.Vector3(x0, yEdgeT0, halfT), frontN);
      }
      // bottom strip
      const cyB = -qrHalf;
      const yEdgeB0 = -Math.sqrt(Math.max(0, radius * radius - x0 * x0));
      const yEdgeB1 = -Math.sqrt(Math.max(0, radius * radius - x1 * x1));
      if (yEdgeB0 < cyB && yEdgeB1 < cyB) {
        pushQuad(positions, normals,
          new THREE.Vector3(x1, cyB, halfT), new THREE.Vector3(x0, cyB, halfT),
          new THREE.Vector3(x0, yEdgeB0, halfT), new THREE.Vector3(x1, yEdgeB1, halfT), frontN);
      }
    }
    // left and right arcs outside QR square
    for (let i = 0; i < DISC_SEGS; i++) {
      const a0 = (i / DISC_SEGS) * Math.PI * 2;
      const a1 = ((i + 1) / DISC_SEGS) * Math.PI * 2;
      const ox0 = Math.cos(a0) * radius, oy0 = Math.sin(a0) * radius;
      const ox1 = Math.cos(a1) * radius, oy1 = Math.sin(a1) * radius;
      // only emit triangles for parts outside the QR square
      if (Math.abs(ox0) > qrHalf || Math.abs(oy0) > qrHalf ||
          Math.abs(ox1) > qrHalf || Math.abs(oy1) > qrHalf) {
        // clamp inner point to QR boundary
        const ix0 = Math.max(-qrHalf, Math.min(qrHalf, ox0));
        const iy0 = Math.max(-qrHalf, Math.min(qrHalf, oy0));
        const ix1 = Math.max(-qrHalf, Math.min(qrHalf, ox1));
        const iy1 = Math.max(-qrHalf, Math.min(qrHalf, oy1));
        pushTri(positions, normals,
          new THREE.Vector3(ix0, iy0, halfT),
          new THREE.Vector3(ox0, oy0, halfT),
          new THREE.Vector3(ox1, oy1, halfT), frontN);
        pushTri(positions, normals,
          new THREE.Vector3(ix0, iy0, halfT),
          new THREE.Vector3(ox1, oy1, halfT),
          new THREE.Vector3(ix1, iy1, halfT), frontN);
      }
    }
  } else {
    // blank front — simple disc fan
    for (let i = 0; i < DISC_SEGS; i++) {
      const a0 = (i / DISC_SEGS) * Math.PI * 2;
      const a1 = ((i + 1) / DISC_SEGS) * Math.PI * 2;
      pushTri(positions, normals,
        new THREE.Vector3(0, 0, halfT),
        new THREE.Vector3(Math.cos(a0) * radius, Math.sin(a0) * radius, halfT),
        new THREE.Vector3(Math.cos(a1) * radius, Math.sin(a1) * radius, halfT), frontN);
    }
  }

  // back face — simple disc
  for (let i = 0; i < DISC_SEGS; i++) {
    const a0 = (i / DISC_SEGS) * Math.PI * 2;
    const a1 = ((i + 1) / DISC_SEGS) * Math.PI * 2;
    pushTri(positions, normals,
      new THREE.Vector3(0, 0, -halfT),
      new THREE.Vector3(Math.cos(a1) * radius, Math.sin(a1) * radius, -halfT),
      new THREE.Vector3(Math.cos(a0) * radius, Math.sin(a0) * radius, -halfT), backN);
  }

  // rim (cylinder wall around disc edge)
  for (let i = 0; i < DISC_SEGS; i++) {
    const a0 = (i / DISC_SEGS) * Math.PI * 2;
    const a1 = ((i + 1) / DISC_SEGS) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const en = new THREE.Vector3((c0 + c1) / 2, (s0 + s1) / 2, 0).normalize();
    pushQuad(positions, normals,
      new THREE.Vector3(c0 * radius, s0 * radius, halfT),
      new THREE.Vector3(c1 * radius, s1 * radius, halfT),
      new THREE.Vector3(c1 * radius, s1 * radius, -halfT),
      new THREE.Vector3(c0 * radius, s0 * radius, -halfT), en);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function buildBail(radius, thickness) {
  // solid integrated bail — like real jewelry
  // a torus (ring) that sits at the top of the disc, partially overlapping
  const bailR = Math.max(radius * 0.25, 4); // ring major radius, min 4mm for thick cords
  const tubeR = thickness * 0.45;      // tube radius (thick for printing)
  const centerY = radius + bailR * 0.5; // sits just above disc edge
  const positions = [];
  const normals = [];

  for (let i = 0; i < BAIL_RING_SEGS; i++) {
    const a0 = (i / BAIL_RING_SEGS) * Math.PI * 2;
    const a1 = ((i + 1) / BAIL_RING_SEGS) * Math.PI * 2;

    for (let j = 0; j < BAIL_TUBE_SEGS; j++) {
      const b0 = (j / BAIL_TUBE_SEGS) * Math.PI * 2;
      const b1 = ((j + 1) / BAIL_TUBE_SEGS) * Math.PI * 2;

      // ring sweeps in YZ plane so chain threads left-to-right (X axis)
      // and pendant face points forward when worn
      const pt = (a, b) => new THREE.Vector3(
        tubeR * Math.sin(b),
        centerY + (bailR + tubeR * Math.cos(b)) * Math.sin(a),
        (bailR + tubeR * Math.cos(b)) * Math.cos(a)
      );
      const nm = (a, b) => new THREE.Vector3(
        Math.sin(b),
        Math.cos(b) * Math.sin(a),
        Math.cos(b) * Math.cos(a)
      ).normalize();

      pushQuad(positions, normals,
        pt(a0, b0), pt(a1, b0), pt(a1, b1), pt(a0, b1),
        nm((a0 + a1) / 2, (b0 + b1) / 2));
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
  const thickness = Math.max(size * 0.1, 3); // min 3mm wall
  const warnings = [];
  const meshes = [];
  let totalTris = 0;
  let hasQR = false;

  const url = state.urls.find(u => u && u.trim()) || '';
  let qrData = null;
  if (url) {
    qrData = getQRModules(url);
    if (qrData && qrData.error) {
      warnings.push({ face: 'Front', msg: qrData.error });
      qrData = null;
    } else if (qrData) {
      hasQR = true;
      const qrSize = radius * 0.65 * 2;
      const pitch = qrSize / (qrData.count + 4);
      if (pitch < 0.8) {
        warnings.push({ face: 'Front', msg: `Module pitch ${pitch.toFixed(2)}mm — QR may not scan. Use shorter URL or bigger pendant.` });
      }
    }
  }

  if (thickness < 2.5) {
    warnings.push({ face: 'All', msg: 'Pendant too thin — increase size for reliable printing.' });
  }
  if (size < 25) {
    warnings.push({ face: 'All', msg: 'Pendant under 25mm — QR may be too small to scan.' });
  }

  const discGeo = buildPendantDisc(radius, thickness, depth, qrData);
  if (normalsFlipped) flipGeometryNormals(discGeo);
  const discMesh = new THREE.Mesh(discGeo, materials.matDefault);
  discMesh.castShadow = params.shadowsOn;
  discMesh.receiveShadow = params.shadowsOn;
  discMesh.userData.faceIndex = 0;
  meshes.push(discMesh);
  totalTris += discGeo.attributes.position.count / 3;

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
  getGroundY: (size) => -(size / 2) - Math.max(size / 2 * 0.25, 4) - 1,
  sizeRange: { min: 25, max: 80, default: 40, step: 1 },
  sizeLabel: 'Pendant Diameter',
  sizeHint: '30mm+ for scannable QR — 40mm is a nice sweet spot',
  hasEdges: false,
});

export default {};
