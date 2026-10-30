/**
 * Spatial Hierarchy and Entity Classification Types
 * 
 * Hierarchy:
 * Sector -> StarSystem -> MapBubble (Location Node) -> Entities
 * 
 * Entity Classes:
 * 1. Static: Planetary bodies, moons, space stations, jump gates (stationary/orbital, rendering & interaction triggers)
 * 2. Dynamic: Player ship, enemy drones, floating asteroids, cargo pods (velocity vectors, physics, AI)
 * 3. Transient: Projectiles, plasma bolts, missiles (ephemeral, TTL / lifespan, auto-despawn on impact)
 */

export type EntityClassification = 'static' | 'dynamic' | 'transient';

export type EntityCategory =
  | 'station'
  | 'planet'
  | 'moon'
  | 'jump_gate'
  | 'beacon'
  | 'ship'
  | 'asteroid'
  | 'target_drone'
  | 'hostile_drone'
  | 'cargo_pod'
  | 'projectile';

export type InteractionType = 'dock' | 'jump' | 'scan' | 'collect' | 'none';

/**
 * Base Entity Interface
 */
export interface IEntity {
  id: string;
  name: string;
  classification: EntityClassification;
  category: EntityCategory;
  x: number;
  y: number;
  radius: number;
  active: boolean;
}

/**
 * Static Entity (Stations, Planets, Jump Gates)
 */
export interface IStaticEntity extends IEntity {
  classification: 'static';
  designation?: string;
  angle: number;
  rotSpeed: number;
  scale?: number;
  interactionType: InteractionType;
  interactionRadius: number;
  targetSystemId?: string; // If jump gate
  targetBubbleId?: string; // If jump gate
}

/**
 * Dynamic Entity (Player, Drones, Asteroids, Cargo)
 */
export interface IDynamicEntity extends IEntity {
  classification: 'dynamic';
  vx: number;
  vy: number;
  angle: number;
  mass?: number;
  hp?: number;
  maxHp?: number;
}

/**
 * Transient (Ephemeral) Dynamic Entity (Laser bolts, missiles, plasma)
 */
export interface ITransientEntity extends IEntity {
  classification: 'transient';
  vx: number;
  vy: number;
  angle: number;
  life: number;
  maxLife: number;
  isEnemy: boolean;
  damage?: number;
}

/**
 * Declarative Configuration for Static Entities
 */
export interface StaticEntityConfig {
  id: string;
  name: string;
  category: 'station' | 'planet' | 'moon' | 'jump_gate' | 'beacon';
  designation: string;
  x: number;
  y: number;
  radius: number;
  scale?: number;
  rotSpeed?: number;
  interactionType: InteractionType;
  interactionRadius?: number;
  targetSystemId?: string;
  targetBubbleId?: string;
}

/**
 * Declarative Spawning Rules for Dynamic Entities
 */
export interface DynamicSpawnRule {
  category: 'asteroid' | 'target_drone' | 'hostile_drone' | 'cargo_pod';
  count: number;
  spawnRadiusMin: number;
  spawnRadiusMax: number;
  respawnRateSec?: number;
}

/**
 * Nebula background cloud declaration
 */
export interface NebulaCloudConfig {
  x: number;
  y: number;
  radius: number;
  color1: string;
  color2: string;
}

export const DEFAULT_MAP_BUBBLE_WORLD_SIZE = 100000;

/**
 * Map Bubble (Location Node)
 * The playable 2D micro-space loaded into engine memory at any given time.
 * Default worldSize is 100,000 (boundaries -50,000 to +50,000 from origin).
 */
export interface MapBubble {
  id: string;
  name: string;
  systemId: string;
  designation: string;
  description: string;
  worldSize?: number;
  spawnPosition: {
    x: number;
    y: number;
    angle?: number;
  };
  staticEntities: StaticEntityConfig[];
  dynamicSpawns: DynamicSpawnRule[];
  nebulae?: NebulaCloudConfig[];
  ambientColor?: string;
}

/**
 * Navigation Graph Edge between Location Nodes (Macro Space)
 */
export interface NavigationEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceAu: number;
  travelTimeSec: number;
  hazardRating?: number;
  description?: string;
}

/**
 * Star System
 * Celestial container holding Location Nodes (Map Bubbles) and their distance graph.
 */
export interface StarSystem {
  id: string;
  name: string;
  sectorId: string;
  description: string;
  starType?: string;
  nodes: Record<string, MapBubble>;
  navigationGraph: NavigationEdge[];
}

/**
 * Sector
 * Top-level galactic container.
 */
export interface Sector {
  id: string;
  name: string;
  description: string;
  systems: Record<string, StarSystem>;
}

/**
 * Master Galactic Universe Database
 */
export interface UniverseDatabase {
  sectors: Record<string, Sector>;
  defaultLocation: {
    sectorId: string;
    systemId: string;
    bubbleId: string;
  };
}

/**
 * State representing the active location coordinates in the galactic hierarchy
 */
export interface CurrentLocationState {
  sectorId: string;
  sectorName: string;
  systemId: string;
  systemName: string;
  bubbleId: string;
  bubbleName: string;
  designation: string;
  worldSize: number;
}

/**
 * Master Active Entities container inside the currently mounted Map Bubble
 */
export interface ActiveEntityContainer {
  staticEntities: IStaticEntity[];
  dynamicEntities: IDynamicEntity[];
  transientEntities: ITransientEntity[];
}
