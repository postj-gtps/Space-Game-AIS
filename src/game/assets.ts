import { ShipsCatalog, ShipDefinition } from '../types/game';

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
        src: '/assets/images/ships/ship-starter.png',
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
        laserHeatLimit: 95,
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
    try {
      const res = await fetch('/assets/data/ships.json');
      if (!res.ok) throw new Error('HTTP status ' + res.status);
      this.shipsCatalog = await res.json();
    } catch (e) {
      console.warn('Could not fetch /assets/data/ships.json. Using fallback catalog.', e);
      this.shipsCatalog = this.fallbackCatalog;
    }

    const loadPromises: Promise<void>[] = [];
    for (const key in this.shipsCatalog) {
      const ship = this.shipsCatalog[key];
      if (ship.sprite && ship.sprite.src) {
        const img = new Image();
        let src = ship.sprite.src;
        if (!src.startsWith('/') && !src.startsWith('http')) {
          src = '/' + src;
        }
        img.src = src;
        this.loadedImages[key] = img;
        loadPromises.push(
          new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => {
              console.warn(`Failed to load texture for ${key} from ${src}`);
              resolve();
            };
          })
        );
      }
    }

    // Preload Enemy Drone sprite
    const droneImg = new Image();
    droneImg.src = '/assets/images/enemies/Enemy%20Drone.png';
    this.droneImage = droneImg;
    loadPromises.push(
      new Promise((resolve) => {
        droneImg.onload = () => resolve();
        droneImg.onerror = () => {
          // Fallback to unencoded or ships directory if needed
          droneImg.src = '/assets/images/ships/Enemy%20Drone.png';
          droneImg.onload = () => resolve();
          droneImg.onerror = () => {
            console.warn('Failed to load Enemy Drone sprite');
            resolve();
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
