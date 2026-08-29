import React from 'react';
import { useTelemetryStats } from '../../hooks/useTelemetryStats';
import { Card } from '../common/Card';
import { PieChart, ShieldCheck, AlertTriangle, Flame } from 'lucide-react';

export const AnomalyDistributionCard: React.FC = () => {
  const { totalReadings, normalCount, weakAnomalyCount, strongAnomalyCount } = useTelemetryStats();

  const normalPct = totalReadings > 0 ? ((normalCount / totalReadings) * 100).toFixed(1) : '0.0';
  const weakPct = totalReadings > 0 ? ((weakAnomalyCount / totalReadings) * 100).toFixed(1) : '0.0';
  const strongPct = totalReadings > 0 ? ((strongAnomalyCount / totalReadings) * 100).toFixed(1) : '0.0';

  return (
    <Card
      title="Anomaly Classification Breakdown"
      icon={<PieChart className="w-4 h-4 text-cyan-400" />}
      subtitle="Upstream ML classification proportions across survey points"
    >
      <div className="space-y-4">
        {/* Proportional Segment Bar */}
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-[#1f324d] p-0.5">
          <div
            className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
            style={{ width: `${normalPct}%` }}
            title={`Normal: ${normalPct}%`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${weakPct}%` }}
            title={`Weak Anomaly: ${weakPct}%`}
          />
          <div
            className="h-full bg-red-500 rounded-r-full transition-all duration-500"
            style={{ width: `${strongPct}%` }}
            title={`Strong Anomaly: ${strongPct}%`}
          />
        </div>

        {/* Legend / Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {/* Normal */}
          <div className="p-2.5 bg-[#070b12] border border-emerald-500/30 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-mono font-semibold">Normal</span>
            </div>
            <span className="font-mono font-extrabold text-base text-slate-100 block">{normalCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">{normalPct}%</span>
          </div>

          {/* Weak Anomaly */}
          <div className="p-2.5 bg-[#070b12] border border-amber-500/30 rounded-xl">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-mono font-semibold">Weak</span>
            </div>
            <span className="font-mono font-extrabold text-base text-slate-100 block">{weakAnomalyCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">{weakPct}%</span>
          </div>

          {/* Strong Anomaly */}
          <div className="p-2.5 bg-[#070b12] border border-red-500/40 rounded-xl bg-red-950/20">
            <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[10px] uppercase font-mono font-semibold">Strong</span>
            </div>
            <span className="font-mono font-extrabold text-base text-red-300 block">{strongAnomalyCount}</span>
            <span className="text-[10px] text-red-400 font-mono">{strongPct}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
