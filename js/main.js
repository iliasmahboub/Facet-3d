// facet studio — main entry point
// imports all modules, registers shapes, and kicks off the app

import './shapes/cube.js';
import './shapes/pendant.js';
import './shapes/bracelet.js';
import './shapes/keychain.js';
import { animate } from './scene.js';
import { initUI } from './ui.js';

initUI();
animate();
