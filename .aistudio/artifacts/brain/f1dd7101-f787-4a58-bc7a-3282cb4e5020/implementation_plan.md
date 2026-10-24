# Fix Asset Loading on GitHub Pages (Subpath Base URL Resolution)

Resolve the missing ship and drone PNG images on GitHub Pages deployments by supporting Vite's subpath `base` configuration (`/Space-Game-AIS/`) and bundling fallback textures directly.

---

## Root Cause Analysis

1. **GitHub Pages Subpath vs Root Domain**:
   - In AI Studio preview and local dev, the app runs at the root path (`/`).
   - On GitHub Pages (`https://<username>.github.io/Space-Game-AIS/`), the app is served from a subfolder path: `/Space-Game-AIS/`.
   - The user correctly configured `base: '/Space-Game-AIS/'` in `vite.config.ts`, which causes Vite to rewrite all HTML script and stylesheet tags to `/Space-Game-AIS/assets/...`.
2. **Hardcoded Root Paths in Asset Pipeline**:
   - In `src/game/assets.ts`, catalog data and image files were fetched using absolute paths with a leading slash:
     `fetch('/assets/data/ships.json')`
     `src: '/assets/images/ships/ship-starter.png'`
     `src: '/assets/images/enemies/Enemy%20Drone.png'`
   - In the browser on GitHub Pages, `/assets/...` resolves to `https://<username>.github.io/assets/...` (the root GitHub domain), completely skipping the `/Space-Game-AIS/` repository name and returning **HTTP 404 Not Found**.
3. **Trigger of Retro Vector Fallback**:
   - When texture loading fails (`img.naturalWidth === 0`), `PlayerShip.draw` executes its retro vector wireframe fallback: the exact cyan arrowhead polygon shown in the user's screenshot.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Dual-Layer Resolution (Zero 404 Guarantee)**:
>   1. **Dynamic Base URL Helper (`resolveAssetPath`)**: Automatically prepends Vite's `import.meta.env.BASE_URL` (`/Space-Game-AIS/`) to all asset URLs at runtime.
>   2. **Bundled Asset Imports**: Directly import `ship-starter.png` and `Enemy Drone.png` in TypeScript so Vite compiles them directly into `dist/assets/`, guaranteeing they are always available even if network JSON fetches encounter CORS or path discrepancies.
>   3. **Automatic Fallback Chain**: If a remote or JSON-specified path fails to load, the engine falls back to the bundled image before resorting to the wireframe vector shape.

---

### 1. Overview & Core Concept

- **Problem**: Ship and drone textures fail to load on GitHub Pages because asset paths do not incorporate the repository subpath (`/Space-Game-AIS/`).
- **Solution**: Dynamically resolve all asset paths against `import.meta.env.BASE_URL` and bundle fallback textures so images display seamlessly across GitHub Pages, AI Studio preview, and local development.

---

### 2. User Experience & Visual Design

- **Ship Appearance**: The high-resolution **SF-77 Vanguard** sprite with hull armor and thrusters renders immediately on GitHub Pages instead of the cyan wireframe fallback.
- **Combat Drones**: The **Unit-07 Combat Drone** sprite renders reliably across all deployment environments.
- **Environment Agnostic**: Works identically whether hosted at `https://<username>.github.io/Space-Game-AIS/`, root custom domains (`https://example.com/`), or AI Studio dev containers.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Use `import.meta.env.BASE_URL` with Relative Fallback**
  - *Chosen Approach*: `resolveAssetPath(path)` strips leading slashes and combines with `import.meta.env.BASE_URL`.
  - *Why*: It honors `vite.config.ts`'s `base` setting in both build and dev modes without hardcoding repository names.
- **Decision 2: Direct Asset Import in Fallback Catalog**
  - *Chosen Approach*: `import defaultShipImg from ...` in `assets.ts`.
  - *Why*: Guarantees that Vite's asset compiler processes the image into `dist/assets/`, ensuring zero broken images regardless of server static directory rules.

---

### 4. Technical Architecture & File Changes

```
┌────────────────────────────────────────────────────────┐
│                   vite.config.ts                       │
│  - base: '/Space-Game-AIS/'                            │
│  - Exposes import.meta.env.BASE_URL                    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               src/game/assets.ts                       │
│  - import defaultShipImg from '../assets/images/...'   │
│  - import defaultDroneImg from '../assets/images/...'  │
│  - resolveAssetPath(path): prepends BASE_URL           │
│  - Automatic image load retry & fallback cascade       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Vite Production Build                  │
│  - dist/assets/ship-starter-[hash].png                 │
│  - dist/assets/Enemy Drone-[hash].png                  │
│  - Fully resolved paths on GitHub Pages deployment     │
└────────────────────────────────────────────────────────┘
```

### Steps to Implement

1. **`src/game/assets.ts`**:
   - Add `resolveAssetPath(path: string): string` utility.
   - Import default ship and drone images via Vite ES module imports.
   - Update `ships.json` fetch to use `resolveAssetPath('assets/data/ships.json')` with relative `./` and root `/` fallback cascade.
   - Update `fallbackCatalog` and image preloader to use resolved URLs and bundled defaults.
2. **Build & Verify**:
   - Run `npm run build` to confirm assets compile into `dist/` with correct `/Space-Game-AIS/` prefixes.
   - Verify with `compile_applet` and `lint_applet`.
