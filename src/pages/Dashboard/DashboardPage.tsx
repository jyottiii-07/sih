import React from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { useTelemetryStats } from '../../hooks/useTelemetryStats';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { LatestTelemetryCard } from '../../components/dashboard/LatestTelemetryCard';
import { CompactHeatmapCard } from '../../components/dashboard/CompactHeatmapCard';
import { RecentReadingsTable } from '../../components/dashboard/RecentReadingsTable';
import { AnomalyDistributionCard } from '../../components/dashboard/AnomalyDistributionCard';
import { LoadingView, EmptyView, ErrorView } from '../../components/common/StateViews';
import {
  Layers,
  Flame,
  AlertTriangle,
  Zap,
  Sparkles,
  Radio,
} from 'lucide-react';
import { ActiveTab } from '../../types/sensor';

interface DashboardPageProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const {
    readings,
    status,
    errorMessage,
    refreshData,
    setSelectedReading,
  } = useSensorData();

  const {
    totalReadings,
    weakAnomalyCount,
    strongAnomalyCount,
    peakMagneticSignal,
    latestAnomalyScore,
    latestReading,
    activeSensorId,
  } = useTelemetryStats();

  if (status === 'loading' && readings.length === 0) {
    return <LoadingView message="Initializing sensor telemetry stream..." />;
  }

  if (status === 'error' && readings.length === 0) {
    return <ErrorView message={errorMessage || 'Could not connect to sensor telemetry stream.'} onRetry={refreshData} />;
  }

  if (readings.length === 0) {
    return (
      <EmptyView
        title="No Telemetry Available"
        description="No sensor readings have been loaded yet into the mission control dashboard."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Mission Status */}
      <div className="p-4 sm:p-5 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                Seafloor Mission Overview
              </h2>
              <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Low-Cost Deployable Ocean-Bottom Metal Detection Sensor (NCPOR Problem 26064)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono text-slate-600">
          <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            <span className="text-slate-500 mr-1.5">Sensor:</span>
            <span className="font-semibold text-slate-900">{activeSensorId}</span>
          </div>
          <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            <span className="text-slate-500 mr-1.5">Status:</span>
            <span className="font-semibold text-emerald-600">Active</span>
          </div>
        </div>
      </div>

      {/* Primary Key Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Readings */}
        <MetricCard
          label="Total Survey Readings"
          value={totalReadings}
          icon={<Layers className="w-4 h-4 text-slate-600" />}
          description="Packets in memory"
        />

        {/* Strong Anomalies */}
        <MetricCard
          label="Strong Anomalies"
          value={strongAnomalyCount}
          icon={<Flame className="w-4 h-4 text-rose-600" />}
          description="High ferrous targets"
        />

        {/* Weak Anomalies */}
        <MetricCard
          label="Weak Anomalies"
          value={weakAnomalyCount}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          description="Boundary zones"
        />

        {/* Peak Magnetic Signal */}
        <MetricCard
          label="Peak Mag Signal"
          value={peakMagneticSignal}
          unit="survey units"
          icon={<Zap className="w-4 h-4 text-blue-600" />}
          description="Maximum field magnitude"
        />

        {/* Latest Anomaly Score */}
        <MetricCard
          label="Latest ML Score"
          value={latestAnomalyScore}
          unit="/ 1.00"
          icon={<Sparkles className="w-4 h-4 text-slate-600" />}
          description="Current packet ML score"
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Latest Telemetry & Recent Feed */}
        <div className="lg:col-span-2 space-y-6">
          <LatestTelemetryCard
            reading={latestReading}
            onInspect={() => latestReading && setSelectedReading(latestReading)}
          />

          <RecentReadingsTable onOpenLogs={() => setActiveTab('logs')} />
        </div>

        {/* Right 1 Column: Survey Grid Mini-Preview & Distribution */}
        <div className="space-y-6">
          <CompactHeatmapCard onOpenSurvey={() => setActiveTab('survey')} />

          <AnomalyDistributionCard />
        </div>
      </div>
    </div>
  );
};
