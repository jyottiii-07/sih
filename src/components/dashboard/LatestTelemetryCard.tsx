import React from 'react';
import { SensorReading } from '../../types/sensor';
import { Card } from '../common/Card';
import { AnomalyBadge } from '../common/Badge';
import { Radio, Zap, Sparkles } from 'lucide-react';

interface LatestTelemetryCardProps {
  reading: SensorReading | null;
  onInspect?: () => void;
}

export const LatestTelemetryCard: React.FC<LatestTelemetryCardProps> = ({ reading, onInspect }) => {
  if (!reading) {
    return (
      <Card title="Active Telemetry Packet" icon={<Radio className="w-4 h-4" />}>
        <div className="py-8 text-center text-slate-400 text-xs">Waiting for telemetry packet...</div>
      </Card>
    );
  }

  const normBar = (val: number) => Math.min(100, Math.max(5, (Math.abs(val) / 2.0) * 100));

  return (
    <Card
      title="Latest Sensor Telemetry"
      icon={<Radio className="w-4 h-4 text-blue-600" />}
      subtitle={`Node: ${reading.sensor_id} • UTC: ${new Date(reading.timestamp).toLocaleTimeString()}`}
      action={<AnomalyBadge classification={reading.classification} size="sm" />}
    >
      <div className="space-y-4">
        {/* ML Anomaly Score Callout */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-blue-600 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-700 block">
                Upstream ML Anomaly Score
              </span>
              <span className="text-xs text-slate-500">Output by upstream inference engine</span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl font-bold text-slate-900">
              {reading.anomaly_score.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-500 block font-mono">/ 1.00</span>
          </div>
        </div>

        {/* Raw Coordinate & Magnetic Signal */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <span className="text-slate-500 text-[11px] uppercase font-mono block">Survey Coords (X, Y)</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              ({reading.x.toFixed(1)}, {reading.y.toFixed(1)})
            </span>
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 text-[11px] uppercase font-mono font-medium">Magnetic Signal</span>
              <Zap className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="font-mono font-bold text-blue-900 text-base">
              {reading.magnetic_signal.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-500">survey units</span>
            </span>
          </div>
        </div>

        {/* Vector Component Gauges */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="uppercase text-[11px] font-mono font-medium tracking-wider">Magnetic Vector Components (Bx, By, Bz)</span>
            <span className="text-[11px] text-slate-400 font-mono">Provisional Units</span>
          </div>

          {/* Bx */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">Bx:</span>
              <span className="text-slate-900 font-semibold">{reading.bx.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${normBar(reading.bx)}%` }} />
            </div>
          </div>

          {/* By */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">By:</span>
              <span className="text-slate-900 font-semibold">{reading.by.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${normBar(reading.by)}%` }} />
            </div>
          </div>

          {/* Bz */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">Bz:</span>
              <span className="text-slate-900 font-semibold">{reading.bz.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${normBar(reading.bz)}%` }} />
            </div>
          </div>
        </div>

        {onInspect && (
          <button
            onClick={onInspect}
            className="w-full py-2 text-xs font-medium text-blue-600 hover:text-blue-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors text-center"
          >
            Inspect Full Payload in Drawer &rarr;
          </button>
        )}
      </div>
    </Card>
  );
};
