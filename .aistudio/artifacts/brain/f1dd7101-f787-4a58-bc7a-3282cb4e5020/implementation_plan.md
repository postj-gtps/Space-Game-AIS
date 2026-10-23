# Double Ship Scale & Anchor Alignment

Expand the SF-77 Vanguard heavy fighter to twice its current visual scale (`0.055` -> `0.11`), allowing players to appreciate hull armor plating, wing mounts, cockpit canopies, and thruster assemblies in full detail. Synchronize weapon muzzles, main thruster nozzles, and RCS reaction control thruster anchors proportionally to align exactly with the enlarged geometry.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following adjustments were confirmed during clarification:
> - **Hitbox & Deflector Shield**: Scale collision radius and outer deflector shield glow radius from 22px to 44px (2x) to match the larger physical silhouette.
> - **Weapon & Thruster Anchors**: Double muzzle and engine offsets proportionally so dual plasma blaster rounds fire directly from the wingtip barrels and ion exhaust trails plume from the 3 rear sublight nozzles.

---

### 1. Overview & Core Concept

- **What It Does**: Doubles the rendered dimensions of the player's starship on the game canvas while preserving crisp high-resolution detail from the source texture (`ship-starter.png`).
- **Visual Impact**: Hull details, weapons, and thruster animations become prominent focal points in the center of the viewport, enhancing immersion during combat maneuvers.
- **Physics Consistency**: The collision bounding circle and energy shield mesh expand proportionally, ensuring collision detection with asteroids and combat drones reflects the visible ship hull.

---

### 2. User Experience & Visual Design

- **Hull Presence**: At 2x scale, the ship occupies a bold, heroic focal point in the viewport without crowding the 10,000x10,000 universe.
- **Weapon Alignment**: Dual wing plasma cannons fire at local offsets `(56, -16)` and `(56, +16)`, matching the wingtip emitters.
- **Propulsion Effects**:
  - Tri-jet sublight main thrusters emit cyan ion particles from `(-44, -24)`, `(-52, 0)`, and `(-44, +24)`.
  - Dual RCS reaction control jets emit amber steering plumes from `(30, -28)` and `(30, +28)`.
- **Deflector Shield Bubble**: Outer shield aura expands to 48px radius (`collisionRadius + 4`), with pulsating cyan resonance when absorbing kinetic or energy impacts.
- **Vector Fallback**: Retro procedural vector wireframe scaled 2x in `engine.ts` for immediate visual parity.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Catalog Parameter Adjustment**
  - *Chosen Approach*: Update `sprite.scale: 0.11` directly in `assets/data/ships.json`, `public/assets/data/ships.json`, and `AssetManager.fallbackCatalog`.
  - *Why*: The engine was architected with a dynamic asset pipeline. Updating the catalog ensures the engine's data-driven contract is respected.
- **Decision 2: Proportional Anchor Scaling**
  - *Chosen Approach*: Multiply all anchor coordinates by 2.
  - *Why*: Anchors are defined in ship local space (pixels relative to ship center). Multiplying by 2 ensures particle emitters remain locked to hull features without requiring hardcoded offsets in the engine.
- **Decision 3: Maintain World Mechanics & Drone Spacing**
  - *Chosen Approach*: Keep asteroid counts, drone AI, and radar range intact.
  - *Why*: The 2200m radar and 10,000 sector coordinate space remain well-proportioned for high-speed dogfighting with the larger ship.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│            assets/data/ships.json (Catalog)            │
│  - scale: 0.055 ──► 0.11 (2x visual size)             │
│  - collisionRadius: 22 ──► 44                         │
│  - muzzles: [ (56,-16), (56,16) ]                     │
│  - thrusters: [ (-44,-24), (-52,0), (-44,24) ]        │
│  - rcsJets: [ (30,-28), (30,28) ]                     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  AssetManager Pipeline                 │
│  - Loads & caches enlarged sprite & anchor telemetry   │
│  - Syncs fallback catalog in src/game/assets.ts       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                PlayerShip & Canvas Engine              │
│  - Transforms 2x anchors to world space                │
│  - Emits muzzle flashes & thruster ion plumes at hull  │
│  - Calculates 44px collision bounds with asteroids     │
│  - Renders 48px glowing dynamic deflector shield       │
└────────────────────────────────────────────────────────┘
```

### Component & File Mapping

1. `/assets/data/ships.json` and `/public/assets/data/ships.json`:
   - Update `scale` to `0.11`
   - Update `collisionRadius` to `44`
   - Update `anchors.muzzles`, `anchors.thrusters`, and `anchors.rcsJets` to 2x coordinates
2. `/src/game/assets.ts`:
   - Synchronize `fallbackCatalog` with matching 2x scale and anchor coordinates
3. `/src/game/engine.ts`:
   - Scale vector fallback shape by 2x for consistency when textures load
   - Fine-tune particle plume emitter spread for larger engine bells
4. Verification:
   - Run `compile_applet` and `lint_applet` to ensure type safety and seamless build
