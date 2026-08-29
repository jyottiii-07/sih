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
    return <LoadingView message="Initializing Seafloor Sensor Telemetry Stream..." />;
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
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#0e1626] via-[#111c30] to-[#0e1626] border border-[#1f324d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-slate-100 tracking-wide">
                Seafloor Mission Overview
              </h2>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Low-Cost Deployable Ocean-Bottom Metal Detection Sensor (NCPOR Problem 26064)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
          <div className="bg-[#070b12] px-3 py-1.5 rounded-lg border border-[#1f324d]">
            <span className="text-slate-400 mr-1.5">SENSOR:</span>
            <span className="font-bold text-cyan-300">{activeSensorId}</span>
          </div>
          <div className="bg-[#070b12] px-3 py-1.5 rounded-lg border border-[#1f324d]">
            <span className="text-slate-400 mr-1.5">STREAM:</span>
            <span className="font-bold text-emerald-400">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Primary Key Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Readings */}
        <MetricCard
          label="Total Survey Readings"
          value={totalReadings}
          icon={<Layers className="w-4 h-4" />}
          description="Packets in survey memory"
        />

        {/* Strong Anomalies */}
        <MetricCard
          label="Strong Anomalies"
          value={strongAnomalyCount}
          icon={<Flame className="w-4 h-4 text-red-400 animate-pulse" />}
          variant="danger"
          description="High ferrous seabed targets"
        />

        {/* Weak Anomalies */}
        <MetricCard
          label="Weak Anomalies"
          value={weakAnomalyCount}
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          description="Fringe / boundary zones"
        />

        {/* Peak Magnetic Signal */}
        <MetricCard
          label="Peak Mag Signal"
          value={peakMagneticSignal}
          unit="survey units"
          icon={<Zap className="w-4 h-4 text-cyan-400" />}
          variant="cyan"
          description="Maximum field magnitude"
        />

        {/* Latest Anomaly Score */}
        <MetricCard
          label="Latest ML Score"
          value={latestAnomalyScore}
          unit="/ 1.00"
          icon={<Sparkles className="w-4 h-4 text-cyan-400" />}
          description="Current packet ML likelihood"
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
