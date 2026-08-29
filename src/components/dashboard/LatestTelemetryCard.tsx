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
        <div className="py-8 text-center text-slate-500 text-xs">Waiting for telemetry packet...</div>
      </Card>
    );
  }

  // Calculate percentage fills for Bx, By, Bz assuming nominal normalized range ~ 2.0
  const normBar = (val: number) => Math.min(100, Math.max(5, (Math.abs(val) / 2.0) * 100));

  return (
    <Card
      title="Latest Sensor Telemetry"
      icon={<Radio className="w-4 h-4 text-cyan-400 animate-pulse" />}
      subtitle={`Node: ${reading.sensor_id} • UTC: ${new Date(reading.timestamp).toLocaleTimeString()}`}
      action={<AnomalyBadge classification={reading.classification} size="sm" />}
      className="relative"
    >
      <div className="space-y-4">
        {/* ML Anomaly Score Callout */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#152238] to-[#0e1626] border border-[#2e4d75] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950/80 rounded-lg border border-cyan-500/40 text-cyan-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-300 block">
                Upstream ML Anomaly Score
              </span>
              <span className="text-xs text-slate-400">Categorized by inference engine</span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl font-bold text-slate-100">
              {reading.anomaly_score.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">/ 1.00 max</span>
          </div>
        </div>

        {/* Raw Coordinate & Magnetic Signal */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 bg-[#070b12] border border-[#1f324d] rounded-lg">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Survey Coords (X, Y)</span>
            <span className="font-mono font-bold text-slate-100 text-sm">
              ({reading.x.toFixed(1)}, {reading.y.toFixed(1)})
            </span>
          </div>

          <div className="p-2.5 bg-[#070b12] border border-cyan-500/40 rounded-lg bg-cyan-950/20 col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 text-[10px] uppercase font-mono">Magnetic Signal</span>
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="font-mono font-bold text-cyan-200 text-base">
              {reading.magnetic_signal.toFixed(2)}{' '}
              <span className="text-[10px] font-normal text-slate-400">survey units</span>
            </span>
          </div>
        </div>

        {/* Vector Component Gauges */}
        <div className="space-y-2 pt-1 border-t border-[#1f324d]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="uppercase text-[10px] font-mono tracking-wider">Magnetic Vector Components (Bx, By, Bz)</span>
            <span className="text-[10px] text-slate-500 font-mono">Provisional Units</span>
          </div>

          {/* Bx */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-sky-400 font-semibold">Bx Vector:</span>
              <span className="text-slate-200">{reading.bx.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${normBar(reading.bx)}%` }} />
            </div>
          </div>

          {/* By */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-indigo-400 font-semibold">By Vector:</span>
              <span className="text-slate-200">{reading.by.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${normBar(reading.by)}%` }} />
            </div>
          </div>

          {/* Bz */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-purple-400 font-semibold">Bz Vector:</span>
              <span className="text-slate-200">{reading.bz.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${normBar(reading.bz)}%` }} />
            </div>
          </div>
        </div>

        {onInspect && (
          <button
            onClick={onInspect}
            className="w-full py-2 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-[#152238] hover:bg-[#1c2c47] border border-[#1f324d] hover:border-cyan-500/40 rounded-lg transition-all"
          >
            Inspect Full Payload in Drawer →
          </button>
        )}
      </div>
    </Card>
  );
};
