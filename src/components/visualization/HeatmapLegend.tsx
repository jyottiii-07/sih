import React from 'react';
import { Card } from '../common/Card';
import { Info, Compass } from 'lucide-react';

export const HeatmapLegend: React.FC = () => {
  return (
    <Card
      title="Survey Grid & Heatmap Legend"
      icon={<Compass className="w-4 h-4 text-cyan-400" />}
      subtitle="Visual encoding of seafloor anomaly intensity"
    >
      <div className="space-y-4 text-xs">
        {/* Classification Markers */}
        <div className="space-y-2.5">
          {/* Normal */}
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#070b12] border border-emerald-500/20">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0 mt-0.5 border border-emerald-300" />
            <div>
              <span className="font-mono font-bold text-emerald-300 uppercase block">Normal Baseline</span>
              <p className="text-slate-400 text-[11px]">
                Nominal ambient seafloor magnetic readings. Background baseline survey zone.
              </p>
            </div>
          </div>

          {/* Weak */}
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#070b12] border border-amber-500/20">
            <div className="w-4 h-4 rounded-full bg-amber-500 shrink-0 mt-0.5 border border-amber-300 ring-2 ring-amber-500/30" />
            <div>
              <span className="font-mono font-bold text-amber-300 uppercase block">Weak Anomaly</span>
              <p className="text-slate-400 text-[11px]">
                Moderate magnetic gradient / fringe anomaly boundary detected by ML model.
              </p>
            </div>
          </div>

          {/* Strong */}
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#070b12] border border-red-500/30 bg-red-950/20">
            <div className="w-4 h-4 rounded-full bg-red-500 shrink-0 mt-0.5 border border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse" />
            <div>
              <span className="font-mono font-bold text-red-300 uppercase block">Strong Anomaly</span>
              <p className="text-slate-400 text-[11px]">
                High-confidence magnetic anomaly. Prime prospective target for seafloor metal deposits.
              </p>
            </div>
          </div>
        </div>

        {/* Survey Disclaimers */}
        <div className="p-3 bg-[#152238]/60 border border-[#1f324d] rounded-xl text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Info className="w-3.5 h-3.5" />
            <span>Scientific Notice:</span>
          </div>
          <p>
            1. Coordinate axes <span className="font-mono text-slate-200">X</span> and <span className="font-mono text-slate-200">Y</span> represent relative <strong>Local Survey Coordinates (Grid Units)</strong>, not geographic latitude/longitude.
          </p>
          <p>
            2. Anomaly likelihood scores and classifications are directly rendered from upstream ML engine outputs.
          </p>
        </div>
      </div>
    </Card>
  );
};
