import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { TelemetryData } from './types/game';
import { AssetManager } from './game/assets';
import { SoundEngine } from './game/sound';
import {
  CONFIG,
  PlayerShip,
  LaserProjectile,
  ParticleSystem,
  Starfield,
  NebulaRenderer,
  drawSectorGrid,
  InputState,
} from './game/engine';
import {
  loadMapBubble,
  getAvailableMapBubbles,
  RuntimeMapEntity,
  STARTER_SHIP_CONFIG,
} from './game/mapLoader';
import { MapBubbleFile, InstancePlacement } from './types/universe';
import { HUD } from './components/HUD';
import { StationModal } from './components/StationModal';
import { DevInspector } from './components/DevInspector';
import { DevAuthModal } from './components/DevAuthModal';

export interface WarpState {
  phase: 'idle' | 'spooling' | 'warp' | 'drop';
  targetBubbleId: string | null;
  bannerText: string;
  progress: number;
}

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameStarted, setGameStarted] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showNebula, setShowNebula] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeShipId, setActiveShipId] = useState<string>('starter_ship');

  // --- Map Bubble & System Traversal State ---
  const [currentSystem, setCurrentSystem] = useState<string>('Sol System');
  const [currentLocation, setCurrentLocation] = useState<string>('sol_hub');
  const [activeMapFile, setActiveMapFile] = useState<MapBubbleFile>(() => loadMapBubble('sol_hub').mapData);

  // Unified Runtime Entities Collection
  const activeEntitiesRef = useRef<RuntimeMapEntity[]>([]);
  const [, setActiveEntitiesCount] = useState<number>(0);

  // Warp State for Autopilot Traversal
  const [warpState, setWarpState] = useState<WarpState>({
    phase: 'idle',
    targetBubbleId: null,
    bannerText: '',
    progress: 0,
  });
  const warpStateRef = useRef<WarpState>(warpState);
  warpStateRef.current = warpState;

  // --- Developer Mode & Authentication State ---
  const [isDevModeUnlocked, setIsDevModeUnlocked] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isDevInspectorOpen, setIsDevInspectorOpen] = useState<boolean>(false);

  // --- Free-Cam / Camera Pan State ---
  const [isFreePan, setIsFreePan] = useState<boolean>(false);
  const isFreePanRef = useRef<boolean>(false);
  isFreePanRef.current = isFreePan;

  const cameraPosRef = useRef<{ x: number; y: number }>({
    x: activeMapFile.spawnPosition.x,
    y: activeMapFile.spawnPosition.y,
  });
  const [hudCameraPos, setHudCameraPos] = useState<{ x: number; y: number }>({
    x: activeMapFile.spawnPosition.x,
    y: activeMapFile.spawnPosition.y,
  });

  // Mouse pan tracking
  const isDraggingPanRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Inspector Probes & Ruler
  const [selectedOriginId, setSelectedOriginId] = useState<string | null>(null);
  const [clickedWorldPos, setClickedWorldPos] = useState<{ x: number; y: number } | null>(null);
  const [cursorWorldPos, setCursorWorldPos] = useState<{ x: number; y: number } | null>(null);

  // Telemetry HUD State
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    shipName: STARTER_SHIP_CONFIG.name || 'STARLIGHT SCOUT',
    fps: 60,
    speed: 0,
    headingDeg: 0,
    coordX: 0,
    coordY: 0,
    thrustStatus: 'DOCKED [STATION]',
    heatPct: 0,
    shieldPct: 100,
    hullPct: 100,
    isDead: false,
  });

  const [isDocked, setIsDocked] = useState(true);
  const isDockedRef = useRef(true);
  const [currentDockedEntity, setCurrentDockedEntity] = useState<RuntimeMapEntity | null>(null);

  // Engine Subsystems Refs
  const soundEngineRef = useRef<SoundEngine>(new SoundEngine());
  const playerRef = useRef<PlayerShip>(
    new PlayerShip(activeMapFile.spawnPosition.x, activeMapFile.spawnPosition.y)
  );
  const starfieldRef = useRef<Starfield>(new Starfield(350));
  const nebulaRef = useRef<NebulaRenderer>(new NebulaRenderer([]));
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const projectilesRef = useRef<LaserProjectile[]>([]);
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
  const zoomRef = useRef<number>(1.0);
  const targetZoomRef = useRef<number>(1.0);
  const [hudZoom, setHudZoom] = useState<number>(1.0);

  const getZoomLimits = useCallback(() => {
    const minDim = Math.min(window.innerWidth || 800, window.innerHeight || 600);
    const minZoom = 0.035;
    const maxZoom = Math.max(5.0, (minDim * 0.88) / 95);
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

  const availableBubbles = useMemo(() => getAvailableMapBubbles(), []);

  // --- Subroutine: Load Target Map Bubble ---
  const mountMapBubble = useCallback(
    (bubbleId: string, repositionPlayer = true) => {
      const { mapData, activeEntities } = loadMapBubble(bubbleId);
      setActiveMapFile(mapData);
      setCurrentLocation(mapData.id);
      setCurrentSystem(mapData.systemName || 'Sol System');
      activeEntitiesRef.current = activeEntities;
      setActiveEntitiesCount(activeEntities.length);
      CONFIG.worldSize = mapData.worldSize || 100000;

      // Select default origin entity for Dev Inspector ruler
      const stationEnt = activeEntities.find((e) => e.dockable) || activeEntities[0];
      if (stationEnt) {
        setSelectedOriginId(stationEnt.id);
      }

      if (repositionPlayer) {
        const player = playerRef.current;
        player.reset();
        player.x = mapData.spawnPosition.x;
        player.y = mapData.spawnPosition.y;
        if (mapData.spawnPosition.angle !== undefined) {
          player.angle = mapData.spawnPosition.angle;
        }
        cameraPosRef.current = { x: player.x, y: player.y };
        setHudCameraPos({ x: player.x, y: player.y });
        player.dockingGraceTimer = 3.0;
        player.invulnerableTimer = 180;
      }
    },
    []
  );

  // --- Autopilot Sublight Warp Traversal State Transition ---
  const handleAutopilotJump = useCallback(
    (targetBubbleId: string) => {
      if (warpStateRef.current.phase !== 'idle') return;
      if (targetBubbleId === currentLocation) return;

      const targetBubble = availableBubbles.find((b) => b.id === targetBubbleId);
      const targetName = targetBubble?.name || targetBubbleId;

      if (isDockedRef.current) {
        isDockedRef.current = false;
        setIsDocked(false);
      }

      const soundEngine = soundEngineRef.current;
      soundEngine.init();
      soundEngine.playWarpSpool();
      triggerScreenShake(12, 6);

      // Phase 1: Spooling (0.6s)
      setWarpState({
        phase: 'spooling',
        targetBubbleId,
        bannerText: `WARP DRIVE SPOOLING // TARGET: ${targetName.toUpperCase()}`,
        progress: 0.1,
      });

      // Phase 2: Warp Hyperspace Transit (1.2s)
      setTimeout(() => {
        soundEngine.playWarpJump();
        triggerScreenShake(20, 10);
        setWarpState({
          phase: 'warp',
          targetBubbleId,
          bannerText: `HYPERSPACE TRANSIT // DISPLACING SECTOR`,
          progress: 0.5,
        });

        mountMapBubble(targetBubbleId, true);

        // Phase 3: Sector Drop & Deceleration (0.7s)
        setTimeout(() => {
          soundEngine.playWarpDrop();
          triggerScreenShake(10, 5);
          setWarpState({
            phase: 'drop',
            targetBubbleId,
            bannerText: `ARRIVED AT ${targetName.toUpperCase()}`,
            progress: 1.0,
          });

          // Return to idle
          setTimeout(() => {
            setWarpState({
              phase: 'idle',
              targetBubbleId: null,
              bannerText: '',
              progress: 0,
            });
          }, 700);
        }, 1200);
      }, 600);
    },
    [currentLocation, availableBubbles, mountMapBubble, triggerScreenShake]
  );

  const handleStartGame = useCallback(() => {
    soundEngineRef.current.init();
    setGameStarted(true);
  }, []);

  const handleUndock = useCallback(() => {
    isDockedRef.current = false;
    setIsDocked(false);
    const player = playerRef.current;
    soundEngineRef.current.playUndocking();

    const station = currentDockedEntity || activeEntitiesRef.current.find((e) => e.dockable);
    const stX = station ? station.x : 0;
    const stY = station ? station.y : 350;
    const stRadius = station ? station.radius : 430;

    let angle = Math.atan2(player.y - stY, player.x - stX);
    if (Math.hypot(player.x - stX, player.y - stY) < 5) {
      angle = -Math.PI / 2;
    }

    const spawnDist = stRadius + 85;
    player.x = stX + Math.cos(angle) * spawnDist;
    player.y = stY + Math.sin(angle) * spawnDist;
    player.angle = angle;
    player.vx = Math.cos(angle) * 2.2;
    player.vy = Math.sin(angle) * 2.2;
    player.dockingGraceTimer = 3.5;
    player.invulnerableTimer = 180;
    cameraPosRef.current = { x: player.x, y: player.y };
  }, [currentDockedEntity]);

  const handleSelectShip = useCallback((shipId: string) => {
    setActiveShipId(shipId);
    playerRef.current.setShip(shipId);
  }, []);

  const handleRestartGame = useCallback(() => {
    isDockedRef.current = true;
    setIsDocked(true);
    setGameOver(false);
    playerRef.current.reset();
    playerRef.current.x = activeMapFile.spawnPosition.x;
    playerRef.current.y = activeMapFile.spawnPosition.y;
    playerRef.current.setShip(activeShipId);
    cameraPosRef.current = { x: playerRef.current.x, y: playerRef.current.y };
    setHudCameraPos({ x: playerRef.current.x, y: playerRef.current.y });
  }, [activeShipId, activeMapFile]);

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

  // --- Password-Protected Dev Mode Activation ---
  const handleToggleDevInspector = useCallback(() => {
    if (!isDevModeUnlocked) {
      setIsAuthModalOpen(true);
    } else {
      setIsDevInspectorOpen((prev) => {
        const next = !prev;
        if (next) {
          setIsFreePan(true);
        }
        return next;
      });
    }
  }, [isDevModeUnlocked]);

  const handleAuthSuccess = useCallback(() => {
    setIsDevModeUnlocked(true);
    setIsAuthModalOpen(false);
    setIsDevInspectorOpen(true);
    setIsFreePan(true);
  }, []);

  const handleLockDevMode = useCallback(() => {
    setIsDevModeUnlocked(false);
    setIsDevInspectorOpen(false);
    setIsFreePan(false);
    cameraPosRef.current = { x: playerRef.current.x, y: playerRef.current.y };
    setHudCameraPos({ x: playerRef.current.x, y: playerRef.current.y });
  }, []);

  // --- Camera Free-Pan Controls ---
  const handleToggleFreePan = useCallback(() => {
    setIsFreePan((prev) => !prev);
  }, []);

  const handleRecenterCamera = useCallback(() => {
    const player = playerRef.current;
    cameraPosRef.current = { x: player.x, y: player.y };
    setHudCameraPos({ x: player.x, y: player.y });
  }, []);

  const handleFocusEntity = useCallback((ent: RuntimeMapEntity) => {
    cameraPosRef.current = { x: ent.x, y: ent.y };
    setHudCameraPos({ x: ent.x, y: ent.y });
    setSelectedOriginId(ent.id);
    setIsFreePan(true);
  }, []);

  const handleNudgeCamera = useCallback((dx: number, dy: number) => {
    cameraPosRef.current.x += dx;
    cameraPosRef.current.y += dy;
    setHudCameraPos({ x: cameraPosRef.current.x, y: cameraPosRef.current.y });
    setIsFreePan(true);
  }, []);

  // Quick live entity insertion from Dev Inspector
  const handleQuickAddEntity = useCallback((instance: InstancePlacement) => {
    const { mapData } = loadMapBubble(activeMapFile.id);
    mapData.instances.push(instance);
    const { activeEntities } = loadMapBubble(activeMapFile.id);
    activeEntitiesRef.current = activeEntities;
    setActiveEntitiesCount(activeEntities.length);
  }, [activeMapFile.id]);

  // Keyboard controls
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

  // --- Canvas Mouse Handlers: Click, Move, and Direct Drag Panning ---
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Right click (2) or middle click (1), or left click when dragging pan in devmode
    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isDraggingPanRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setIsFreePan(true);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingPanRef.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const currentZoom = zoomRef.current;

      // Direct Camera Drag Panning
      if (isDraggingPanRef.current) {
        const deltaScreenX = e.clientX - lastMousePosRef.current.x;
        const deltaScreenY = e.clientY - lastMousePosRef.current.y;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };

        cameraPosRef.current.x -= deltaScreenX / currentZoom;
        cameraPosRef.current.y -= deltaScreenY / currentZoom;
        setHudCameraPos({ x: cameraPosRef.current.x, y: cameraPosRef.current.y });
      }

      // Cursor World Probe
      const rect = canvas.getBoundingClientRect();
      const screenX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const screenY = (e.clientY - rect.top) * (canvas.height / rect.height);
      const cam = cameraPosRef.current;

      const worldX = cam.x + (screenX - canvas.width / 2) / currentZoom;
      const worldY = cam.y + (screenY - canvas.height / 2) / currentZoom;

      setCursorWorldPos({ x: worldX, y: worldY });
    },
    []
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Ignore if user was dragging pan
      if (e.button !== 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const screenY = (e.clientY - rect.top) * (canvas.height / rect.height);
      const cam = cameraPosRef.current;
      const currentZoom = zoomRef.current;

      // Coordinate Transformer: Screen pixel -> World coordinates
      const worldX = cam.x + (screenX - canvas.width / 2) / currentZoom;
      const worldY = cam.y + (screenY - canvas.height / 2) / currentZoom;

      setClickedWorldPos({ x: worldX, y: worldY });

      // Check if click selected an entity in the scene
      const clickedEntity = activeEntitiesRef.current.find((ent) => {
        const d = Math.hypot(ent.x - worldX, ent.y - worldY);
        return d <= ent.radius + 30 / currentZoom;
      });

      if (clickedEntity) {
        setSelectedOriginId(clickedEntity.id);
      }
    },
    []
  );

  // Resize and keyboard listeners
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Intercept Firefox quick-search keys (' and /) to prevent accidental quick search browser interception
      if (e.key === "'" || e.code === 'Quote') {
        e.preventDefault();
        return;
      }

      handleKeyDownAction(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
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

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (canvas) {
        canvas.removeEventListener('wheel', onWheel);
      }
    };
  }, [handleKeyDownAction, handleKeyUpAction, adjustTargetZoom]);

  // Initial Map Load
  useEffect(() => {
    mountMapBubble('sol_hub', false);
  }, [mountMapBubble]);

  // Main game loop effect
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const initCatalogAndStart = async () => {
      await AssetManager.init();

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
        const starfield = starfieldRef.current;
        const nebula = nebulaRef.current;
        const keys = keysRef.current;
        const activeEntities = activeEntitiesRef.current;
        const currentWarp = warpStateRef.current;

        // Camera follow logic
        if (!isFreePanRef.current) {
          cameraPosRef.current.x = player.x;
          cameraPosRef.current.y = player.y;
        }

        // Player & Projectiles update pass
        if (!isDockedRef.current && currentWarp.phase !== 'warp') {
          player.update(deltaTime, keys, soundEngine, particleSystem, projectiles);
        } else if (isDockedRef.current) {
          // Shore power replenishing
          if (player.shields < player.config.stats.maxShields) {
            player.shields = Math.min(player.config.stats.maxShields, player.shields + 0.5);
          }
          player.laserHeat = Math.max(0, player.laserHeat - 0.8);
        }

        // Projectile life ticks
        for (let i = projectiles.length - 1; i >= 0; i--) {
          projectiles[i].update(particleSystem);
          if (projectiles[i].life > projectiles[i].maxLife) {
            projectiles.splice(i, 1);
          }
        }

        // --- Dynamic Physics Tick Pass over activeEntities ---
        for (let i = activeEntities.length - 1; i >= 0; i--) {
          const ent = activeEntities[i];
          ent.update(deltaTime, player, soundEngine, particleSystem, projectiles);
          if (ent.isDead) {
            activeEntities.splice(i, 1);
            continue;
          }

          // Check Docking Contact with Station
          if (!player.isDead && !isDockedRef.current && currentWarp.phase === 'idle') {
            if (ent.checkDocking(player)) {
              player.vx = 0;
              player.vy = 0;
              keys.forward = false;
              keys.reverse = false;
              keys.left = false;
              keys.right = false;
              keys.fire = false;
              isDockedRef.current = true;
              setIsDocked(true);
              setCurrentDockedEntity(ent);
              soundEngine.playDockingClamp();
              triggerScreenShake(6, 4);
            }
          }

          // Collision Checks: Player vs Entity
          if (!player.isDead && !isDockedRef.current && currentWarp.phase === 'idle') {
            const pRadius = player.config.stats.collisionRadius || 25;
            const dist = Math.hypot(player.x - ent.x, player.y - ent.y);

            if (dist < pRadius + ent.radius) {
              if (ent.category === 'asteroid') {
                player.takeDamage(
                  25,
                  ent.x,
                  ent.y,
                  6,
                  soundEngine,
                  particleSystem,
                  triggerScreenShake,
                  () => setGameOver(true)
                );
                const bounce = Math.atan2(ent.y - player.y, ent.x - player.x);
                ent.vx += Math.cos(bounce) * 2.5;
                ent.vy += Math.sin(bounce) * 2.5;
              } else if (ent.category === 'drone' || ent.category === 'hostile') {
                player.takeDamage(
                  30,
                  ent.x,
                  ent.y,
                  7,
                  soundEngine,
                  particleSystem,
                  triggerScreenShake,
                  () => setGameOver(true)
                );
                ent.takeDamage(2, player.x, player.y, soundEngine, particleSystem);
              } else if (ent.category === 'defense' || ent.category === 'station' || ent.isFallback) {
                const bounce = Math.atan2(player.y - ent.y, player.x - ent.x);
                player.vx = Math.cos(bounce) * 3;
                player.vy = Math.sin(bounce) * 3;
              }
            }
          }

          // Collision Checks: Projectiles vs Entity
          for (let pIdx = projectiles.length - 1; pIdx >= 0; pIdx--) {
            const proj = projectiles[pIdx];
            if (!proj.active) continue;

            if (!proj.isEnemy && ent.category !== 'station') {
              const dist = Math.hypot(proj.x - ent.x, proj.y - ent.y);
              if (dist < ent.radius + proj.radius) {
                particleSystem.emitExplosion(proj.x, proj.y, 14, '#00ffff');
                projectiles.splice(pIdx, 1);
                ent.takeDamage(1, proj.x, proj.y, soundEngine, particleSystem);
                break;
              }
            }

            if (proj.isEnemy && !player.isDead && !isDockedRef.current) {
              const pRadius = player.config.stats.collisionRadius || 25;
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
                particleSystem.emitExplosion(proj.x, proj.y, 12, '#ff3366');
                projectiles.splice(pIdx, 1);
                break;
              }
            }
          }
        }

        particleSystem.update();

        // Viewport Zoom Interpolation
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.15;
        const currentZoom = zoomRef.current;
        const cam = cameraPosRef.current;

        // --- Dynamic Rendering Pass over activeEntities ---
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        starfield.draw(ctx, cam.x, cam.y, canvas.width, canvas.height);

        ctx.save();
        let shakeX = 0;
        let shakeY = 0;
        if (shakeDurationRef.current > 0) {
          shakeX = (Math.random() - 0.5) * shakeMagnitudeRef.current;
          shakeY = (Math.random() - 0.5) * shakeMagnitudeRef.current;
          shakeDurationRef.current--;
        }

        // Camera Pan & Zoom Transform
        ctx.translate(canvas.width / 2 + shakeX, canvas.height / 2 + shakeY);
        ctx.scale(currentZoom, currentZoom);
        ctx.translate(-cam.x, -cam.y);

        nebula.draw(ctx, showNebula);
        drawSectorGrid(ctx, cam.x, cam.y, canvas.width / currentZoom, canvas.height / currentZoom, showGrid);

        // Render all entities in activeEntities dynamically
        for (const ent of activeEntities) {
          ent.draw(ctx);
        }

        // --- Flight Time Ruler Vector Guide Line ---
        if (selectedOriginId) {
          const origin = activeEntities.find((e) => e.id === selectedOriginId);
          const target = cursorWorldPos || clickedWorldPos;
          if (origin && target) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(target.x, target.y);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.8 / currentZoom;
            ctx.setLineDash([8 / currentZoom, 6 / currentZoom]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Origin marker ring
            ctx.beginPath();
            ctx.arc(origin.x, origin.y, origin.radius + 15 / currentZoom, 0, Math.PI * 2);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2 / currentZoom;
            ctx.stroke();

            // Target crosshair
            const cr = 12 / currentZoom;
            ctx.beginPath();
            ctx.moveTo(target.x - cr, target.y);
            ctx.lineTo(target.x + cr, target.y);
            ctx.moveTo(target.x, target.y - cr);
            ctx.lineTo(target.x, target.y + cr);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.5 / currentZoom;
            ctx.stroke();

            // Distance and Flight Time Label along the vector
            const midX = (origin.x + target.x) / 2;
            const midY = (origin.y + target.y) / 2;
            const dist = Math.hypot(target.x - origin.x, target.y - origin.y);
            const maxSpeed = STARTER_SHIP_CONFIG.maxSpeed || 7.0;
            const timeSec = dist / (maxSpeed * 60);
            const mins = Math.floor(timeSec / 60);
            const secs = Math.floor(timeSec % 60);
            const timeStr = `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;

            ctx.font = `${Math.max(11, 13 / currentZoom)}px monospace`;
            ctx.fillStyle = '#07090e';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1 / currentZoom;
            const text = `${Math.round(dist).toLocaleString()}u · ${timeStr} @ ${maxSpeed.toFixed(1)} u/s`;
            const textMetrics = ctx.measureText(text);
            const pad = 6 / currentZoom;
            ctx.fillRect(
              midX - textMetrics.width / 2 - pad,
              midY - 14 / currentZoom - pad,
              textMetrics.width + pad * 2,
              20 / currentZoom + pad * 2
            );
            ctx.strokeRect(
              midX - textMetrics.width / 2 - pad,
              midY - 14 / currentZoom - pad,
              textMetrics.width + pad * 2,
              20 / currentZoom + pad * 2
            );
            ctx.fillStyle = '#00f0ff';
            ctx.fillText(text, midX - textMetrics.width / 2, midY + 2 / currentZoom);
            ctx.restore();
          }
        }

        // Render projectiles, particles, and player ship
        for (const proj of projectiles) proj.draw(ctx);
        particleSystem.draw(ctx);
        player.draw(ctx);

        // --- Sublight Warp Jump Sequence Visual Distortion ---
        if (currentWarp.phase === 'warp' || currentWarp.phase === 'spooling') {
          ctx.save();
          const numRays = currentWarp.phase === 'warp' ? 60 : 25;
          const raySpeed = currentWarp.phase === 'warp' ? 800 : 200;
          for (let r = 0; r < numRays; r++) {
            const angle = (r / numRays) * Math.PI * 2 + currentTime * 0.002;
            const innerR = 40 + Math.random() * 80;
            const outerR = innerR + raySpeed + Math.random() * 400;
            ctx.beginPath();
            ctx.moveTo(player.x + Math.cos(angle) * innerR, player.y + Math.sin(angle) * innerR);
            ctx.lineTo(player.x + Math.cos(angle) * outerR, player.y + Math.sin(angle) * outerR);
            ctx.strokeStyle = r % 2 === 0 ? 'rgba(0, 240, 255, 0.7)' : 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = (r % 3 === 0 ? 3 : 1.5) / currentZoom;
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.restore();

        starfield.drawDust(ctx, player, canvas.width, canvas.height);

        // --- Dynamic Radar Minimap Pass over activeEntities ---
        if (radarCanvas) {
          const radarCtx = radarCanvas.getContext('2d');
          if (radarCtx) {
            const rWidth = radarCanvas.width;
            const rHeight = radarCanvas.height;
            const center = rWidth / 2;
            const range = 2400;

            radarCtx.clearRect(0, 0, rWidth, rHeight);

            // Radar range rings
            radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
            radarCtx.lineWidth = 1;
            radarCtx.beginPath();
            radarCtx.arc(center, center, center * 0.4, 0, Math.PI * 2);
            radarCtx.stroke();
            radarCtx.beginPath();
            radarCtx.arc(center, center, center * 0.8, 0, Math.PI * 2);
            radarCtx.stroke();

            // Render all activeEntities on Radar relative to camera or player
            for (const ent of activeEntities) {
              const dx = ent.x - player.x;
              const dy = ent.y - player.y;
              const dist = Math.hypot(dx, dy);

              if (dist < range) {
                const rx = center + (dx / range) * center;
                const ry = center + (dy / range) * center;

                radarCtx.save();
                radarCtx.fillStyle = ent.radarColor;
                radarCtx.strokeStyle = ent.radarColor;

                if (ent.category === 'station') {
                  const pulse = Math.sin(currentTime * 0.005) * 1.5 + 6.5;
                  radarCtx.lineWidth = 1.5;
                  radarCtx.beginPath();
                  radarCtx.arc(rx, ry, pulse, 0, Math.PI * 2);
                  radarCtx.stroke();
                  radarCtx.beginPath();
                  radarCtx.arc(rx, ry, 3.5, 0, Math.PI * 2);
                  radarCtx.fill();
                  radarCtx.font = 'bold 8px monospace';
                  radarCtx.textAlign = 'center';
                  radarCtx.fillText(ent.radarLabel, rx, ry - 8);
                } else if (ent.category === 'beacon') {
                  radarCtx.beginPath();
                  radarCtx.arc(rx, ry, 2.5, 0, Math.PI * 2);
                  radarCtx.fill();
                  radarCtx.font = '8px monospace';
                  radarCtx.textAlign = 'center';
                  radarCtx.fillText('BUOY', rx, ry - 5);
                } else if (ent.category === 'hostile') {
                  radarCtx.beginPath();
                  radarCtx.moveTo(rx, ry - 3.5);
                  radarCtx.lineTo(rx + 3.5, ry);
                  radarCtx.lineTo(rx, ry + 3.5);
                  radarCtx.lineTo(rx - 3.5, ry);
                  radarCtx.closePath();
                  radarCtx.fill();
                } else if (ent.category === 'drone') {
                  radarCtx.beginPath();
                  radarCtx.arc(rx, ry, 2.2, 0, Math.PI * 2);
                  radarCtx.fill();
                } else if (ent.category === 'asteroid') {
                  const sz = ent.radius > 60 ? 3 : 2;
                  radarCtx.fillRect(rx - sz / 2, ry - sz / 2, sz, sz);
                } else {
                  radarCtx.fillRect(rx - 1.5, ry - 1.5, 3, 3);
                }
                radarCtx.restore();
              }
            }

            // Player Ship Blip
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
        else if (currentWarp.phase !== 'idle') thrustStatus = 'WARP TRANSIT';
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
  }, [showGrid, showNebula, triggerScreenShake, cursorWorldPos, clickedWorldPos, selectedOriginId]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-cyan-400 font-mono select-none">
      {/* Game Canvas Viewport */}
      <canvas
        id="gameCanvas"
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onContextMenu={(e) => e.preventDefault()}
        className={`block w-full h-full bg-black ${
          isFreePan ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
      />

      {/* Heads-Up Display with Dev Inspector & Autopilot Jump Trigger */}
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
        onToggleDevInspector={handleToggleDevInspector}
        isDevInspectorOpen={isDevInspectorOpen}
        currentSystem={currentSystem}
        currentLocationName={activeMapFile.name}
        availableBubbles={availableBubbles}
        onAutopilotJump={handleAutopilotJump}
        warpState={warpState}
      />

      {/* Developer Authorization Modal (Password: DEVMODE) */}
      <DevAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* In-Engine Developer Inspector Overlay with Map Panning */}
      <DevInspector
        isOpen={isDevInspectorOpen}
        onClose={() => setIsDevInspectorOpen(false)}
        playerPos={{ x: playerRef.current.x, y: playerRef.current.y }}
        cameraPos={hudCameraPos}
        isFreePan={isFreePan}
        onToggleFreePan={handleToggleFreePan}
        onRecenterCamera={handleRecenterCamera}
        onFocusEntity={handleFocusEntity}
        onNudgeCamera={handleNudgeCamera}
        onLockDevMode={handleLockDevMode}
        zoom={hudZoom}
        activeEntities={activeEntitiesRef.current}
        selectedOriginId={selectedOriginId}
        onSelectOriginId={setSelectedOriginId}
        clickedWorldPos={clickedWorldPos}
        cursorWorldPos={cursorWorldPos}
        currentLocation={activeMapFile.name}
        currentSystem={currentSystem}
        onQuickAddEntity={handleQuickAddEntity}
      />

      {/* Orbital Base Station Docking Concourse Terminal */}
      <StationModal
        isOpen={isDocked}
        onUndock={handleUndock}
        soundEngine={soundEngineRef.current}
        stationName={currentDockedEntity?.displayName || 'STARPORT VALIANT-PRIME'}
        activeShipId={activeShipId}
        onSelectShip={handleSelectShip}
      />
    </div>
  );
};

export default App;
