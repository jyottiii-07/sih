import React from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Map, ArrowRight } from 'lucide-react';

interface CompactHeatmapCardProps {
  onOpenSurvey: () => void;
}

export const CompactHeatmapCard: React.FC<CompactHeatmapCardProps> = ({ onOpenSurvey }) => {
  const { readings, selectedReading, setSelectedReading } = useSensorData();

  const size = 280;
  const padding = 20;

  const maxCoord = React.useMemo(() => {
    if (readings.length === 0) return 50;
    const maxVal = Math.max(...readings.map((r) => Math.max(r.x, r.y, 0)));
    if (maxVal <= 50) return 50;
    return Math.ceil(maxVal / 10) * 10;
  }, [readings]);

  // Center coordinate mapping for placing the dot in the middle of each cell
  const toCellCenter = (val: number, step: number = 10) => {
    if (Math.abs((val % step) - step / 2) < 0.5) return val;
    const cellIdx = Math.min(Math.floor(val / step), Math.floor(maxCoord / step) - 1);
    return cellIdx * step + step / 2;
  };

  const mapCoord = (val: number, max: number = maxCoord) => {
    return padding + (val / (max || 1)) * (size - padding * 2);
  };

  const gridTicks: number[] = [];
  for (let t = 0; t <= maxCoord; t += 10) {
    gridTicks.push(t);
  }

  return (
    <Card
      title="Survey Grid Preview"
      icon={<Map className="w-4 h-4 text-slate-500" />}
      subtitle="Local Survey Coordinates (Grid Units)"
      action={
        <Button variant="ghost" size="sm" onClick={onOpenSurvey} icon={<ArrowRight className="w-3.5 h-3.5" />}>
          Full Grid
        </Button>
      }
    >
      <div className="flex flex-col items-center">
        {/* SVG Mini Grid Canvas */}
        <div className="relative w-full max-w-[280px] aspect-square bg-slate-50 rounded-lg border border-slate-200 overflow-hidden p-1 shadow-inner">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            <defs>
              <radialGradient id="miniStrongGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#e11d48" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Grid background lines */}
            {gridTicks.map((tick) => {
              const pos = mapCoord(tick);
              return (
                <g key={`grid-${tick}`}>
                  <line
                    x1={pos}
                    y1={padding}
                    x2={pos}
                    y2={size - padding}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={padding}
                    y1={pos}
                    x2={size - padding}
                    y2={pos}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </g>
              );
            })}

            {/* Centered Plotted Sensor Points */}
            {readings.map((r, i) => {
              const cxVal = toCellCenter(r.x);
              const cyVal = toCellCenter(r.y);
              const cx = mapCoord(cxVal);
              const cy = size - mapCoord(cyVal);
              const isSelected =
                selectedReading?.timestamp === r.timestamp &&
                Math.abs(toCellCenter(selectedReading.x) - cxVal) < 1 &&
                Math.abs(toCellCenter(selectedReading.y) - cyVal) < 1;

              let fillColor = '#10b981';
              let radius = 3.5;

              if (r.classification === 'strong_anomaly') {
                fillColor = '#e11d48';
                radius = 5.5;
              } else if (r.classification === 'weak_anomaly') {
                fillColor = '#f59e0b';
                radius = 4.5;
              }

              return (
                <g key={`pt-${i}`} className="cursor-pointer" onClick={() => setSelectedReading(r)}>
                  {/* Subtle Anomaly Aura */}
                  {r.classification === 'strong_anomaly' && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius * 2.5}
                      fill="url(#miniStrongGlow)"
                      className="pointer-events-none"
                    />
                  )}
                  {/* Sensor Reading Dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={fillColor}
                    stroke={isSelected ? '#2563eb' : '#ffffff'}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                </g>
              );
            })}
          </svg>

          {/* Coordinate axis tags */}
          <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-400 font-medium">(0, 0)</div>
          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400 font-medium">({maxCoord}, 0)</div>
          <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-400 font-medium">(0, {maxCoord})</div>
          <div className="absolute top-1 right-2 text-[9px] font-mono text-slate-400 font-medium">({maxCoord}, {maxCoord})</div>
        </div>

        {/* Legend pills */}
        <div className="flex items-center justify-center gap-3 mt-3 text-xs font-mono text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Weak
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            Strong
          </span>
        </div>
      </div>
    </Card>
  );
};
