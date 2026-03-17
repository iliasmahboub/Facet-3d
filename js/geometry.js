// shared geometry primitives used by all shape builders
// pushTri, pushQuad, buildWall, flipGeometryNormals

import * as THREE from 'three';

export function pushTri(positions, normals, a, b, c, normal) {
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
}

export function pushQuad(positions, normals, a, b, c, d, normal) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ac = new THREE.Vector3().subVectors(c, a);
  const cross = new THREE.Vector3().crossVectors(ab, ac);
  if (cross.dot(normal) >= 0) {
    pushTri(positions, normals, a, b, c, normal);
    pushTri(positions, normals, a, c, d, normal);
  } else {
    pushTri(positions, normals, a, d, c, normal);
    pushTri(positions, normals, a, c, b, normal);
  }
}

export function buildWall(positions, normals, center, u, v, n, param1, param2, param3, dA, dB, direction) {
  if (direction === 'right') {
    const uPos = param1, vTop = param2, vBot = param3;
    const pATop = center.clone().add(u.clone().multiplyScalar(uPos)).add(v.clone().multiplyScalar(vTop)).add(n.clone().multiplyScalar(dA));
    const pABot = center.clone().add(u.clone().multiplyScalar(uPos)).add(v.clone().multiplyScalar(vBot)).add(n.clone().multiplyScalar(dA));
    const pBTop = center.clone().add(u.clone().multiplyScalar(uPos)).add(v.clone().multiplyScalar(vTop)).add(n.clone().multiplyScalar(dB));
    const pBBot = center.clone().add(u.clone().multiplyScalar(uPos)).add(v.clone().multiplyScalar(vBot)).add(n.clone().multiplyScalar(dB));
    const wallNormal = dA > dB ? u.clone() : u.clone().negate();
    pushQuad(positions, normals, pATop, pABot, pBBot, pBTop, wallNormal);
  } else if (direction === 'bottom') {
    const uLeft = param1, uRight = param2, vPos = param3;
    const pALeft = center.clone().add(u.clone().multiplyScalar(uLeft)).add(v.clone().multiplyScalar(vPos)).add(n.clone().multiplyScalar(dA));
    const pARight = center.clone().add(u.clone().multiplyScalar(uRight)).add(v.clone().multiplyScalar(vPos)).add(n.clone().multiplyScalar(dA));
    const pBLeft = center.clone().add(u.clone().multiplyScalar(uLeft)).add(v.clone().multiplyScalar(vPos)).add(n.clone().multiplyScalar(dB));
    const pBRight = center.clone().add(u.clone().multiplyScalar(uRight)).add(v.clone().multiplyScalar(vPos)).add(n.clone().multiplyScalar(dB));
    const wallNormal = dA > dB ? v.clone().negate() : v.clone();
    pushQuad(positions, normals, pARight, pALeft, pBLeft, pBRight, wallNormal);
  }
}

export function flipGeometryNormals(geo) {
  const pos = geo.attributes.position.array;
  const norm = geo.attributes.normal.array;
  for (let i = 0; i < norm.length; i++) norm[i] = -norm[i];
  for (let i = 0; i < pos.length; i += 9) {
    for (let j = 0; j < 3; j++) {
      const tmp = pos[i + 3 + j];
      pos[i + 3 + j] = pos[i + 6 + j];
      pos[i + 6 + j] = tmp;
      const tmpN = norm[i + 3 + j];
      norm[i + 3 + j] = norm[i + 6 + j];
      norm[i + 6 + j] = tmpN;
    }
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
}
