import React, { useState, useMemo, useCallback } from 'react';
import { X, Copy, Check, Crosshair, Navigation, Compass, Layers, Plus, Terminal } from 'lucide-react';
import { RuntimeMapEntity, BLUEPRINTS, STARTER_SHIP_CONFIG } from '../game/mapLoader';
import { InstancePlacement } from '../types/universe';

export interface DevInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: { x: number; y: number };
  zoom: number;
  activeEntities: RuntimeMapEntity[];
  selectedOriginId: string | null;
  onSelectOriginId: (id: string | null) => void;
  clickedWorldPos: { x: number; y: number } | null;
  cursorWorldPos: { x: number; y: number } | null;
  currentLocation: string;
  currentSystem: string;
  onQuickAddEntity?: (instance: InstancePlacement) => void;
}

export const DevInspector: React.FC<DevInspectorProps> = ({
  isOpen,
  onClose,
  playerPos,
  zoom,
  activeEntities,
  selectedOriginId,
  onSelectOriginId,
  clickedWorldPos,
  cursorWorldPos,
  currentLocation,
  currentSystem,
  onQuickAddEntity,
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>('mining_station_v1');
  const [customInstanceId, setCustomInstanceId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ruler' | 'export' | 'entities'>('ruler');

  // Origin entity for ruler
  const originEntity = useMemo(() => {
    if (!selectedOriginId) return null;
    return activeEntities.find((e) => e.id === selectedOriginId) || null;
  }, [activeEntities, selectedOriginId]);

  // Target point for ruler: prefer cursorWorldPos, fallback to clickedWorldPos
  const targetWorldPos = cursorWorldPos || clickedWorldPos;

  // Flight Time Ruler calculations
  const rulerCalculation = useMemo(() => {
    if (!originEntity || !targetWorldPos) return null;

    const dx = targetWorldPos.x - originEntity.x;
    const dy = targetWorldPos.y - originEntity.y;
    const distance = Math.hypot(dx, dy);

    // Read maxSpeed from starter_ship.json
    const maxSpeed = STARTER_SHIP_CONFIG.maxSpeed || 7.0;

    // Time = Distance / maxSpeed
    // At standard 60 ticks/s physics: sublight speed = maxSpeed * 60 world-units/sec
    const travelTimeSeconds = distance / (maxSpeed * 60);
    const minutes = Math.floor(travelTimeSeconds / 60);
    const seconds = Math.floor(travelTimeSeconds % 60);
    const formattedFlightTime = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

    // Angle in degrees (0 deg = East, 90 deg = South, -90 deg = North, 180 = West)
    let headingDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (headingDeg < 0) headingDeg += 360;

    return {
      distance: Math.round(distance),
      travelTimeSeconds: Math.round(travelTimeSeconds),
      formattedFlightTime,
      headingDeg: Math.round(headingDeg),
      maxSpeed,
      originName: originEntity.displayName,
      originCoords: { x: Math.round(originEntity.x), y: Math.round(originEntity.y) },
      targetCoords: { x: Math.round(targetWorldPos.x), y: Math.round(targetWorldPos.y) },
    };
  }, [originEntity, targetWorldPos]);

  // Generate formatted JSON snippet based on clicked coordinates or player coordinates
  const targetSpawnPos = clickedWorldPos || { x: Math.round(playerPos.x), y: Math.round(playerPos.y) };
  const effectiveId = customInstanceId.trim() || `${selectedTypeId}_${Math.abs(Math.round(targetSpawnPos.x))}_${Math.abs(Math.round(targetSpawnPos.y))}`;

  const jsonSnippet = useMemo(() => {
    const obj = {
      id: effectiveId,
      typeId: selectedTypeId,
      position: {
        x: Math.round(targetSpawnPos.x),
        y: Math.round(targetSpawnPos.y),
      },
    };
    return JSON.stringify(obj, null, 2);
  }, [effectiveId, selectedTypeId, targetSpawnPos]);

  const handleCopyJSON = useCallback(() => {
    navigator.clipboard.writeText(jsonSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [jsonSnippet]);

  const handleAddLive = useCallback(() => {
    if (onQuickAddEntity) {
      onQuickAddEntity({
        id: effectiveId,
        typeId: selectedTypeId,
        position: {
          x: Math.round(targetSpawnPos.x),
          y: Math.round(targetSpawnPos.y),
        },
      });
      setCustomInstanceId('');
    }
  }, [onQuickAddEntity, effectiveId, selectedTypeId, targetSpawnPos]);

  if (!isOpen) return null;

  return (
    <aside
      className="fixed top-14 right-4 z-50 w-96 max-h-[85vh] flex flex-col bg-[#07090e]/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-2xl text-slate-200 overflow-hidden text-xs select-none"
      aria-label="Developer Map Inspector"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold tracking-wide text-slate-100 uppercase">Dev Inspector</span>
          <span className="text-slate-500">·</span>
          <span className="font-mono text-[10px] text-amber-400">HOTKEY [ ` ]</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
          title="Close Inspector (` key)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Breadcrumb strip */}
      <div className="px-4 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between font-mono text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-cyan-400 font-semibold">{currentSystem}</span>
          <span>/</span>
          <span className="text-slate-200">{currentLocation}</span>
        </div>
        <div className="text-slate-500 tabular-nums shrink-0">
          ZOOM: {zoom.toFixed(2)}x
        </div>
      </div>

      {/* Live Coordinate Transformer Readout */}
      <div className="p-3 bg-slate-900/40 border-b border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            Coordinate Transformer
          </span>
          <span className="text-[10px] text-slate-500">Click canvas to sample</span>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/60">
            <div className="text-[9px] uppercase text-slate-400">Clicked World Coordinates</div>
            {clickedWorldPos ? (
              <div className="text-cyan-300 font-bold tabular-nums">
                X: {Math.round(clickedWorldPos.x).toLocaleString()}<br />
                Y: {Math.round(clickedWorldPos.y).toLocaleString()}
              </div>
            ) : (
              <div className="text-slate-600 italic">Click space canvas</div>
            )}
          </div>

          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/60">
            <div className="text-[9px] uppercase text-slate-400">Ship Camera Coordinates</div>
            <div className="text-slate-200 font-bold tabular-nums">
              X: {Math.round(playerPos.x).toLocaleString()}<br />
              Y: {Math.round(playerPos.y).toLocaleString()}
            </div>
          </div>
        </div>

        {cursorWorldPos && (
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 px-1 pt-0.5">
            <span>Cursor Probe:</span>
            <span className="text-cyan-400 tabular-nums">
              [{Math.round(cursorWorldPos.x)}, {Math.round(cursorWorldPos.y)}]
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 px-2 pt-1">
        <button
          onClick={() => setActiveTab('ruler')}
          className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium text-[11px] transition-colors whitespace-nowrap ${
            activeTab === 'ruler'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Flight Ruler
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium text-[11px] transition-colors whitespace-nowrap ${
            activeTab === 'export'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
          JSON Exporter
        </button>
        <button
          onClick={() => setActiveTab('entities')}
          className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 font-medium text-[11px] transition-colors whitespace-nowrap ${
            activeTab === 'entities'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Entities ({activeEntities.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-3 overflow-y-auto flex-1 space-y-3">
        {/* TAB 1: FLIGHT TIME RULER */}
        {activeTab === 'ruler' && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Select Origin Entity (Ruler Anchor)
              </label>
              <select
                value={selectedOriginId || ''}
                onChange={(e) => onSelectOriginId(e.target.value || null)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="">-- Click canvas entity or choose below --</option>
                {activeEntities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.displayName} ({ent.id}) [{Math.round(ent.x)}, {Math.round(ent.y)}]
                  </option>
                ))}
              </select>
            </div>

            {rulerCalculation ? (
              <div className="bg-slate-950/90 rounded border border-slate-800 p-2.5 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="font-semibold text-slate-200">{rulerCalculation.originName}</span>
                  <span className="font-mono text-cyan-400 font-bold tabular-nums">
                    {rulerCalculation.distance.toLocaleString()} units
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">Flight Time (Sublight)</span>
                    <span className="text-amber-400 font-bold text-sm tabular-nums">
                      {rulerCalculation.formattedFlightTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 block">Bearing / Heading</span>
                    <span className="text-slate-200 font-bold text-sm tabular-nums">
                      {rulerCalculation.headingDeg}°
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900 font-mono space-y-0.5">
                  <div className="flex justify-between">
                    <span>Base Vessel Speed:</span>
                    <span className="text-slate-300 font-bold tabular-nums">
                      {STARTER_SHIP_CONFIG.maxSpeed.toFixed(1)} u/tick ({STARTER_SHIP_CONFIG.maxSpeed * 60} u/s)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Formula:</span>
                    <span>Time = Distance / maxSpeed</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded border border-dashed border-slate-800 text-center text-slate-500 space-y-1">
                <Navigation className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                <p>Pick an origin entity above to activate vector ruler.</p>
                <p className="text-[10px] text-slate-600">
                  A dynamic guide line will track from the entity to your cursor in real time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: JSON EXPORTER */}
        {activeTab === 'export' && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Entity Blueprint Archetype
              </label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                {Object.values(BLUEPRINTS).map((bp) => (
                  <option key={bp.typeId} value={bp.typeId}>
                    {bp.displayName} ({bp.typeId}) - {bp.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Custom Instance ID (Optional)
              </label>
              <input
                type="text"
                placeholder={effectiveId}
                value={customInstanceId}
                onChange={(e) => setCustomInstanceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase font-semibold text-slate-400">
                  Generated JSON Placement Block
                </label>
                <span className="text-[10px] text-slate-500">For /src/data/maps/*.json</span>
              </div>
              <pre className="p-2.5 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto whitespace-pre">
                {jsonSnippet}
              </pre>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyJSON}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard!' : 'Copy JSON Block'}
              </button>

              {onQuickAddEntity && (
                <button
                  onClick={handleAddLive}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded transition-colors"
                  title="Spawn instance in current active session"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Spawn Live
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVE ENTITIES LIST */}
        {activeTab === 'entities' && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex justify-between">
              <span>Active Bubble Entities</span>
              <span className="font-mono tabular-nums">{activeEntities.length} Total</span>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {activeEntities.map((ent) => {
                const isSelected = ent.id === selectedOriginId;
                return (
                  <div
                    key={ent.id}
                    onClick={() => onSelectOriginId(ent.id)}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-100'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="truncate">{ent.displayName}</span>
                      <span
                        className="text-[9px] px-1 rounded uppercase font-mono"
                        style={{ color: ent.radarColor, border: `1px solid ${ent.radarColor}40` }}
                      >
                        {ent.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mt-1">
                      <span>ID: {ent.id}</span>
                      <span className="tabular-nums">[{Math.round(ent.x)}, {Math.round(ent.y)}]</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer status */}
      <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>Vessel Max Speed: {STARTER_SHIP_CONFIG.maxSpeed} u/tick</span>
        <span>Toggle: [ ` ]</span>
      </div>
    </aside>
  );
};
