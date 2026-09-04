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

  const maxCoord = React.useMemo(() => {
    if (readings.length === 0) return 50;
    const maxVal = Math.max(...readings.map((r) => Math.max(r.x, r.y, 0)));
    if (maxVal <= 50) return 50;
    return Math.ceil(maxVal / 10) * 10;
  }, [readings]);

  // Maps reading coordinate into the dead-center of its 10x10 cell square (e.g. 0 -> 5, 10 -> 15, 20 -> 25)
  const toCellCenter = useCallback(
    (val: number, step: number = 10): number => {
      // If already near center (e.g. 5, 15, 25, 35, 45)
      if (Math.abs((val % step) - step / 2) < 0.5) return val;
      // If on cell boundary (e.g. 0, 10, 20, 30, 40)
      const cellIdx = Math.min(Math.floor(val / step), Math.floor(maxCoord / step) - 1);
      return cellIdx * step + step / 2;
    },
    [maxCoord]
  );

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
    gridMaxX: maxCoord,
    gridMinY: 0,
    gridMaxY: maxCoord,
  });

  // Pan dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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
  const gridTicks = React.useMemo(() => {
    const step = maxCoord <= 60 ? 10 : 20;
    const ticks: number[] = [];
    for (let t = 0; t <= maxCoord; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [maxCoord]);

  // Filter plotted readings based on active layers
  const visibleReadings = readings.filter((r) => {
    if (r.classification === 'normal' && !activeLayers.normal) return false;
    if (r.classification === 'weak_anomaly' && !activeLayers.weak) return false;
    if (r.classification === 'strong_anomaly' && !activeLayers.strong) return false;
    return true;
  });

  return (
    <div className="relative w-full flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      {/* Top Header & Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white z-20">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base text-slate-900 tracking-tight">
              Seafloor Survey Grid
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              {visibleReadings.length} / {readings.length} Plotted
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cartesian Survey Coordinate Plane &bull; Spatial Anomaly Intensity
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
        className={`relative w-full aspect-square max-h-[640px] bg-slate-50 overflow-hidden select-none cursor-${
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
            transition: isDragging ? 'none' : 'transform 0.12s ease-out',
          }}
        >
          <defs>
            {/* Soft Transparent Gradient for Strong Anomalies */}
            <radialGradient id="strongGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#e11d48" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>

            {/* Clean Subtle Grid Pattern */}
            <pattern id="surveyGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Grid Area Background */}
          <rect
            x={padding}
            y={padding}
            width={viewBoxWidth - padding * 2}
            height={viewBoxHeight - padding * 2}
            fill="#ffffff"
            stroke="#e2e8f0"
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
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  strokeDasharray={tick % 20 === 0 ? 'none' : '3 3'}
                />
                {/* X Axis Label */}
                <text
                  x={svgX}
                  y={viewBoxHeight - padding + 18}
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                  fontWeight="500"
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
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  strokeDasharray={tick % 20 === 0 ? 'none' : '3 3'}
                />
                {/* Y Axis Label */}
                <text
                  x={padding - 12}
                  y={svgY + 4}
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="Inter, sans-serif"
                  fontWeight="500"
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
            fill="#475569"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            LOCAL SURVEY X-AXIS (GRID UNITS)
          </text>
          <text
            x={14}
            y={viewBoxHeight / 2}
            fill="#475569"
            fontSize="11"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
            textAnchor="middle"
            letterSpacing="0.5"
            transform={`rotate(-90 14 ${viewBoxHeight / 2})`}
          >
            LOCAL SURVEY Y-AXIS (GRID UNITS)
          </text>

          {/* Layer 1: Strong Anomaly Influence Aura */}
          {activeLayers.strong &&
            visibleReadings
              .filter((r) => r.classification === 'strong_anomaly')
              .map((r, idx) => {
                const cx = toCellCenter(r.x);
                const cy = toCellCenter(r.y);
                const { svgX, svgY } = mapToSvg(cx, cy);
                const haloRadius = 26 + r.anomaly_score * 12;
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

          {/* Layer 2: Centered Sensor Reading Markers */}
          {visibleReadings.map((r, idx) => {
            const cx = toCellCenter(r.x);
            const cy = toCellCenter(r.y);
            const { svgX, svgY } = mapToSvg(cx, cy);
            const isHovered = hoveredReading === r;
            const isSelected =
              selectedReading?.timestamp === r.timestamp &&
              Math.abs(toCellCenter(selectedReading.x) - cx) < 1 &&
              Math.abs(toCellCenter(selectedReading.y) - cy) < 1;

            let fillColor = '#10b981';
            let strokeColor = '#059669';
            let radius = 5;

            if (r.classification === 'strong_anomaly') {
              fillColor = '#e11d48';
              strokeColor = '#be123c';
              radius = 7;
            } else if (r.classification === 'weak_anomaly') {
              fillColor = '#f59e0b';
              strokeColor = '#d97706';
              radius = 6;
            }

            return (
              <g
                key={`point-${idx}`}
                className="cursor-pointer"
                onClick={(e) => handlePointClick(r, e)}
                onMouseEnter={() => setHoveredReading(r)}
                onMouseLeave={() => setHoveredReading(null)}
              >
                {/* Sensor Marker Dot */}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r={isHovered ? radius + 2 : radius}
                  fill={fillColor}
                  stroke={isSelected ? '#2563eb' : strokeColor}
                  strokeWidth={isSelected ? 2.5 : 1}
                  className="transition-all"
                />

                {/* Selected Crosshair Reticle */}
                {isSelected && (
                  <g className="pointer-events-none">
                    <circle
                      cx={svgX}
                      cy={svgY}
                      r={radius + 8}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={svgX - 16}
                      y1={svgY}
                      x2={svgX + 16}
                      y2={svgY}
                      stroke="#2563eb"
                      strokeWidth="1.2"
                    />
                    <line
                      x1={svgX}
                      y1={svgY - 16}
                      x2={svgX}
                      y2={svgY + 16}
                      stroke="#2563eb"
                      strokeWidth="1.2"
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
            className="absolute z-30 pointer-events-none p-3 bg-white border border-slate-200 rounded-lg shadow-lg text-xs space-y-1.5 min-w-[200px]"
            style={{
              left: Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 600) - 220),
              top: Math.max(tooltipPos.y - 120, 15),
            }}
          >
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
              <span className="font-mono font-bold text-slate-900">
                Cell [{Math.floor(toCellCenter(hoveredReading.x)/10)}, {Math.floor(toCellCenter(hoveredReading.y)/10)}] &bull; ({toCellCenter(hoveredReading.x).toFixed(0)}, {toCellCenter(hoveredReading.y).toFixed(0)})
              </span>
              <AnomalyBadge classification={hoveredReading.classification} size="sm" showIcon={false} />
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs font-mono">
              <span className="text-slate-500">Mag Signal:</span>
              <span className="text-blue-700 font-bold text-right">
                {hoveredReading.magnetic_signal.toFixed(2)}
              </span>

              <span className="text-slate-500">ML Score:</span>
              <span className="text-slate-900 font-bold text-right">
                {hoveredReading.anomaly_score.toFixed(2)}
              </span>

              <span className="text-slate-500">Bx/By/Bz:</span>
              <span className="text-slate-700 text-right">
                {hoveredReading.bx.toFixed(1)}, {hoveredReading.by.toFixed(1)}, {hoveredReading.bz.toFixed(1)}
              </span>
            </div>

            <p className="text-[11px] text-blue-600 pt-1 border-t border-slate-100 text-center font-medium">
              Click marker to inspect details
            </p>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 font-mono">
        <div className="flex items-center gap-3">
          <span>
            EXTENTS: <strong className="text-slate-800">[0, {maxCoord}] × [0, {maxCoord}]</strong>
          </span>
          <span>&bull;</span>
          <span>
            SELECTION:{' '}
            {selectedReading ? (
              <strong className="text-blue-600 font-bold">
                Cell [{Math.floor(toCellCenter(selectedReading.x)/10)}, {Math.floor(toCellCenter(selectedReading.y)/10)}] @ ({toCellCenter(selectedReading.x).toFixed(0)}, {toCellCenter(selectedReading.y).toFixed(0)})
              </strong>
            ) : (
              <span className="text-slate-400">None</span>
            )}
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-sans">
          Drag to pan &bull; Click point to inspect
        </div>
      </div>
    </div>
  );
};
