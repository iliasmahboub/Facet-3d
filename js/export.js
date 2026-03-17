// stl export logic and print checklist modal

import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import state from './state.js';
import { cubeGroup } from './scene.js';

export function doExportSTL() {
  if (state.faceMeshes.length === 0) return;
  const geos = [];
  for (const child of cubeGroup.children) {
    geos.push(child.geometry);
  }
  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  const watertight = BufferGeometryUtils.mergeVertices(merged, 0.001);
  merged.dispose();
  const tmpMesh = new THREE.Mesh(watertight, state.matDefault);
  const exporter = new STLExporter();
  const result = exporter.parse(tmpMesh, { binary: true });
  watertight.dispose();
  const blob = new Blob([result], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `facet-${state.cubeSize}mm.stl`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function showChecklist() {
  const hasQR = state.urls.some(u => u.trim());
  const checks = [
    { label: 'Size 60mm or above', pass: state.cubeSize >= 60, fix: 'Increase size to at least 60mm for reliable QR scanning.' },
    { label: 'Engrave depth 0.8mm or above', pass: state.engraveDepth >= 0.8, fix: 'Increase engrave depth to at least 0.8mm.' },
    { label: 'Light material selected (not neon preset)', pass: state.currentPresetId !== 'neon', fix: 'Switch to a lighter material preset for better QR contrast.' },
    { label: 'At least one QR code present', pass: hasQR, fix: 'Enter at least one URL to generate a QR code.' },
  ];
  const container = document.getElementById('checklistItems');
  container.innerHTML = '';
  for (const c of checks) {
    const item = document.createElement('div');
    item.className = 'checklist-item';
    const icon = document.createElement('span');
    icon.className = 'check-icon ' + (c.pass ? 'pass' : 'fail');
    icon.textContent = c.pass ? '\u2713' : '\u2717';
    const textWrap = document.createElement('div');
    const text = document.createElement('div');
    text.className = 'check-text';
    text.textContent = c.label;
    textWrap.appendChild(text);
    if (!c.pass) {
      const fix = document.createElement('div');
      fix.className = 'check-fix';
      fix.textContent = c.fix;
      textWrap.appendChild(fix);
    }
    item.appendChild(icon);
    item.appendChild(textWrap);
    container.appendChild(item);
  }
  document.getElementById('checklistOverlay').classList.add('open');
}

export function initExportHandlers() {
  document.getElementById('exportBtn').addEventListener('click', () => {
    if (state.faceMeshes.length === 0) return;
    showChecklist();
  });
  document.getElementById('checklistExport').addEventListener('click', () => {
    document.getElementById('checklistOverlay').classList.remove('open');
    doExportSTL();
  });
  document.getElementById('checklistGoBack').addEventListener('click', () => {
    document.getElementById('checklistOverlay').classList.remove('open');
  });
  document.getElementById('checklistOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('checklistOverlay').classList.remove('open');
  });
}
