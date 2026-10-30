export interface AnchorPoint {
  x: number;
  y: number;
  color?: string;
}

export interface ShipSpriteConfig {
  src: string;
  scale: number;
  rotationOffset?: number;
}

export interface ShipStats {
  maxSpeed: number;
  thrustPower: number;
  reverseThrustPower: number;
  rotationSpeed: number;
  maxShields: number;
  maxHull?: number;
  laserCooldown: number;
  laserHeatLimit: number;
  collisionRadius: number;
  cost: number;
  crewCapacity: number;
  cargoCapacity: number;
}

export interface ShipAnchors {
  muzzles: AnchorPoint[];
  thrusters: AnchorPoint[];
  rcsJets: AnchorPoint[];
}

export interface ShipDefinition {
  id: string;
  name: string;
  description: string;
  startingWeapons: string[];
  sprite: ShipSpriteConfig;
  stats: ShipStats;
  anchors: ShipAnchors;
}

export type ShipsCatalog = Record<string, ShipDefinition>;

export interface TelemetryData {
  shipName: string;
  fps: number;
  speed: number;
  headingDeg: number;
  coordX: number;
  coordY: number;
  thrustStatus: 'OFFLINE' | 'FORWARD [100%]' | 'REVERSE [RCS]' | 'IDLE (DRIFT)' | 'DOCKED [STATION]';
  heatPct: number;
  shieldPct: number;
  hullPct: number;
  isDead: boolean;
  isOverheated?: boolean;
  overheatRemainingSec?: number;
}