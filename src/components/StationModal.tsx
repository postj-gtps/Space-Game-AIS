import React, { useState, useEffect, useCallback } from 'react';
import { SoundEngine } from '../game/sound';
import defaultShipStarterImg from '../../assets/images/ships/ship-starter.png';
import defaultFreighterImg from '../../assets/images/ships/Freighter.png';

export type StationView = 'CONCOURSE' | 'SHIP_DEALER' | 'BAR' | 'MISSION_COMPUTER' | 'MERCHANTS_HALL';

interface StationModalProps {
  isOpen: boolean;
  onUndock: () => void;
  soundEngine: SoundEngine;
  stationName?: string;
  activeShipId: string;
  onSelectShip: (shipId: string) => void;
}

interface FacilityInfo {
  id: StationView;
  index: number;
  label: string;
  tagline: string;
  roomTitle: string;
  subtitle: string;
  statusBadge: string;
  description: string;
  details: string[];
}

export interface ShowroomShip {
  id: string;
  name: string;
  callsign: string;
  role: string;
  description: string;
  image: string;
  stats: {
    topSpeed: string;
    thrust: string;
    shields: number;
    hull: number;
    cargo: number;
    crew: number;
    laserCycle: string;
    cost: number;
  };
  highlights: string[];
}

export const SHOWROOM_SHIPS: ShowroomShip[] = [
  {
    id: 'starter_ship',
    name: 'Starlight Scout',
    callsign: 'SF-77 VANGUARD',
    role: 'LIGHT RECON / INTERCEPTOR FIGHTER',
    description:
      'High-agility military chassis equipped with twin plasma cannons and tri-jet sublight engines. Designed for rapid dogfighting, doglegs around asteroids, and fast reconnaissance.',
    image: defaultShipStarterImg,
    stats: {
      topSpeed: '7.0 kn (105 kn)',
      thrust: '0.09 Tri-Jet',
      shields: 100,
      hull: 100,
      cargo: 25,
      crew: 2,
      laserCycle: '110 ms',
      cost: 0,
    },
    highlights: [
      'Agile 0.0325 rad/frame turning rate for precision evasion',
      'Twin forward wing-mounted plasma muzzles with rapid cycle',
      'Tri-jet sublight main thrusters + dual forward RCS jets',
    ],
  },
  {
    id: 'freighter_01',
    name: 'Scipia Freighter',
    callsign: 'HEAVY HAULER V-12',
    role: 'ARMORED BULK TRANSPORT',
    description:
      'Heavy industrial transport chassis featuring reinforced composite hull plating, high-capacity cargo holds, and twin heavy plasma sublight drives. Perfect for deep asteroid mining operations.',
    image: defaultFreighterImg,
    stats: {
      topSpeed: '6.2 kn (93 kn)',
      thrust: '0.07 Heavy Drive',
      shields: 135,
      hull: 115,
      cargo: 50,
      crew: 4,
      laserCycle: '130 ms',
      cost: 30000,
    },
    highlights: [
      'Double payload capacity (50 SCU) for high-yield mining hauls',
      '+35% Shield capacity (135 MW) & +15% reinforced hull (115 HP)',
      'Dual heavy red plasma sublight thrusters with 4-point lateral RCS',
    ],
  },
];

const FACILITIES: Record<Exclude<StationView, 'CONCOURSE'>, FacilityInfo> = {
  SHIP_DEALER: {
    id: 'SHIP_DEALER',
    index: 1,
    label: 'Ship Dealer',
    tagline: 'Vessel showroom, custom hulls & outfitting',
    roomTitle: 'Orbital Ship Dealer & Outfitting Yard',
    subtitle: 'Bays 01-12 · Starship Procurement & Hull Upgrades',
    statusBadge: 'SHOWROOM OPEN · 2 CHASSIS IN STOCK',
    description:
      'The shipyard showroom floor is open for certified pilots. Browse the showroom floor to inspect technical specifications, swap chassis hulls, or commandeer new military and commercial vessels.',
    details: [
      'Available Vessels: Starlight Scout [Interceptor] & Scipia Freighter [Heavy Transport]',
      'Services: Instant drydock hull transfer, subsystem synchronization, weapon mounting',
      'Notice: Authorized pilots can freely switch hulls in drydock with full shield recharge',
    ],
  },
  BAR: {
    id: 'BAR',
    index: 2,
    label: 'Visit the Bar',
    tagline: "The Starlight Cantina · Pilot gossip & refreshments",
    roomTitle: 'The Starlight Cantina & Officers Club',
    subtitle: 'Sub-level 3 · Pilots Guild Lounge & Information Broker',
    statusBadge: 'PRIVATE FUNCTION IN PROGRESS',
    description:
      'Neon tubes buzz softly through haze and soft jazz. A lone bartender polishes glasses behind reinforced plasteel, nodding as you approach the door, but the lounge is reserved for an incoming deep-range convoy escort crew.',
    details: [
      'Atmosphere: Pressurized nitrogen/oxygen blend · 21°C',
      'Available Rumors: Neutral drone patrol routes, asteroid belt salvage claims',
      'Notice: Taproom opens following next convoy arrival',
    ],
  },
  MISSION_COMPUTER: {
    id: 'MISSION_COMPUTER',
    index: 3,
    label: 'Mission Computer',
    tagline: 'Sector bounty board, patrol contracts & escorts',
    roomTitle: 'Federal Tactical Operations & Bounty Terminal',
    subtitle: 'Sub-deck 1 · Automated Contract Clearinghouse',
    statusBadge: 'NETWORK COMM SYNCHRONIZING',
    description:
      'The central tactical array is authenticating cryptographic uplink keys with Sector Command. High-priority bounty targets, hostile drone eradication contracts, and mining defense escorts will be posted once telemetry links settle.',
    details: [
      'Uplink: Sector Command Relay 04 · Status: Cryptographic Handshake',
      'Open Bounties: Hostile automated sentry drone clusters detected',
      'Notice: Combat license registration required for Class-4 contracts',
    ],
  },
  MERCHANTS_HALL: {
    id: 'MERCHANTS_HALL',
    index: 4,
    label: "Merchants' Hall",
    tagline: 'Bulk commodity exchange, raw ore refinery & salvage',
    roomTitle: "Merchants' Guild & Commerce Exchange",
    subtitle: 'Docking Promenade · Bulk Goods & Rare Mineral Refinery',
    statusBadge: 'COMMERCE SYSTEM UPGRADING',
    description:
      'Automated mag-lev cranes move container crates overhead while refinery kilns hum in the distance. The market boards are recalibrating tariff tariffs and commodity pricing indices for refined minerals, fuel cells, and electronics.',
    details: [
      'Refinery Status: Preheating plasma kilns for dense asteroid ore',
      'Market Index: Titanium +4.2% · Plasma Cells Stable · Rare Isotopes +8.1%',
      'Notice: Trading floor re-opens following quarterly tariff reconciliation',
    ],
  },
};

export const StationModal: React.FC<StationModalProps> = ({
  isOpen,
  onUndock,
  soundEngine,
  stationName = 'STARPORT VALIANT-PRIME',
  activeShipId,
  onSelectShip,
}) => {
  const [currentView, setCurrentView] = useState<StationView>('CONCOURSE');

  // Reset view when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentView('CONCOURSE');
    }
  }, [isOpen]);

  const handleSelectFacility = useCallback(
    (view: StationView) => {
      soundEngine.playMenuBeep(true);
      setCurrentView(view);
    },
    [soundEngine]
  );

  const handleBackToConcourse = useCallback(() => {
    soundEngine.playMenuBeep(false);
    setCurrentView('CONCOURSE');
  }, [soundEngine]);

  const handleUndockAction = useCallback(() => {
    soundEngine.playMenuBeep(true);
    onUndock();
  }, [soundEngine, onUndock]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentView === 'CONCOURSE') {
        switch (e.key) {
          case '1':
            e.preventDefault();
            handleSelectFacility('SHIP_DEALER');
            break;
          case '2':
            e.preventDefault();
            handleSelectFacility('BAR');
            break;
          case '3':
            e.preventDefault();
            handleSelectFacility('MISSION_COMPUTER');
            break;
          case '4':
            e.preventDefault();
            handleSelectFacility('MERCHANTS_HALL');
            break;
          case '5':
            e.preventDefault();
            handleUndockAction();
            break;
          case 'Escape':
            e.preventDefault();
            handleUndockAction();
            break;
        }
      } else if (currentView === 'SHIP_DEALER') {
        if (e.key === '1' || e.key.toLowerCase() === 's') {
          e.preventDefault();
          soundEngine.playMenuBeep(true);
          onSelectShip('starter_ship');
        } else if (e.key === '2' || e.key.toLowerCase() === 'f') {
          e.preventDefault();
          soundEngine.playMenuBeep(true);
          onSelectShip('freighter_01');
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          handleBackToConcourse();
        } else if (e.key === '5') {
          e.preventDefault();
          handleUndockAction();
        }
      } else {
        if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Enter') {
          e.preventDefault();
          handleBackToConcourse();
        } else if (e.key === '5') {
          e.preventDefault();
          handleUndockAction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentView, handleSelectFacility, handleBackToConcourse, handleUndockAction, onSelectShip, soundEngine]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-terminal-title"
    >
      {/* Outer Industrial Terminal Frame */}
      <div className="relative w-full max-w-4xl bg-slate-950/95 border border-cyan-500/30 rounded-lg shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col text-slate-200">
        {/* Terminal Header Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-sm bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
            <div>
              <h2 id="station-terminal-title" className="text-sm md:text-base font-bold tracking-wider text-cyan-300">
                {stationName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>BAY 04</span>
                <span aria-hidden="true">·</span>
                <span>MOORING CLAMPS SECURED</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400">SHORE POWER ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="hidden sm:inline">SECTOR 0-A · GRID (0, 350)</span>
            <button
              onClick={handleUndockAction}
              className="px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 rounded hover:bg-cyan-900/80 hover:text-white transition-colors"
              title="Release docking clamps and return to flight"
            >
              Undock [5 / Esc]
            </button>
          </div>
        </header>

        {/* Terminal Content Body */}
        <div className="p-6 md:p-8 flex-1 min-h-[420px] flex flex-col justify-between">
          {currentView === 'CONCOURSE' ? (
            <div>
              {/* Concourse Intro */}
              <div className="mb-6">
                <span className="text-xs uppercase tracking-widest text-cyan-400/80">Station Concourse Directory</span>
                <h1 className="text-xl md:text-2xl font-bold text-white mt-1">Select Station Facility</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
                  Mooring clamps are fully pressurized. Use the numerical keys [1-5] or click any station concourse wing
                  below to access port services.
                </p>
              </div>

              {/* Concourse Navigation Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* 1. Ship Dealer */}
                <button
                  onClick={() => handleSelectFacility('SHIP_DEALER')}
                  className="group flex items-start gap-4 p-4 text-left bg-slate-900/50 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-md transition-all cursor-pointer"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-sm font-bold group-hover:scale-105 group-hover:border-cyan-400 transition-transform">
                    1
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        Ship Dealer
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Drydock 01</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      Vessel showroom, custom hulls & outfitting
                    </p>
                  </div>
                </button>

                {/* 2. Visit the Bar */}
                <button
                  onClick={() => handleSelectFacility('BAR')}
                  className="group flex items-start gap-4 p-4 text-left bg-slate-900/50 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-md transition-all cursor-pointer"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-sm font-bold group-hover:scale-105 group-hover:border-cyan-400 transition-transform">
                    2
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        Visit the Bar
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sub-Deck 03</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      The Starlight Cantina · Pilot gossip & refreshments
                    </p>
                  </div>
                </button>

                {/* 3. Mission Computer */}
                <button
                  onClick={() => handleSelectFacility('MISSION_COMPUTER')}
                  className="group flex items-start gap-4 p-4 text-left bg-slate-900/50 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-md transition-all cursor-pointer"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-sm font-bold group-hover:scale-105 group-hover:border-cyan-400 transition-transform">
                    3
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        Mission Computer
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tactical Hub</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      Sector bounty board, patrol contracts & escorts
                    </p>
                  </div>
                </button>

                {/* 4. Merchants' Hall */}
                <button
                  onClick={() => handleSelectFacility('MERCHANTS_HALL')}
                  className="group flex items-start gap-4 p-4 text-left bg-slate-900/50 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 rounded-md transition-all cursor-pointer"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-sm font-bold group-hover:scale-105 group-hover:border-cyan-400 transition-transform">
                    4
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        Merchants' Hall
                      </h3>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Refinery Level</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      Bulk commodity exchange, raw ore refinery & salvage
                    </p>
                  </div>
                </button>
              </div>

              {/* 5. Leave Station Primary Action Card */}
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <button
                  onClick={handleUndockAction}
                  className="w-full group flex items-center justify-between p-4 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/40 hover:border-cyan-400 rounded-md transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded bg-cyan-900/60 border border-cyan-400 text-cyan-200 text-sm font-bold">
                      5
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-cyan-300 group-hover:text-white transition-colors">
                        Leave Station
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Disengage docking clamps and return ship to open space flight
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-cyan-400 px-3 py-1 bg-cyan-950 border border-cyan-500/30 rounded">
                    Release [5] →
                  </span>
                </button>
              </div>
            </div>
          ) : currentView === 'SHIP_DEALER' ? (
            /* Dedicated Ship Dealer Showroom View */
            <div className="flex flex-col justify-between flex-1">
              <div>
                {/* Breadcrumb Header */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <button
                    onClick={handleBackToConcourse}
                    className="hover:text-cyan-300 underline transition-colors cursor-pointer"
                  >
                    Station Concourse
                  </button>
                  <span aria-hidden="true">/</span>
                  <span className="text-cyan-300 font-semibold">Ship Dealer & Outfitting Yard</span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
                      Orbital Ship Dealer Showroom
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select your operational starship for immediate drydock deployment
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 px-3 py-1 rounded flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>2 CHASSIS CERTIFIED & READY</span>
                  </div>
                </div>

                {/* Starship Showroom Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {SHOWROOM_SHIPS.map((ship, idx) => {
                    const isEquipped =
                      activeShipId === ship.id ||
                      (ship.id === 'starter_ship' && (activeShipId === 'scout_01' || activeShipId === 'scout')) ||
                      (ship.id === 'freighter_01' && (activeShipId === 'freighter_01' || activeShipId === 'freighter'));

                    return (
                      <div
                        key={ship.id}
                        className={`relative p-4 rounded-lg border transition-all flex flex-col justify-between ${
                          isEquipped
                            ? 'bg-gradient-to-b from-cyan-950/50 to-slate-900/80 border-cyan-400 shadow-lg shadow-cyan-950/50'
                            : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800 hover:border-cyan-500/40'
                        }`}
                      >
                        {/* Card Header & Badge */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                                  KEY [{idx + 1}]
                                </span>
                                <h3 className="text-base font-bold text-white">{ship.name}</h3>
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold block mt-0.5">
                                {ship.role}
                              </span>
                            </div>
                            {isEquipped ? (
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-400 px-2 py-0.5 rounded shadow-sm shadow-emerald-400/30">
                                ✓ ACTIVE VESSEL
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                                {ship.stats.cost === 0 ? 'FREE REQUISITION' : `${ship.stats.cost.toLocaleString()} Cr`}
                              </span>
                            )}
                          </div>

                          {/* Holographic Drydock Bay Preview */}
                          <div className="relative my-3 h-32 rounded bg-black/60 border border-cyan-500/20 flex items-center justify-center overflow-hidden p-2">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.08)_0%,transparent_70%)]" />
                            <img
                              src={ship.image}
                              alt={ship.name}
                              className={`max-h-24 max-w-[80%] object-contain drop-shadow-[0_0_12px_rgba(0,240,255,0.35)] transition-transform duration-300 ${
                                isEquipped ? 'scale-105' : 'hover:scale-100'
                              }`}
                            />
                            <div className="absolute bottom-1 right-2 text-[9px] text-slate-500 font-mono">
                              {ship.callsign}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-2">
                            {ship.description}
                          </p>

                          {/* Key Technical Specifications Grid */}
                          <div className="grid grid-cols-3 gap-1.5 p-2.5 rounded bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono mb-3">
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[9px]">MAX SPEED</span>
                              <span className="text-cyan-300 font-bold">{ship.stats.topSpeed}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[9px]">SHIELDS / HULL</span>
                              <span className="text-emerald-400 font-bold">{ship.stats.shields} / {ship.stats.hull}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[9px]">CARGO HOLD</span>
                              <span className="text-amber-300 font-bold">{ship.stats.cargo} SCU</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[9px]">CREW CAPACITY</span>
                              <span className="text-slate-200">{ship.stats.crew} Personnel</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[9px]">THRUST SYSTEM</span>
                              <span className="text-cyan-300">{ship.stats.thrust}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-slate-500 text-[9px]">LASER CYCLE</span>
                              <span className="text-purple-300">{ship.stats.laserCycle}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ship Action Button */}
                        <div className="mt-2">
                          {isEquipped ? (
                            <div className="w-full py-2 px-3 rounded bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span>CURRENTLY PILOTING IN DRYDOCK</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                soundEngine.playMenuBeep(true);
                                onSelectShip(ship.id);
                              }}
                              className="w-full py-2 px-3 rounded bg-cyan-900/70 hover:bg-cyan-800 border border-cyan-400 text-cyan-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow hover:shadow-cyan-500/40"
                            >
                              <span>[{idx + 1}] COMMANDEER {ship.name.toUpperCase()}</span>
                              <span className="text-cyan-300">→</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-view Navigation Controls */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={handleBackToConcourse}
                  className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>← Back to Concourse [Esc]</span>
                </button>

                <button
                  onClick={handleUndockAction}
                  className="px-4 py-2 text-xs md:text-sm font-semibold text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 hover:border-cyan-300 rounded transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/50"
                >
                  <span>Launch Vessel into Space [5] →</span>
                </button>
              </div>
            </div>
          ) : (
            /* Facility Sub-View (Under Construction / Dead End) */
            <div className="flex flex-col justify-between flex-1">
              <div>
                {/* Breadcrumb Header */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <button
                    onClick={handleBackToConcourse}
                    className="hover:text-cyan-300 underline transition-colors"
                  >
                    Station Concourse
                  </button>
                  <span aria-hidden="true">/</span>
                  <span className="text-cyan-300 font-semibold">{FACILITIES[currentView].label}</span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 mt-2 pb-4 border-b border-slate-800">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
                      {FACILITIES[currentView].roomTitle}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">{FACILITIES[currentView].subtitle}</p>
                  </div>
                  <div className="text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-500/40 px-3 py-1 rounded">
                    {FACILITIES[currentView].statusBadge}
                  </div>
                </div>

                {/* Facility Narrative & Details */}
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-md">
                    <p className="text-sm leading-relaxed text-slate-300">
                      {FACILITIES[currentView].description}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-900/30 border border-slate-800/80 rounded-md">
                    <h4 className="text-xs uppercase tracking-wider text-cyan-400 mb-2">Facility Telemetry & Log</h4>
                    <ul className="space-y-1.5 text-xs text-slate-400">
                      {FACILITIES[currentView].details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-cyan-500" aria-hidden="true">›</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sub-view Navigation Controls */}
              <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={handleBackToConcourse}
                  className="px-4 py-2 text-xs md:text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>← Back to Concourse [Esc]</span>
                </button>

                <button
                  onClick={handleUndockAction}
                  className="px-4 py-2 text-xs md:text-sm font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 hover:border-cyan-400 rounded transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Undock into Space [5] →</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Terminal Footer Status Bar */}
        <footer className="px-6 py-3 border-t border-cyan-500/20 bg-slate-900/40 flex items-center justify-between text-xs text-slate-500">
          <div>
            <span>SYSTEM: ONLINE</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>PRESS NUMBER KEYS [1 - 5] TO NAVIGATE</span>
          </div>
          <div>
            <span>AUTONOMOUS ORBITAL DEFENSE ACTIVE</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
