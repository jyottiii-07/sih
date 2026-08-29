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
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'border-[#1f324d] hover:border-[#2e4d75]',
    cyan: 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    danger: 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  }[variant];

  return (
    <div
      className={`bg-[#0e1626]/90 backdrop-blur-md border rounded-xl p-4 sm:p-5 transition-all duration-200 ${variantStyles} ${className}`}
    >
      {(title || icon || action) && (
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1f324d]">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-cyan-400 shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && (
                <h3 className="font-display font-semibold text-sm sm:text-base text-slate-100 tracking-wide truncate">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
