# Orbital Base Station & Docking System Implementation Plan

Integrate the large 10x Base Station asset (`Base Station.png`) into deep space, implement contact-based docking collision mechanics, and build an authentic sci-fi docking terminal interface with station facilities and safe undocking clearance.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Choices from User Clarification:**
> - **Station Location**: Positioned near the sector center at `(0, 350)` with the player spawning clear of the station perimeter at `(0, 0)` facing space.
> - **Undock Clearance**: Selecting "Leave Station" disengages clamps and places the player outside the station's perimeter with a 3-second collision grace period to prevent immediate re-docking loops.
> - **Dead-End Facility Screens**: Selecting "Ship Dealer", "Visit the Bar", "Mission Computer", or "Merchants' Hall" opens dedicated interior terminal screens clearly marked "Under Construction / Renovation in Progress" with atmospheric facility descriptions and a functional "Back to Concourse" action.
> - **Visual Scale**: Sized at 10x the player ship dimensions (~880px visual footprint, ~400px docking radius) with smooth slow rotation and distinct radar navigational blips.

---

### 1. Overview & Core Concept

- **The Orbital Base Station**: A colossal deep-space outpost rendered using `/Potential Assets/Base Station.png`. Serving as the primary civilization hub in the sector, it rotates majestically in deep space.
- **Proximity & Contact Docking**: When the player flies into contact with the base station hull, docking clamps engage: ship velocity is dampened to zero, weapons and thrust are safely locked, and the Station Concourse Terminal opens over the viewport.
- **Docking Concourse Terminal**:
  1. **Ship Dealer**: Concourse wing for purchasing, upgrading, and viewing starships (Under Construction preview).
  2. **Visit the Bar**: The "Starlight Cantina" - rumors, crew hiring, and local news (Under Construction preview).
  3. **Mission Computer**: Bounty hunting, patrol contracts, and courier manifests (Under Construction preview).
  4. **Merchants' Hall**: Cargo trading, ore exchange, and market commodities (Under Construction preview).
  5. **Leave Station**: Clamps release, engine power restored, and the ship is safely positioned clear of the station hull.

---

### 2. User Experience & Visual Design

- **Scale & Spatial Presence**:
  - The base station is rendered at 10x the player ship size, dwarfs nearby asteroids and drones, and provides a true sense of scale in the sector.
  - A subtle slow rotational drift ($0.001\text{ rad/s}$) gives the station kinetic presence without disorienting docking pilots.
- **Docking Transition**:
  - Upon touching the station radius, docking clamp audio / chime triggers, shields immediately begin slow auxiliary replenishment (station shore power), and the UI seamlessly reveals the station interface.
- **Station Concourse UI Aesthetic**:
  - Designed with clean sci-fi industrial aesthetic conforming to 60-30-10 color discipline: deep slate/void canvas (`#070d18`), structural steel borders (`rgba(0, 240, 255, 0.2)`), and high-contrast telemetry cyan/amber accents.
  - Authentic station status readout: Station Designation (`OUTPOST EPSILON-7`), Sector Grid Coordinates, Docking Bay (`BAY 04`), and Port Authorities Status.
  - Clear single-line facility navigation cards with crisp typography, hover states, and hotkey indicators (`1` through `5`).
- **Tactical Radar Representation**:
  - Distinct large hexagonal/circular station icon on the radar minimap with a pulsating beacon ring, allowing players to navigate back to base from anywhere in the sector.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Asset Pipeline & Preloading**
  - *Chosen Approach*: Copy `Base Station.png` from `/Potential Assets/` to both `/public/assets/images/stations/Base Station.png` and `/assets/images/stations/Base Station.png`. Preload inside `AssetManager` with error fallback to vector graphics.
  - *Why*: Guarantees immediate loading in dev server and production builds without missing asset errors.
- **Decision 2: Safe Undocking Buffer & Grace Period**
  - *Chosen Approach*: When clicking "Leave Station", the ship is positioned just outside the station's collision boundary along the vector pointing away from station center, with velocity set to an outward drift ($1.5\text{ units/frame}$) and a 3-second docking invulnerability timer.
  - *Why*: Completely eliminates the frustrating bug where a player immediately re-docks the moment they exit.
- **Decision 3: Dedicated Interior Terminal Sub-views**
  - *Chosen Approach*: Keep station modal state within a clean sub-route state machine (`'CONCOURSE' | 'SHIP_DEALER' | 'BAR' | 'MISSION_COMPUTER' | 'MERCHANTS_HALL'`). Each facility displays bespoke thematic descriptions and a "Return to Concourse" button.
  - *Why*: Satisfies the user's dead-end requirement cleanly while building the exact architecture ready for future feature expansion.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   src/game/assets.ts                   │
│  - Preloads 'Base Station.png'                         │
│  - Exposes AssetManager.getBaseStationImage()          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   src/game/engine.ts                   │
│  - BaseStation entity class:                           │
│      * Position (0, 350), visual radius ~420px         │
│      * Slow rotational drift (draw & transform)        │
│      * Docking contact detection against PlayerShip    │
│  - PlayerShip docking state & undock grace cooldown    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                      src/App.tsx                       │
│  - Base station update & render in world space         │
│  - Station blip on radar minimap                       │
│  - Docking collision trigger -> setDocked(true)        │
│  - Undock handler -> setDocked(false) & reposition     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             src/components/StationModal.tsx            │
│  - Atmospheric Concourse UI with 5 facility options    │
│  - Sub-views for Dealer, Bar, Missions, Merchants      │
│  - Keyboard shortcuts (1-5, Esc to back/leave)         │
└────────────────────────────────────────────────────────┘
```

#### State & Interaction Flow

1. **Space Flight**: Player pilots ship across sector. Radar shows station icon at `(0, 350)`.
2. **Contact Trigger**: `hypot(player.x - station.x, player.y - station.y) <= player.radius + station.radius`.
   - If `dockingGraceTimer <= 0`: trigger dock event.
   - Halt player ship: `vx = 0, vy = 0`.
   - Set `isDocked = true`.
3. **Station Terminal Opened**:
   - Keyboard navigation enabled (`1-5`, `Esc`).
   - Clicking options 1-4 navigates to facility sub-view with "Under Construction" banner and back action.
   - Clicking option 5 "Leave Station" calls `onUndock()`.
4. **Undocking**:
   - `isDocked = false`.
   - Player position moved to `station.x + cos(angle) * (station.radius + 60)`.
   - Ship velocity directed outward at speed `2.0`.
   - `dockingGraceTimer = 3.0` seconds.

---

### Verification Plan

1. **Compilation Check**: Run `compile_applet` to verify TypeScript builds without errors.
2. **Visual Inspection**:
   - Verify the Base Station renders at 10x ship scale at `(0, 350)`.
   - Verify station slowly rotates and appears on the radar minimap.
3. **Docking Test**:
   - Fly ship into the base station.
   - Confirm docking terminal modal pops up and ship controls are paused.
   - Click "Ship Dealer", "Visit the Bar", "Mission Computer", "Merchants' Hall" — verify under-construction screens with "Back" button.
   - Click "Leave Station" — verify ship emerges safely outside station facing outward without re-docking.
