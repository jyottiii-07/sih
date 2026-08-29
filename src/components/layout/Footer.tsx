import React from 'react';
import { ShieldCheck, Info, Database, Compass } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#1f324d] bg-[#070b12]/90 mt-12 py-6 px-4 sm:px-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Mission & Organization */}
        <div className="flex items-center gap-2 text-slate-400">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>
            National Centre for Polar and Ocean Research (NCPOR) &bull; Ministry of Earth Sciences (MoES)
          </span>
        </div>

        {/* Scientific Disclaimers & Assumptions */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Local Survey Coordinates (Grid Units)</span>
          </span>
          <span>&bull;</span>
          <span>Provisional Magnetic Units</span>
          <span>&bull;</span>
          <span className="flex items-center gap-1 text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Locked 10-Field Contract</span>
          </span>
        </div>

        {/* Telemetry Architecture */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>Data-Agnostic Adapter Active</span>
        </div>
      </div>
    </footer>
  );
};
