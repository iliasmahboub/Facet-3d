// shared application state — single source of truth
// every module imports from here instead of keeping local copies

export const ACCENT_COLORS = [
  { name: 'orange', hex: '#FF4F00', dim: '#cc3f00', three: 0xFF4F00 },
  { name: 'blue',   hex: '#0088FF', dim: '#0066cc', three: 0x0088FF },
  { name: 'green',  hex: '#00CC66', dim: '#00aa55', three: 0x00CC66 },
  { name: 'purple', hex: '#8844FF', dim: '#6633cc', three: 0x8844FF },
  { name: 'red',    hex: '#FF2244', dim: '#cc1133', three: 0xFF2244 },
  { name: 'cyan',   hex: '#00DDCC', dim: '#00bbaa', three: 0x00DDCC },
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
