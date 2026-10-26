import { ShipsCatalog, ShipDefinition } from '../types/game';
import defaultShipStarterImg from '../../assets/images/ships/ship-starter.png';
import defaultEnemyDroneImg from '../../assets/images/enemies/Enemy Drone.png';

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
}
