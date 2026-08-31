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
    if (readings.length === 0) return 60;
    const maxVal = Math.max(...readings.map((r) => Math.max(r.x, r.y, 0)));
    return Math.max(60, Math.ceil(maxVal / 10) * 10);
  }, [readings]);

  const mapCoord = (val: number, max: number = maxCoord) => {
    return padding + (val / (max || 1)) * (size - padding * 2);
  };

  const gridTicks = [0, maxCoord * 0.25, maxCoord * 0.5, maxCoord * 0.75, maxCoord].map((t) => Math.round(t));

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

            {/* Plotted points */}
            {readings.map((r, i) => {
              const cx = mapCoord(r.x);
              const cy = size - mapCoord(r.y);
              const isSelected = selectedReading?.timestamp === r.timestamp && selectedReading?.x === r.x && selectedReading?.y === r.y;

              let fillColor = '#10b981';
              let radius = 2.5;

              if (r.classification === 'strong_anomaly') {
                fillColor = '#e11d48';
                radius = 5;
              } else if (r.classification === 'weak_anomaly') {
                fillColor = '#f59e0b';
                radius = 3.5;
              }

              return (
                <g key={`pt-${i}`} className="cursor-pointer" onClick={() => setSelectedReading(r)}>
                  {r.classification === 'strong_anomaly' && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius * 1.8}
                      fill="#e11d48"
                      fillOpacity="0.15"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={fillColor}
                    stroke={isSelected ? '#2563eb' : '#ffffff'}
                    strokeWidth={isSelected ? 2 : 0.75}
                  />
                </g>
              );
            })}
          </svg>

          {/* Coordinate axis tags */}
          <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-400">(0, 0)</div>
          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400">(60, 0)</div>
          <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-400">(0, 60)</div>
          <div className="absolute top-1 right-2 text-[9px] font-mono text-slate-400">(60, 60)</div>
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
