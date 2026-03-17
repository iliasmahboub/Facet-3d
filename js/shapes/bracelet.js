// bracelet shape — curved band with QR code tile on the outer surface
// designed for 3d printing as a rigid bracelet segment or full band

import * as THREE from 'three';
import { registerShape } from '../state.js';
import { pushTri, pushQuad, flipGeometryNormals } from '../geometry.js';
import { getQRModules } from '../qr.js';
import state from '../state.js';

const BAND_SEGMENTS = 80;

function buildBraceletBand(innerRadius, width, thickness, depth, qrData) {
  const positions = [];
  const normals = [];
  const outerRadius = innerRadius + thickness;

  // outer surface with QR engrave
  if (qrData && !qrData.error) {
    const { grid, count } = qrData;
    const totalModules = count + 4;
    const quietZone = Math.floor((totalModules - count) / 2);

    // QR is engraved on the front arc (center 120 degrees)
    const arcStart = -Math.PI / 3;
    const arcEnd = Math.PI / 3;
    const arcLen = arcEnd - arcStart;

    function cellDark(row, col) {
      const qr = row - quietZone;
      const qc = col - quietZone;
      if (qr < 0 || qr >= count || qc < 0 || qc >= count) return false;
      return grid[qr][qc] === 1;
    }

    // QR zone on outer surface
    for (let row = 0; row < totalModules; row++) {
      for (let col = 0; col < totalModules; col++) {
        const isDark = cellDark(row, col);
        const d = isDark ? -depth : 0;
        const r = outerRadius + d;

        const a0 = arcStart + (col / totalModules) * arcLen;
        const a1 = arcStart + ((col + 1) / totalModules) * arcLen;
        const y0 = (0.5 - row / totalModules) * width;
        const y1 = (0.5 - (row + 1) / totalModules) * width;

        const p00 = new THREE.Vector3(Math.cos(a0) * r, y0, Math.sin(a0) * r);
        const p10 = new THREE.Vector3(Math.cos(a1) * r, y0, Math.sin(a1) * r);
        const p11 = new THREE.Vector3(Math.cos(a1) * r, y1, Math.sin(a1) * r);
        const p01 = new THREE.Vector3(Math.cos(a0) * r, y1, Math.sin(a0) * r);
        const nm = new THREE.Vector3(Math.cos((a0 + a1) / 2), 0, Math.sin((a0 + a1) / 2)).normalize();
        pushQuad(positions, normals, p00, p10, p11, p01, nm);

        // depth walls between QR modules
        if (col < totalModules - 1 && isDark !== cellDark(row, col + 1)) {
          const dR = cellDark(row, col + 1) ? -depth : 0;
          const rR = outerRadius + dR;
          const wA = new THREE.Vector3(Math.cos(a1) * r, y0, Math.sin(a1) * r);
          const wB = new THREE.Vector3(Math.cos(a1) * r, y1, Math.sin(a1) * r);
          const wC = new THREE.Vector3(Math.cos(a1) * rR, y1, Math.sin(a1) * rR);
          const wD = new THREE.Vector3(Math.cos(a1) * rR, y0, Math.sin(a1) * rR);
          const tangent = new THREE.Vector3(-Math.sin(a1), 0, Math.cos(a1));
          pushQuad(positions, normals, wA, wB, wC, wD, d < dR ? tangent.negate() : tangent);
        }
        if (row < totalModules - 1 && isDark !== cellDark(row + 1, col)) {
          const dB = cellDark(row + 1, col) ? -depth : 0;
          const rB = outerRadius + dB;
          const mid = (a0 + a1) / 2;
          const wn = new THREE.Vector3(0, d < dB ? 1 : -1, 0);
          const wA = new THREE.Vector3(Math.cos(a1) * r, y1, Math.sin(a1) * r);
          const wB = new THREE.Vector3(Math.cos(a0) * r, y1, Math.sin(a0) * r);
          const wC = new THREE.Vector3(Math.cos(a0) * rB, y1, Math.sin(a0) * rB);
          const wD = new THREE.Vector3(Math.cos(a1) * rB, y1, Math.sin(a1) * rB);
          pushQuad(positions, normals, wA, wB, wC, wD, wn);
        }
      }
    }

    // outer surface outside QR zone
    const qrAngles = [arcStart, arcEnd];
    // left arc (from -PI to arcStart)
    buildArcStrip(positions, normals, outerRadius, -Math.PI, arcStart, width, 30, 1);
    // right arc (from arcEnd to PI)
    buildArcStrip(positions, normals, outerRadius, arcEnd, Math.PI, width, 30, 1);
  } else {
    // full outer surface, no QR
    buildArcStrip(positions, normals, outerRadius, -Math.PI, Math.PI, width, BAND_SEGMENTS, 1);
  }

  // inner surface
  buildArcStrip(positions, normals, innerRadius, -Math.PI, Math.PI, width, BAND_SEGMENTS, -1);

  // top and bottom edges (caps)
  for (let i = 0; i < BAND_SEGMENTS; i++) {
    const a0 = -Math.PI + (i / BAND_SEGMENTS) * Math.PI * 2;
    const a1 = -Math.PI + ((i + 1) / BAND_SEGMENTS) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const halfW = width / 2;

    // top cap
    const tA = new THREE.Vector3(c0 * innerRadius, halfW, s0 * innerRadius);
    const tB = new THREE.Vector3(c1 * innerRadius, halfW, s1 * innerRadius);
    const tC = new THREE.Vector3(c1 * outerRadius, halfW, s1 * outerRadius);
    const tD = new THREE.Vector3(c0 * outerRadius, halfW, s0 * outerRadius);
    pushQuad(positions, normals, tA, tB, tC, tD, new THREE.Vector3(0, 1, 0));

    // bottom cap
    const bA = new THREE.Vector3(c1 * innerRadius, -halfW, s1 * innerRadius);
    const bB = new THREE.Vector3(c0 * innerRadius, -halfW, s0 * innerRadius);
    const bC = new THREE.Vector3(c0 * outerRadius, -halfW, s0 * outerRadius);
    const bD = new THREE.Vector3(c1 * outerRadius, -halfW, s1 * outerRadius);
    pushQuad(positions, normals, bA, bB, bC, bD, new THREE.Vector3(0, -1, 0));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function buildArcStrip(positions, normals, radius, startAngle, endAngle, width, segments, normalDir) {
  const halfW = width / 2;
  const arcLen = endAngle - startAngle;
  for (let i = 0; i < segments; i++) {
    const a0 = startAngle + (i / segments) * arcLen;
    const a1 = startAngle + ((i + 1) / segments) * arcLen;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const nm = new THREE.Vector3((c0 + c1) / 2 * normalDir, 0, (s0 + s1) / 2 * normalDir).normalize();

    if (normalDir > 0) {
      const pa = new THREE.Vector3(c0 * radius, halfW, s0 * radius);
      const pb = new THREE.Vector3(c1 * radius, halfW, s1 * radius);
      const pc = new THREE.Vector3(c1 * radius, -halfW, s1 * radius);
      const pd = new THREE.Vector3(c0 * radius, -halfW, s0 * radius);
      pushQuad(positions, normals, pa, pb, pc, pd, nm);
    } else {
      const pa = new THREE.Vector3(c1 * radius, halfW, s1 * radius);
      const pb = new THREE.Vector3(c0 * radius, halfW, s0 * radius);
      const pc = new THREE.Vector3(c0 * radius, -halfW, s0 * radius);
      const pd = new THREE.Vector3(c1 * radius, -halfW, s1 * radius);
      pushQuad(positions, normals, pa, pb, pc, pd, nm);
    }
  }
}

function build(params, materials) {
  const { size, depth, normalsFlipped } = params;
  // size = inner diameter, so inner radius = size/2
  const innerRadius = size / 2;
  const thickness = Math.max(size * 0.06, 2.5); // min 2.5mm wall
  const width = Math.max(size * 0.22, 12);      // band width, min 12mm
  const warnings = [];
  const meshes = [];
  let totalTris = 0;
  let hasQR = false;

  const url = state.urls.find(u => u && u.trim()) || '';
  let qrData = null;
  if (url) {
    qrData = getQRModules(url);
    if (qrData && qrData.error) {
      warnings.push({ face: 'Outer', msg: qrData.error });
      qrData = null;
    } else if (qrData) {
      hasQR = true;
    }
  }

  if (thickness < 2) {
    warnings.push({ face: 'All', msg: 'Band too thin — may break during printing or wear.' });
  }
  if (size < 50) {
    warnings.push({ face: 'All', msg: 'Inner diameter under 50mm — may not fit most wrists.' });
  }

  const geo = buildBraceletBand(innerRadius, width, thickness, depth, qrData);
  if (normalsFlipped) flipGeometryNormals(geo);

  const mesh = new THREE.Mesh(geo, materials.matDefault);
  mesh.castShadow = params.shadowsOn;
  mesh.receiveShadow = params.shadowsOn;
  mesh.userData.faceIndex = 0;
  meshes.push(mesh);
  totalTris += geo.attributes.position.count / 3;

  if (materials.matOverlay) {
    meshes.push(new THREE.Mesh(geo, materials.matOverlay));
  }

  return { meshes, warnings, triCount: totalTris, hasQR };
}

registerShape('bracelet', {
  name: 'Bracelet',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="12" rx="9" ry="7"/><ellipse cx="12" cy="12" rx="6.5" ry="4.5"/></svg>',
  maxFaces: 1,
  urlLabel: 'QR URL',
  build,
  getGroundY: (size) => -(size * 0.22 / 2) - 0.5,
  sizeRange: { min: 50, max: 90, default: 65, step: 1 },
  sizeLabel: 'Inner Diameter',
  sizeHint: 'Standard wrist ~65mm — measure yours first',
  hasEdges: false,
});

export default {};
