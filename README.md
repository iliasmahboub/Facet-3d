# Facet Studio

Browser-based 3D print customizer with QR code engraving. Design objects, preview them in real-time, and export print-ready STL files — all from a single browser tab.

No frameworks. No bundlers. No npm. Pure vanilla HTML/CSS/JS with CDN imports.

## Live Demo

https://iliasmahboub.github.io/Facet-3d/

## Shapes

| Shape | Description | QR Faces |
|-------|-------------|----------|
| **Cube** | Classic QR cube with up to 6 engraved faces, chamfer/fillet edge treatments | 6 |
| **Pendant** | Round disc with bail loop for necklace chain — wearable QR | 1 |
| **Bracelet** | Rigid band with QR engraved on the outer surface | 1 |
| **Keychain** | Rounded rectangle tag with keyring hole | 1 |

## Features

- **Real-time 3D preview** — Three.js rendered viewport with orbit controls
- **7 material presets** — Solid, Glass, Chrome, Clay, Holographic, Neon, Gradient
- **4 display modes** — Wireframe, Ghosted, Shaded, Rendered
- **Smart print warnings** — Flags issues before you waste filament (size too small, depth too shallow, dark material for QR)
- **Pre-export checklist** — Pass/fail modal before STL download
- **Click-to-select** — Click a face in the viewport to focus its URL input
- **Dark/light mode** — With accent color picker
- **Configurable grid** — Color, cell size, extents, falloff
- **Print-friendly geometry** — Beveled edges, minimum wall thickness enforcement, watertight STL export

## 3D Print Tips

- **Minimum size**: 50mm+ for reliable QR scanning
- **Engrave depth**: 1.5mm+ gives the best contrast
- **Filament**: Use light-colored PLA (white, light gray) for QR scanability
- **Layer height**: 0.12mm for fine QR detail, 0.2mm acceptable for larger prints
- **Infill**: 20%+ for structural integrity, 100% for pendants/jewelry
- **Supports**: Not needed for cubes. Pendants print flat on back face. Bracelets print upright.

## Project Structure

```
facet-studio/
  index.html              <- html shell only
  css/
    style.css             <- all styles
  js/
    main.js               <- entry point, imports and boots
    state.js              <- shared app state, shape registry
    qr.js                 <- QR generation and URL distribution
    geometry.js           <- shared geometry primitives
    materials.js          <- material presets and shaders
    scene.js              <- Three.js scene, camera, lights, grid
    export.js             <- STL export and print checklist
    ui.js                 <- panel controls, rebuild loop, raycaster
    shapes/
      cube.js             <- cube with 6-face QR + edge treatments
      pendant.js          <- round pendant with bail loop
      bracelet.js         <- rigid bracelet band
      keychain.js         <- rounded tag with keyring hole
```

## Running Locally

Serve the directory with any static file server (ES modules require it):

```bash
# python
python -m http.server 8000

# node
npx serve .

# vscode
# use the Live Server extension
```

Then open `http://localhost:8000` in your browser.

## Deployment

GitHub Pages is configured via GitHub Actions. Pushes to `master` publish the static site to:

`https://iliasmahboub.github.io/Facet-3d/`

## Tech Stack

- [Three.js](https://threejs.org/) v0.170.0 — 3D rendering (CDN)
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) — QR encoding (CDN)
- Vanilla JS ES modules — no build step
- Google Fonts — Instrument Serif + DM Mono

## License

MIT
