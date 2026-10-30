import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TelemetryData } from './types/game';
import { AssetManager } from './game/assets';
import { SoundEngine } from './game/sound';
import {
  CONFIG,
  PlayerShip,
  LaserProjectile,
  Asteroid,
  TargetDrone,
  HostileDrone,
  BaseStation,
  ParticleSystem,
  Starfield,
  NebulaRenderer,
  drawSectorGrid,
  InputState,
  ActiveBubbleSession,
} from './game/engine';
import { UniverseManager } from './data/universeData';
import { CurrentLocationState } from './types/universe';
import { HUD } from './components/HUD';
import { StationModal } from './components/StationModal';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameStarted, setGameStarted] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showNebula, setShowNebula] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeShipId, setActiveShipId] = useState<string>('starter_ship');

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    shipName: 'STARLIGHT SCOUT',
    fps: 60,
    speed: 0,
    headingDeg: 0,
    coordX: 0,
    coordY: 3,
    thrustStatus: 'DOCKED [STATION]',
    heatPct: 0,
    shieldPct: 100,
    hullPct: 100,
    isDead: false,
  });

  const [isDocked, setIsDocked] = useState(true);
  const isDockedRef = useRef(true);

  // Active Galactic Spatial Hierarchy Location
  const [currentLocation, setCurrentLocation] = useState<CurrentLocationState>(() =>
    UniverseManager.getCurrentLocationState()
  );
  const activeBubble = UniverseManager.getActiveBubble();

  // Keep references to game engine instances
  const soundEngineRef = useRef<SoundEngine>(new SoundEngine());
  const playerRef = useRef<PlayerShip>(new PlayerShip(activeBubble.spawnPosition.x, activeBubble.spawnPosition.y));
  const baseStationRef = useRef<BaseStation>(new BaseStation(0, 350));
  const bubbleSessionRef = useRef<ActiveBubbleSession>(new ActiveBubbleSession(activeBubble, playerRef.current));
  const starfieldRef = useRef<Starfield>(new Starfield(350));
  const nebulaRef = useRef<NebulaRenderer>(new NebulaRenderer(activeBubble.nebulae));
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const projectilesRef = useRef<LaserProjectile[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const dronesRef = useRef<TargetDrone[]>([]);
  const hostileDronesRef = useRef<HostileDrone[]>([]);
  const keysRef = useRef<InputState>({
    forward: false,
    reverse: false,
    left: false,
    right: false,
    fire: false,
  });

  const shakeDurationRef = useRef<number>(0);
  const shakeMagnitudeRef = useRef<number>(0);

  // Viewport Zoom System
  // Outer limit: 0.035 (~3.4px dot). Inner limit: ship fills the viewport (~8-10x)
  const zoomRef = useRef<number>(1.0);
  const targetZoomRef = useRef<number>(1.0);
  const [hudZoom, setHudZoom] = useState<number>(1.0);

  const getZoomLimits = useCallback(() => {
    const minDim = Math.min(window.innerWidth || 800, window.innerHeight || 600);
    const minZoom = 0.035; // Ship is just a dot
    const maxZoom = Math.max(5.0, (minDim * 0.88) / 95); // Ship fills the screen
    return { minZoom, maxZoom };
  }, []);

  const adjustTargetZoom = useCallback(
    (newTarget: number) => {
      const { minZoom, maxZoom } = getZoomLimits();
      const clamped = Math.max(minZoom, Math.min(maxZoom, newTarget));
      targetZoomRef.current = clamped;
      setHudZoom(clamped);
    },
    [getZoomLimits]
  );

  const handleZoomIn = useCallback(() => {
    adjustTargetZoom(targetZoomRef.current * 1.35);
  }, [adjustTargetZoom]);

  const handleZoomOut = useCallback(() => {
    adjustTargetZoom(targetZoomRef.current / 1.35);
  }, [adjustTargetZoom]);

  const handleZoomReset = useCallback(() => {
    adjustTargetZoom(1.0);
  }, [adjustTargetZoom]);

  const triggerScreenShake = useCallback((duration = 10, magnitude = 8) => {
    shakeDurationRef.current = duration;
    shakeMagnitudeRef.current = magnitude;
  }, []);

  const handleStartGame = useCallback(() => {
    soundEngineRef.current.init();
    setGameStarted(true);
  }, []);

  const handleUndock = useCallback(() => {
    isDockedRef.current = false;
    setIsDocked(false);
    const player = playerRef.current;
    const baseStation = baseStationRef.current;
    soundEngineRef.current.playUndocking();

    // Calculate angle outward from station center to player
    let angle = Math.atan2(player.y - baseStation.y, player.x - baseStation.x);
    if (Math.hypot(player.x - baseStation.x, player.y - baseStation.y) < 5) {
      angle = -Math.PI / 2; // Default facing space upward
    }

    // Place player safely outside station perimeter
    const spawnDist = baseStation.radius + 85;
    player.x = baseStation.x + Math.cos(angle) * spawnDist;
    player.y = baseStation.y + Math.sin(angle) * spawnDist;
    player.angle = angle;
    player.vx = Math.cos(angle) * 2.2;
    player.vy = Math.sin(angle) * 2.2;
    player.dockingGraceTimer = 3.5; // 3.5 second collision grace
    player.invulnerableTimer = 180;
  }, []);

  const handleSelectShip = useCallback((shipId: string) => {
    setActiveShipId(shipId);
    playerRef.current.setShip(shipId);
  }, []);

  const handleRestartGame = useCallback(() => {
    isDockedRef.current = true;
    setIsDocked(true);
    setGameOver(false);
    playerRef.current.reset();
    playerRef.current.x = 0;
    playerRef.current.y = 350;
    playerRef.current.setShip(activeShipId);
  }, [activeShipId]);

  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev);
  }, []);

  const handleToggleNebula = useCallback(() => {
    setShowNebula((prev) => !prev);
  }, []);

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      soundEngineRef.current.enabled = next;
      return next;
    });
  }, []);

  const handleKeyDownAction = useCallback(
    (code: string) => {
      soundEngineRef.current.init();
      const keys = keysRef.current;
      const player = playerRef.current;

      if (isDockedRef.current) {
        if (code === 'Digit5' || code === 'Numpad5' || code === 'Escape') {
          handleUndock();
        }
        return;
      }

      if (player.isDead && (code === 'KeyR' || code === 'Space')) {
        handleRestartGame();
        return;
      }

      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.reverse = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.right = true;
          break;
        case 'Space':
          keys.fire = true;
          break;
        case 'Equal':
        case 'NumpadAdd':
          handleZoomIn();
          break;
        case 'Minus':
        case 'NumpadSubtract':
          handleZoomOut();
          break;
        case 'Digit0':
        case 'Numpad0':
          handleZoomReset();
          break;
      }
    },
    [handleRestartGame, handleUndock, handleZoomIn, handleZoomOut, handleZoomReset]
  );

  const handleKeyUpAction = useCallback((code: string) => {
    const keys = keysRef.current;
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.reverse = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = false;
        break;
      case 'Space':
        keys.fire = false;
        break;
    }
  }, []);

  // Initialize Entities from Active Map Bubble (Micro Space)
  useEffect(() => {
    const bubble = UniverseManager.getActiveBubble();
    const session = bubbleSessionRef.current;
    session.loadFromBubble(bubble, false);

    asteroidsRef.current = session.asteroids;
    dronesRef.current = session.drones;
    hostileDronesRef.current = session.hostileDrones;
    baseStationRef.current = session.baseStation;
    projectilesRef.current = session.projectiles;
    setCurrentLocation(UniverseManager.getCurrentLocationState());
  }, []);

  // Window resize & keyboard listeners
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (isDockedRef.current) {
        // While docked in station concourse/dealer, StationModal handles keyboard navigation
        return;
      }
      if (e.code === 'Space') e.preventDefault();
      handleKeyDownAction(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      handleKeyUpAction(e.code);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse Wheel Zoom
    const canvas = canvasRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      adjustTargetZoom(targetZoomRef.current * factor);
    };

    if (canvas) {
      canvas.addEventListener('wheel', onWheel, { passive: false });
    }

    // Touch Pinch-to-Zoom
    let initialPinchDist: number | null = null;
    let initialZoom = 1.0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.hypot(dx, dy);
        initialZoom = targetZoomRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDist) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / initialPinchDist;
        adjustTargetZoom(initialZoom * ratio);
      }
    };

    const onTouchEnd = () => {
      initialPinchDist = null;
    };

    if (canvas) {
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (canvas) {
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
      }
    };
  }, [handleKeyDownAction, handleKeyUpAction, adjustTargetZoom]);

  // Main game loop effect
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const initCatalogAndStart = async () => {
      await AssetManager.init();
      const activeBubble = UniverseManager.getActiveBubble();
      bubbleSessionRef.current.loadFromBubble(activeBubble, false);
      asteroidsRef.current = bubbleSessionRef.current.asteroids;
      dronesRef.current = bubbleSessionRef.current.drones;
      hostileDronesRef.current = bubbleSessionRef.current.hostileDrones;
      baseStationRef.current = bubbleSessionRef.current.baseStation;
      projectilesRef.current = bubbleSessionRef.current.projectiles;
      if (activeBubble.nebulae) {
        nebulaRef.current.setClouds(activeBubble.nebulae);
      }
      playerRef.current.reset();
      playerRef.current.x = activeBubble.spawnPosition.x;
      playerRef.current.y = activeBubble.spawnPosition.y;

      const loop = (currentTime: number) => {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        frameCount++;

        const canvas = canvasRef.current;
        const radarCanvas = radarCanvasRef.current;
        if (!canvas) {
          animId = requestAnimationFrame(loop);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          animId = requestAnimationFrame(loop);
          return;
        }

        const player = playerRef.current;
        const soundEngine = soundEngineRef.current;
        const particleSystem = particleSystemRef.current;
        const projectiles = projectilesRef.current;
        const asteroids = asteroidsRef.current;
        const drones = dronesRef.current;
        const hostileDrones = hostileDronesRef.current;
        const starfield = starfieldRef.current;
        const nebula = nebulaRef.current;
        const keys = keysRef.current;

        const baseStation = baseStationRef.current;
        baseStation.update();

        // Check Docking Contact with Base Station
        if (!player.isDead && !isDockedRef.current) {
          if (baseStation.checkDocking(player)) {
            player.vx = 0;
            player.vy = 0;
            keys.forward = false;
            keys.reverse = false;
            keys.left = false;
            keys.right = false;
            keys.fire = false;
            isDockedRef.current = true;
            setIsDocked(true);
            soundEngine.playDockingClamp();
            triggerScreenShake(6, 4);
          }
        }

        // Player & Projectiles update
        if (!isDockedRef.current) {
          player.update(deltaTime, keys, soundEngine, particleSystem, projectiles);
        } else {
          // Shore power while moored: replenish shields & dissipate heat (hull repairs reserved for Ship Dealer)
          if (player.shields < player.config.stats.maxShields) {
            player.shields = Math.min(player.config.stats.maxShields, player.shields + 0.5);
          }
          player.laserHeat = Math.max(0, player.laserHeat - 0.8);
        }

        for (let i = projectiles.length - 1; i >= 0; i--) {
          projectiles[i].update(particleSystem);
          if (projectiles[i].life > projectiles[i].maxLife) {
            projectiles.splice(i, 1);
          }
        }

        // Environment, Target Drones & Hostile Combat Drones update
        for (const ast of asteroids) ast.update();
        for (const drone of drones) drone.update(player);
        for (const hd of hostileDrones) hd.update(player, soundEngine, particleSystem, projectiles);
        particleSystem.update();

        // Check Collisions (suppressed while docked in station berth)
        if (!player.isDead && !isDockedRef.current) {
          const radius = player.config.stats.collisionRadius || 20;

          // Player vs Asteroid
          for (const ast of asteroids) {
            const dist = Math.hypot(player.x - ast.x, player.y - ast.y);
            if (dist < radius + ast.radius) {
              const damage = ast.size === 3 ? 35 : ast.size === 2 ? 25 : 15;
              player.takeDamage(
                damage,
                ast.x,
                ast.y,
                6,
                soundEngine,
                particleSystem,
                triggerScreenShake,
                () => setGameOver(true)
              );

              const bounceAngle = Math.atan2(ast.y - player.y, ast.x - player.x);
              ast.vx += Math.cos(bounceAngle) * 3;
              ast.vy += Math.sin(bounceAngle) * 3;
            }
          }

          // Player vs Target Drone
          for (const drone of drones) {
            const dist = Math.hypot(player.x - drone.x, player.y - drone.y);
            if (dist < radius + drone.radius) {
              player.takeDamage(
                30,
                drone.x,
                drone.y,
                7,
                soundEngine,
                particleSystem,
                triggerScreenShake,
                () => setGameOver(true)
              );

              const bounceAngle = Math.atan2(drone.y - player.y, drone.x - player.x);
              drone.vx += Math.cos(bounceAngle) * 4;
              drone.vy += Math.sin(bounceAngle) * 4;
            }
          }

          // Player vs Hostile Drone
          for (const hd of hostileDrones) {
            const dist = Math.hypot(player.x - hd.x, player.y - hd.y);
            if (dist < radius + hd.radius) {
              player.takeDamage(
                30,
                hd.x,
                hd.y,
                7,
                soundEngine,
                particleSystem,
                triggerScreenShake,
                () => setGameOver(true)
              );

              const bounceAngle = Math.atan2(hd.y - player.y, hd.x - player.x);
              hd.vx += Math.cos(bounceAngle) * 4;
              hd.vy += Math.sin(bounceAngle) * 4;
            }
          }
        }

        // Hostile Projectiles vs Player
        if (!player.isDead && !isDockedRef.current) {
          const pRadius = player.config.stats.collisionRadius || 20;
          for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
            const proj = projectiles[pIdx];
            if (!proj.isEnemy) continue;

            const dist = Math.hypot(player.x - proj.x, player.y - proj.y);
            if (dist < pRadius + proj.radius) {
              player.takeDamage(
                15,
                proj.x,
                proj.y,
                4,
                soundEngine,
                particleSystem,
                triggerScreenShake,
                () => setGameOver(true)
              );
              particleSystem.emitExplosion(proj.x, proj.y, 12, '#00ffff');
              projectiles.splice(pIdx, 1);
            }
          }
        }

        // Projectiles vs Asteroids
        for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
          const proj = projectiles[pIdx];

          for (let aIdx = asteroids.length - 1; aIdx >= 0; aIdx--) {
            const ast = asteroids[aIdx];
            const dist = Math.hypot(proj.x - ast.x, proj.y - ast.y);

            if (dist < ast.radius + proj.radius) {
              particleSystem.emitExplosion(proj.x, proj.y, 12, '#00ffff');
              projectiles.splice(pIdx, 1);

              if (ast.size > 1) {
                const nextSize = ast.size - 1;
                // Compute divergent impulse perpendicular to projectile trajectory
                const projAngle = Math.atan2(proj.vy, proj.vx);
                const perpAngle = projAngle + Math.PI / 2;
                const spreadSpeed = 1.0 + Math.random() * 0.8;
                const offsetDist = ast.radius * 0.45;

                const v1x = ast.vx * 0.6 + Math.cos(perpAngle) * spreadSpeed + (Math.random() - 0.5) * 0.5;
                const v1y = ast.vy * 0.6 + Math.sin(perpAngle) * spreadSpeed + (Math.random() - 0.5) * 0.5;
                const a1 = new Asteroid(
                  ast.x + Math.cos(perpAngle) * offsetDist,
                  ast.y + Math.sin(perpAngle) * offsetDist,
                  nextSize,
                  Math.floor(Math.random() * 4),
                  v1x,
                  v1y
                );

                const v2x = ast.vx * 0.6 - Math.cos(perpAngle) * spreadSpeed + (Math.random() - 0.5) * 0.5;
                const v2y = ast.vy * 0.6 - Math.sin(perpAngle) * spreadSpeed + (Math.random() - 0.5) * 0.5;
                const a2 = new Asteroid(
                  ast.x - Math.cos(perpAngle) * offsetDist,
                  ast.y - Math.sin(perpAngle) * offsetDist,
                  nextSize,
                  Math.floor(Math.random() * 4),
                  v2x,
                  v2y
                );

                asteroids.push(a1, a2);
                soundEngine.playHitSound();

                // Emitted rock debris particles matching mineral tones
                for (let k = 0; k < 14; k++) {
                  particleSystem.emitSpark(
                    ast.x + (Math.random() - 0.5) * ast.radius,
                    ast.y + (Math.random() - 0.5) * ast.radius,
                    ast.vx * 0.4 + (Math.random() - 0.5) * 3,
                    ast.vy * 0.4 + (Math.random() - 0.5) * 3,
                    k % 2 === 0 ? '#b0bdcb' : '#728193',
                    18
                  );
                }
              } else {
                soundEngine.playExplosion(false);
                for (let k = 0; k < 18; k++) {
                  particleSystem.emitSpark(
                    ast.x,
                    ast.y,
                    ast.vx * 0.3 + (Math.random() - 0.5) * 4,
                    ast.vy * 0.3 + (Math.random() - 0.5) * 4,
                    k % 2 === 0 ? '#b0bdcb' : '#ff9944',
                    22
                  );
                }
              }

              asteroids.splice(aIdx, 1);
              break;
            }
          }
        }

        // Replenish asteroid field over time if population drops
        if (asteroids.length < CONFIG.maxAsteroids) {
          if (Math.random() < 0.012) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = 1400 + Math.random() * 2200;
            asteroids.push(
              new Asteroid(
                player.x + Math.cos(spawnAngle) * spawnDist,
                player.y + Math.sin(spawnAngle) * spawnDist,
                3, // Spawn new large asteroid
                Math.floor(Math.random() * 4)
              )
            );
          }
        }

        // Player Projectiles vs Target Drones
        for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
          const proj = projectiles[pIdx];
          if (proj.isEnemy) continue;

          for (let dIdx = drones.length - 1; dIdx >= 0; dIdx--) {
            const drone = drones[dIdx];
            const dist = Math.hypot(proj.x - drone.x, proj.y - drone.y);

            if (dist < drone.radius + proj.radius) {
              drone.hp--;
              particleSystem.emitExplosion(proj.x, proj.y, 15, '#ff3366');
              projectiles.splice(pIdx, 1);

              if (drone.hp <= 0) {
                soundEngine.playExplosion(true);
                particleSystem.emitExplosion(drone.x, drone.y, 40, '#ff9900');
                drones.splice(dIdx, 1);

                setTimeout(() => {
                  const angle = Math.random() * Math.PI * 2;
                  drones.push(
                    new TargetDrone(player.x + Math.cos(angle) * 1200, player.y + Math.sin(angle) * 1200)
                  );
                }, 4000);
              } else {
                soundEngine.playHitSound();
              }
              break;
            }
          }
        }

        // Player Projectiles vs Hostile Drones
        for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
          const proj = projectiles[pIdx];
          if (proj.isEnemy) continue;

          for (let hdIdx = hostileDrones.length - 1; hdIdx >= 0; hdIdx--) {
            const hd = hostileDrones[hdIdx];
            const dist = Math.hypot(proj.x - hd.x, proj.y - hd.y);

            if (dist < hd.radius + proj.radius) {
              hd.hp--;
              particleSystem.emitExplosion(proj.x, proj.y, 15, '#ff3366');
              projectiles.splice(pIdx, 1);

              if (hd.hp <= 0) {
                soundEngine.playExplosion(true);
                particleSystem.emitExplosion(hd.x, hd.y, 45, '#ff4400');
                particleSystem.emitExplosion(hd.x, hd.y, 25, '#ffcc00');
                hostileDrones.splice(hdIdx, 1);

                setTimeout(() => {
                  const angle = Math.random() * Math.PI * 2;
                  const spawnDist = 900 + Math.random() * 1600;
                  hostileDrones.push(
                    new HostileDrone(player.x + Math.cos(angle) * spawnDist, player.y + Math.sin(angle) * spawnDist)
                  );
                }, 5000);
              } else {
                soundEngine.playHitSound();
              }
              break;
            }
          }
        }

        // Viewport Zoom Interpolation
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.15;
        const currentZoom = zoomRef.current;

        // --- Render Main Viewport ---
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        starfield.draw(ctx, player.x, player.y, canvas.width, canvas.height);

        ctx.save();
        let shakeX = 0;
        let shakeY = 0;
        if (shakeDurationRef.current > 0) {
          shakeX = (Math.random() - 0.5) * shakeMagnitudeRef.current;
          shakeY = (Math.random() - 0.5) * shakeMagnitudeRef.current;
          shakeDurationRef.current--;
        }

        ctx.translate(canvas.width / 2 + shakeX, canvas.height / 2 + shakeY);
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-player.x, -player.y);

        nebula.draw(ctx, showNebula);
        drawSectorGrid(ctx, player.x, player.y, canvas.width / currentZoom, canvas.height / currentZoom, showGrid);

        baseStation.draw(ctx);
        for (const ast of asteroids) ast.draw(ctx);
        for (const drone of drones) drone.draw(ctx);
        for (const hd of hostileDrones) hd.draw(ctx);
        for (const proj of projectiles) proj.draw(ctx);
        particleSystem.draw(ctx);
        player.draw(ctx);

        ctx.restore();

        starfield.drawDust(ctx, player, canvas.width, canvas.height);

        // --- Render Radar Minimap ---
        if (radarCanvas) {
          const radarCtx = radarCanvas.getContext('2d');
          if (radarCtx) {
            const rWidth = radarCanvas.width;
            const rHeight = radarCanvas.height;
            const center = rWidth / 2;
            const range = 2200;

            radarCtx.clearRect(0, 0, rWidth, rHeight);

            radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
            radarCtx.lineWidth = 1;
            radarCtx.beginPath();
            radarCtx.arc(center, center, center * 0.4, 0, Math.PI * 2);
            radarCtx.stroke();

            radarCtx.beginPath();
            radarCtx.arc(center, center, center * 0.8, 0, Math.PI * 2);
            radarCtx.stroke();

            // Base Station on Radar
            const bsDx = baseStation.x - player.x;
            const bsDy = baseStation.y - player.y;
            const bsDist = Math.hypot(bsDx, bsDy);

            if (bsDist < range) {
              const rx = center + (bsDx / range) * center;
              const ry = center + (bsDy / range) * center;
              const pulse = Math.sin(currentTime * 0.005) * 1.5 + 6.5;

              radarCtx.save();
              radarCtx.strokeStyle = '#00f0ff';
              radarCtx.lineWidth = 1.5;
              radarCtx.beginPath();
              radarCtx.arc(rx, ry, pulse, 0, Math.PI * 2);
              radarCtx.stroke();

              radarCtx.fillStyle = '#00f0ff';
              radarCtx.beginPath();
              radarCtx.arc(rx, ry, 3, 0, Math.PI * 2);
              radarCtx.fill();

              radarCtx.font = 'bold 8px monospace';
              radarCtx.fillStyle = '#00f0ff';
              radarCtx.textAlign = 'center';
              radarCtx.fillText('BASE', rx, ry - 9);
              radarCtx.restore();
            } else {
              // Directional waypoint pointer on radar outer rim
              const angleToStation = Math.atan2(bsDy, bsDx);
              const edgeR = center * 0.90;
              const ex = center + Math.cos(angleToStation) * edgeR;
              const ey = center + Math.sin(angleToStation) * edgeR;

              radarCtx.save();
              radarCtx.fillStyle = '#00f0ff';
              radarCtx.beginPath();
              radarCtx.arc(ex, ey, 3, 0, Math.PI * 2);
              radarCtx.fill();

              radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
              radarCtx.lineWidth = 1;
              radarCtx.beginPath();
              radarCtx.moveTo(
                center + Math.cos(angleToStation) * (center * 0.78),
                center + Math.sin(angleToStation) * (center * 0.78)
              );
              radarCtx.lineTo(ex, ey);
              radarCtx.stroke();
              radarCtx.restore();
            }

            radarCtx.fillStyle = '#6688aa';
            for (const ast of asteroids) {
              const dx = ast.x - player.x;
              const dy = ast.y - player.y;
              if (Math.hypot(dx, dy) < range) {
                const rx = center + (dx / range) * center;
                const ry = center + (dy / range) * center;
                const dotSize = ast.size === 3 ? 3 : ast.size === 2 ? 2.2 : 1.5;
                radarCtx.fillRect(rx - dotSize / 2, ry - dotSize / 2, dotSize, dotSize);
              }
            }

            radarCtx.fillStyle = '#ff3366';
            for (const drone of drones) {
              const dx = drone.x - player.x;
              const dy = drone.y - player.y;
              if (Math.hypot(dx, dy) < range) {
                const rx = center + (dx / range) * center;
                const ry = center + (dy / range) * center;
                radarCtx.beginPath();
                radarCtx.arc(rx, ry, 2.5, 0, Math.PI * 2);
                radarCtx.fill();
              }
            }

            // Hostile Drones on Radar (Distinct Diamond Blip)
            radarCtx.fillStyle = '#ff1144';
            radarCtx.strokeStyle = '#ffffff';
            radarCtx.lineWidth = 1;
            for (const hd of hostileDrones) {
              const dx = hd.x - player.x;
              const dy = hd.y - player.y;
              if (Math.hypot(dx, dy) < range) {
                const rx = center + (dx / range) * center;
                const ry = center + (dy / range) * center;
                radarCtx.beginPath();
                radarCtx.moveTo(rx, ry - 3.5);
                radarCtx.lineTo(rx + 3.5, ry);
                radarCtx.lineTo(rx, ry + 3.5);
                radarCtx.lineTo(rx - 3.5, ry);
                radarCtx.closePath();
                radarCtx.fill();
                radarCtx.stroke();
              }
            }

            if (!player.isDead) {
              radarCtx.save();
              radarCtx.translate(center, center);
              radarCtx.rotate(player.angle);
              radarCtx.fillStyle = '#00f0ff';
              radarCtx.beginPath();
              radarCtx.moveTo(5, 0);
              radarCtx.lineTo(-4, -3);
              radarCtx.lineTo(-4, 3);
              radarCtx.closePath();
              radarCtx.fill();
              radarCtx.restore();
            }
          }
        }

        // Telemetry Update
        const cfg = player.config;
        const currentSpeed = Math.hypot(player.vx, player.vy);
        let deg = Math.round((player.angle * (180 / Math.PI) + 90) % 360);
        if (deg < 0) deg += 360;

        let thrustStatus: TelemetryData['thrustStatus'] = 'IDLE (DRIFT)';
        if (isDockedRef.current) thrustStatus = 'DOCKED [STATION]';
        else if (player.isDead) thrustStatus = 'OFFLINE';
        else if (keys.forward) thrustStatus = 'FORWARD [100%]';
        else if (keys.reverse) thrustStatus = 'REVERSE [RCS]';

        const heatPct = Math.round(player.laserHeat);
        const shieldPct = Math.round((player.shields / cfg.stats.maxShields) * 100);
        const maxHull = cfg.stats.maxHull ?? 100;
        const hullPct = Math.max(0, Math.min(100, Math.round((player.hull / maxHull) * 100)));

        const cartesianX = Math.round(player.x / 100) || 0;
        const cartesianY = Math.round(-player.y / 100) || 0;

        const overheatRemainingSec = player.isOverheated
          ? Math.max(0, Math.ceil((player.overheatEndTime - Date.now()) / 100) / 10)
          : 0;

        setTelemetry((prev) => ({
          shipName: cfg.name,
          fps: frameCount % 30 === 0 && deltaTime > 0 ? Math.round(1 / deltaTime) : prev.fps,
          speed: currentSpeed,
          headingDeg: deg,
          coordX: cartesianX,
          coordY: cartesianY,
          thrustStatus,
          heatPct,
          shieldPct,
          hullPct,
          isDead: player.isDead,
          isOverheated: player.isOverheated,
          overheatRemainingSec,
        }));

        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    };

    initCatalogAndStart();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [showGrid, showNebula, triggerScreenShake]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-cyan-400 font-mono select-none">
      {/* Game Canvas Viewport */}
      <canvas id="gameCanvas" ref={canvasRef} className="block w-full h-full bg-black cursor-crosshair" />

      {/* Heads-Up Display */}
      <HUD
        telemetry={telemetry}
        showGrid={showGrid}
        onToggleGrid={handleToggleGrid}
        showNebula={showNebula}
        onToggleNebula={handleToggleNebula}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        radarCanvasRef={radarCanvasRef}
        zoomLevel={hudZoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        gameStarted={gameStarted}
        onStartGame={handleStartGame}
        gameOver={gameOver}
        onRestartGame={handleRestartGame}
        onKeyDownAction={handleKeyDownAction}
        onKeyUpAction={handleKeyUpAction}
      />

      {/* Orbital Base Station Docking Concourse Terminal */}
      <StationModal
        isOpen={isDocked}
        onUndock={handleUndock}
        soundEngine={soundEngineRef.current}
        stationName={baseStationRef.current.name}
        activeShipId={activeShipId}
        onSelectShip={handleSelectShip}
      />
    </div>
  );
};

export default App;
