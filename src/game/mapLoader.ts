import { EntityBlueprint, InstancePlacement, MapBubbleFile, StarterShipConfig } from '../types/universe';
import { AssetManager } from './assets';
import { PlayerShip, LaserProjectile, ParticleSystem } from './engine';
import { SoundEngine } from './sound';

// Declarative static JSON imports
import entitiesBlueprintData from '../data/blueprints/entities.json';
import marsClusterMapData from '../data/maps/mars_cluster.json';
import solHubMapData from '../data/maps/sol_hub.json';
import starterShipData from '../data/ships/starter_ship.json';

export const BLUEPRINTS = entitiesBlueprintData as Record<string, EntityBlueprint>;
export const STARTER_SHIP_CONFIG = starterShipData as StarterShipConfig;

export const REGISTERED_MAPS: Record<string, MapBubbleFile> = {
  sol_hub: solHubMapData as MapBubbleFile,
  mars_cluster: marsClusterMapData as MapBubbleFile,
};

/**
 * Generic Fallback Blueprint applied when an instance references an unknown typeId.
 * Guarantees the game continues running without crashing.
 */
export const FALLBACK_BLUEPRINT: EntityBlueprint = {
  typeId: 'generic_placeholder_v0',
  displayName: 'Unregistered Spatial Object',
  category: 'unknown',
  spriteAsset: '',
  collisionRadius: 40,
  dockable: false,
  services: [],
  scale: 1.0,
  rotSpeed: 0.001,
  description: 'Default generic placeholder blueprint injected by system runtime.',
};

/**
 * Runtime polymorphic entity merged from an Instance Placement and an Entity Blueprint.
 * All game loop passes (rendering, physics ticks, collision checks) execute dynamically over these.
 */
export class RuntimeMapEntity {
  public id: string;
  public typeId: string;
  public displayName: string;
  public category: string;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public angle: number;
  public rotSpeed: number;
  public radius: number;
  public dockable: boolean;
  public services: string[];
  public spriteAsset: string;
  public scale: number;
  public description: string;
  public hp: number;
  public maxHp: number;
  public isFallback: boolean;
  public isDead = false;
  public radarLabel: string;
  public radarColor: string;
  public shootCooldown = 0;

  // Custom visual attributes for asteroids and procedural graphics
  public numPoints = 10;
  public offsets: number[] = [];

  constructor(instance: InstancePlacement, blueprint: EntityBlueprint, isFallback = false) {
    this.id = instance.id;
    this.typeId = blueprint.typeId;
    this.displayName = blueprint.displayName;
    this.category = blueprint.category || 'unknown';
    this.x = instance.position.x;
    this.y = instance.position.y;
    this.vx = 0;
    this.vy = 0;
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = blueprint.rotSpeed !== undefined ? blueprint.rotSpeed : 0.0005;
    this.radius = blueprint.collisionRadius || 40;
    this.dockable = !!blueprint.dockable;
    this.services = [...(blueprint.services || [])];
    this.spriteAsset = blueprint.spriteAsset || '';
    this.scale = blueprint.scale || 1.0;
    this.description = blueprint.description || '';
    this.isFallback = isFallback;

    // HP based on category
    if (this.category === 'station') {
      this.hp = 25000;
      this.maxHp = 25000;
      this.radarLabel = 'STATION';
      this.radarColor = '#00f0ff';
    } else if (this.category === 'defense') {
      this.hp = 800;
      this.maxHp = 800;
      this.radarLabel = 'DEFENSE';
      this.radarColor = '#3b82f6';
    } else if (this.category === 'beacon') {
      this.hp = 300;
      this.maxHp = 300;
      this.radarLabel = 'BEACON';
      this.radarColor = '#10b981';
    } else if (this.category === 'drone') {
      this.hp = 3;
      this.maxHp = 3;
      this.radarLabel = 'DRONE';
      this.radarColor = '#ffbb00';
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = (Math.random() - 0.5) * 1.5;
    } else if (this.category === 'hostile') {
      this.hp = 4;
      this.maxHp = 4;
      this.radarLabel = 'HOSTILE';
      this.radarColor = '#ef4444';
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
    } else if (this.category === 'asteroid') {
      this.hp = Math.round(this.radius * 2);
      this.maxHp = this.hp;
      this.radarLabel = 'ORE';
      this.radarColor = '#64748b';
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = (Math.random() - 0.5) * 0.8;
      this.numPoints = 8 + Math.floor(Math.random() * 5);
      for (let i = 0; i < this.numPoints; i++) {
        this.offsets.push(0.75 + Math.random() * 0.5);
      }
    } else {
      this.hp = 100;
      this.maxHp = 100;
      this.radarLabel = isFallback ? 'UNKNOWN' : 'OBJ';
      this.radarColor = '#f59e0b';
    }
  }

  /**
   * Dynamic physics and AI update tick pass
   */
  public update(
    deltaTime: number,
    player: PlayerShip,
    sound: SoundEngine,
    particles: ParticleSystem,
    projectiles: LaserProjectile[]
  ): void {
    if (this.isDead) return;

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotSpeed;

    // AI logic for drones
    if (this.category === 'drone') {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 400 && dist < 3000) {
        this.vx += (dx / dist) * 0.05;
        this.vy += (dy / dist) * 0.05;
      }
      this.vx *= 0.985;
      this.vy *= 0.985;
      this.angle = Math.atan2(this.vy, this.vx);
    } else if (this.category === 'hostile') {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4000) {
        // Pursuit vector
        this.vx += (dx / dist) * 0.09;
        this.vy += (dy / dist) * 0.09;
        this.angle = Math.atan2(dy, dx);

        // Hostile firing loop
        if (this.shootCooldown > 0) {
          this.shootCooldown -= deltaTime;
        } else if (dist < 1600 && !player.isDead) {
          this.shootCooldown = 2.2 + Math.random() * 1.0;
          const projSpeed = 14;
          const pAngle = this.angle + (Math.random() - 0.5) * 0.15;
          const proj = new LaserProjectile(
            this.x + Math.cos(this.angle) * (this.radius + 15),
            this.y + Math.sin(this.angle) * (this.radius + 15),
            Math.cos(pAngle) * projSpeed + this.vx * 0.5,
            Math.sin(pAngle) * projSpeed + this.vy * 0.5,
            pAngle,
            true
          );
          projectiles.push(proj);
          sound.playLaser();
          particles.emitSpark(proj.x, proj.y, -Math.cos(pAngle) * 3, -Math.sin(pAngle) * 3, '#ff3366', 15);
        }
      }
      this.vx *= 0.98;
      this.vy *= 0.98;
    }
  }

  /**
   * Dynamic rendering pass
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const img = this.spriteAsset ? AssetManager.getImage(this.spriteAsset) : null;
    const hasImage = img && img.complete && img.naturalWidth !== 0;

    if (hasImage) {
      const maxDim = Math.max(img.naturalWidth, img.naturalHeight);
      const targetDiameter = this.radius * 2 * this.scale;
      const s = targetDiameter / maxDim;
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      // Procedural rendering fallback based on category
      if (this.isFallback) {
        this.drawFallbackGraphic(ctx);
      } else if (this.category === 'station') {
        this.drawStationProcedural(ctx);
      } else if (this.category === 'defense') {
        this.drawDefensePlatform(ctx);
      } else if (this.category === 'beacon') {
        this.drawBeacon(ctx);
      } else if (this.category === 'asteroid') {
        this.drawAsteroidProcedural(ctx);
      } else if (this.category === 'drone') {
        this.drawDroneProcedural(ctx, false);
      } else if (this.category === 'hostile') {
        this.drawDroneProcedural(ctx, true);
      } else {
        this.drawFallbackGraphic(ctx);
      }
    }

    // Interactive docking ring or beacon strobes
    if (this.dockable) {
      const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.25 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  /**
   * Fallback graphic for missing/unregistered blueprints
   */
  private drawFallbackGraphic(ctx: CanvasRenderingContext2D): void {
    const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.save();
    // Amber wireframe diamond
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.fill();
    ctx.strokeStyle = `rgba(245, 158, 11, ${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Central pulsing beacon core
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
    ctx.fill();

    // Calibration crosshairs
    ctx.beginPath();
    ctx.moveTo(-this.radius * 1.3, 0);
    ctx.lineTo(this.radius * 1.3, 0);
    ctx.moveTo(0, -this.radius * 1.3);
    ctx.lineTo(0, this.radius * 1.3);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private drawStationProcedural(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Hex spokes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * this.radius * 0.3, Math.sin(a) * this.radius * 0.3);
      ctx.lineTo(Math.cos(a) * this.radius * 0.95, Math.sin(a) * this.radius * 0.95);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private drawDefensePlatform(ctx: CanvasRenderingContext2D): void {
    // Octagonal armored turret
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.cos(a) * this.radius;
      const py = Math.sin(a) * this.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Twin coilgun barrels
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(this.radius * 0.2, -8, this.radius * 0.9, 5);
    ctx.fillRect(this.radius * 0.2, 3, this.radius * 0.9, 5);
  }

  private drawBeacon(ctx: CanvasRenderingContext2D): void {
    const pulse = Math.sin(Date.now() * 0.005) * 0.4 + 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#065f46';
    ctx.fill();
    ctx.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 12;
    ctx.fill();
  }

  private drawAsteroidProcedural(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    for (let i = 0; i < this.numPoints; i++) {
      const theta = (i / this.numPoints) * Math.PI * 2;
      const r = this.radius * (this.offsets[i] || 1);
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawDroneProcedural(ctx: CanvasRenderingContext2D, isHostile: boolean): void {
    ctx.beginPath();
    ctx.moveTo(this.radius, 0);
    ctx.lineTo(-this.radius * 0.7, -this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.3, 0);
    ctx.lineTo(-this.radius * 0.7, this.radius * 0.7);
    ctx.closePath();
    ctx.fillStyle = isHostile ? '#7f1d1d' : '#78350f';
    ctx.fill();
    ctx.strokeStyle = isHostile ? '#ef4444' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Check contact docking collision with player ship
   */
  public checkDocking(player: PlayerShip): boolean {
    if (!this.dockable || player.isDead || player.dockingGraceTimer > 0) {
      return false;
    }
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    return dist <= this.radius + (player.config.stats.collisionRadius || 25);
  }

  /**
   * Take damage from weapons or impacts
   */
  public takeDamage(
    amount: number,
    fromX: number,
    fromY: number,
    sound: SoundEngine,
    particles: ParticleSystem
  ): boolean {
    if (this.isDead) return true;
    this.hp -= amount;

    // Emit impact sparks
    const angle = Math.atan2(fromY - this.y, fromX - this.x);
    particles.emitSpark(
      this.x + Math.cos(angle) * this.radius * 0.8,
      this.y + Math.sin(angle) * this.radius * 0.8,
      Math.cos(angle) * 3,
      Math.sin(angle) * 3,
      this.category === 'hostile' ? '#ff3366' : '#ff9900',
      15
    );

    if (this.hp <= 0) {
      this.isDead = true;
      sound.playExplosion(this.radius > 60);
      particles.emitExplosion(this.x, this.y, Math.min(50, Math.round(this.radius * 0.8)));
      return true;
    }

    sound.playHitSound();
    return false;
  }
}

/**
 * Map Loading Routine & Merge Subroutine
 * Receives target Map Bubble ID, reads its instance placements, merges each object
 * with its corresponding typeId blueprint from entities.json, and returns activeEntities array.
 * If typeId is missing, gracefully falls back to FALLBACK_BLUEPRINT without crashing.
 */
export function loadMapBubble(bubbleId: string): {
  mapData: MapBubbleFile;
  activeEntities: RuntimeMapEntity[];
} {
  const mapData = REGISTERED_MAPS[bubbleId] || REGISTERED_MAPS['sol_hub'] || (solHubMapData as MapBubbleFile);
  const activeEntities: RuntimeMapEntity[] = [];

  for (const instance of mapData.instances) {
    let blueprint = BLUEPRINTS[instance.typeId];
    let isFallback = false;

    if (!blueprint) {
      console.warn(
        `[MapLoader] Unknown typeId "${instance.typeId}" for entity instance "${instance.id}" in map "${mapData.id}". Applying fallback blueprint.`
      );
      blueprint = {
        ...FALLBACK_BLUEPRINT,
        typeId: instance.typeId,
        displayName: `Unregistered (${instance.typeId})`,
      };
      isFallback = true;
    }

    const entity = new RuntimeMapEntity(instance, blueprint, isFallback);
    activeEntities.push(entity);
  }

  return {
    mapData,
    activeEntities,
  };
}

export function getAvailableMapBubbles(): {
  id: string;
  name: string;
  systemId: string;
  systemName: string;
  designation: string;
  description: string;
}[] {
  return Object.values(REGISTERED_MAPS).map((m) => ({
    id: m.id,
    name: m.name,
    systemId: m.systemId,
    systemName: m.systemName,
    designation: m.designation,
    description: m.description,
  }));
}
