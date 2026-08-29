import React from 'react';
import { Classification, DataSourceType } from '../../types/sensor';
import { ShieldCheck, AlertTriangle, Flame, Database, Radio } from 'lucide-react';

interface AnomalyBadgeProps {
  classification: Classification;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const AnomalyBadge: React.FC<AnomalyBadgeProps> = ({
  classification,
  size = 'md',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  switch (classification) {
    case 'strong_anomaly':
      return (
        <span
          className={`inline-flex items-center font-mono font-medium uppercase tracking-wider rounded-full bg-red-950/70 border border-red-500/60 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)] ${sizeClasses}`}
        >
          {showIcon && <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
          <span>Strong Anomaly</span>
        </span>
      );
    case 'weak_anomaly':
      return (
        <span
          className={`inline-flex items-center font-mono font-medium uppercase tracking-wider rounded-full bg-amber-950/70 border border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)] ${sizeClasses}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
          <span>Weak Anomaly</span>
        </span>
      );
    case 'normal':
    default:
      return (
        <span
          className={`inline-flex items-center font-mono font-medium uppercase tracking-wider rounded-full bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)] ${sizeClasses}`}
        >
          {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
          <span>Normal Baseline</span>
        </span>
      );
  }
};

interface DataSourceBadgeProps {
  dataSource: DataSourceType;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ dataSource }) => {
  if (dataSource === 'mock') {
    return (
      <span className="inline-flex items-center text-xs font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
        <Database className="w-3.5 h-3.5 text-cyan-400" />
        <span>MOCK DATA MODE</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-xs font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
      <span>LIVE STREAM</span>
    </span>
  );
};
