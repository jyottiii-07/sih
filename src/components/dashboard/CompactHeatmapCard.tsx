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

  // 300x300 mini canvas coordinate mapper
  const size = 280;
  const padding = 20;
  const mapCoord = (val: number, max: number = 60) => {
    return padding + (val / max) * (size - padding * 2);
  };

  return (
    <Card
      title="Seafloor Survey Grid Preview"
      icon={<Map className="w-4 h-4" />}
      subtitle="Local Survey Coordinates (Grid Units)"
      action={
        <Button variant="ghost" size="sm" onClick={onOpenSurvey} icon={<ArrowRight className="w-3.5 h-3.5" />}>
          Full Grid
        </Button>
      }
    >
      <div className="flex flex-col items-center">
        {/* SVG Mini Grid Canvas */}
        <div className="relative w-full max-w-[280px] aspect-square bg-[#070b12] rounded-xl border border-[#1f324d] overflow-hidden p-1 shadow-inner">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            {/* Grid background lines */}
            {[0, 15, 30, 45, 60].map((tick) => {
              const pos = mapCoord(tick);
              return (
                <g key={`grid-${tick}`}>
                  <line
                    x1={pos}
                    y1={padding}
                    x2={pos}
                    y2={size - padding}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <line
                    x1={padding}
                    y1={pos}
                    x2={size - padding}
                    y2={pos}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </g>
              );
            })}

            {/* Plotted points */}
            {readings.map((r, i) => {
              const cx = mapCoord(r.x);
              const cy = size - mapCoord(r.y); // Invert Y for cartesian
              const isSelected = selectedReading?.timestamp === r.timestamp && selectedReading?.x === r.x && selectedReading?.y === r.y;

              let fillColor = '#10b981';
              let radius = 2.5;

              if (r.classification === 'strong_anomaly') {
                fillColor = '#ef4444';
                radius = 5.5;
              } else if (r.classification === 'weak_anomaly') {
                fillColor = '#f59e0b';
                radius = 4;
              }

              return (
                <g key={`pt-${i}`} className="cursor-pointer" onClick={() => setSelectedReading(r)}>
                  {r.classification === 'strong_anomaly' && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius * 2}
                      fill="#ef4444"
                      fillOpacity="0.25"
                      className="animate-pulse"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={fillColor}
                    stroke={isSelected ? '#00f2fe' : '#070b12'}
                    strokeWidth={isSelected ? 1.5 : 0.5}
                  />
                </g>
              );
            })}
          </svg>

          {/* Coordinate axis tags */}
          <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500">(0, 0)</div>
          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">(60, 0)</div>
          <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">(0, 60)</div>
          <div className="absolute top-1 right-2 text-[9px] font-mono text-slate-500">(60, 60)</div>
        </div>

        {/* Legend pills */}
        <div className="flex items-center justify-center gap-3 mt-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Normal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Weak Anomaly
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Strong Anomaly
          </span>
        </div>
      </div>
    </Card>
  );
};
