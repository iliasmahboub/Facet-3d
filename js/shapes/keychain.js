// keychain tag — rounded rectangle with hole for keyring
// QR on front face, flat back, print-friendly thickness

import * as THREE from 'three';
import { registerShape } from '../state.js';
import { pushTri, pushQuad, flipGeometryNormals } from '../geometry.js';
import { getQRModules } from '../qr.js';
import state from '../state.js';

const CORNER_SEGS = 8;
const HOLE_SEGS = 16;

function roundedRectOutline(w, h, r, segments) {
  // returns array of {x,y} points tracing a rounded rect
  const pts = [];
  const corners = [
    { cx: w / 2 - r, cy: h / 2 - r, start: 0 },
    { cx: -w / 2 + r, cy: h / 2 - r, start: Math.PI / 2 },
    { cx: -w / 2 + r, cy: -h / 2 + r, start: Math.PI },
    { cx: w / 2 - r, cy: -h / 2 + r, start: Math.PI * 1.5 },
  ];
  for (const c of corners) {
    for (let i = 0; i <= segments; i++) {
      const a = c.start + (i / segments) * (Math.PI / 2);
      pts.push({ x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r });
    }
  }
  return pts;
}

function buildKeychainGeo(width, height, thickness, holeRadius, depth, qrData) {
  const positions = [];
  const normals = [];
  const halfT = thickness / 2;
  const cornerR = Math.min(width, height) * 0.15;

  // hole center at top
  const holeCY = height / 2 - holeRadius - cornerR - 1;

  const outline = roundedRectOutline(width, height, cornerR, CORNER_SEGS);

  // front face with QR
  const frontN = new THREE.Vector3(0, 0, 1);
  if (qrData && !qrData.error) {
    const { grid, count } = qrData;
    const totalModules = count + 4;
    const quietZone = Math.floor((totalModules - count) / 2);
    const qrSize = Math.min(width, height - holeRadius * 2 - 4) * 0.85;

    function cellDark(row, col) {
      const qr = row - quietZone;
      const qc = col - quietZone;
      if (qr < 0 || qr >= count || qc < 0 || qc >= count) return false;
      return grid[qr][qc] === 1;
    }

    // QR offset slightly below center to make room for hole
    const qrOffsetY = -(holeRadius + 1) / 2;

    for (let row = 0; row < totalModules; row++) {
      for (let col = 0; col < totalModules; col++) {
        const isDark = cellDark(row, col);
        const d = isDark ? -depth : 0;
        const x0 = (col / totalModules - 0.5) * qrSize;
        const x1 = ((col + 1) / totalModules - 0.5) * qrSize;
        const y0 = (0.5 - row / totalModules) * qrSize + qrOffsetY;
        const y1 = (0.5 - (row + 1) / totalModules) * qrSize + qrOffsetY;

        const p00 = new THREE.Vector3(x0, y0, halfT + d);
        const p10 = new THREE.Vector3(x1, y0, halfT + d);
        const p11 = new THREE.Vector3(x1, y1, halfT + d);
        const p01 = new THREE.Vector3(x0, y1, halfT + d);
        pushQuad(positions, normals, p00, p10, p11, p01, frontN);

        if (col < totalModules - 1 && isDark !== cellDark(row, col + 1)) {
          const dR = cellDark(row, col + 1) ? -depth : 0;
          const wA = new THREE.Vector3(x1, y0, halfT + d);
          const wB = new THREE.Vector3(x1, y1, halfT + d);
          const wC = new THREE.Vector3(x1, y1, halfT + dR);
          const wD = new THREE.Vector3(x1, y0, halfT + dR);
          pushQuad(positions, normals, wA, wB, wC, wD, d < dR ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(1, 0, 0));
        }
        if (row < totalModules - 1 && isDark !== cellDark(row + 1, col)) {
          const dB = cellDark(row + 1, col) ? -depth : 0;
          const wA = new THREE.Vector3(x1, y1, halfT + d);
          const wB = new THREE.Vector3(x0, y1, halfT + d);
          const wC = new THREE.Vector3(x0, y1, halfT + dB);
          const wD = new THREE.Vector3(x1, y1, halfT + dB);
          pushQuad(positions, normals, wA, wB, wC, wD, d < dB ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0));
        }
      }
    }
  } else {
    // blank front — fan from center
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i];
      const b = outline[(i + 1) % outline.length];
      pushTri(positions, normals,
        new THREE.Vector3(0, 0, halfT),
        new THREE.Vector3(a.x, a.y, halfT),
        new THREE.Vector3(b.x, b.y, halfT),
        frontN);
    }
  }

  // back face
  const backN = new THREE.Vector3(0, 0, -1);
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    pushTri(positions, normals,
      new THREE.Vector3(0, 0, -halfT),
      new THREE.Vector3(b.x, b.y, -halfT),
      new THREE.Vector3(a.x, a.y, -halfT),
      backN);
  }

  // side walls
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const sn = new THREE.Vector3(dy, -dx, 0).normalize();
    pushQuad(positions, normals,
      new THREE.Vector3(a.x, a.y, halfT),
      new THREE.Vector3(b.x, b.y, halfT),
      new THREE.Vector3(b.x, b.y, -halfT),
      new THREE.Vector3(a.x, a.y, -halfT),
      sn);
  }

  // keyring hole — cylinder cut-out at top
  for (let i = 0; i < HOLE_SEGS; i++) {
    const a0 = (i / HOLE_SEGS) * Math.PI * 2;
    const a1 = ((i + 1) / HOLE_SEGS) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const x0 = c0 * holeRadius, y0 = s0 * holeRadius + holeCY;
    const x1 = c1 * holeRadius, y1 = s1 * holeRadius + holeCY;
    const hn = new THREE.Vector3(-(c0 + c1) / 2, -(s0 + s1) / 2, 0).normalize();

    // inner wall of hole
    pushQuad(positions, normals,
      new THREE.Vector3(x1, y1, halfT),
      new THREE.Vector3(x0, y0, halfT),
      new THREE.Vector3(x0, y0, -halfT),
      new THREE.Vector3(x1, y1, -halfT),
      hn);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function build(params, materials) {
  const { size, depth, normalsFlipped } = params;
  const width = size;
  const height = size * 1.4;
  const thickness = Math.max(3, size * 0.08);
  const holeRadius = Math.max(3, size * 0.1);
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
    }
  }

  if (size < 25) {
    warnings.push({ face: 'All', msg: 'Keychain under 25mm — QR may not scan.' });
  }

  const geo = buildKeychainGeo(width, height, thickness, holeRadius, depth, qrData);
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

registerShape('keychain', {
  name: 'Keychain',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="6" width="14" height="16" rx="3"/><circle cx="12" cy="9" r="2"/></svg>',
  maxFaces: 1,
  urlLabel: 'QR URL',
  build,
  getGroundY: (size) => -(size * 1.4 / 2) - 0.5,
  sizeRange: { min: 20, max: 60, default: 35, step: 1 },
  sizeLabel: 'Tag Width',
  sizeHint: 'Compact but scannable — 30mm+ recommended',
  hasEdges: false,
});

export default {};
