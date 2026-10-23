# Cartesian Coordinate Display Conversion for Classroom Math

Align the game's in-flight telemetry and sector coordinate displays with standard mathematics Cartesian coordinate conventions ($\text{Right} = +X$, $\text{Left} = -X$, $\text{Up} = +Y$, $\text{Down} = -Y$).

---

## Technical Explanation: Computer Graphics vs. Cartesian Math

### Why Screen Coordinates Differ from Math Projections
1. **Cathode Ray Tube (CRT) Line Scanning**: Early display monitors drew electron beam scanlines from top-to-bottom and left-to-right. Consequently, computer operating systems, windowing engines, HTML5 Canvas 2D, and SVGs standardized on placing the origin `(0, 0)` at the **top-left corner** of the display.
2. **The $Y$-Axis Inversion**:
   - In **Standard Mathematics (Cartesian plane)**: As you move **up**, the $Y$-coordinate **increases** ($+Y$). As you move **down**, it **decreases** ($-Y$).
   - In **Computer Graphics**: As you move **down**, the $Y$-coordinate **increases** ($+Y$). Moving **up** towards the top of the monitor reduces $Y$ into negative numbers.
3. **The Flight Engine Calculation**:
   - The starship spawns at the center of the sector `(0, 0)` facing upward (heading $000^\circ$ North).
   - Moving forward (upward) lowers internal canvas $Y$ into negative values (`-player.y`).
   - By converting the display readout to Math Cartesian space ($\text{Display } Y = -\text{Internal } Y / 100$ and $\text{Display } X = \text{Internal } X / 100$), the HUD immediately matches standard classroom graph paper: **Up is $+Y$**, **Down is $-Y$**, **Right is $+X$**, and **Left is $-X$**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Display-Level Conversion**: Convert `telemetry.coordX` and `telemetry.coordY` directly in the HUD telemetry pipeline so students see standard math Cartesian coordinates without disrupting the internal physics loop, collision calculations, or camera transforms.
> - **Consistent Game Over Telemetry**: The "Critical Hull Failure" respawn modal will also reflect the same Cartesian coordinates for the vessel's last recorded sector position.
> - **Numeric Format**: Display clean integer coordinates `X: [val] | Y: [val]` as confirmed.

---

### 1. Overview & Core Concept

- **Purpose**: Prevent cognitive confusion for students practicing Cartesian coordinate geometry by ensuring that piloting the spacecraft up, down, left, and right produces coordinate changes identical to graphing on an $(x, y)$ coordinate plane.
- **Student Experience**:
  - Fly East (Right) $\rightarrow X$ increments positively ($+1, +2, +3 \dots$).
  - Fly West (Left) $\rightarrow X$ decrements negatively ($-1, -2, -3 \dots$).
  - Fly North (Up) $\rightarrow Y$ increments positively ($+1, +2, +3 \dots$).
  - Fly South (Down) $\rightarrow Y$ decrements negatively ($-1, -2, -3 \dots$).

---

### 2. User Experience & Visual Design

- **Top-Left HUD Panel**:
  - `SECTOR COORD: X: 0 | Y: 0` at origin.
  - Moving forward North displays positive $Y$ (e.g. `X: 0 | Y: 14`).
  - Moving East displays positive $X$ (e.g. `X: 22 | Y: 14`).
- **Game Over Modal**:
  - `LAST COORDS: X: [Cartesian X] | Y: [Cartesian Y]`

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Projection Inversion in Telemetry Output**
  - *Chosen Approach*: Apply Cartesian mapping at the telemetry boundary ($\text{coordX} = \text{Math.round}(player.x / 100)$, $\text{coordY} = \text{Math.round}(-player.y / 100)$).
  - *Why*: Decouples the mathematical classroom presentation from low-level canvas viewport matrix transformations, eliminating any risk of breaking asteroid collisions, camera smoothing, or radar sweeping.
- **Decision 2: Rounding / Precision**
  - *Chosen Approach*: Use `Math.round` instead of `Math.floor` so coordinates cleanly cross $0$ at the origin without asymmetric floor bias across negative numbers.

---

### 4. Technical Architecture & File Changes

```
┌────────────────────────────────────────────────────────┐
│               Internal Game Engine Space               │
│  - Canvas screen Y: negative is UP, positive is DOWN   │
│  - Player physics: (player.x, player.y)                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Cartesian Classroom Projection             │
│  - coordX = Math.round( player.x / 100 )  (+X = Right) │
│  - coordY = Math.round( -player.y / 100 ) (+Y = Up)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Student-Facing HUD & Modals              │
│  - Top-Left Telemetry: "SECTOR COORD: X: ... | Y: ..." │
│  - Game Over Modal: "LAST COORDS: X: ... | Y: ..."     │
└────────────────────────────────────────────────────────┘
```

### Files to Modify

1. `src/App.tsx`:
   - In the telemetry update loop:
     `coordX: Math.round(player.x / 100)`
     `coordY: Math.round(-player.y / 100)`
   - In game over triggers and reset states:
     Ensure the converted Cartesian coordinates are passed to the Game Over modal.
2. Verification:
   - Run `compile_applet` and `lint_applet`.
   - Verify dev server on port 3000.
