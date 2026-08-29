import React, { useState, useRef, useCallback } from 'react';
import { SensorReading } from '../../types/sensor';
import { useSensorData } from '../../hooks/useSensorData';
import { useSurveyGrid } from '../../hooks/useSurveyGrid';
import { GridControls } from './GridControls';
import { AnomalyBadge } from '../common/Badge';

interface SurveyHeatmapProps {
  onSelectReading?: (reading: SensorReading) => void;
}

export const SurveyHeatmap: React.FC<SurveyHeatmapProps> = ({ onSelectReading }) => {
  const { readings, selectedReading, setSelectedReading } = useSensorData();
  const [hoveredReading, setHoveredReading] = useState<SensorReading | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    config,
    zoom,
    pan,
    setPan,
    mapToSvg,
    zoomIn,
    zoomOut,
    resetView,
    centerOnPoint,
    activeLayers,
    toggleLayer,
  } = useSurveyGrid({
    viewBoxWidth: 640,
    viewBoxHeight: 640,
    padding: 50,
    gridMinX: 0,
    gridMaxX: 60,
    gridMinY: 0,
    gridMaxY: 60,
  });

  // Pan dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Primary click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePointClick = (reading: SensorReading, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedReading(reading);
    if (onSelectReading) onSelectReading(reading);
  };

  // Find highest anomaly point to center
  const centerOnPeakAnomaly = useCallback(() => {
    if (readings.length === 0) return;
    const peak = readings.reduce((prev, curr) =>
      curr.anomaly_score > prev.anomaly_score ? curr : prev
    );
    centerOnPoint(peak);
    setSelectedReading(peak);
  }, [readings, centerOnPoint, setSelectedReading]);

  const { viewBoxWidth, viewBoxHeight, padding } = config;
  const gridTicks = [0, 10, 20, 30, 40, 50, 60];

  // Filter plotted readings based on active layers
  const visibleReadings = readings.filter((r) => {
    if (r.classification === 'normal' && !activeLayers.normal) return false;
    if (r.classification === 'weak_anomaly' && !activeLayers.weak) return false;
    if (r.classification === 'strong_anomaly' && !activeLayers.strong) return false;
    return true;
  });

  return (
    <div className="relative w-full flex flex-col bg-[#0e1626]/90 border border-[#1f324d] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Header & Floating Controls */}
      <div className="p-4 border-b border-[#1f324d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a101b]/80 z-20">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base text-slate-100 tracking-wide">
              Seafloor Survey Grid (Heatmap)
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#152238] text-cyan-400 border border-cyan-500/30">
              {visibleReadings.length} / {readings.length} PLOTTED
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Cartesian Survey Coordinate Plane &bull; Spatial Anomaly Intensity Visualization
          </p>
        </div>

        <GridControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetView}
          activeLayers={activeLayers}
          onToggleLayer={toggleLayer}
          onCenterPeak={centerOnPeakAnomaly}
        />
      </div>

      {/* Interactive SVG Survey Viewport */}
      <div
        ref={containerRef}
        className={`relative w-full aspect-square max-h-[660px] bg-[#070b12] overflow-hidden select-none cursor-${
          isDragging ? 'grabbing' : 'crosshair'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredReading(null);
        }}
      >
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: `${viewBoxWidth / 2}px ${viewBoxHeight / 2}px`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {/* Radial Glow Gradient for Strong Anomalies */}
            <radialGradient id="strongGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Radial Glow Gradient for Weak Anomalies */}
            <radialGradient id="weakGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Bathymetric Grid Pattern */}
            <pattern id="surveyGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#111c30" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Grid Area Background */}
          <rect
            x={padding}
            y={padding}
            width={viewBoxWidth - padding * 2}
            height={viewBoxHeight - padding * 2}
            fill="#090f1a"
            stroke="#1f324d"
            strokeWidth="1.5"
          />

          <rect
            x={padding}
            y={padding}
            width={viewBoxWidth - padding * 2}
            height={viewBoxHeight - padding * 2}
            fill="url(#surveyGrid)"
          />

          {/* Gridlines & Axis Ticks */}
          {gridTicks.map((tick) => {
            const { svgX } = mapToSvg(tick, 0);
            const { svgY } = mapToSvg(0, tick);

            return (
              <g key={`grid-axis-${tick}`}>
                {/* Vertical gridline (X tick) */}
                <line
                  x1={svgX}
                  y1={padding}
                  x2={svgX}
                  y2={viewBoxHeight - padding}
                  stroke="#1c2c47"
                  strokeWidth={tick % 20 === 0 ? '1.2' : '0.6'}
                  strokeDasharray={tick % 20 === 0 ? 'none' : '3 3'}
                />
                {/* X Axis Label */}
                <text
                  x={svgX}
                  y={viewBoxHeight - padding + 18}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                >
                  {tick}
                </text>

                {/* Horizontal gridline (Y tick) */}
                <line
                  x1={padding}
                  y1={svgY}
                  x2={viewBoxWidth - padding}
                  y2={svgY}
                  stroke="#1c2c47"
                  strokeWidth={tick % 20 === 0 ? '1.2' : '0.6'}
                  strokeDasharray={tick % 20 === 0 ? 'none' : '3 3'}
                />
                {/* Y Axis Label */}
                <text
                  x={padding - 12}
                  y={svgY + 3.5}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="end"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Axis Titles */}
          <text
            x={viewBoxWidth / 2}
            y={viewBoxHeight - 12}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="Outfit"
            fontWeight="600"
            textAnchor="middle"
            letterSpacing="1"
          >
            LOCAL SURVEY X-AXIS (GRID UNITS)
          </text>
          <text
            x={14}
            y={viewBoxHeight / 2}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="Outfit"
            fontWeight="600"
            textAnchor="middle"
            letterSpacing="1"
            transform={`rotate(-90 14 ${viewBoxHeight / 2})`}
          >
            LOCAL SURVEY Y-AXIS (GRID UNITS)
          </text>

          {/* Layer 1: Strong Anomaly Halo Heatmap Layer */}
          {activeLayers.strong &&
            visibleReadings
              .filter((r) => r.classification === 'strong_anomaly')
              .map((r, idx) => {
                const { svgX, svgY } = mapToSvg(r.x, r.y);
                const haloRadius = 24 + r.anomaly_score * 16;
                return (
                  <circle
                    key={`halo-${idx}`}
                    cx={svgX}
                    cy={svgY}
                    r={haloRadius}
                    fill="url(#strongGlow)"
                    className="pointer-events-none"
                  />
                );
              })}

          {/* Layer 2: Plotted Sensor Reading Markers */}
          {visibleReadings.map((r, idx) => {
            const { svgX, svgY } = mapToSvg(r.x, r.y);
            const isHovered = hoveredReading === r;
            const isSelected =
              selectedReading?.timestamp === r.timestamp &&
              selectedReading?.x === r.x &&
              selectedReading?.y === r.y;

            let fillColor = '#10b981';
            let strokeColor = '#059669';
            let radius = 4.5;

            if (r.classification === 'strong_anomaly') {
              fillColor = '#ef4444';
              strokeColor = '#fca5a5';
              radius = 7.5;
            } else if (r.classification === 'weak_anomaly') {
              fillColor = '#f59e0b';
              strokeColor = '#fde68a';
              radius = 5.5;
            }

            return (
              <g
                key={`point-${idx}`}
                className="cursor-pointer transition-transform duration-100"
                onClick={(e) => handlePointClick(r, e)}
                onMouseEnter={() => setHoveredReading(r)}
                onMouseLeave={() => setHoveredReading(null)}
              >
                {/* Outer pulsing ring for weak/strong anomalies */}
                {r.classification === 'strong_anomaly' && (
                  <circle
                    cx={svgX}
                    cy={svgY}
                    r={radius + 5}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    opacity="0.6"
                    className="animate-ping-slow"
                  />
                )}

                {/* Primary Data Dot */}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={isHovered ? radius + 2.5 : radius}
                  fill={fillColor}
                  stroke={isSelected ? '#00f2fe' : strokeColor}
                  strokeWidth={isSelected ? 2.5 : 1}
                  className="transition-all"
                  style={{
                    filter:
                      r.classification === 'strong_anomaly'
                        ? 'drop-shadow(0 0 6px rgba(239,68,68,0.8))'
                        : undefined,
                  }}
                />

                {/* Selected Crosshair Reticle */}
                {isSelected && (
                  <g className="pointer-events-none">
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r={radius + 8}
                      fill="none"
                      stroke="#00f2fe"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={svgX - 18}
                      y1={svgY}
                      x2={svgX + 18}
                      y2={svgY}
                      stroke="#00f2fe"
                      strokeWidth="1"
                    />
                    <line
                      x1={svgX}
                      y1={svgY - 18}
                      x2={svgX}
                      y2={svgY + 18}
                      stroke="#00f2fe"
                      strokeWidth="1"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredReading && (
          <div
            className="absolute z-30 pointer-events-none p-3 bg-[#0a101b]/95 border border-[#2e4d75] rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-1.5 min-w-[200px]"
            style={{
              left: Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 600) - 220),
              top: Math.max(tooltipPos.y - 120, 15),
            }}
          >
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#1f324d]">
              <span className="font-mono font-bold text-cyan-300">
                Coords: ({hoveredReading.x.toFixed(1)}, {hoveredReading.y.toFixed(1)})
              </span>
              <AnomalyBadge classification={hoveredReading.classification} size="sm" showIcon={false} />
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono">
              <span className="text-slate-400">Mag Signal:</span>
              <span className="text-cyan-200 font-bold text-right">
                {hoveredReading.magnetic_signal.toFixed(2)}
              </span>

              <span className="text-slate-400">ML Score:</span>
              <span className="text-slate-100 font-bold text-right">
                {hoveredReading.anomaly_score.toFixed(2)}
              </span>

              <span className="text-slate-400">Bx / By / Bz:</span>
              <span className="text-slate-300 text-right">
                {hoveredReading.bx.toFixed(1)}, {hoveredReading.by.toFixed(1)}, {hoveredReading.bz.toFixed(1)}
              </span>
            </div>

            <p className="text-[10px] text-cyan-400/80 pt-1 border-t border-[#1f324d]/60 text-center">
              Click marker to inspect in detail drawer
            </p>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="p-3 bg-[#0a101b] border-t border-[#1f324d] flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 font-mono">
        <div className="flex items-center gap-3">
          <span>
            SURVEY EXTENTS: <strong className="text-slate-200">[0, 60] × [0, 60]</strong>
          </span>
          <span>&bull;</span>
          <span>
            SELECTION:{' '}
            {selectedReading ? (
              <strong className="text-cyan-300">
                ({selectedReading.x}, {selectedReading.y})
              </strong>
            ) : (
              <span className="text-slate-500">None</span>
            )}
          </span>
        </div>

        <div className="text-[11px] text-slate-400">
          Tip: Drag canvas to pan &bull; Click marker to lock
        </div>
      </div>
    </div>
  );
};
