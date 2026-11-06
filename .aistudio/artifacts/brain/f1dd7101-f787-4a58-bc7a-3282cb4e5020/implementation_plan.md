# Map Bubbles, Data Separation & Dev Inspector Architecture

Refactor the world system from a hardcoded arena into a data-driven Map Bubble architecture with decoupled Entity Blueprints and Instance Placements, seamless Autopilot sublight warp transitions, and an in-engine visual Dev Inspector tool.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Choices from User Clarification:**
> - **Initial Map Bubbles**: Provide both `sol_hub.json` (Valiant Prime Starport Hub) and `mars_cluster.json` (Mining Outpost Delta & Asteroid Operations) with bidirectional jump travel so players can experience real bubble traversal immediately.
> - **Autopilot Traversal**: Implement a cinematic sublight warp jump sequence featuring hyperspace visual streak distortion, velocity dampening, sector unload/load, and arrival notification.
> - **Dev Inspector Hotkeys & Access**: Toggleable via the backquote key (`~` / `` ` ``) as well as an on-screen HUD button in the telemetry toolbar for accessibility.

---

### 1. Overview & Core Concept

- **Data-Driven Map Bubble Architecture**: World generation and entity placement are decoupled from the TypeScript simulation loop. Content authors can create new sectors, stations, and fields purely by editing JSON data files without touching game code.
- **Blueprint vs. Instance Separation**:
  - **Entity Blueprints (`/src/data/blueprints/entities.json`)**: Reusable entity archetype definitions detailing visual assets, collision footprints, docking capabilities, and interactive station services.
  - **Map Instances (`/src/data/maps/mars_cluster.json`, `/src/data/maps/sol_hub.json`)**: Lightweight spatial instances positioning blueprint archetypes at specific $(x, y)$ world coordinates with unique IDs and optional overrides.
  - **Starter Ship Specification (`/src/data/ships/starter_ship.json`)**: Base flight telemetry parameters (notably `maxSpeed`) decoupled from hardcoded engine constants.
- **Dynamic Unified `activeEntities` Pipeline**: The engine merges instance placements with blueprint archetypes on map load, applies resilient generic fallbacks for missing archetypes, and runs rendering, physics ticks, and collision checks over a unified polymorphic collection.
- **In-Engine Dev Inspector (`DevInspector.tsx`)**: An authoring overlay for level designers providing world-coordinate pixel inspection, real-time flight time ruler calculations (`Time = Distance / maxSpeed`), and instant JSON placement snippet export.

---

### 2. User Experience & Visual Design

- **Dev Inspector Overlay (Technical Precision Aesthetic)**:
  - Follows aerospace telemetry standards (`#07090E` deep obsidian backdrop, `#1E293B` hairline structural borders, `#00F0FF` cyan and `#F59E0B` amber telemetry accents).
  - Floating, non-intrusive collapsible panel positioned at the top-right viewport.
  - Canvas Crosshair Mode: when the inspector is active, the cursor switches to precision crosshair with live $(WorldX, WorldY)$ coordinates pinned next to the mouse tip.
- **Flight Time Ruler & Vector Line**:
  - Selecting any entity or clicking an origin point locks the ruler origin.
  - Moving the cursor draws a dynamic dotted vector guide line with distance in kilometers/meters, heading in degrees, and flight time formatted in `MM:SS` (e.g., `01m 45s @ 7.00 u/s`).
- **Autopilot Sublight Warp Transition**:
  - Triggering Autopilot to another bubble initiates a 2.5-second warp sequence:
    1. **Spool-Up (0.6s)**: Engine thrust flares, audio spool pitch-up, HUD displays `WARP DRIVE SPOOLING`.
    2. **Hyperspace Streak (1.2s)**: Starfield accelerates into elongated light-streaks with chromatic aberration distortion; entity arrays swap cleanly in memory.
    3. **Deceleration & Drop (0.7s)**: Flash dissipates, arrival chime plays, HUD announces new bubble location (`ARRIVED: MARS CLUSTER`).
- **Zero-Pill & Tabular Numerals**:
  - All coordinates, distances, and timer readouts use tabular monospace numerals (`font-mono tabular-nums`) to prevent layout jitter.
  - Clean unboxed metadata separated by typographic bullets (`·`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Blueprint Merge Subroutine with Safe Fallbacks**
  - *Chosen Approach*: On loading a bubble, the engine maps each instance `{ id, typeId, position }` to `entities.json[typeId]`. If a `typeId` is missing or invalid, it injects a `generic_beacon_v0` fallback archetype with a procedural placeholder graphic, default 40px collision radius, and null services, logging a non-crashing warning.
  - *Why*: Prevents missing assets or typoed entity IDs from crashing the canvas loop, enabling rapid modding and authoring.
- **Decision 2: Dynamic `activeEntities` Polymorphism**
  - *Chosen Approach*: Create a unified runtime entity interface (`RuntimeEntity`) implementing standard lifecycle methods (`update(dt)`, `draw(ctx)`, `getCollisionCircle()`, `interactiveInfo`). The game loop iterates over `activeEntities` for rendering and collision, eliminating separate hardcoded loops.
  - *Why*: Satisfies requirement 2 ("Ensure all game loop passes execute dynamically over the unified activeEntities array").
- **Decision 3: Global System and Bubble Location State**
  - *Chosen Approach*: Maintain `currentSystem` (e.g., `sol_system`) and `currentLocation` (`bubble_valiant_prime` or `mars_cluster`) in synchronized React and engine states. Provide an in-game Navigation / Autopilot quick selector in the HUD allowing players to jump between available bubbles.
  - *Why*: Allows immediate testing of the new architecture without requiring complex multi-jump manual gate navigation.

---

### 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER                                   │
├──────────────────────────────┬────────────────────────────┬──────────────┤
│ /src/data/blueprints/        │ /src/data/maps/            │ /src/data/   │
│   entities.json              │   mars_cluster.json        │   ships/     │
│   (archetypes, sprites,      │   sol_hub.json             │   starter_   │
│    collision, services)      │   (instances & positions)  │   ship.json  │
└──────────────┬───────────────┴─────────────┬──────────────┴───────┬──────┘
               │                             │                      │
               ▼                             ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           BUBBLE LOADER                                  │
│   - MapBubbleLoader.load(bubbleId)                                       │
│   - Merges instances + blueprints (with generic fallback)               │
│   - Spawns unified ActiveEntities collection                             │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                            GAME ENGINE                                   │
│   - currentSystem & currentLocation state tracking                       │
│   - Dynamic game loop: update() & draw() over activeEntities             │
│   - Collision detection & Docking interactions over activeEntities       │
│   - Warp transit animation state machine (Spool -> Streak -> Drop)       │
└───────────────────────┬──────────────────────────────┬───────────────────┘
                        │                              │
                        ▼                              ▼
┌───────────────────────────────┐     ┌────────────────────────────────────┐
│      HUD & Navigation         │     │    DevInspector.tsx Overlay        │
│  - System / Location breadcrumb│    │  - Canvas pixel -> World coords    │
│  - Autopilot Jump trigger     │     │  - Origin-to-cursor Flight Ruler   │
│  - Toggle Dev Inspector       │     │  - JSON Instance Block Exporter    │
└───────────────────────────────┘     └────────────────────────────────────┘
```

#### Directory & File Structure

1. **`/src/data/blueprints/entities.json`**:
   - `base_station_v1`: Sol Base Station archetype with docking, dealer, bar, repair services, sprite asset `assets/images/stations/Base Station.png`, radius 430.
   - `mining_station_v1`: Outpost Delta archetype with mineral exchange and refuel services, custom industrial sprite / rendering, radius 380.
   - `defense_platform_v1`: Automated turret station archetype, radius 180.
   - `asteroid_large`, `asteroid_medium`, `asteroid_small`: Asteroid field archetypes.
   - `target_drone_v1`, `hostile_drone_v1`: Drone archetypes.
   - `generic_fallback`: Safe generic fallback archetype with wireframe beacon graphic and default collision.
2. **`/src/data/maps/mars_cluster.json`**:
   - Bubble ID `mars_cluster`, name `Mars Frontier Cluster`, system `sol_system`.
   - Instance placements: `mining_outpost_delta` at `{ x: 14500, y: -8200 }`, defense platforms, orbital relays, and resource clusters.
3. **`/src/data/maps/sol_hub.json`**:
   - Bubble ID `sol_hub`, name `Starport Valiant-Prime Hub`, system `sol_system`.
   - Instance placements: `station_valiant_prime` at `{ x: 0, y: 350 }`, local defense beacons, navigation buoys, and perimeter asteroids.
4. **`/src/data/ships/starter_ship.json`**:
   - Base player configuration containing `maxSpeed: 7.0`, `thrustPower: 0.09`, `maxShields: 100`, `maxHull: 100`.
5. **`/src/game/mapLoader.ts`**:
   - Decoupled loader function `loadMapBubble(bubbleId: string): RuntimeBubbleData` merging instance placements with blueprints.
6. **`/src/components/DevInspector.tsx`**:
   - Interactive overlay component capturing canvas clicks, calculating world coords via camera offset and zoom factor, calculating distance and flight time using `starter_ship.json`'s `maxSpeed`, and providing a clean JSON block exporter with a copy-to-clipboard action.

---

### Verification Plan

1. **Compilation & Type Check**:
   - Run `compile_applet` and `lint_applet` to confirm zero TypeScript compilation or linting errors.
2. **Data-Driven Bubble Loading**:
   - Verify `sol_hub` and `mars_cluster` load their respective instances merged with `entities.json`.
   - Verify fallback test: inject an unregistered `typeId: "unknown_derelict_99"` into an instance and verify the game continues without crashing, rendering the generic placeholder.
3. **Autopilot Jump Transition**:
   - Select "Mars Cluster" from the HUD navigation selector or station jump console.
   - Confirm sublight warp effect executes (streak distortion, warp audio, location breadcrumb updates to `SOL SYSTEM // MARS CLUSTER`, entities swap seamlessly).
4. **Dev Inspector Tooling**:
   - Press `` ` `` (Backquote) or click the HUD "DEV INSPECTOR" button.
   - Click anywhere on the viewport: verify $(WorldX, WorldY)$ matches actual camera + screen position.
   - Select an entity as ruler origin: hover cursor over space and verify vector line, distance readout, and flight time (`Distance / maxSpeed`).
   - Click "Copy JSON Snippet" and verify the output matches `{ "id": "...", "typeId": "...", "position": { "x": ..., "y": ... } }`.
