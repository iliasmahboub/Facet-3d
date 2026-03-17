// bracelet shape — rigid band with a flat QR plate on the outer surface
// the QR sits on a raised flat tag so it stays square and scannable
// not stretched around the curve — that would make it unscannable

import * as THREE from 'three';
import { registerShape } from '../state.js';
import { pushTri, pushQuad, flipGeometryNormals } from '../geometry.js';
import { getQRModules } from '../qr.js';
import state from '../state.js';

const BAND_SEGS = 80;

function buildBand(innerR, width, wallT) {
  const positions = [];
  const normals = [];
  const outerR = innerR + wallT;
  const halfW = width / 2;

  // outer surface
  for (let i = 0; i < BAND_SEGS; i++) {
    const a0 = (i / BAND_SEGS) * Math.PI * 2;
    const a1 = ((i + 1) / BAND_SEGS) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const n = new THREE.Vector3((c0 + c1) / 2, 0, (s0 + s1) / 2).normalize();
    pushQuad(positions, normals,
      new THREE.Vector3(c0 * outerR, halfW, s0 * outerR),
      new THREE.Vector3(c1 * outerR, halfW, s1 * outerR),
      new THREE.Vector3(c1 * outerR, -halfW, s1 * outerR),
      new THREE.Vector3(c0 * outerR, -halfW, s0 * outerR), n);
  }

  // inner surface
  for (let i = 0; i < BAND_SEGS; i++) {
    const a0 = (i / BAND_SEGS) * Math.PI * 2;
    const a1 = ((i + 1) / BAND_SEGS) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    const n = new THREE.Vector3(-(c0 + c1) / 2, 0, -(s0 + s1) / 2).normalize();
    pushQuad(positions, normals,
      new THREE.Vector3(c1 * innerR, halfW, s1 * innerR),
      new THREE.Vector3(c0 * innerR, halfW, s0 * innerR),
      new THREE.Vector3(c0 * innerR, -halfW, s0 * innerR),
      new THREE.Vector3(c1 * innerR, -halfW, s1 * innerR), n);
  }

  // top and bottom rims
  const topN = new THREE.Vector3(0, 1, 0);
  const botN = new THREE.Vector3(0, -1, 0);
  for (let i = 0; i < BAND_SEGS; i++) {
    const a0 = (i / BAND_SEGS) * Math.PI * 2;
    const a1 = ((i + 1) / BAND_SEGS) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);
    pushQuad(positions, normals,
      new THREE.Vector3(c0 * innerR, halfW, s0 * innerR),
      new THREE.Vector3(c1 * innerR, halfW, s1 * innerR),
      new THREE.Vector3(c1 * outerR, halfW, s1 * outerR),
      new THREE.Vector3(c0 * outerR, halfW, s0 * outerR), topN);
    pushQuad(positions, normals,
      new THREE.Vector3(c1 * innerR, -halfW, s1 * innerR),
      new THREE.Vector3(c0 * innerR, -halfW, s0 * innerR),
      new THREE.Vector3(c0 * outerR, -halfW, s0 * outerR),
      new THREE.Vector3(c1 * outerR, -halfW, s1 * outerR), botN);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function buildQRPlate(innerR, wallT, width, depth, qrData) {
  // flat rectangular plate sitting on top of the band at the front
  // QR is engraved into this flat surface so it stays perfectly square
  const positions = [];
  const normals = [];
  const outerR = innerR + wallT;
  const frontN = new THREE.Vector3(0, 0, 1);

  // plate dimensions — square, sized to fit the band width
  const plateSize = width * 0.9;
  const plateThick = Math.max(1.2, wallT * 0.4); // raised plate
  const plateHalf = plateSize / 2;
  const plateZ = outerR + plateThick; // sits on top of outer surface

  if (qrData && !qrData.error) {
    const { grid, count } = qrData;
    const totalModules = count + 4;
    const quietZone = Math.floor((totalModules - count) / 2);

    function cellDark(row, col) {
      const qr = row - quietZone;
      const qc = col - quietZone;
      if (qr < 0 || qr >= count || qc < 0 || qc >= count) return false;
      return grid[qr][qc] === 1;
    }

    // QR face (front, facing outward from wrist)
    for (let row = 0; row < totalModules; row++) {
      for (let col = 0; col < totalModules; col++) {
        const isDark = cellDark(row, col);
        const d = isDark ? -depth : 0;
        const x0 = (col / totalModules - 0.5) * plateSize;
        const x1 = ((col + 1) / totalModules - 0.5) * plateSize;
        const y0 = (0.5 - row / totalModules) * plateSize;
        const y1 = (0.5 - (row + 1) / totalModules) * plateSize;

        pushQuad(positions, normals,
          new THREE.Vector3(x0, y0, plateZ + d),
          new THREE.Vector3(x1, y0, plateZ + d),
          new THREE.Vector3(x1, y1, plateZ + d),
          new THREE.Vector3(x0, y1, plateZ + d), frontN);

        if (col < totalModules - 1 && isDark !== cellDark(row, col + 1)) {
          const dR = cellDark(row, col + 1) ? -depth : 0;
          pushQuad(positions, normals,
            new THREE.Vector3(x1, y0, plateZ + d),
            new THREE.Vector3(x1, y1, plateZ + d),
            new THREE.Vector3(x1, y1, plateZ + dR),
            new THREE.Vector3(x1, y0, plateZ + dR),
            d < dR ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(1, 0, 0));
        }
        if (row < totalModules - 1 && isDark !== cellDark(row + 1, col)) {
          const dB = cellDark(row + 1, col) ? -depth : 0;
          pushQuad(positions, normals,
            new THREE.Vector3(x1, y1, plateZ + d),
            new THREE.Vector3(x0, y1, plateZ + d),
            new THREE.Vector3(x0, y1, plateZ + dB),
            new THREE.Vector3(x1, y1, plateZ + dB),
            d < dB ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0));
        }
      }
    }
  } else {
    // blank plate top
    pushQuad(positions, normals,
      new THREE.Vector3(-plateHalf, plateHalf, plateZ),
      new THREE.Vector3(plateHalf, plateHalf, plateZ),
      new THREE.Vector3(plateHalf, -plateHalf, plateZ),
      new THREE.Vector3(-plateHalf, -plateHalf, plateZ), frontN);
  }

  // plate back (sits against band)
  const backN = new THREE.Vector3(0, 0, -1);
  pushQuad(positions, normals,
    new THREE.Vector3(plateHalf, plateHalf, outerR),
    new THREE.Vector3(-plateHalf, plateHalf, outerR),
    new THREE.Vector3(-plateHalf, -plateHalf, outerR),
    new THREE.Vector3(plateHalf, -plateHalf, outerR), backN);

  // plate sides (4 walls)
  // right
  pushQuad(positions, normals,
    new THREE.Vector3(plateHalf, plateHalf, plateZ),
    new THREE.Vector3(plateHalf, -plateHalf, plateZ),
    new THREE.Vector3(plateHalf, -plateHalf, outerR),
    new THREE.Vector3(plateHalf, plateHalf, outerR),
    new THREE.Vector3(1, 0, 0));
  // left
  pushQuad(positions, normals,
    new THREE.Vector3(-plateHalf, -plateHalf, plateZ),
    new THREE.Vector3(-plateHalf, plateHalf, plateZ),
    new THREE.Vector3(-plateHalf, plateHalf, outerR),
    new THREE.Vector3(-plateHalf, -plateHalf, outerR),
    new THREE.Vector3(-1, 0, 0));
  // top
  pushQuad(positions, normals,
    new THREE.Vector3(-plateHalf, plateHalf, plateZ),
    new THREE.Vector3(plateHalf, plateHalf, plateZ),
    new THREE.Vector3(plateHalf, plateHalf, outerR),
    new THREE.Vector3(-plateHalf, plateHalf, outerR),
    new THREE.Vector3(0, 1, 0));
  // bottom
  pushQuad(positions, normals,
    new THREE.Vector3(plateHalf, -plateHalf, plateZ),
    new THREE.Vector3(-plateHalf, -plateHalf, plateZ),
    new THREE.Vector3(-plateHalf, -plateHalf, outerR),
    new THREE.Vector3(plateHalf, -plateHalf, outerR),
    new THREE.Vector3(0, -1, 0));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

function build(params, materials) {
  const { size, depth, normalsFlipped } = params;
  const innerR = size / 2;
  const wallT = Math.max(size * 0.06, 2.5);
  const width = Math.max(size * 0.22, 12);
  const warnings = [];
  const meshes = [];
  let totalTris = 0;
  let hasQR = false;

  const url = state.urls.find(u => u && u.trim()) || '';
  let qrData = null;
  if (url) {
    qrData = getQRModules(url);
    if (qrData && qrData.error) {
      warnings.push({ face: 'Plate', msg: qrData.error });
      qrData = null;
    } else if (qrData) {
      hasQR = true;
      const plateSize = width * 0.9;
      const pitch = plateSize / (qrData.count + 4);
      if (pitch < 0.8) {
        warnings.push({ face: 'Plate', msg: `Module pitch ${pitch.toFixed(2)}mm — QR may not scan. Use shorter URL or bigger bracelet.` });
      }
    }
  }

  if (wallT < 2) {
    warnings.push({ face: 'All', msg: 'Band too thin — may break during printing or wear.' });
  }
  if (size < 55) {
    warnings.push({ face: 'All', msg: 'Inner diameter under 55mm — may be tight for most wrists.' });
  }

  // band
  const bandGeo = buildBand(innerR, width, wallT);
  if (normalsFlipped) flipGeometryNormals(bandGeo);
  const bandMesh = new THREE.Mesh(bandGeo, materials.matDefault);
  bandMesh.castShadow = params.shadowsOn;
  bandMesh.receiveShadow = params.shadowsOn;
  bandMesh.userData.faceIndex = -1;
  meshes.push(bandMesh);
  totalTris += bandGeo.attributes.position.count / 3;

  // QR plate
  const plateGeo = buildQRPlate(innerR, wallT, width, depth, qrData);
  if (normalsFlipped) flipGeometryNormals(plateGeo);
  const plateMesh = new THREE.Mesh(plateGeo, materials.matDefault);
  plateMesh.castShadow = params.shadowsOn;
  plateMesh.receiveShadow = params.shadowsOn;
  plateMesh.userData.faceIndex = 0;
  meshes.push(plateMesh);
  totalTris += plateGeo.attributes.position.count / 3;

  if (materials.matOverlay) {
    meshes.push(new THREE.Mesh(bandGeo, materials.matOverlay));
    meshes.push(new THREE.Mesh(plateGeo, materials.matOverlay));
  }

  return { meshes, warnings, triCount: totalTris, hasQR };
}

registerShape('bracelet', {
  name: 'Bracelet',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="12" rx="9" ry="7"/><ellipse cx="12" cy="12" rx="6.5" ry="4.5"/></svg>',
  maxFaces: 1,
  urlLabel: 'QR URL',
  build,
  getGroundY: (size) => -(size * 0.22 / 2) - 1,
  sizeRange: { min: 50, max: 90, default: 65, step: 1 },
  sizeLabel: 'Inner Diameter',
  sizeHint: 'Standard wrist ~65mm — measure yours first',
  hasEdges: false,
});

export default {};
