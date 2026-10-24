import { ShipDefinition, TelemetryData } from '../types/game';
import { AssetManager } from './assets';
import { SoundEngine } from './sound';

export const CONFIG = {
  worldSize: 10000,
  drag: 0.994,
  laserSpeed: 20,
  maxAsteroids: 45,
  maxDrones: 8,
};

export interface InputState {
  forward: boolean;
  reverse: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

export class ParticleSystem {
  public particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    decay: number;
    size: number;
  }> = [];

  public emitThrust(x: number, y: number, vx: number, vy: number, color: string): void {
    this.particles.push({
      x,
      y,
      vx,
      vy,
      color,
      life: 1.0,
      decay: 0.04 + Math.random() * 0.03,
      size: 3 + Math.random() * 4,
    });
  }

  public emitSpark(x: number, y: number, vx: number, vy: number, color: string, maxFrames = 25): void {
    this.particles.push({
      x,
      y,
      vx,
      vy,
      color,
      life: 1.0,
      decay: 1 / maxFrames,
      size: 1 + Math.random() * 2,
    });
  }

  public emitExplosion(x: number, y: number, count = 25, color = '#ffaa00'): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        size: 2 + Math.random() * 4,
      });
    }
  }

  public update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export class LaserProjectile {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public angle: number;
  public life = 0;
  public maxLife = 55;
  public radius = 3;

  constructor(x: number, y: number, vx: number, vy: number, angle: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.angle = angle;
  }

  public update(particleSystem: ParticleSystem): void {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;

    if (this.life % 2 === 0) {
      particleSystem.emitSpark(
        this.x,
        this.y,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        '#00f0ff',
        10
      );
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.restore();
  }
}

export class Asteroid {
  public x: number;
  public y: number;
  public size: number;
  public radius: number;
  public vx: number;
  public vy: number;
  public angle: number;
  public rotSpeed: number;
  public numPoints: number;
  public offsets: number[];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = size * 16;
    this.vx = (Math.random() - 0.5) * (4 / size);
    this.vy = (Math.random() - 0.5) * (4 / size);
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.03;

    this.numPoints = 8 + Math.floor(Math.random() * 5);
    this.offsets = [];
    for (let i = 0; i < this.numPoints; i++) {
      this.offsets.push(0.75 + Math.random() * 0.5);
    }
  }

  public update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotSpeed;

    const halfWorld = CONFIG.worldSize / 2;
    if (this.x > halfWorld) this.x = -halfWorld;
    if (this.x < -halfWorld) this.x = halfWorld;
    if (this.y > halfWorld) this.y = -halfWorld;
    if (this.y < -halfWorld) this.y = halfWorld;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    for (let i = 0; i < this.numPoints; i++) {
      const theta = (i / this.numPoints) * Math.PI * 2;
      const r = this.radius * this.offsets[i];
      const px = Math.cos(theta) * r;
      const py = Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = '#0a101d';
    ctx.fill();
    ctx.strokeStyle = '#2e5d88';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
  }
}

export class TargetDrone {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius = 24;
  public angle = 0;
  public hp = 3;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
  }

  public update(_player: PlayerShip): void {
    this.angle += 0.02;
    this.vx += Math.cos(this.angle) * 0.05;
    this.vy += Math.sin(this.angle) * 0.05;

    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 3) {
      this.vx = (this.vx / spd) * 3;
      this.vy = (this.vy / spd) * 3;
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const img = AssetManager.getDroneImage();
    if (img && img.complete && img.naturalWidth !== 0) {
      const scale = 0.08;
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      // Subtle tactical damage indicator when hit
      if (this.hp < 3) {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 51, 102, ${(3 - this.hp) * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-this.radius - 4, 0);
      ctx.lineTo(this.radius + 4, 0);
      ctx.moveTo(0, -this.radius - 4);
      ctx.lineTo(0, this.radius + 4);
      ctx.strokeStyle = 'rgba(255, 51, 102, 0.5)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class PlayerShip {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public angle = -Math.PI / 2;
  public activeShipId = 'starter_ship';

  public lastShotTime = 0;
  public laserHeat = 0;
  public maxShields = 100;
  public shields = 100;
  public lastDamageTime = 0;
  public rechargeDelay = 2200;
  public rechargeRate = 0.35;
  public invulnerableTimer = 0;
  public isDead = false;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  public get config(): ShipDefinition {
    return AssetManager.getShip(this.activeShipId);
  }

  public reset(): void {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.shields = this.config.stats.maxShields;
    this.laserHeat = 0;
    this.isDead = false;
    this.invulnerableTimer = 60;
  }

  public takeDamage(
    amount: number,
    sourceX: number,
    sourceY: number,
    knockback = 5,
    soundEngine: SoundEngine,
    particleSystem: ParticleSystem,
    triggerShake: (dur: number, mag: number) => void,
    onGameOver: () => void
  ): void {
    if (this.isDead || this.invulnerableTimer > 0) return;

    this.lastDamageTime = Date.now();
    this.invulnerableTimer = 20;

    const hitAngle = Math.atan2(this.y - sourceY, this.x - sourceX);
    this.vx += Math.cos(hitAngle) * knockback;
    this.vy += Math.sin(hitAngle) * knockback;

    triggerShake(10, 10);

    if (this.shields > 0) {
      this.shields = Math.max(0, this.shields - amount);
      soundEngine.playShieldHit();

      for (let i = 0; i < 15; i++) {
        particleSystem.emitSpark(
          this.x + (Math.random() - 0.5) * 20,
          this.y + (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          '#00f0ff',
          20
        );
      }

      if (this.shields === 0) {
        particleSystem.emitExplosion(this.x, this.y, 20, '#00ffff');
      }
    } else {
      this.explode(soundEngine, particleSystem, triggerShake, onGameOver);
    }
  }

  public explode(
    soundEngine: SoundEngine,
    particleSystem: ParticleSystem,
    triggerShake: (dur: number, mag: number) => void,
    onGameOver: () => void
  ): void {
    if (this.isDead) return;
    this.isDead = true;

    soundEngine.playExplosion(true);
    triggerShake(24, 26);

    particleSystem.emitExplosion(this.x, this.y, 50, '#ff4400');
    particleSystem.emitExplosion(this.x, this.y, 30, '#ffcc00');
    particleSystem.emitExplosion(this.x, this.y, 25, '#00f0ff');

    setTimeout(() => {
      onGameOver();
    }, 700);
  }

  public getLocalAnchorWorldPos(localX: number, localY: number): { x: number; y: number } {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    return {
      x: this.x + cos * localX - sin * localY,
      y: this.y + sin * localX + cos * localY,
    };
  }

  public update(
    _deltaTime: number,
    keys: InputState,
    soundEngine: SoundEngine,
    particleSystem: ParticleSystem,
    projectiles: LaserProjectile[]
  ): void {
    if (this.isDead) return;

    const cfg = this.config;
    const stats = cfg.stats;

    if (this.invulnerableTimer > 0) this.invulnerableTimer--;

    if (this.shields < stats.maxShields && Date.now() - this.lastDamageTime > this.rechargeDelay) {
      this.shields = Math.min(stats.maxShields, this.shields + this.rechargeRate);
    }

    if (keys.left) this.angle -= stats.rotationSpeed;
    if (keys.right) this.angle += stats.rotationSpeed;

    const dirX = Math.cos(this.angle);
    const dirY = Math.sin(this.angle);

    let thrusting = false;

    // Forward Thrust & Thruster Plume Particles
    if (keys.forward) {
      this.vx += dirX * stats.thrustPower;
      this.vy += dirY * stats.thrustPower;
      thrusting = true;

      if (cfg.anchors && cfg.anchors.thrusters) {
        for (const t of cfg.anchors.thrusters) {
          const pos = this.getLocalAnchorWorldPos(t.x, t.y);
          particleSystem.emitThrust(
            pos.x,
            pos.y,
            -dirX * 4 + (Math.random() - 0.5) * 1.5 + this.vx * 0.2,
            -dirY * 4 + (Math.random() - 0.5) * 1.5 + this.vy * 0.2,
            t.color || '#00f0ff'
          );
        }
      }
    }

    // Reverse Thrust & RCS Particles
    if (keys.reverse) {
      this.vx -= dirX * stats.reverseThrustPower;
      this.vy -= dirY * stats.reverseThrustPower;
      thrusting = true;

      if (cfg.anchors && cfg.anchors.rcsJets) {
        for (const rcs of cfg.anchors.rcsJets) {
          const pos = this.getLocalAnchorWorldPos(rcs.x, rcs.y);
          particleSystem.emitThrust(
            pos.x,
            pos.y,
            dirX * 2 + (Math.random() - 0.5),
            dirY * 2 + (Math.random() - 0.5),
            rcs.color || '#ff9900'
          );
        }
      }
    }

    soundEngine.setThrust(thrusting, keys.forward ? 1.0 : 0.6);

    this.vx *= CONFIG.drag;
    this.vy *= CONFIG.drag;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > stats.maxSpeed) {
      this.vx = (this.vx / speed) * stats.maxSpeed;
      this.vy = (this.vy / speed) * stats.maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    const halfWorld = CONFIG.worldSize / 2;
    if (this.x > halfWorld) this.x = -halfWorld;
    if (this.x < -halfWorld) this.x = halfWorld;
    if (this.y > halfWorld) this.y = -halfWorld;
    if (this.y < -halfWorld) this.y = halfWorld;

    if (keys.fire) this.shoot(soundEngine, particleSystem, projectiles);

    this.laserHeat = Math.max(0, this.laserHeat - 0.4);
  }

  public shoot(soundEngine: SoundEngine, particleSystem: ParticleSystem, projectiles: LaserProjectile[]): void {
    const now = Date.now();
    const cfg = this.config;
    const stats = cfg.stats;

    if (now - this.lastShotTime >= stats.laserCooldown && this.laserHeat < stats.laserHeatLimit) {
      this.lastShotTime = now;
      this.laserHeat = Math.min(100, this.laserHeat + 10);

      const dirX = Math.cos(this.angle);
      const dirY = Math.sin(this.angle);

      const muzzles = cfg.anchors && cfg.anchors.muzzles ? cfg.anchors.muzzles : [{ x: 25, y: 0 }];

      for (const m of muzzles) {
        const muzzlePos = this.getLocalAnchorWorldPos(m.x, m.y);
        const projVx = this.vx + dirX * CONFIG.laserSpeed;
        const projVy = this.vy + dirY * CONFIG.laserSpeed;

        projectiles.push(new LaserProjectile(muzzlePos.x, muzzlePos.y, projVx, projVy, this.angle));

        for (let i = 0; i < 4; i++) {
          particleSystem.emitSpark(
            muzzlePos.x,
            muzzlePos.y,
            dirX * 3 + (Math.random() - 0.5) * 2,
            dirY * 3 + (Math.random() - 0.5) * 2,
            '#00ffff',
            15
          );
        }
      }

      this.vx -= dirX * 0.075;
      this.vy -= dirY * 0.075;

      soundEngine.playLaser();
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.isDead) return;

    const cfg = this.config;
    const img = AssetManager.getShipImage(this.activeShipId);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    if (img && img.complete && img.naturalWidth !== 0) {
      ctx.save();
      const rotOffset = ((cfg.sprite.rotationOffset || 0) * Math.PI) / 180;
      ctx.rotate(rotOffset);

      const w = img.width * cfg.sprite.scale;
      const h = img.height * cfg.sprite.scale;

      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      // Retro Vector Fallback
      ctx.beginPath();
      ctx.moveTo(44, 0);
      ctx.lineTo(-28, 32);
      ctx.lineTo(-20, 16);
      ctx.lineTo(-32, 10);
      ctx.lineTo(-32, -10);
      ctx.lineTo(-20, -16);
      ctx.lineTo(-28, -32);
      ctx.closePath();
      ctx.fillStyle = '#061325';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Glowing Outer Shield Shell
    if (this.shields > 0) {
      const shieldRatio = this.shields / cfg.stats.maxShields;
      ctx.beginPath();
      ctx.arc(0, 0, cfg.stats.collisionRadius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 + Math.sin(Date.now() * 0.005) * 0.08 * shieldRatio})`;
      ctx.lineWidth = 1.5 + shieldRatio;
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class Starfield {
  public stars: Array<{ x: number; y: number; size: number; layer: number; color: string }> = [];
  public dust: Array<{ x: number; y: number; size: number }> = [];

  constructor(count = 350) {
    const colors = ['#ffffff', '#88dffc', '#ffd480', '#e0c2ff'];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * CONFIG.worldSize,
        y: (Math.random() - 0.5) * CONFIG.worldSize,
        size: Math.random() * 1.8 + 0.4,
        layer: Math.random(),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    for (let i = 0; i < 60; i++) {
      this.dust.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        size: Math.random() * 1.5 + 0.5,
      });
    }
  }

  public draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, width: number, height: number): void {
    for (const star of this.stars) {
      const px = star.x - camX * star.layer;
      const py = star.y - camY * star.layer;
      const screenX = ((px % width) + width) % width;
      const screenY = ((py % height) + height) % height;

      ctx.fillStyle = star.color;
      ctx.fillRect(screenX, screenY, star.size, star.size);
    }
  }

  public drawDust(ctx: CanvasRenderingContext2D, player: PlayerShip, width: number, height: number): void {
    ctx.fillStyle = 'rgba(200, 240, 255, 0.4)';
    for (const d of this.dust) {
      let dx = (d.x - player.x) % width;
      let dy = (d.y - player.y) % height;
      if (dx < 0) dx += width;
      if (dy < 0) dy += height;
      ctx.fillRect(dx, dy, d.size, d.size);
    }
  }
}

export class NebulaRenderer {
  public clouds = [
    { x: -800, y: -600, radius: 900, color1: 'rgba(0, 100, 200, 0.12)', color2: 'rgba(0,0,0,0)' },
    { x: 1200, y: 800, radius: 1100, color1: 'rgba(150, 0, 200, 0.10)', color2: 'rgba(0,0,0,0)' },
    { x: 400, y: -1400, radius: 800, color1: 'rgba(0, 200, 150, 0.08)', color2: 'rgba(0,0,0,0)' },
  ];

  public draw(ctx: CanvasRenderingContext2D, showNebula: boolean): void {
    if (!showNebula) return;
    for (const cloud of this.clouds) {
      const grad = ctx.createRadialGradient(cloud.x, cloud.y, 10, cloud.x, cloud.y, cloud.radius);
      grad.addColorStop(0, cloud.color1);
      grad.addColorStop(1, cloud.color2);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawSectorGrid(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  width: number,
  height: number,
  showGrid: boolean
): void {
  if (!showGrid) return;
  const gridSize = 300;
  const halfWorld = CONFIG.worldSize / 2;
  const startX = Math.max(-halfWorld, Math.floor((camX - width / 2) / gridSize) * gridSize);
  const endX = Math.min(halfWorld, Math.ceil((camX + width / 2) / gridSize) * gridSize);
  const startY = Math.max(-halfWorld, Math.floor((camY - height / 2) / gridSize) * gridSize);
  const endY = Math.min(halfWorld, Math.ceil((camY + height / 2) / gridSize) * gridSize);

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
  ctx.lineWidth = 1;

  for (let x = startX; x <= endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
  ctx.restore();
}
