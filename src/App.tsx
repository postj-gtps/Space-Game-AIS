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
  ParticleSystem,
  Starfield,
  NebulaRenderer,
  drawSectorGrid,
  InputState,
} from './game/engine';
import { HUD } from './components/HUD';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showNebula, setShowNebula] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    shipName: 'SF-77 VANGUARD',
    fps: 60,
    speed: 0,
    headingDeg: 0,
    coordX: 0,
    coordY: 0,
    thrustStatus: 'IDLE (DRIFT)',
    heatPct: 0,
    shieldPct: 100,
    isDead: false,
  });

  // Keep references to game engine instances
  const soundEngineRef = useRef<SoundEngine>(new SoundEngine());
  const playerRef = useRef<PlayerShip>(new PlayerShip(0, 0));
  const starfieldRef = useRef<Starfield>(new Starfield(350));
  const nebulaRef = useRef<NebulaRenderer>(new NebulaRenderer());
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const projectilesRef = useRef<LaserProjectile[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const dronesRef = useRef<TargetDrone[]>([]);
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

  const handleRestartGame = useCallback(() => {
    setGameOver(false);
    playerRef.current.reset();
  }, []);

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
    [handleRestartGame, handleZoomIn, handleZoomOut, handleZoomReset]
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

  // Initialize Asteroids and Target Drones
  useEffect(() => {
    const astList: Asteroid[] = [];
    for (let i = 0; i < CONFIG.maxAsteroids; i++) {
      const dist = 300 + Math.random() * (CONFIG.worldSize / 2 - 400);
      const angle = Math.random() * Math.PI * 2;
      astList.push(new Asteroid(Math.cos(angle) * dist, Math.sin(angle) * dist, Math.floor(Math.random() * 3) + 1));
    }
    asteroidsRef.current = astList;

    const droneList: TargetDrone[] = [];
    for (let i = 0; i < CONFIG.maxDrones; i++) {
      const dist = 400 + Math.random() * 2000;
      const angle = Math.random() * Math.PI * 2;
      droneList.push(new TargetDrone(Math.cos(angle) * dist, Math.sin(angle) * dist));
    }
    dronesRef.current = droneList;
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
      playerRef.current.reset();

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
        const starfield = starfieldRef.current;
        const nebula = nebulaRef.current;
        const keys = keysRef.current;

        // Player & Projectiles update
        player.update(deltaTime, keys, soundEngine, particleSystem, projectiles);

        for (let i = projectiles.length - 1; i >= 0; i--) {
          projectiles[i].update(particleSystem);
          if (projectiles[i].life > projectiles[i].maxLife) {
            projectiles.splice(i, 1);
          }
        }

        // Environment & Drones update
        for (const ast of asteroids) ast.update();
        for (const drone of drones) drone.update(player);
        particleSystem.update();

        // Check Collisions
        if (!player.isDead) {
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

          // Player vs Drone
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
                asteroids.push(new Asteroid(ast.x, ast.y, ast.size - 1));
                asteroids.push(new Asteroid(ast.x, ast.y, ast.size - 1));
                soundEngine.playHitSound();
              } else {
                soundEngine.playExplosion(false);
              }

              asteroids.splice(aIdx, 1);
              break;
            }
          }
        }

        // Projectiles vs Drones
        for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
          const proj = projectiles[pIdx];

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

        for (const ast of asteroids) ast.draw(ctx);
        for (const drone of drones) drone.draw(ctx);
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

            radarCtx.fillStyle = '#6688aa';
            for (const ast of asteroids) {
              const dx = ast.x - player.x;
              const dy = ast.y - player.y;
              if (Math.hypot(dx, dy) < range) {
                const rx = center + (dx / range) * center;
                const ry = center + (dy / range) * center;
                radarCtx.fillRect(rx - 1, ry - 1, 2, 2);
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
        if (player.isDead) thrustStatus = 'OFFLINE';
        else if (keys.forward) thrustStatus = 'FORWARD [100%]';
        else if (keys.reverse) thrustStatus = 'REVERSE [RCS]';

        const heatPct = Math.round(player.laserHeat);
        const shieldPct = Math.round((player.shields / cfg.stats.maxShields) * 100);

        const cartesianX = Math.round(player.x / 100) || 0;
        const cartesianY = Math.round(-player.y / 100) || 0;

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
          isDead: player.isDead,
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
    </div>
  );
};

export default App;
