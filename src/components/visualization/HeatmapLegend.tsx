import React from 'react';
import { Card } from '../common/Card';
import { Info, Compass } from 'lucide-react';

export const HeatmapLegend: React.FC = () => {
  return (
    <Card
      title="Survey Grid Legend"
      icon={<Compass className="w-4 h-4 text-slate-500" />}
      subtitle="Visual encoding of seafloor anomaly intensity"
    >
      <div className="space-y-4 text-xs">
        {/* Classification Markers */}
        <div className="space-y-2.5">
          {/* Normal */}
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">Normal Baseline</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Nominal ambient seafloor magnetic readings. Background baseline survey zone.
              </p>
            </div>
          </div>

          {/* Weak */}
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">Weak Anomaly</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Moderate magnetic gradient / fringe anomaly boundary detected by ML model.
              </p>
            </div>
          </div>

          {/* Strong */}
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900 block">Strong Anomaly</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                High-confidence magnetic anomaly. Prime prospective target for seafloor metal deposits.
              </p>
            </div>
          </div>
        </div>

        {/* Survey Disclaimers */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Scientific Notice:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            1. Coordinate axes <span className="font-mono text-slate-700 font-medium">X</span> and <span className="font-mono text-slate-700 font-medium">Y</span> represent relative <strong>Local Survey Coordinates (Grid Units)</strong>, not geographic GPS coordinates.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            2. Anomaly likelihood scores and classifications are directly rendered from upstream ML engine outputs.
          </p>
        </div>
      </div>
    </Card>
  );
};
