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
  variant = 'default',
  trend,
  description,
  badge,
}) => {
  return (
    <Card variant={variant} className="relative overflow-hidden group">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-sans">
          {label}
        </span>
        <div className="p-2 bg-[#152238] rounded-lg border border-[#1f324d] text-cyan-400 group-hover:border-cyan-500/40 transition-colors">
          {icon}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          {value}
        </span>
        {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
      </div>

      {(description || trend || badge) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-[#1f324d]/60 text-xs">
          {description && <span className="text-slate-400 text-[11px] truncate">{description}</span>}
          {badge && <div>{badge}</div>}
          {trend && <span className="text-cyan-400 font-mono text-[11px] font-semibold">{trend}</span>}
        </div>
      )}
    </Card>
  );
};
