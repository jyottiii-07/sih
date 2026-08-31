import React from 'react';
import { Classification, DataSourceType } from '../../types/sensor';
import { ShieldCheck, AlertTriangle, AlertCircle, Database, Radio } from 'lucide-react';

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
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  }[size];

  switch (classification) {
    case 'strong_anomaly':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-rose-50 border border-rose-200 text-rose-700 ${sizeClasses}`}
        >
          {showIcon && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
          <span>Strong Anomaly</span>
        </span>
      );
    case 'weak_anomaly':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 border border-amber-200 text-amber-700 ${sizeClasses}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span>Weak Anomaly</span>
        </span>
      );
    case 'normal':
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 ${sizeClasses}`}
        >
          {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          <span>Normal</span>
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
      <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 gap-1.5">
        <Database className="w-3.5 h-3.5 text-slate-500" />
        <span>Mock Data</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 gap-1.5">
      <Radio className="w-3.5 h-3.5 text-emerald-600" />
      <span>Live Stream</span>
    </span>
  );
};
