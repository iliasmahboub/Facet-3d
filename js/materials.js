// material presets and builder — all shader code lives here
// do not refactor the shader strings, they are proven and working

import * as THREE from 'three';
import state from './state.js';

const GLSL_WV = `varying vec3 vWN; varying vec3 vWP;`;
const GLSL_WC = `vWN = normalize((modelMatrix * vec4(transformedNormal, 0.0)).xyz); vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;`;
const GLSL_HSL = `vec3 hsl2rgb(float h,float s,float l){vec3 c=clamp(abs(mod(h*6.0+vec3(0,.33,.67),6.0)-3.0)-1.0,0.0,1.0);return l+s*(c-0.5)*(1.0-abs(2.0*l-1.0));}`;

export const VIEW_MODES = {
  wireframe: { shadows: false },
  ghosted: { shadows: false },
  shaded: { shadows: true },
  rendered: { shadows: true },
};

export const PRESETS = [
  { id: 'solid',       name: 'Solid',    swatch: 'background:linear-gradient(135deg,#7088cc,#8098dd)' },
  { id: 'glass',       name: 'Glass',    swatch: 'background:rgba(180,200,255,0.12);border:1.5px solid rgba(200,220,255,0.4)' },
  { id: 'chrome',      name: 'Chrome',   swatch: 'background:linear-gradient(160deg,#888,#fff 40%,#666 60%,#ddd)' },
  { id: 'clay',        name: 'Clay',     swatch: 'background:#d4b89c' },
  { id: 'holographic', name: 'Holo',     swatch: 'background:conic-gradient(from 0deg,#ff6b6b,#feca57,#48dbfb,#ff9ff3,#ff6b6b)' },
  { id: 'neon',        name: 'Neon',     swatch: 'background:#0a0a1a;border:1.5px solid #8844FF;box-shadow:0 0 6px #8844FF' },
  { id: 'gradient',    name: 'Gradient', swatch: 'background:linear-gradient(135deg,#7044ee,#44aadd)' },
];

export const PRESET_SLIDERS = {
  solid: [{ key: 'color', label: 'Color', min: 0, max: 360, def: 230, rainbow: true, apply: (v, m) => { m.color.setHSL(v / 360, 0.5, 0.65); } }, { key: 'rough', label: 'Roughness', min: 0, max: 100, def: 20, apply: (v, m) => { m.roughness = v / 100; } }],
  glass: [{ key: 'rough', label: 'Roughness', min: 0, max: 100, def: 5, apply: (v, m) => { m.roughness = v / 100; } }, { key: 'tint', label: 'Tint', min: 0, max: 360, def: 0, rainbow: true, apply: (v, m) => { if (v < 5) m.color.set(0xffffff); else m.color.setHSL(v / 360, 0.3, 0.92); } }],
  chrome: [{ key: 'env', label: 'Brightness', min: 100, max: 400, def: 250, apply: (v, m) => { m.envMapIntensity = v / 100; } }, { key: 'tint', label: 'Tint', min: 0, max: 360, def: 0, rainbow: true, apply: (v, m) => { if (v < 5) m.color.set(0xffffff); else m.color.setHSL(v / 360, 0.35, 0.75); } }],
  clay: [{ key: 'color', label: 'Color', min: 0, max: 360, def: 25, rainbow: true, apply: (v, m) => { m.color.setHSL(v / 360, 0.35, 0.75); m.sheenColor.setHSL(v / 360, 0.2, 0.7); } }, { key: 'rough', label: 'Roughness', min: 30, max: 100, def: 85, apply: (v, m) => { m.roughness = v / 100; } }],
  holographic: [{ key: 'speed', label: 'Speed', min: 5, max: 100, def: 30, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uSpeed) u.uSpeed.value = v / 100; } }, { key: 'mix', label: 'Intensity', min: 10, max: 100, def: 50, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uMix) u.uMix.value = v / 100; } }],
  neon: [{ key: 'hue', label: 'Color', min: 0, max: 360, def: 270, rainbow: true, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uH1) { u.uH1.value = v / 360; u.uH2.value = ((v + 120) % 360) / 360; } } }, { key: 'glow', label: 'Glow', min: 50, max: 500, def: 250, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uGlow) u.uGlow.value = v / 100; } }, { key: 'width', label: 'Width', min: 10, max: 90, def: 50, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uSpread) u.uSpread.value = (100 - v) / 20; } }],
  gradient: [{ key: 'color1', label: 'Color 1', min: 0, max: 360, def: 263, rainbow: true, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uGH1) u.uGH1.value = v / 360; } }, { key: 'color2', label: 'Color 2', min: 0, max: 360, def: 187, rainbow: true, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uGH2) u.uGH2.value = v / 360; } }, { key: 'sat', label: 'Saturation', min: 10, max: 100, def: 75, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uSat) u.uSat.value = v / 100; } }, { key: 'lit', label: 'Lightness', min: 30, max: 80, def: 60, apply: (v, m) => { const u = m.userData?.shader?.uniforms; if (u?.uLit) u.uLit.value = v / 100; } }],
};

export function gp(preset, key, def) {
  const v = state.presetParams[`${preset}-${key}`];
  return v !== undefined ? v : def;
}

export function hslAccent(h, s, l) {
  const c = new THREE.Color().setHSL(h / 360, s, l);
  const hex = '#' + c.getHexString();
  const d = new THREE.Color().setHSL(h / 360, s, l * 0.72);
  return { hex, dim: '#' + d.getHexString() };
}

export function buildPresetMaterial(id) {
  switch (id) {
    case 'solid': { const col = gp('solid', 'color', 230), rough = gp('solid', 'rough', 20); const mat = new THREE.MeshPhysicalMaterial({ metalness: 0.0, roughness: rough / 100, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.2 }); mat.color.setHSL(col / 360, 0.5, 0.65); return mat; }
    case 'glass': { const rough = gp('glass', 'rough', 5), tint = gp('glass', 'tint', 0); const mat = new THREE.MeshPhysicalMaterial({ metalness: 0.0, roughness: rough / 100, transmission: 0.92, thickness: 1.5, ior: 1.5, envMapIntensity: 1.5 }); if (tint < 5) mat.color.set(0xffffff); else mat.color.setHSL(tint / 360, 0.3, 0.92); return mat; }
    case 'chrome': { const env = gp('chrome', 'env', 250), tint = gp('chrome', 'tint', 0); const mat = new THREE.MeshPhysicalMaterial({ metalness: 1.0, roughness: 0.02, clearcoat: 0.5, envMapIntensity: env / 100 }); if (tint < 5) mat.color.set(0xffffff); else mat.color.setHSL(tint / 360, 0.35, 0.75); return mat; }
    case 'clay': { const col = gp('clay', 'color', 25), rough = gp('clay', 'rough', 85); const mat = new THREE.MeshPhysicalMaterial({ metalness: 0.0, roughness: rough / 100, sheen: 1.0, sheenRoughness: 0.4, sheenColor: new THREE.Color(), envMapIntensity: 0.5 }); mat.color.setHSL(col / 360, 0.35, 0.75); mat.sheenColor.setHSL(col / 360, 0.2, 0.7); return mat; }
    case 'holographic': { const spd = gp('holographic', 'speed', 30) / 100, mix = gp('holographic', 'mix', 50) / 100; const mat = new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.3, roughness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.2 }); mat.onBeforeCompile = (shader) => { shader.uniforms.uTime = { value: 0 }; shader.uniforms.uSpeed = { value: spd }; shader.uniforms.uMix = { value: mix }; shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${GLSL_WV}`).replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${GLSL_WC}`); shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uTime,uSpeed,uMix;\n${GLSL_WV}`).replace('#include <dithering_fragment>', `vec3 vd=normalize(cameraPosition-vWP);float fr=pow(1.0-abs(dot(vWN,vd)),3.0);float ang=atan(vWN.z,vWN.x);vec3 rain=0.5+0.5*cos(6.2832*(ang*0.5+uTime*uSpeed+vec3(0,.33,.67)));gl_FragColor.rgb=mix(gl_FragColor.rgb,rain,uMix+fr*(1.0-uMix));gl_FragColor.rgb+=fr*rain*uMix*0.8;\n#include <dithering_fragment>`); mat.userData.shader = shader; }; return mat; }
    case 'neon': { const hue = gp('neon', 'hue', 270), glow = gp('neon', 'glow', 250) / 100, width = gp('neon', 'width', 50), spread = (100 - width) / 20, h1 = hue / 360, h2 = ((hue + 120) % 360) / 360; const mat = new THREE.MeshPhysicalMaterial({ color: 0x080810, metalness: 0.2, roughness: 0.3, clearcoat: 1.0, envMapIntensity: 0.3 }); mat.onBeforeCompile = (shader) => { shader.uniforms.uH1 = { value: h1 }; shader.uniforms.uH2 = { value: h2 }; shader.uniforms.uGlow = { value: glow }; shader.uniforms.uSpread = { value: spread }; shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${GLSL_WV}`).replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${GLSL_WC}`); shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uH1,uH2,uGlow,uSpread;\n${GLSL_WV}\n${GLSL_HSL}`).replace('#include <dithering_fragment>', `vec3 vd2=normalize(cameraPosition-vWP);float fr2=pow(1.0-abs(dot(vWN,vd2)),uSpread);vec3 nc1=hsl2rgb(uH1,0.9,0.65);vec3 nc2=hsl2rgb(uH2,0.9,0.65);gl_FragColor.rgb+=mix(nc1,nc2,fr2)*fr2*uGlow;\n#include <dithering_fragment>`); mat.userData.shader = shader; }; return mat; }
    case 'gradient': { const c1 = gp('gradient', 'color1', 263) / 360, c2 = gp('gradient', 'color2', 187) / 360, sat = gp('gradient', 'sat', 75) / 100, lit = gp('gradient', 'lit', 60) / 100; const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.2, clearcoat: 0.8, envMapIntensity: 1.0 }); mat.onBeforeCompile = (shader) => { shader.uniforms.uGH1 = { value: c1 }; shader.uniforms.uGH2 = { value: c2 }; shader.uniforms.uSat = { value: sat }; shader.uniforms.uLit = { value: lit }; shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vOPos;`).replace('#include <begin_vertex>', `#include <begin_vertex>\nvOPos = position;`); shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nuniform float uGH1,uGH2,uSat,uLit;\nvarying vec3 vOPos;\n${GLSL_HSL}`).replace('vec4 diffuseColor = vec4( diffuse, opacity );', `float gT=clamp(vOPos.y*0.5+0.5,0.0,1.0);vec3 gc1=hsl2rgb(uGH1,uSat,uLit);vec3 gc2=hsl2rgb(uGH2,uSat,uLit);vec4 diffuseColor=vec4(mix(gc1,gc2,gT),opacity);`); mat.userData.shader = shader; }; return mat; }
    default: return buildPresetMaterial('solid');
  }
}

export function buildActiveMaterials() {
  if (state.matDefault) { state.matDefault.dispose(); state.matDefault = null; }
  if (state.matHighlight) { state.matHighlight.dispose(); state.matHighlight = null; }
  if (state.matOverlay) { state.matOverlay.dispose(); state.matOverlay = null; }
  state.activePresetMat = null;

  const { viewMode, currentAccent, isDarkMode, currentPresetId } = state;

  if (viewMode === 'wireframe') {
    state.matDefault = new THREE.MeshBasicMaterial({ color: 0x8B5CF6, wireframe: true, opacity: 0.8, transparent: true });
    state.matHighlight = new THREE.MeshBasicMaterial({ color: currentAccent.three, wireframe: true, opacity: 0.9, transparent: true });
    state.matOverlay = null;
  } else if (viewMode === 'ghosted') {
    state.matDefault = new THREE.MeshStandardMaterial({ color: 0xd0d4e8, transparent: true, opacity: 0.12, depthWrite: false });
    state.matHighlight = new THREE.MeshStandardMaterial({ color: currentAccent.three, transparent: true, opacity: 0.2, depthWrite: false });
    state.matOverlay = new THREE.MeshBasicMaterial({ color: 0x8B5CF6, wireframe: true, opacity: 0.1, transparent: true });
  } else if (viewMode === 'shaded') {
    state.matDefault = new THREE.MeshStandardMaterial({ color: isDarkMode ? 0xcccccc : 0x999999, roughness: 1.0, metalness: 0.0 });
    state.matHighlight = new THREE.MeshStandardMaterial({ color: currentAccent.three, emissive: currentAccent.three, emissiveIntensity: 0.35, roughness: 1.0, metalness: 0.0 });
  } else {
    state.matDefault = buildPresetMaterial(currentPresetId);
    state.activePresetMat = state.matDefault;
    state.matHighlight = new THREE.MeshPhysicalMaterial({ color: currentAccent.three, emissive: currentAccent.three, emissiveIntensity: 0.35, metalness: 0.08, roughness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.1 });
    state.matOverlay = null;
  }
}
