import { ShipsCatalog, ShipDefinition } from '../types/game';

export class AssetManager {
  public static shipsCatalog: ShipsCatalog = {};
  public static loadedImages: Record<string, HTMLImageElement> = {};
  public static isReady = false;

  public static fallbackCatalog: ShipsCatalog = {
    starter_ship: {
      id: 'starter_ship',
      name: 'SF-77 Vanguard',
      description:
        'Standard issue heavy fighter equipped with dual wing-mounted plasma cannons and tri-jet sublight thrusters.',
      sprite: {
        src: '/assets/images/ships/ship-starter.png',
        scale: 0.055,
        rotationOffset: 180,
      },
      stats: {
        maxSpeed: 14,
        thrustPower: 0.18,
        reverseThrustPower: 0.1,
        rotationSpeed: 0.065,
        maxShields: 100,
        laserCooldown: 110,
        laserHeatLimit: 95,
        collisionRadius: 22,
      },
      anchors: {
        muzzles: [
          { x: 28, y: -8 },
          { x: 28, y: 8 },
        ],
        thrusters: [
          { x: -22, y: -12, color: '#00f0ff' },
          { x: -26, y: 0, color: '#00f0ff' },
          { x: -22, y: 12, color: '#00f0ff' },
        ],
        rcsJets: [
          { x: 15, y: -14, color: '#ff9900' },
          { x: 15, y: 14, color: '#ff9900' },
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

    await Promise.all(loadPromises);
    this.isReady = true;
  }

  public static getShip(id: string): ShipDefinition {
    return this.shipsCatalog[id] || this.shipsCatalog['starter_ship'] || this.fallbackCatalog['starter_ship'];
  }

  public static getShipImage(id: string): HTMLImageElement | undefined {
    return this.loadedImages[id];
  }
}
