// three.js scene setup — camera, renderer, lights, grid, floating shapes, animate loop

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import state, { ACCENT_COLORS } from './state.js';
import { hslAccent, VIEW_MODES } from './materials.js';

const viewport = document.getElementById('viewport');

export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
camera.position.set(80, 60, 80);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 30;
controls.maxDistance = 300;

// lights
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(60, 80, 60);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
fillLight.position.set(-40, 20, -40);
scene.add(fillLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// grid
let GROUND_Y = -(state.cubeSize / 2) - 0.05;

function buildGridGeometry(cellSize, extents) {
  const positions = [];
  for (let x = -extents; x <= extents + 0.001; x += cellSize) { positions.push(x, 0, -extents, x, 0, extents); }
  for (let z = -extents; z <= extents + 0.001; z += cellSize) { positions.push(-extents, 0, z, extents, 0, z); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

const gridMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uColor: { value: new THREE.Color(0xffffff) }, uHalf: { value: state.gridExtents }, uFalloff: { value: state.gridFalloff } },
  vertexShader: `varying vec2 vXZ; void main() { vXZ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 uColor; uniform float uHalf, uFalloff; varying vec2 vXZ; void main() { float d = length(vXZ) / uHalf; float fadeStart = 1.0 - uFalloff; float alpha = 1.0 - smoothstep(fadeStart, 1.0, d); gl_FragColor = vec4(uColor, alpha * 0.45); }`,
});

let gridMesh = new THREE.LineSegments(buildGridGeometry(state.gridCellSize, state.gridExtents), gridMat);
gridMesh.position.y = GROUND_Y;
gridMesh.visible = state.gridVisible;
scene.add(gridMesh);

export function updateGridColor() {
  const lightness = state.isDarkMode ? state.gridColorVal / 255 : 1 - state.gridColorVal / 255;
  gridMat.uniforms.uColor.value.setHSL(0, 0, lightness);
}

export function rebuildGrid() {
  gridMesh.geometry.dispose();
  gridMesh.geometry = buildGridGeometry(state.gridCellSize, state.gridExtents);
  gridMat.uniforms.uHalf.value = state.gridExtents;
  gridMat.uniforms.uFalloff.value = state.gridFalloff;
}

export function setGridVisible(v) { gridMesh.visible = v; }
export function setGridY(y) { gridMesh.position.y = y; }

// floating background shapes
const floatingGroup = new THREE.Group();
scene.add(floatingGroup);
const FLOAT_GEOS = [new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1, 0), new THREE.TetrahedronGeometry(1, 0), new THREE.TorusGeometry(0.7, 0.3, 4, 6), new THREE.DodecahedronGeometry(1, 0)];
export const floatingMat = new THREE.MeshBasicMaterial({ color: 0x8844FF, transparent: true, opacity: 0.06, wireframe: true });
const floatingShapes = [];
for (let i = 0; i < 22; i++) {
  const geo = FLOAT_GEOS[i % FLOAT_GEOS.length].clone();
  const scale = 6 + Math.random() * 18;
  const mesh = new THREE.Mesh(geo, floatingMat);
  const r = 180 + Math.random() * 180;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  mesh.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  mesh.scale.setScalar(scale);
  mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
  mesh.userData.rv = new THREE.Vector3((Math.random() - 0.5) * 0.004, (Math.random() - 0.5) * 0.004, (Math.random() - 0.5) * 0.004);
  floatingGroup.add(mesh);
  floatingShapes.push(mesh);
}

// main object group
export const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

// resize handler
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// animate loop
let holoHue = 270;
const clock = new THREE.Clock();

export function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (state.activePresetMat?.userData?.shader?.uniforms?.uTime) {
    state.activePresetMat.userData.shader.uniforms.uTime.value += dt;
  }
  controls.update();
  floatingShapes.forEach(m => {
    m.rotation.x += m.userData.rv.x;
    m.rotation.y += m.userData.rv.y;
    m.rotation.z += m.userData.rv.z;
  });
  if (state.currentPresetId === 'holographic') {
    holoHue = (holoHue + 0.4) % 360;
    const c = hslAccent(holoHue, 0.85, 0.65);
    document.documentElement.style.setProperty('--accent', c.hex);
    document.documentElement.style.setProperty('--accent-dim', c.dim);
  }
  renderer.render(scene, camera);
}

export { viewport };
