import React from 'react';
import { TelemetryData } from '../types/game';

interface HUDProps {
  telemetry: TelemetryData;
  showGrid: boolean;
  onToggleGrid: () => void;
  showNebula: boolean;
  onToggleNebula: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  radarCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  gameStarted: boolean;
  onStartGame: () => void;
  gameOver: boolean;
  onRestartGame: () => void;
  onKeyDownAction: (code: string) => void;
  onKeyUpAction: (code: string) => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  showGrid,
  onToggleGrid,
  showNebula,
  onToggleNebula,
  audioEnabled,
  onToggleAudio,
  radarCanvasRef,
  gameStarted,
  onStartGame,
  gameOver,
  onRestartGame,
  onKeyDownAction,
  onKeyUpAction,
}) => {
  const getCompassDir = (deg: number): string => {
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'E';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'S';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'W';
    return 'NW';
  };

  const shieldColorClass =
    telemetry.shieldPct < 30
      ? 'bg-red-500'
      : telemetry.shieldPct < 70
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  const heatColorClass = telemetry.heatPct > 80 ? 'bg-red-500' : 'bg-cyan-400';

  const bindTouch = (key: string) => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      onKeyDownAction(key);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      onKeyUpAction(key);
    },
    onMouseDown: () => onKeyDownAction(key),
    onMouseUp: () => onKeyUpAction(key),
    onMouseLeave: () => onKeyUpAction(key),
  });

  return (
    <>
      {/* TOP-LEFT: TELEMETRY & COMPASS HUD */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10 w-64 select-none">
        <div className="hud-panel p-3 rounded-lg text-xs flex flex-col gap-1">
          <div className="flex justify-between items-center border-b border-cyan-500/30 pb-1 mb-1">
            <span className="font-bold tracking-widest text-cyan-300 glow-text">
              {telemetry.shipName.toUpperCase()}
            </span>
            <span className="text-[10px] text-cyan-500">{telemetry.fps} FPS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">SPEED:</span>
            <span className="font-mono text-cyan-300 font-bold">
              {(telemetry.speed * 15).toFixed(1)} kn
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">HEADING:</span>
            <span className="font-mono text-cyan-300">
              {telemetry.headingDeg.toString().padStart(3, '0')}° ({getCompassDir(telemetry.headingDeg)})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">SECTOR COORD:</span>
            <span className="font-mono text-cyan-300">
              X: {telemetry.coordX} | Y: {telemetry.coordY}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">THRUSTER VEL:</span>
            <span className="font-mono text-cyan-300">{telemetry.thrustStatus}</span>
          </div>
        </div>

        {/* WEAPON / ENERGY GAUGES */}
        <div className="hud-panel p-3 rounded-lg text-xs flex flex-col gap-2">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400 text-[10px]">PLASMA CANNON HEAT</span>
              <span className="text-[10px] text-cyan-300 font-bold">{telemetry.heatPct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30">
              <div
                className={`h-full transition-all duration-75 ${heatColorClass}`}
                style={{ width: `${telemetry.heatPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400 text-[10px]">DEFLECTOR SHIELDS</span>
              <span className="text-[10px] text-cyan-300 font-bold">{telemetry.shieldPct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30">
              <div
                className={`h-full transition-all duration-75 ${shieldColorClass}`}
                style={{ width: `${telemetry.shieldPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT: RADAR & MINIMAP HUD */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10 select-none">
        <div className="hud-panel p-2 rounded-lg flex flex-col items-center">
          <div className="text-[10px] font-bold tracking-wider text-cyan-400 mb-1 flex justify-between w-full px-1">
            <span>TACTICAL RADAR</span>
            <span className="text-slate-400">2200m RANGE</span>
          </div>
          <canvas
            ref={radarCanvasRef}
            width={160}
            height={160}
            className="rounded border border-cyan-500/40 bg-slate-950/80"
          />
        </div>

        {/* CONTROL TOGGLE BUTTONS */}
        <div className="hud-panel p-2 rounded-lg flex gap-2 text-xs pointer-events-auto">
          <button
            onClick={onToggleGrid}
            className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-800/50 border border-cyan-500/40 rounded text-cyan-300 transition text-[11px] cursor-pointer"
          >
            Grid: {showGrid ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onToggleNebula}
            className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-800/50 border border-cyan-500/40 rounded text-cyan-300 transition text-[11px] cursor-pointer"
          >
            Nebula: {showNebula ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onToggleAudio}
            className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-800/50 border border-cyan-500/40 rounded text-cyan-300 transition text-[11px] cursor-pointer"
          >
            Audio: {audioEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* BOTTOM-LEFT: CONTROLS & MANUAL OVERLAY */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none hidden sm:block select-none">
        <div className="hud-panel p-3 rounded-lg text-xs w-72">
          <div className="font-bold text-cyan-300 mb-1 border-b border-cyan-500/30 pb-1 flex justify-between">
            <span>FLIGHT COMPUTER CONTROLS</span>
            <span className="text-amber-400 text-[10px]">WASD MODE</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px] text-slate-300">
            <div>
              <kbd className="px-1 py-0.5 bg-cyan-900/50 border border-cyan-500/40 rounded text-cyan-200">W</kbd>{' '}
              Thrust Forward
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-cyan-900/50 border border-cyan-500/40 rounded text-cyan-200">S</kbd>{' '}
              Reverse Thrusters
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-cyan-900/50 border border-cyan-500/40 rounded text-cyan-200">A</kbd>{' '}
              Rotate Left
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-cyan-900/50 border border-cyan-500/40 rounded text-cyan-200">D</kbd>{' '}
              Rotate Right
            </div>
            <div className="col-span-2 mt-1">
              <kbd className="px-1.5 py-0.5 bg-cyan-900/50 border border-cyan-500/40 rounded text-cyan-200">
                SPACEBAR
              </kbd>{' '}
              Fire Plasma Blaster
            </div>
          </div>
        </div>
      </div>

      {/* TOUCH CONTROLS FOR MOBILE DEVICES */}
      <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-between items-end z-20 pointer-events-none sm:hidden">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex justify-center">
            <button
              {...bindTouch('KeyW')}
              className="touch-btn w-14 h-14 bg-cyan-950/80 border-2 border-cyan-400/60 rounded-full flex items-center justify-center text-cyan-300 font-bold active:bg-cyan-500 text-lg cursor-pointer"
            >
              W
            </button>
          </div>
          <div className="flex gap-2">
            <button
              {...bindTouch('KeyA')}
              className="touch-btn w-14 h-14 bg-cyan-950/80 border-2 border-cyan-400/60 rounded-full flex items-center justify-center text-cyan-300 font-bold active:bg-cyan-500 text-lg cursor-pointer"
            >
              A
            </button>
            <button
              {...bindTouch('KeyS')}
              className="touch-btn w-14 h-14 bg-cyan-950/80 border-2 border-cyan-400/60 rounded-full flex items-center justify-center text-cyan-300 font-bold active:bg-cyan-500 text-lg cursor-pointer"
            >
              S
            </button>
            <button
              {...bindTouch('KeyD')}
              className="touch-btn w-14 h-14 bg-cyan-950/80 border-2 border-cyan-400/60 rounded-full flex items-center justify-center text-cyan-300 font-bold active:bg-cyan-500 text-lg cursor-pointer"
            >
              D
            </button>
          </div>
        </div>
        <div className="pointer-events-auto pb-2">
          <button
            {...bindTouch('Space')}
            className="touch-btn w-20 h-20 bg-red-950/80 border-2 border-red-500/80 rounded-full flex items-center justify-center text-red-300 font-bold active:bg-red-600 text-sm glow-red cursor-pointer"
          >
            FIRE
          </button>
        </div>
      </div>

      {/* START PROMPT */}
      {!gameStarted && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex items-center justify-center pointer-events-auto transition-opacity duration-300">
          <div className="hud-panel p-6 rounded-xl max-w-md text-center border-cyan-400/50 shadow-2xl">
            <h2 className="text-xl font-bold text-cyan-300 glow-text mb-2">ASSET LIBRARY PROOF OF CONCEPT</h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Loaded ship asset <strong className="text-cyan-300">{telemetry.shipName}</strong> from catalog
              configuration. Controls: <strong className="text-cyan-300">WASD</strong> to pilot,{' '}
              <strong className="text-cyan-300">Spacebar</strong> to shoot.
            </p>
            <button
              onClick={onStartGame}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all transform active:scale-95 text-sm uppercase tracking-wider cursor-pointer"
            >
              Initialize Flight Computer
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameOver && (
        <div className="absolute inset-0 bg-red-950/50 backdrop-blur-md z-30 flex items-center justify-center pointer-events-auto transition-all duration-300">
          <div className="hud-panel p-6 rounded-xl max-w-md text-center border-red-500/60 shadow-2xl bg-black/85">
            <h2 className="text-2xl font-bold text-red-500 glow-red mb-1">CRITICAL HULL FAILURE</h2>
            <p className="text-xs text-red-300/80 mb-4 font-mono">VESSEL DESTROYED IN SECTOR</p>
            <div className="p-3 bg-red-950/30 rounded border border-red-900/50 text-slate-300 text-xs mb-5 font-mono flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-slate-400">LAST COORDS:</span>
                <span className="text-cyan-300">
                  X: {telemetry.coordX} | Y: {telemetry.coordY}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CAUSE OF IMPACT:</span>
                <span className="text-amber-400">COLLISION DAMAGE</span>
              </div>
            </div>
            <button
              onClick={onRestartGame}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-lg hover:shadow-red-500/50 transition-all transform active:scale-95 text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>RESPAWN & REROUTE POWER</span>
              <span className="text-[10px] opacity-80">(Press R or Space)</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
