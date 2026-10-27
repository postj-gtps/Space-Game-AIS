# Hostile Combat Drone Implementation Plan

Introduce a new hostile combat drone enemy type with procedural circular patrol mechanics, 12 o'clock turn-decision routing, corner-mounted 45° plasma cannon turrets, and safe-approach flight corridors.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Choices from User Clarification:**
> - **45° Turret Arc Orientation**: Firing arcs are centered along the 4 outward corner diagonals ($\pm 45^\circ$, $\pm 135^\circ$), creating 4 distinct 45-degree safe blind spots along the cardinal axes (front, aft, port, starboard) for skillful player positioning.
> - **Sector Deployment**: Hostile Drones will coexist with existing target practice drones and asteroids throughout the sector.
> - **Durability & Stats**: Light drone combat tier (3 unshielded direct hits to destroy, matching target drones with explosive destruction and sound effects).
> - **Sprite Asset**: Utilizing `Hostile Drone.png` (mapped from the high-detail combat drone sprite) with fallback redundancy.

---

### 1. Overview & Core Concept

- **The Hostile Drone**: An autonomous combat sentry unit (`HostileDrone`) that patrols deep space in procedural circular loops.
- **Dynamic 12 O'Clock Navigation**: Each time the drone reaches the 12 o'clock position (the northernmost apex of its current orbital path), it executes a branch decision:
  1. Randomly selects a new patrol diameter ($D \in [300, 800]$ units).
  2. Randomly chooses whether to circle to the left (counter-clockwise) or right (clockwise) for its next patrol orbit.
- **Corner Plasma Cannons**: Equipped with 4 plasma weapon mounts situated at its structural corner pylons. Each turret independently monitors player position:
  - If the player enters within weapon range and inside the turret's 45° field of fire ($[-22.5^\circ, +22.5^\circ]$ relative to the pylon diagonal), it fires plasma projectiles identical to the player's weapon.
  - Between the turrets lie four 45° safe approach corridors where no turret can track or fire, rewarding tactical maneuvering and flanking.

---

### 2. User Experience & Visual Design

- **Visual Asset**: Distinctive combat drone sprite (`Hostile Drone.png` / `enemy-drone.png`) featuring armored blast plating, crimson combat markings, and four corner plasma mounts.
- **Visual Weapon Feedback**:
  - Subtle targeting laser or energy charging corona when a player is within a turret's 45° firing cone.
  - Plasma bolts identical in speed, particle trail, and acoustic pitch to player plasma cannons.
  - Corner muzzle flashes with blue/cyan spark bursts upon firing.
- **Tactical Radar Representation**: Distinct aggressive crimson blip (`#ff1144` or diamond crosshair) on the radar display, visually differentiating hostile combat drones from neutral target drones (`#ff3366` circles) and asteroids (`#6688aa`).
- **Safe Zone Visualization**: The four 45° dead zones naturally emerge from the geometric limits of the corner turrets, giving observant pilots clear windows to line up shots without taking damage.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Continuous Tangent 12 O'Clock Decision Logic**
  - *Chosen Approach*: When crossing the 12 o'clock apex ($\theta \approx -\pi/2$ or passing the top horizontal tangent), the drone initiates its next circle tangent to its current heading, selecting a random radius and direction (left vs right).
  - *Why*: Prevents jarring coordinate snaps while faithfully executing the requested circular patrol logic.
- **Decision 2: Independent 4-Turret Arc Checks**
  - *Chosen Approach*: Each corner turret evaluates whether the angle vector to the player falls within its $45^\circ$ cone ($\pm 22.5^\circ$ from the corner diagonal). A cooldown timer per turret prevents bullet spam and maintains fair combat rhythm.
  - *Why*: Allows simultaneous multi-barrel firing if the player straddles an edge, while strictly enforcing the 45-degree dead zones.
- **Decision 3: Enemy Projectile Layer & Player Damage**
  - *Chosen Approach*: Extend the existing projectile pipeline with an `isEnemy` flag so hostile plasma bolts collide with the player ship (depleting shields and triggering camera shake) while player bolts collide with hostile drones.
  - *Why*: Reuses tested particle and projectile physics with zero overhead.

---

### 4. Technical Architecture & Component Structure

```
┌────────────────────────────────────────────────────────┐
│                   src/game/assets.ts                   │
│  - Preloads 'Hostile Drone.png' with bundled fallbacks │
│  - Exposes AssetManager.getHostileDroneImage()         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   src/game/engine.ts                   │
│  - HostileDrone class:                                 │
│      * Circular patrol kinematics (cx, cy, R, dir, ω)  │
│      * 12 o'clock waypoint detection & reroute logic   │
│      * 4 Corner turrets at [45°, 135°, 225°, 315°]     │
│      * 45° Firing cone evaluation & cooldown timers     │
│  - LaserProjectile:                                    │
│      * isEnemy: boolean (damages player vs enemies)    │
│  - Player collision & damage handling for enemy shots  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                      src/App.tsx                       │
│  - Spawns HostileDrone instances alongside asteroids   │
│  - Game loop updates & draws hostile drones            │
│  - Projectile collision checks (Hostile vs Player)     │
│  - Radar minimap rendering with distinct hostile icon  │
└────────────────────────────────────────────────────────┘
```

### Steps to Implement

1. **Asset Pipeline (`src/game/assets.ts`)**:
   - Ensure `Hostile Drone.png` is placed in both `assets/images/enemies/` and `public/assets/images/enemies/`.
   - Update `AssetManager` to preload the hostile drone texture with dynamic base URL resolution and fallback support.
2. **Kinematics & Turrets (`src/game/engine.ts`)**:
   - Implement the `HostileDrone` class with circular orbital math, 12 o'clock apex detection, left/right direction flip, and random radius generation.
   - Define the 4 corner weapon pylons ($(\pm 22, \pm 22)$ local space), calculate relative player angles, and constrain firing to 45° cones.
   - Update `LaserProjectile` to support hostile laser bolts and handle collisions against player shields/hull.
3. **Game Loop & Radar Integration (`src/App.tsx`)**:
   - Initialize hostile combat drones in the sector alongside existing target drones.
   - Integrate hostile drones into projectile updates, collision sweeps, and respawn loops.
   - Render hostile combat drones with custom radar signatures on the tactical HUD minimap.
4. **Verification & Build**:
   - Run `compile_applet` and test all circular path transitions, turret firing cones, and damage mechanics.
