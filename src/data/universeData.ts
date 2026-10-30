import { UniverseDatabase, MapBubble, StarSystem, Sector, DEFAULT_MAP_BUBBLE_WORLD_SIZE } from '../types/universe';

/**
 * Declarative Galactic Universe Content Data
 * 
 * Separates universe configuration and location layout from hardcoded engine loops.
 * Students and content creators can author new sectors, star systems, and map bubbles
 * without modifying the core TypeScript/Canvas physics loops.
 */

export const UNIVERSE_DATA: UniverseDatabase = {
  defaultLocation: {
    sectorId: 'sector_terran',
    systemId: 'system_valiant',
    bubbleId: 'bubble_valiant_prime',
  },
  sectors: {
    sector_terran: {
      id: 'sector_terran',
      name: 'Terran Frontier Sector',
      description: 'Outer rim territory administered by the Sol Defense Coalition and frontier trading guilds.',
      systems: {
        system_valiant: {
          id: 'system_valiant',
          name: 'Valiant Star System',
          sectorId: 'sector_terran',
          description: 'A strategic border system with active trade routes, automated defense grids, and mineral-rich asteroid bands.',
          starType: 'G-Type Main Sequence',
          navigationGraph: [
            {
              id: 'nav_valiant_to_belt',
              fromNodeId: 'bubble_valiant_prime',
              toNodeId: 'bubble_caelum_belt',
              distanceAu: 1.8,
              travelTimeSec: 12,
              hazardRating: 2,
              description: 'Direct transit corridor to primary iron/nickel mining concessions.',
            },
            {
              id: 'nav_valiant_to_gate',
              fromNodeId: 'bubble_valiant_prime',
              toNodeId: 'bubble_ares_gate',
              distanceAu: 3.4,
              travelTimeSec: 20,
              hazardRating: 1,
              description: 'High-security patrol route toward the interstellar jump nexus.',
            },
            {
              id: 'nav_belt_to_gate',
              fromNodeId: 'bubble_caelum_belt',
              toNodeId: 'bubble_ares_gate',
              distanceAu: 2.2,
              travelTimeSec: 15,
              hazardRating: 3,
              description: 'Sparse pirate territory linking outer ore fields to the jump corridor.',
            },
          ],
          nodes: {
            bubble_valiant_prime: {
              id: 'bubble_valiant_prime',
              name: 'Starport Valiant-Prime Orbital Hub',
              systemId: 'system_valiant',
              designation: 'SECTOR 0-A // ORBITAL STATION',
              description: 'Heavy orbital logistics hub servicing commercial freighters, scout squadrons, and deep-space patrols.',
              worldSize: DEFAULT_MAP_BUBBLE_WORLD_SIZE,
              spawnPosition: {
                x: 0,
                y: 350,
                angle: -Math.PI / 2,
              },
              staticEntities: [
                {
                  id: 'station_valiant_prime',
                  name: 'STARPORT VALIANT-PRIME',
                  category: 'station',
                  designation: 'SECTOR 0-A // ORBITAL STATION',
                  x: 0,
                  y: 350,
                  radius: 430,
                  scale: 1.33,
                  rotSpeed: 0.0006,
                  interactionType: 'dock',
                  interactionRadius: 430,
                },
              ],
              dynamicSpawns: [
                {
                  category: 'asteroid',
                  count: 45,
                  spawnRadiusMin: 300,
                  spawnRadiusMax: 4600,
                  respawnRateSec: 10,
                },
                {
                  category: 'target_drone',
                  count: 8,
                  spawnRadiusMin: 400,
                  spawnRadiusMax: 2000,
                  respawnRateSec: 4,
                },
                {
                  category: 'hostile_drone',
                  count: 6,
                  spawnRadiusMin: 600,
                  spawnRadiusMax: 2200,
                  respawnRateSec: 5,
                },
              ],
              nebulae: [
                {
                  x: -800,
                  y: -600,
                  radius: 900,
                  color1: 'rgba(0, 100, 200, 0.12)',
                  color2: 'rgba(0,0,0,0)',
                },
                {
                  x: 1200,
                  y: 800,
                  radius: 1100,
                  color1: 'rgba(150, 0, 200, 0.10)',
                  color2: 'rgba(0,0,0,0)',
                },
                {
                  x: 400,
                  y: -1400,
                  radius: 800,
                  color1: 'rgba(0, 200, 150, 0.08)',
                  color2: 'rgba(0,0,0,0)',
                },
              ],
            },

            bubble_caelum_belt: {
              id: 'bubble_caelum_belt',
              name: 'Caelum Asteroid Extraction Zone',
              systemId: 'system_valiant',
              designation: 'MINING CONCESSION B-7',
              description: 'Dense field of crystalline and metallic asteroids frequented by automated extraction rigs.',
              worldSize: DEFAULT_MAP_BUBBLE_WORLD_SIZE,
              spawnPosition: {
                x: -1200,
                y: 800,
                angle: 0,
              },
              staticEntities: [
                {
                  id: 'beacon_ore_refinery',
                  name: 'CAELUM REFINERY PLATFORM',
                  category: 'station',
                  designation: 'ORE EXTRACTION DEPOT',
                  x: -1200,
                  y: 800,
                  radius: 350,
                  scale: 1.1,
                  rotSpeed: 0.0004,
                  interactionType: 'dock',
                  interactionRadius: 350,
                },
              ],
              dynamicSpawns: [
                {
                  category: 'asteroid',
                  count: 75,
                  spawnRadiusMin: 250,
                  spawnRadiusMax: 5500,
                },
                {
                  category: 'hostile_drone',
                  count: 8,
                  spawnRadiusMin: 500,
                  spawnRadiusMax: 2500,
                },
              ],
            },

            bubble_ares_gate: {
              id: 'bubble_ares_gate',
              name: 'Ares Waypoint & Jump Gate',
              systemId: 'system_valiant',
              designation: 'INTERSTELLAR RELAY 04',
              description: 'Hyperspace jump conduit linking the Valiant System to adjacent core worlds.',
              worldSize: DEFAULT_MAP_BUBBLE_WORLD_SIZE,
              spawnPosition: {
                x: 0,
                y: 0,
                angle: 0,
              },
              staticEntities: [
                {
                  id: 'jump_gate_centauri',
                  name: 'JUMP GATE CENTAURI-A',
                  category: 'jump_gate',
                  designation: 'CORRIDOR ALPHA-9',
                  x: 0,
                  y: -600,
                  radius: 380,
                  scale: 1.2,
                  rotSpeed: 0.001,
                  interactionType: 'jump',
                  interactionRadius: 380,
                  targetSystemId: 'system_centauri',
                  targetBubbleId: 'bubble_centauri_gate',
                },
              ],
              dynamicSpawns: [
                {
                  category: 'asteroid',
                  count: 20,
                  spawnRadiusMin: 800,
                  spawnRadiusMax: 4500,
                },
                {
                  category: 'target_drone',
                  count: 10,
                  spawnRadiusMin: 300,
                  spawnRadiusMax: 2000,
                },
              ],
            },
          },
        },
      },
    },
  },
};

/**
 * Helper class to access and query the universe hierarchy
 */
export class UniverseManager {
  private static database: UniverseDatabase = UNIVERSE_DATA;
  private static currentSectorId: string = UNIVERSE_DATA.defaultLocation.sectorId;
  private static currentSystemId: string = UNIVERSE_DATA.defaultLocation.systemId;
  private static currentBubbleId: string = UNIVERSE_DATA.defaultLocation.bubbleId;

  public static getDatabase(): UniverseDatabase {
    return this.database;
  }

  public static getSector(sectorId = this.currentSectorId): Sector | undefined {
    return this.database.sectors[sectorId];
  }

  public static getSystem(systemId = this.currentSystemId, sectorId = this.currentSectorId): StarSystem | undefined {
    const sector = this.getSector(sectorId);
    return sector?.systems[systemId];
  }

  public static getActiveBubble(): MapBubble {
    const system = this.getSystem(this.currentSystemId, this.currentSectorId);
    if (!system || !system.nodes[this.currentBubbleId]) {
      // Fallback to default
      const defaultLoc = this.database.defaultLocation;
      return this.database.sectors[defaultLoc.sectorId].systems[defaultLoc.systemId].nodes[defaultLoc.bubbleId];
    }
    return system.nodes[this.currentBubbleId];
  }

  public static getCurrentLocationState(): {
    sectorId: string;
    sectorName: string;
    systemId: string;
    systemName: string;
    bubbleId: string;
    bubbleName: string;
    designation: string;
    worldSize: number;
  } {
    const sector = this.getSector();
    const system = this.getSystem();
    const bubble = this.getActiveBubble();

    return {
      sectorId: this.currentSectorId,
      sectorName: sector?.name || 'Unknown Sector',
      systemId: this.currentSystemId,
      systemName: system?.name || 'Unknown System',
      bubbleId: this.currentBubbleId,
      bubbleName: bubble.name,
      designation: bubble.designation,
      worldSize: bubble.worldSize || DEFAULT_MAP_BUBBLE_WORLD_SIZE,
    };
  }

  public static getNavigationEdges(): StarSystem['navigationGraph'] {
    const system = this.getSystem();
    return system?.navigationGraph || [];
  }

  public static getSystemNodes(): MapBubble[] {
    const system = this.getSystem();
    return system ? Object.values(system.nodes) : [];
  }

  /**
   * Sets the active location node (Map Bubble) within the active Star System
   */
  public static setLocation(bubbleId: string, systemId?: string, sectorId?: string): boolean {
    const targetSectorId = sectorId || this.currentSectorId;
    const targetSystemId = systemId || this.currentSystemId;

    const sector = this.database.sectors[targetSectorId];
    if (!sector) return false;

    const system = sector.systems[targetSystemId];
    if (!system) return false;

    if (!system.nodes[bubbleId]) return false;

    this.currentSectorId = targetSectorId;
    this.currentSystemId = targetSystemId;
    this.currentBubbleId = bubbleId;
    return true;
  }
}
