import { ShipsCatalog, ShipDefinition } from '../types/game';
import defaultShipStarterImg from '../../assets/images/ships/ship-starter.png';
import defaultEnemyDroneImg from '../../assets/images/enemies/Enemy Drone.png';
import defaultHostileDroneImg from '../../assets/images/enemies/Hostile Drone.png';
import defaultBaseStationImg from '../../assets/images/stations/Base Station.png';
import defaultLargeAsteroidImg from '../../assets/images/asteroids/Large Asteroid.png';
import defaultMediumAsteroidImg from '../../assets/images/asteroids/Medium Asteroid.png';
import defaultSmallRockAImg from '../../assets/images/asteroids/Small Rock A.png';
import defaultSmallRockBImg from '../../assets/images/asteroids/Small Rock B.png';
import defaultSmallRockCImg from '../../assets/images/asteroids/Small Rock C.png';
import defaultSmallRockDImg from '../../assets/images/asteroids/Small Rock D.png';

export function resolveAssetPath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.replace(/^\.?\//, '');
  const baseUrl = import.meta.env.BASE_URL || './';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${cleanPath}`;
}

export class AssetManager {
  public static shipsCatalog: ShipsCatalog = {};
  public static loadedImages: Record<string, HTMLImageElement> = {};
  public static droneImage: HTMLImageElement | null = null;
  public static hostileDroneImage: HTMLImageElement | null = null;
  public static baseStationImage: HTMLImageElement | null = null;
  public static largeAsteroidImage: HTMLImageElement | null = null;
  public static mediumAsteroidImage: HTMLImageElement | null = null;
  public static smallRockImages: HTMLImageElement[] = [];
  public static isReady = false;

  public static fallbackCatalog: ShipsCatalog = {
    starter_ship: {
      id: 'starter_ship',
      name: 'SF-77 Vanguard',
      description:
        'Standard issue heavy fighter equipped with dual wing-mounted plasma cannons and tri-jet sublight thrusters.',
      sprite: {
        src: defaultShipStarterImg,
        scale: 0.11,
        rotationOffset: 180,
      },
      stats: {
        maxSpeed: 7,
        thrustPower: 0.09,
        reverseThrustPower: 0.05,
        rotationSpeed: 0.0325,
        maxShields: 100,
        maxHull: 100,
        laserCooldown: 110,
        laserHeatLimit: 100,
        collisionRadius: 44,
      },
      anchors: {
        muzzles: [
          { x: 56, y: -16 },
          { x: 56, y: 16 },
        ],
        thrusters: [
          { x: -44, y: -24, color: '#00f0ff' },
          { x: -52, y: 0, color: '#00f0ff' },
          { x: -44, y: 24, color: '#00f0ff' },
        ],
        rcsJets: [
          { x: 30, y: -28, color: '#ff9900' },
          { x: 30, y: 28, color: '#ff9900' },
        ],
      },
    },
  };

  public static async init(): Promise<void> {
    const candidates = [
      resolveAssetPath('assets/data/ships.json'),
      './assets/data/ships.json',
      '/assets/data/ships.json',
    ];

    let jsonLoaded = false;
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate);
        if (res.ok) {
          this.shipsCatalog = await res.json();
          jsonLoaded = true;
          break;
        }
      } catch {
        // Continue to fallback candidates
      }
    }

    if (!jsonLoaded) {
      console.warn('Could not fetch ships.json over network. Utilizing embedded fallback catalog.');
      this.shipsCatalog = this.fallbackCatalog;
    }

    const loadPromises: Promise<void>[] = [];

    // Preload ship sprites
    for (const key in this.shipsCatalog) {
      const ship = this.shipsCatalog[key];
      if (ship.sprite && ship.sprite.src) {
        const img = new Image();
        const primarySrc = resolveAssetPath(ship.sprite.src);
        img.src = primarySrc;
        this.loadedImages[key] = img;

        loadPromises.push(
          new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => {
              console.warn(`Primary texture failed for ${key} at ${primarySrc}. Attempting fallbacks.`);
              if (key === 'starter_ship') {
                img.src = defaultShipStarterImg;
                img.onload = () => resolve();
                img.onerror = () => {
                  img.src = './assets/images/ships/ship-starter.png';
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                };
              } else {
                img.src = './' + ship.sprite.src.replace(/^\.?\//, '');
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }
            };
          })
        );
      }
    }

    // Preload Enemy Drone sprite
    const droneImg = new Image();
    const primaryDroneSrc = resolveAssetPath('assets/images/enemies/Enemy Drone.png');
    droneImg.src = primaryDroneSrc;
    this.droneImage = droneImg;

    loadPromises.push(
      new Promise((resolve) => {
        droneImg.onload = () => resolve();
        droneImg.onerror = () => {
          console.warn(`Primary drone texture failed at ${primaryDroneSrc}. Attempting bundled fallback.`);
          droneImg.src = defaultEnemyDroneImg;
          droneImg.onload = () => resolve();
          droneImg.onerror = () => {
            droneImg.src = './assets/images/enemies/Enemy%20Drone.png';
            droneImg.onload = () => resolve();
            droneImg.onerror = () => {
              droneImg.src = './assets/images/ships/Enemy%20Drone.png';
              droneImg.onload = () => resolve();
              droneImg.onerror = () => resolve();
            };
          };
        };
      })
    );

    // Preload Hostile Drone sprite
    const hostileDroneImg = new Image();
    const primaryHostileDroneSrc = resolveAssetPath('assets/images/enemies/Hostile Drone.png');
    hostileDroneImg.src = primaryHostileDroneSrc;
    this.hostileDroneImage = hostileDroneImg;

    loadPromises.push(
      new Promise((resolve) => {
        hostileDroneImg.onload = () => resolve();
        hostileDroneImg.onerror = () => {
          console.warn(`Primary hostile drone texture failed at ${primaryHostileDroneSrc}. Attempting fallback.`);
          hostileDroneImg.src = defaultHostileDroneImg;
          hostileDroneImg.onload = () => resolve();
          hostileDroneImg.onerror = () => {
            hostileDroneImg.src = './assets/images/enemies/Hostile%20Drone.png';
            hostileDroneImg.onload = () => resolve();
            hostileDroneImg.onerror = () => {
              hostileDroneImg.src = defaultEnemyDroneImg;
              hostileDroneImg.onload = () => resolve();
              hostileDroneImg.onerror = () => resolve();
            };
          };
        };
      })
    );

    // Preload Base Station sprite
    const stationImg = new Image();
    const primaryStationSrc = resolveAssetPath('assets/images/stations/Base Station.png');
    stationImg.src = primaryStationSrc;
    this.baseStationImage = stationImg;

    loadPromises.push(
      new Promise((resolve) => {
        stationImg.onload = () => resolve();
        stationImg.onerror = () => {
          console.warn(`Primary station texture failed at ${primaryStationSrc}. Attempting fallback.`);
          stationImg.src = defaultBaseStationImg;
          stationImg.onload = () => resolve();
          stationImg.onerror = () => {
            stationImg.src = './assets/images/stations/Base%20Station.png';
            stationImg.onload = () => resolve();
            stationImg.onerror = () => resolve();
          };
        };
      })
    );

    // Helper for loading textures with bundled and encoded fallbacks
    const preloadTexture = (
      relativePath: string,
      fallbackSrc: string,
      onAssigned: (img: HTMLImageElement) => void
    ): Promise<void> => {
      const img = new Image();
      const primary = resolveAssetPath(relativePath);
      img.src = primary;
      onAssigned(img);

      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => {
          console.warn(`Primary texture failed for ${relativePath}. Attempting fallback.`);
          img.src = fallbackSrc;
          img.onload = () => resolve();
          img.onerror = () => {
            img.src = resolveAssetPath(encodeURI(relativePath));
            img.onload = () => resolve();
            img.onerror = () => {
              img.src = `./${relativePath.replace(/^\.?\//, '')}`;
              img.onload = () => resolve();
              img.onerror = () => resolve();
            };
          };
        };
      });
    };

    // Preload Large Asteroid
    loadPromises.push(
      preloadTexture('assets/images/asteroids/Large Asteroid.png', defaultLargeAsteroidImg, (img) => {
        this.largeAsteroidImage = img;
      })
    );

    // Preload Medium Asteroid
    loadPromises.push(
      preloadTexture('assets/images/asteroids/Medium Asteroid.png', defaultMediumAsteroidImg, (img) => {
        this.mediumAsteroidImage = img;
      })
    );

    // Preload Small Rocks A - D
    this.smallRockImages = [];
    const smallRockConfigs = [
      { path: 'assets/images/asteroids/Small Rock A.png', fallback: defaultSmallRockAImg },
      { path: 'assets/images/asteroids/Small Rock B.png', fallback: defaultSmallRockBImg },
      { path: 'assets/images/asteroids/Small Rock C.png', fallback: defaultSmallRockCImg },
      { path: 'assets/images/asteroids/Small Rock D.png', fallback: defaultSmallRockDImg },
    ];

    smallRockConfigs.forEach((rockCfg, idx) => {
      loadPromises.push(
        preloadTexture(rockCfg.path, rockCfg.fallback, (img) => {
          this.smallRockImages[idx] = img;
        })
      );
    });

    await Promise.all(loadPromises);
    this.isReady = true;
  }

  public static getShip(id: string): ShipDefinition {
    return this.shipsCatalog[id] || this.shipsCatalog['starter_ship'] || this.fallbackCatalog['starter_ship'];
  }

  public static getShipImage(id: string): HTMLImageElement | undefined {
    return this.loadedImages[id];
  }

  public static getDroneImage(): HTMLImageElement | null {
    return this.droneImage;
  }

  public static getHostileDroneImage(): HTMLImageElement | null {
    return this.hostileDroneImage;
  }

  public static getBaseStationImage(): HTMLImageElement | null {
    return this.baseStationImage;
  }

  public static getLargeAsteroidImage(): HTMLImageElement | null {
    return this.largeAsteroidImage;
  }

  public static getMediumAsteroidImage(): HTMLImageElement | null {
    return this.mediumAsteroidImage;
  }

  public static getSmallRockImage(index = 0): HTMLImageElement | null {
    if (this.smallRockImages.length === 0) return null;
    const safeIdx = Math.abs(index) % this.smallRockImages.length;
    return this.smallRockImages[safeIdx] || this.smallRockImages[0] || null;
  }

  public static getAsteroidImage(size: number, variantIndex = 0): HTMLImageElement | null {
    if (size >= 3) {
      return this.largeAsteroidImage;
    } else if (size === 2) {
      return this.mediumAsteroidImage;
    } else {
      return this.getSmallRockImage(variantIndex);
    }
  }
}
