// qr code generation and url distribution logic
// uses the global qrcode() function from the CDN script

import state from './state.js';

export function getQRModules(url) {
  if (!url || !url.trim()) return null;
  try {
    const qr = qrcode(0, 'H');
    qr.addData(url.trim());
    qr.make();
    const count = qr.getModuleCount();
    const grid = [];
    for (let r = 0; r < count; r++) {
      const row = [];
      for (let c = 0; c < count; c++) {
        row.push(qr.isDark(r, c) ? 1 : 0);
      }
      grid.push(row);
    }
    return { grid, count };
  } catch (e) {
    return { error: e.message };
  }
}

export function distributeURLs() {
  const active = [];
  for (let i = 0; i < 6; i++) {
    if (state.urls[i] && state.urls[i].trim()) active.push(state.urls[i].trim());
  }
  const faces = [null, null, null, null, null, null];
  if (active.length === 0) return faces;
  if (active.length === 1) return [active[0], active[0], active[0], active[0], active[0], active[0]];
  if (active.length === 2) return [active[0], active[0], active[0], active[1], active[1], active[1]];
  if (active.length === 3) return [active[0], active[0], active[1], active[1], active[2], active[2]];
  for (let i = 0; i < active.length && i < 6; i++) faces[i] = active[i];
  return faces;
}

export function getFacesForInput(inputIndex) {
  const url = state.urls[inputIndex]?.trim();
  if (!url) return [];
  const dist = distributeURLs();
  const faces = [];
  for (let f = 0; f < 6; f++) {
    if (dist[f] === url) faces.push(f);
  }
  return faces;
}
