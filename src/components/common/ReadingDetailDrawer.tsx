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
    if (score >= 0.8) return 'bg-rose-600';
    if (score >= 0.45) return 'bg-amber-500';
    return 'bg-emerald-600';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
              <Radio className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-sm text-slate-900 truncate">
                  {reading.sensor_id}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  ({reading.x}, {reading.y})
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                {new Date(reading.timestamp).toUTCString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* ML Anomaly Analysis Panel */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Upstream ML Analysis</span>
              </div>
              <AnomalyBadge classification={reading.classification} size="sm" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-600 font-medium">Anomaly Likelihood Score</span>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {reading.anomaly_score.toFixed(2)} / 1.00
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getAnomalyBarColor(
                      reading.anomaly_score
                    )}`}
                    style={{ width: `${Math.min(100, Math.max(2, reading.anomaly_score * 100))}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                <span className="text-slate-700 font-medium">Classification: </span>
                <span className="font-mono text-slate-900 capitalize font-semibold">{reading.classification.replace('_', ' ')}</span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Direct output from upstream ML model. No client-side recalculation.
                </p>
              </div>
            </div>
          </div>

          {/* Raw Sensor Telemetry Panel */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-slate-500" />
              <span>Raw Sensor Telemetry (Locked Contract)</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px] uppercase font-mono">Survey X-Coord</span>
                <span className="font-mono font-bold text-sm text-slate-900">{reading.x.toFixed(1)} <span className="text-xs text-slate-400 font-normal">units</span></span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px] uppercase font-mono">Survey Y-Coord</span>
                <span className="font-mono font-bold text-sm text-slate-900">{reading.y.toFixed(1)} <span className="text-xs text-slate-400 font-normal">units</span></span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px] uppercase font-mono">Bx Vector</span>
                <span className="font-mono font-bold text-sm text-slate-900">{reading.bx.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px] uppercase font-mono">By Vector</span>
                <span className="font-mono font-bold text-sm text-slate-900">{reading.by.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block text-[11px] uppercase font-mono">Bz Vector</span>
                <span className="font-mono font-bold text-sm text-slate-900">{reading.bz.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                <span className="text-blue-700 block text-[11px] uppercase font-mono font-medium">Magnetic Signal</span>
                <span className="font-mono font-bold text-sm text-blue-900">{reading.magnetic_signal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Scientific Disclaimers */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-800">Provisional Survey Disclaimers:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-slate-500">
                <li>X/Y are local survey Cartesian coordinates, not GPS coordinates.</li>
                <li>Magnetic measurements are expressed in provisional survey units.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
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
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopyJson}
          >
            {copied ? 'Copied' : 'Copy JSON'}
          </Button>
        </div>
      </div>
    </>
  );
};
