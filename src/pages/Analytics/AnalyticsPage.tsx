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
    return <LoadingView message="Loading Telemetry Analytics..." />;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-lg bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
              Telemetry & Anomaly Analytics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tri-axial vector decomposition, composite magnetic signal intensity, and ML anomaly trajectories
            </p>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
            <span className="text-slate-500 mr-1">Peak Signal:</span>
            <span className="text-blue-700 font-bold">{peakMagneticSignal}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
            <span className="text-slate-500 mr-1">Avg ML Score:</span>
            <span className="text-slate-900 font-bold">{averageAnomalyScore}</span>
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
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-800">Scientific Assumptions & Unit Calibration Notice:</span>
          <p className="text-xs leading-relaxed text-slate-500">
            Physical calibration units for magnetic field measurements (Bx, By, Bz, Signal) are currently unconfirmed by NCPOR hardware calibration teams. Values are visualized in <strong>Provisional Survey Units</strong>. The classification boundaries and anomaly scores shown are direct outputs from upstream ML inference.
          </p>
        </div>
      </div>
    </div>
  );
};
