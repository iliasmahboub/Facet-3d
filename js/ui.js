// ui controls — panel, sliders, theme, raycaster, shape selector, rebuild loop

import * as THREE from 'three';
import state, { ACCENT_COLORS, SHAPES, saveTheme } from './state.js';
import { buildActiveMaterials, VIEW_MODES, PRESETS, PRESET_SLIDERS, gp, hslAccent } from './materials.js';
import { scene, camera, cubeGroup, viewport, floatingMat, updateGridColor, rebuildGrid, setGridY, setGridVisible } from './scene.js';
import { distributeURLs, getFacesForInput } from './qr.js';
import { flipGeometryNormals } from './geometry.js';
import { initExportHandlers } from './export.js';

let rebuildTimeout = null;
let pendingDispose = [];
const faceTagEls = [];
const urlInputs = [];

// rebuild — the core render loop that builds the active shape
export function rebuild() {
  for (const g of pendingDispose) g.dispose();
  pendingDispose = [];
  const geosSeen = new Set();
  for (const child of cubeGroup.children) {
    if (child.geometry && !geosSeen.has(child.geometry)) {
      geosSeen.add(child.geometry);
      pendingDispose.push(child.geometry);
    }
  }
  while (cubeGroup.children.length) cubeGroup.remove(cubeGroup.children[0]);
  state.faceMeshes = [];

  buildActiveMaterials();
  const shadowsOn = VIEW_MODES[state.viewMode].shadows;

  const shape = SHAPES[state.activeShape];
  if (!shape) return;

  const groundY = shape.getGroundY(state.cubeSize);
  setGridY(groundY);

  const result = shape.build({
    size: state.cubeSize,
    depth: state.engraveDepth,
    edgeMode: state.edgeMode,
    edgeSize: state.edgeSize,
    normalsFlipped: state.normalsFlipped,
    shadowsOn,
  }, {
    matDefault: state.matDefault,
    matHighlight: state.matHighlight,
    matOverlay: state.matOverlay,
  });

  const { meshes, warnings, triCount, hasQR } = result;

  // add face meshes to scene
  for (const m of meshes) {
    cubeGroup.add(m);
    if (m.userData.faceIndex >= 0) {
      state.faceMeshes.push(m);
    }
  }

  // smart print warnings
  const hasAnyQR = hasQR;
  if (hasAnyQR && state.currentPresetId === 'neon') {
    warnings.push({ face: 'Print', msg: '\u26A0 Dark material detected \u2014 QR codes may not scan. Use a light-colored filament like white PLA.' });
  }
  if (hasAnyQR && state.cubeSize < 50) {
    warnings.push({ face: 'Print', msg: '\u26A0 Size below 50mm \u2014 QR codes may not scan reliably. Recommend 60mm minimum.' });
  }
  if (hasAnyQR && state.engraveDepth < 0.8) {
    warnings.push({ face: 'Print', msg: '\u26A0 Engrave depth too shallow \u2014 increase to at least 0.8mm for scannable QR codes.' });
  }

  applyHighlight();

  // render warnings
  const warningsEl = document.getElementById('warnings');
  warningsEl.innerHTML = '';
  for (const w of warnings) {
    const div = document.createElement('div');
    div.className = 'warning' + (w.msg.includes('error') ? ' error' : '');
    div.textContent = `${w.face}: ${w.msg}`;
    warningsEl.appendChild(div);
  }

  // status bar
  const activeCount = state.urls.filter(u => u.trim()).length;
  const status = document.getElementById('status');
  if (triCount > 0 && hasQR) {
    status.textContent = `${triCount.toLocaleString()} triangles \u00B7 ${activeCount} URL${activeCount !== 1 ? 's' : ''} \u00B7 ${state.cubeSize}mm`;
  } else {
    status.textContent = 'Enter a URL to generate QR ' + shape.name.toLowerCase();
  }

  updateFaceTags();
  document.getElementById('exportBtn').disabled = !hasQR;
}

export function scheduleRebuild(delay = 0) {
  clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(rebuild, delay);
}

function applyHighlight() {
  for (let i = 0; i < state.faceMeshes.length; i++) {
    state.faceMeshes[i].material = state.matDefault;
  }
  if (state.focusedInputIndex >= 0) {
    const faces = getFacesForInput(state.focusedInputIndex);
    for (const f of faces) {
      if (state.faceMeshes[f]) state.faceMeshes[f].material = state.matHighlight;
    }
  }
  for (let i = 0; i < 6; i++) {
    const tag = faceTagEls[i];
    if (!tag) continue;
    tag.classList.toggle('lit', i === state.focusedInputIndex && state.urls[i]?.trim());
  }
}

function updateFaceTags() {
  const dist = distributeURLs();
  const shape = SHAPES[state.activeShape];
  for (let i = 0; i < 6; i++) {
    const url = state.urls[i]?.trim();
    const tag = faceTagEls[i];
    if (!tag) continue;
    if (!url) { tag.textContent = ''; continue; }
    if (shape && shape.maxFaces === 1) {
      tag.textContent = i === 0 ? 'Front' : '';
      continue;
    }
    const names = [];
    const FACE_NAMES = ['Front', 'Back', 'Right', 'Left', 'Top', 'Bottom'];
    for (let f = 0; f < 6; f++) {
      if (dist[f] === url) names.push(FACE_NAMES[f]);
    }
    tag.textContent = names.join(', ');
  }
}

// theme
function syncPresetAccent(id) {
  let col = null;
  if (id === 'solid') col = hslAccent(gp('solid', 'color', 230), 0.75, 0.60);
  else if (id === 'clay') col = hslAccent(gp('clay', 'color', 25), 0.55, 0.55);
  else if (id === 'neon') col = hslAccent(gp('neon', 'hue', 270), 0.90, 0.65);
  else if (id === 'gradient') col = hslAccent(gp('gradient', 'color1', 263), 0.75, 0.62);
  else if (id === 'glass' && gp('glass', 'tint', 0) > 5) col = hslAccent(gp('glass', 'tint', 0), 0.55, 0.68);
  else if (id === 'chrome' && gp('chrome', 'tint', 0) > 5) col = hslAccent(gp('chrome', 'tint', 0), 0.45, 0.72);
  const root = document.documentElement;
  if (col) { root.style.setProperty('--accent', col.hex); root.style.setProperty('--accent-dim', col.dim); }
  else if (id !== 'holographic') { root.style.setProperty('--accent', state.currentAccent.hex); root.style.setProperty('--accent-dim', state.currentAccent.dim); }
  document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', col ? false : s.dataset.name === state.currentAccent.name));
}

function buildPresetSliders(presetId) {
  const container = document.getElementById('presetParams');
  container.innerHTML = '';
  const sliders = PRESET_SLIDERS[presetId];
  if (!sliders) return;
  for (const s of sliders) {
    const val = gp(presetId, s.key, s.def);
    const row = document.createElement('div');
    row.className = 'ov-slider-row';
    row.innerHTML = `<div class="ov-label">${s.label}</div><input type="range" class="${s.rainbow ? 'rainbow-range' : 'param-range'}" min="${s.min}" max="${s.max}" value="${val}">`;
    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      state.presetParams[`${presetId}-${s.key}`] = v;
      if (state.activePresetMat) s.apply(v, state.activePresetMat);
      if (['color', 'hue', 'tint', 'color1'].includes(s.key)) syncPresetAccent(presetId);
    });
    container.appendChild(row);
  }
}

function applyPreset(id) {
  state.currentPresetId = id;
  buildPresetSliders(id);
  syncPresetAccent(id);
  scheduleRebuild(0);
}

export function applyTheme() {
  document.body.classList.toggle('light', !state.isDarkMode);
  const sceneBg = state.isDarkMode ? 0x0a0a0a : 0xe0e0e0;
  scene.background = new THREE.Color(sceneBg);
  floatingMat.opacity = state.isDarkMode ? 0.06 : 0.04;
  floatingMat.color.set(state.currentAccent.three);
  updateGridColor();
  rebuildGrid();
  scheduleRebuild(0);
  document.getElementById('modeToggle').textContent = state.isDarkMode ? 'Switch to Light' : 'Switch to Dark';
  saveTheme();
  syncPresetAccent(state.currentPresetId);
}

// shape selector
function buildShapeSelector() {
  const container = document.getElementById('shapeSelector');
  if (!container) return;
  container.innerHTML = '';
  for (const [id, shape] of Object.entries(SHAPES)) {
    const btn = document.createElement('button');
    btn.className = 'shape-btn' + (id === state.activeShape ? ' active' : '');
    btn.innerHTML = `<span class="shape-icon">${shape.icon}</span><span class="shape-name">${shape.name}</span>`;
    btn.addEventListener('click', () => {
      state.activeShape = id;
      document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // update slider config for this shape
      updateSliderForShape(shape);
      // update URL label
      const urlLabel = document.querySelector('#urlSection .section-label');
      if (urlLabel) urlLabel.textContent = shape.urlLabel;
      // show/hide edge controls
      const edgeSection = document.getElementById('edgeSection');
      if (edgeSection) edgeSection.style.display = shape.hasEdges ? '' : 'none';
      scheduleRebuild(0);
    });
    container.appendChild(btn);
  }
}

function updateSliderForShape(shape) {
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeLabel = document.querySelector('#sizeSection .slider-label');
  const sizeHint = document.querySelector('#sizeSection .slider-hint');
  if (sizeSlider) {
    sizeSlider.min = shape.sizeRange.min;
    sizeSlider.max = shape.sizeRange.max;
    sizeSlider.step = shape.sizeRange.step;
    if (state.cubeSize < shape.sizeRange.min) {
      state.cubeSize = shape.sizeRange.default;
      sizeSlider.value = state.cubeSize;
    } else if (state.cubeSize > shape.sizeRange.max) {
      state.cubeSize = shape.sizeRange.default;
      sizeSlider.value = state.cubeSize;
    }
    document.getElementById('sizeVal').textContent = `${state.cubeSize} mm`;
  }
  if (sizeLabel) sizeLabel.textContent = shape.sizeLabel;
  if (sizeHint) sizeHint.textContent = shape.sizeHint;
}

// init all UI
export function initUI() {
  // url inputs
  const urlGroup = document.getElementById('urlGroup');
  for (let i = 0; i < 6; i++) {
    const row = document.createElement('div');
    row.className = 'url-row';
    const label = document.createElement('label');
    label.textContent = (i + 1);
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = i === 0 ? 'https://example.com' : '';
    input.spellcheck = false;
    input.autocomplete = 'off';
    const tag = document.createElement('span');
    tag.className = 'face-tags';
    faceTagEls.push(tag);
    input.addEventListener('input', () => { state.urls[i] = input.value; scheduleRebuild(300); });
    input.addEventListener('focus', () => { state.focusedInputIndex = i; applyHighlight(); });
    input.addEventListener('blur', () => { state.focusedInputIndex = -1; applyHighlight(); });
    const wrap = document.createElement('div');
    wrap.className = 'url-input-wrap';
    wrap.appendChild(input);
    wrap.appendChild(tag);
    row.appendChild(label);
    row.appendChild(wrap);
    urlGroup.appendChild(row);
    urlInputs.push(input);
  }

  // sliders
  const sizeSlider = document.getElementById('sizeSlider');
  const depthSlider = document.getElementById('depthSlider');
  const edgeSlider = document.getElementById('edgeSlider');
  const sizeVal = document.getElementById('sizeVal');
  const depthVal = document.getElementById('depthVal');
  const edgeVal = document.getElementById('edgeVal');
  const edgeBtns = document.querySelectorAll('.edge-btn');

  sizeSlider.addEventListener('input', () => {
    state.cubeSize = parseFloat(sizeSlider.value);
    sizeVal.textContent = `${state.cubeSize} mm`;
    const maxEdge = Math.round(state.cubeSize * 0.15 * 10) / 10;
    edgeSlider.max = maxEdge;
    if (state.edgeSize > maxEdge) { state.edgeSize = maxEdge; edgeSlider.value = state.edgeSize; updateEdgeLabel(); }
    scheduleRebuild(0);
  });
  depthSlider.addEventListener('input', () => {
    state.engraveDepth = parseFloat(depthSlider.value);
    depthVal.textContent = `${state.engraveDepth.toFixed(1)} mm`;
    scheduleRebuild(0);
  });
  edgeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.edgeMode = btn.dataset.mode;
      edgeBtns.forEach(b => b.classList.toggle('active', b === btn));
      edgeSlider.disabled = state.edgeMode === 'none';
      updateEdgeLabel();
      scheduleRebuild(0);
    });
  });
  edgeSlider.addEventListener('input', () => {
    state.edgeSize = parseFloat(edgeSlider.value);
    updateEdgeLabel();
    scheduleRebuild(0);
  });

  function updateEdgeLabel() {
    if (state.edgeMode === 'none') { edgeVal.textContent = 'None'; }
    else { edgeVal.textContent = `${state.edgeMode.charAt(0).toUpperCase() + state.edgeMode.slice(1)} ${state.edgeSize.toFixed(1)} mm`; }
  }

  // flip normals
  document.getElementById('flipBtn').addEventListener('click', () => {
    state.normalsFlipped = !state.normalsFlipped;
    document.getElementById('flipBtn').classList.toggle('active', state.normalsFlipped);
    for (const child of cubeGroup.children) { flipGeometryNormals(child.geometry); }
  });

  // theme popover
  const titleBtn = document.getElementById('titleBtn');
  const themePopover = document.getElementById('themePopover');
  const swatchesEl = document.getElementById('swatches');
  for (const ac of ACCENT_COLORS) {
    const s = document.createElement('div');
    s.className = 'swatch';
    s.style.background = ac.hex;
    s.dataset.name = ac.name;
    s.addEventListener('click', (e) => { e.stopPropagation(); state.currentAccent = ac; applyTheme(); if (state.focusedInputIndex >= 0) applyHighlight(); });
    swatchesEl.appendChild(s);
  }
  document.getElementById('modeToggle').addEventListener('click', (e) => { e.stopPropagation(); state.isDarkMode = !state.isDarkMode; applyTheme(); });
  titleBtn.addEventListener('click', (e) => { e.stopPropagation(); themePopover.classList.toggle('open'); });
  document.addEventListener('click', (e) => { if (!themePopover.contains(e.target) && e.target !== titleBtn) { themePopover.classList.remove('open'); } });

  // material presets
  const matPresetGrid = document.getElementById('matPresetGrid');
  PRESETS.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'mat-preset-btn' + (preset.id === state.currentPresetId ? ' active' : '');
    const swatch = document.createElement('div');
    swatch.className = 'mat-swatch';
    swatch.style.cssText = preset.swatch;
    const label = document.createElement('div');
    label.className = 'mat-name';
    label.textContent = preset.name;
    btn.appendChild(swatch);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mat-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(preset.id);
    });
    matPresetGrid.appendChild(btn);
  });
  buildPresetSliders(state.currentPresetId);

  // grid controls
  document.getElementById('gridVisibleChk').addEventListener('change', e => { state.gridVisible = e.target.checked; setGridVisible(state.gridVisible); });
  document.getElementById('gridColorSlider').addEventListener('input', e => { state.gridColorVal = parseInt(e.target.value); updateGridColor(); });
  document.getElementById('gridCellSizeSlider').addEventListener('input', e => { state.gridCellSize = parseFloat(e.target.value); rebuildGrid(); });
  document.getElementById('gridExtentsSlider').addEventListener('input', e => { state.gridExtents = parseInt(e.target.value); rebuildGrid(); });
  document.getElementById('gridFalloffSlider').addEventListener('input', e => { state.gridFalloff = parseInt(e.target.value) / 100; rebuildGrid(); });

  // theme icon button
  document.getElementById('themeIconBtn').addEventListener('click', () => { state.isDarkMode = !state.isDarkMode; applyTheme(); });

  // view mode
  document.querySelectorAll('#viewModeControl .segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#viewModeControl .segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.viewMode = btn.dataset.mode;
      scheduleRebuild(0);
    });
  });

  // raycaster for click-to-select
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  viewport.addEventListener('click', (e) => {
    const rect = viewport.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(state.faceMeshes);
    if (hits.length > 0) {
      const fi = hits[0].object.userData.faceIndex;
      if (fi >= 0 && fi < 6) {
        const dist = distributeURLs();
        const url = dist[fi];
        let inputIdx = -1;
        if (url) { for (let i = 0; i < 6; i++) { if (state.urls[i]?.trim() === url) { inputIdx = i; break; } } }
        if (inputIdx < 0) { for (let i = 0; i < 6; i++) { if (!state.urls[i] || !state.urls[i].trim()) { inputIdx = i; break; } } if (inputIdx < 0) inputIdx = fi < 6 ? fi : 0; }
        urlInputs[inputIdx].focus();
        urlInputs[inputIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });

  // shape selector
  buildShapeSelector();

  // export handlers
  initExportHandlers();

  // edge slider max
  edgeSlider.max = Math.round(state.cubeSize * 0.15 * 10) / 10;

  // initial render
  updateGridColor();
  applyTheme();
  rebuild();
}
