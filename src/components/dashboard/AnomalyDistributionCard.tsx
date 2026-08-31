import React from 'react';
import { useTelemetryStats } from '../../hooks/useTelemetryStats';
import { Card } from '../common/Card';
import { PieChart, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';

export const AnomalyDistributionCard: React.FC = () => {
  const { totalReadings, normalCount, weakAnomalyCount, strongAnomalyCount } = useTelemetryStats();

  const normalPct = totalReadings > 0 ? ((normalCount / totalReadings) * 100).toFixed(1) : '0.0';
  const weakPct = totalReadings > 0 ? ((weakAnomalyCount / totalReadings) * 100).toFixed(1) : '0.0';
  const strongPct = totalReadings > 0 ? ((strongAnomalyCount / totalReadings) * 100).toFixed(1) : '0.0';

  return (
    <Card
      title="Classification Breakdown"
      icon={<PieChart className="w-4 h-4 text-slate-500" />}
      subtitle="Upstream ML classification proportions across survey points"
    >
      <div className="space-y-4">
        {/* Proportional Segment Bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${normalPct}%` }}
            title={`Normal: ${normalPct}%`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${weakPct}%` }}
            title={`Weak Anomaly: ${weakPct}%`}
          />
          <div
            className="h-full bg-rose-600 transition-all duration-300"
            style={{ width: `${strongPct}%` }}
            title={`Strong Anomaly: ${strongPct}%`}
          />
        </div>

        {/* Legend / Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
          {/* Normal */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-emerald-700 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] uppercase font-semibold">Normal</span>
            </div>
            <span className="font-mono font-bold text-base text-slate-900 block">{normalCount}</span>
            <span className="text-[11px] text-slate-500 font-mono">{normalPct}%</span>
          </div>

          {/* Weak Anomaly */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-amber-700 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] uppercase font-semibold">Weak</span>
            </div>
            <span className="font-mono font-bold text-base text-slate-900 block">{weakAnomalyCount}</span>
            <span className="text-[11px] text-slate-500 font-mono">{weakPct}%</span>
          </div>

          {/* Strong Anomaly */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-rose-700 mb-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-[11px] uppercase font-semibold">Strong</span>
            </div>
            <span className="font-mono font-bold text-base text-slate-900 block">{strongAnomalyCount}</span>
            <span className="text-[11px] text-slate-500 font-mono">{strongPct}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
