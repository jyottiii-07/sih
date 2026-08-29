import React from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { useTelemetryStats } from '../../hooks/useTelemetryStats';
import { SurveyHeatmap } from '../../components/visualization/SurveyHeatmap';
import { HeatmapLegend } from '../../components/visualization/HeatmapLegend';
import { AnomalyDistributionCard } from '../../components/dashboard/AnomalyDistributionCard';
import { LoadingView, EmptyView, ErrorView } from '../../components/common/StateViews';
import { Map } from 'lucide-react';
import { SensorReading } from '../../types/sensor';

interface SurveyPageProps {
  onSelectReading?: (reading: SensorReading) => void;
}

export const SurveyPage: React.FC<SurveyPageProps> = ({ onSelectReading }) => {
  const { readings, status, errorMessage, refreshData } = useSensorData();
  const { strongAnomalyCount, peakMagneticSignal } = useTelemetryStats();

  if (status === 'loading' && readings.length === 0) {
    return <LoadingView message="Loading Seafloor Survey Spatial Grid..." />;
  }

  if (status === 'error' && readings.length === 0) {
    return <ErrorView message={errorMessage || 'Failed to load survey grid.'} onRetry={refreshData} />;
  }

  if (readings.length === 0) {
    return (
      <EmptyView
        title="No Survey Data Plotted"
        description="There are currently no survey points to plot on the coordinate grid."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-lg bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
              Seafloor Spatial Survey Grid & Heatmap
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Local survey coordinate visualization for identifying prospective metal deposit targets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
            <span className="text-slate-500 mr-1">Strong Targets:</span>
            <span className="text-rose-700 font-bold">{strongAnomalyCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
            <span className="text-slate-500 mr-1">Peak Signal:</span>
            <span className="text-blue-700 font-bold">{peakMagneticSignal}</span>
          </div>
        </div>
      </div>

      {/* Main Grid View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Main Interactive Heatmap */}
        <div className="lg:col-span-2">
          <SurveyHeatmap onSelectReading={onSelectReading} />
        </div>

        {/* Right 1 Column: Legend & Distribution */}
        <div className="space-y-6">
          <HeatmapLegend />
          <AnomalyDistributionCard />
        </div>
      </div>
    </div>
  );
};
