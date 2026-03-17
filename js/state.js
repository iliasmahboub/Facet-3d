// shared application state — single source of truth
// every module imports from here instead of keeping local copies

export const ACCENT_COLORS = [
  { name: 'indigo', hex: '#6366f1', dim: '#4f46e5', three: 0x6366f1 },
  { name: 'blue',   hex: '#3b82f6', dim: '#2563eb', three: 0x3b82f6 },
  { name: 'emerald',hex: '#10b981', dim: '#059669', three: 0x10b981 },
  { name: 'violet', hex: '#8b5cf6', dim: '#7c3aed', three: 0x8b5cf6 },
  { name: 'rose',   hex: '#f43f5e', dim: '#e11d48', three: 0xf43f5e },
  { name: 'amber',  hex: '#f59e0b', dim: '#d97706', three: 0xf59e0b },
];

export const FACE_TABLE = [
  { name: 'Front',  normal: [0, 0, 1],  uAxis: [1, 0, 0],  vAxis: [0, 1, 0] },
  { name: 'Back',   normal: [0, 0, -1], uAxis: [-1, 0, 0], vAxis: [0, 1, 0] },
  { name: 'Right',  normal: [1, 0, 0],  uAxis: [0, 0, -1], vAxis: [0, 1, 0] },
  { name: 'Left',   normal: [-1, 0, 0], uAxis: [0, 0, 1],  vAxis: [0, 1, 0] },
  { name: 'Top',    normal: [0, 1, 0],  uAxis: [1, 0, 0],  vAxis: [0, 0, -1] },
  { name: 'Bottom', normal: [0, -1, 0], uAxis: [1, 0, 0],  vAxis: [0, 0, 1] },
];

// shape registry — each shape module registers itself here
export const SHAPES = {};

export function registerShape(id, shape) {
  SHAPES[id] = shape;
}

const state = {
  // geometry
  cubeSize: 44,
  engraveDepth: 1.5,
  edgeMode: 'none',
  edgeSize: 2,
  normalsFlipped: false,
  activeShape: 'cube',

  // urls
  urls: ['', '', '', '', '', ''],

  // appearance
  currentAccent: ACCENT_COLORS[0],
  isDarkMode: true,
  viewMode: 'rendered',
  currentPresetId: 'solid',
  presetParams: {},

  // scene objects (set by scene.js)
  faceMeshes: [],
  focusedInputIndex: -1,

  // grid
  gridVisible: true,
  gridColorVal: 200,
  gridCellSize: 5,
  gridExtents: 100,
  gridFalloff: 0.5,

  // materials (set by materials.js)
  matDefault: null,
  matHighlight: null,
  matOverlay: null,
  activePresetMat: null,
};

// load saved theme
try {
  const saved = JSON.parse(localStorage.getItem('facet-theme'));
  if (saved) {
    if (saved.accent) state.currentAccent = ACCENT_COLORS.find(a => a.name === saved.accent) || ACCENT_COLORS[0];
    if (saved.dark !== undefined) state.isDarkMode = saved.dark;
  }
} catch {}

export function saveTheme() {
  localStorage.setItem('facet-theme', JSON.stringify({
    accent: state.currentAccent.name,
    dark: state.isDarkMode,
  }));
}

export default state;
