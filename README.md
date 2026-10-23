# Solar Winds - Dynamic Asset Library Engine

A React + TypeScript space combat game engine rewritten from a static prototype to a modern SPA with modular architecture, Web Audio API synthesis, dynamic asset catalog integration, and tactical HUD telemetry.

## Features Preserved & Ported

- **Dynamic Ship Asset Pipeline**: Ship definitions (names, stats, thruster offsets, weapon muzzles, rcs jets, collision bounds, and sprite textures) loaded dynamically from JSON catalog (`/assets/data/ships.json`) with asset preloading and fallback safeguards.
- **Flight Physics & Control**: Inertia, momentum drag, rotation mechanics, forward thrust, and reverse RCS thrusters.
- **Procedural Audio Synthesizer**: Web Audio API continuous filtered thruster noise, laser frequency sweeps, shield impacts, projectile detonations, and mute controls.
- **Combat & World Entities**:
  - Twin-plasma blaster arrays firing from configurable ship muzzle offsets.
  - Irregular polygonal Asteroids that split into smaller fragments when hit.
  - Enemy Target Drones that track, patrol, and respawn.
  - Particle systems for thruster fire, muzzle sparks, collision shields, and explosions.
- **Tactical Radar & Minimap**: 2200m range tactical radar with sweep indicator, distance rings, player heading arrow, and color-coded entity blips.
- **Sci-Fi HUD & Telemetry**:
  - Real-time speedometer (knots), compass heading, sector coordinates, and thruster status.
  - Plasma cannon heat management gauge with overheat indicators.
  - Dynamic deflector shield levels with hit feedback and auto-recharge.
  - Toggles for Sector Grid, Nebula volumetric dust, and Sound FX.
- **Multi-Platform Controls**: Responsive desktop keyboard controls (WASD / Arrow Keys + Spacebar + R to restart) and mobile on-screen touch controls.

## Development

- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Typecheck: `npm run lint`
