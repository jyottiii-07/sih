import React from 'react';
import { SensorReading } from '../../types/sensor';
import { AnomalyBadge } from './Badge';
import { Button } from './Button';
import { X, Copy, Check, Info, Radio, Sparkles, Navigation } from 'lucide-react';

interface ReadingDetailDrawerProps {
  reading: SensorReading | null;
  onClose: () => void;
  onCenterInGrid?: (reading: SensorReading) => void;
}

export const ReadingDetailDrawer: React.FC<ReadingDetailDrawerProps> = ({
  reading,
  onClose,
  onCenterInGrid,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!reading) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(reading, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAnomalyBarColor = (score: number) => {
    if (score >= 0.8) return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]';
    if (score >= 0.45) return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
    return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a101b]/98 backdrop-blur-xl border-l border-[#1f324d] shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#1f324d] flex items-center justify-between gap-3 bg-[#0e1626]/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-mono font-bold text-sm text-slate-100 truncate">
                {reading.sensor_id}
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                ({reading.x}, {reading.y})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {new Date(reading.timestamp).toUTCString()}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#152238] rounded-lg transition-colors"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        {/* ML Anomaly Analysis Panel */}
        <div className="p-4 rounded-xl bg-gradient-to-b from-[#152238]/90 to-[#0e1626]/90 border border-[#2e4d75]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upstream ML Analysis</span>
            </div>
            <AnomalyBadge classification={reading.classification} size="sm" />
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Anomaly Likelihood Score</span>
                <span className="font-mono font-bold text-sm text-slate-100">
                  {reading.anomaly_score.toFixed(2)} / 1.00
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getAnomalyBarColor(
                    reading.anomaly_score
                  )}`}
                  style={{ width: `${Math.min(100, Math.max(2, reading.anomaly_score * 100))}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-[#070b12]/60 p-2.5 rounded-lg border border-[#1f324d]">
              <span className="text-slate-300 font-medium">Classification: </span>
              <span className="font-mono text-cyan-300 capitalize">{reading.classification.replace('_', ' ')}</span>
              <p className="mt-1 text-[10px] text-slate-500">
                Determined by upstream ML model. Frontend performs zero inference recalculation.
              </p>
            </div>
          </div>
        </div>

        {/* Raw Sensor Telemetry Panel */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Raw Sensor Telemetry (Locked Contract)</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-[#0e1626] border border-[#1f324d] rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Survey X-Coord</span>
              <span className="font-mono font-bold text-sm text-slate-100">{reading.x.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">grid units</span></span>
            </div>
            <div className="p-3 bg-[#0e1626] border border-[#1f324d] rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Survey Y-Coord</span>
              <span className="font-mono font-bold text-sm text-slate-100">{reading.y.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">grid units</span></span>
            </div>

            <div className="p-3 bg-[#0e1626] border border-[#1f324d] rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Bx Vector</span>
              <span className="font-mono font-bold text-sm text-sky-400">{reading.bx.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-[#0e1626] border border-[#1f324d] rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">By Vector</span>
              <span className="font-mono font-bold text-sm text-indigo-400">{reading.by.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-[#0e1626] border border-[#1f324d] rounded-lg">
              <span className="text-slate-400 block text-[10px] uppercase font-mono">Bz Vector</span>
              <span className="font-mono font-bold text-sm text-purple-400">{reading.bz.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-[#0e1626] border border-cyan-500/40 rounded-lg bg-cyan-950/20">
              <span className="text-cyan-400 block text-[10px] uppercase font-mono">Magnetic Signal</span>
              <span className="font-mono font-bold text-sm text-cyan-300">{reading.magnetic_signal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Scientific Disclaimers */}
        <div className="p-3 rounded-lg bg-[#0e1626]/80 border border-[#1f324d] flex items-start gap-2.5 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-slate-300">Provisional Survey Disclaimers:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px] text-slate-400">
              <li>X/Y are local survey Cartesian coordinates, not geographic GPS coordinates.</li>
              <li>Magnetic components (Bx, By, Bz) are expressed in provisional survey units pending physical calibration.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[#1f324d] bg-[#0e1626]/90 flex items-center gap-2">
        {onCenterInGrid && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            icon={<Navigation className="w-3.5 h-3.5" />}
            onClick={() => onCenterInGrid(reading)}
          >
            Locate in Grid
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          onClick={handleCopyJson}
        >
          {copied ? 'JSON Copied' : 'Copy JSON'}
        </Button>
      </div>
    </div>
  </>
);
};
