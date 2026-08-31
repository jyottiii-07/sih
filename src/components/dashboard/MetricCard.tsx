import React from 'react';
import { Card } from '../common/Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'cyan' | 'danger';
  trend?: string;
  description?: string;
  badge?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  description,
  badge,
}) => {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500 font-mono">{unit}</span>}
      </div>

      {(description || trend || badge) && (
        <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          {description && <span className="text-slate-500 text-[11px] truncate">{description}</span>}
          {badge && <div>{badge}</div>}
          {trend && <span className="text-blue-600 font-mono text-[11px] font-semibold">{trend}</span>}
        </div>
      )}
    </Card>
  );
};
