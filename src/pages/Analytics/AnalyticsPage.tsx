import React from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { useTelemetryStats } from '../../hooks/useTelemetryStats';
import { VectorChart } from '../../components/analytics/VectorChart';
import { SignalChart } from '../../components/analytics/SignalChart';
import { AnomalyChart } from '../../components/analytics/AnomalyChart';
import { ScatterChart } from '../../components/analytics/ScatterChart';
import { LoadingView, EmptyView, ErrorView } from '../../components/common/StateViews';
import { LineChart, Info } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { readings, status, errorMessage, refreshData } = useSensorData();
  const { peakMagneticSignal, averageAnomalyScore } = useTelemetryStats();

  if (status === 'loading' && readings.length === 0) {
    return <LoadingView message="Loading Scientific Telemetry Analytics..." />;
  }

  if (status === 'error' && readings.length === 0) {
    return <ErrorView message={errorMessage || 'Failed to load telemetry analytics.'} onRetry={refreshData} />;
  }

  if (readings.length === 0) {
    return (
      <EmptyView
        title="No Telemetry Available for Analytics"
        description="Load or simulate survey readings to generate time-series and correlation charts."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0e1626] border border-[#1f324d]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 border border-cyan-500/40 rounded-xl text-cyan-400">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-100">
              Scientific Telemetry & Anomaly Analytics
            </h2>
            <p className="text-xs text-slate-400">
              Tri-axial vector decomposition, composite magnetic signal intensity, and ML anomaly trajectories
            </p>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1 bg-[#070b12] border border-[#1f324d] rounded-lg text-slate-300">
            <span className="text-slate-500 mr-1">PEAK SIGNAL:</span>
            <span className="text-cyan-300 font-bold">{peakMagneticSignal}</span>
          </div>
          <div className="px-3 py-1 bg-[#070b12] border border-[#1f324d] rounded-lg text-slate-300">
            <span className="text-slate-500 mr-1">AVG ML SCORE:</span>
            <span className="text-slate-200 font-bold">{averageAnomalyScore}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VectorChart readings={readings} />
        <SignalChart readings={readings} />
        <AnomalyChart readings={readings} />
        <ScatterChart readings={readings} />
      </div>

      {/* Scientific Unit Disclaimers */}
      <div className="p-4 rounded-xl bg-[#0e1626]/70 border border-[#1f324d] flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-300">Scientific Assumptions & Unit Calibration Notice:</span>
          <p className="text-[11px] leading-relaxed">
            Physical calibration units for magnetic field measurements (Bx, By, Bz, Signal) are currently unconfirmed by NCPOR hardware calibration teams. Values are visualized in <strong>Provisional Survey Units</strong>. The classification boundaries and anomaly scores shown are direct outputs from upstream ML inference.
          </p>
        </div>
      </div>
    </div>
  );
};
