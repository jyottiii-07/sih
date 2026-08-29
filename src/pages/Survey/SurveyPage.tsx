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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0e1626] border border-[#1f324d]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 border border-cyan-500/40 rounded-xl text-cyan-400">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-100">
              Seafloor Spatial Survey Grid & Anomaly Heatmap
            </h2>
            <p className="text-xs text-slate-400">
              Local survey coordinate visualization for identifying prospective metal deposit targets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1 bg-[#070b12] border border-[#1f324d] rounded-lg text-slate-300">
            <span className="text-slate-500 mr-1">STRONG TARGETS:</span>
            <span className="text-red-400 font-bold">{strongAnomalyCount}</span>
          </div>
          <div className="px-3 py-1 bg-[#070b12] border border-[#1f324d] rounded-lg text-slate-300">
            <span className="text-slate-500 mr-1">PEAK SIGNAL:</span>
            <span className="text-cyan-300 font-bold">{peakMagneticSignal}</span>
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
