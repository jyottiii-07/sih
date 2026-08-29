import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  subtitle?: string;
  variant?: 'default' | 'cyan' | 'danger';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  icon,
  action,
  subtitle,
}) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 shadow-sm rounded-lg p-4 sm:p-5 transition-shadow duration-150 ${className}`}
    >
      {(title || icon || action) && (
        <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && (
                <h3 className="font-semibold text-sm sm:text-base text-slate-900 tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
