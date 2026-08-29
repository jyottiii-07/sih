import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070b12] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-3.5 py-2 gap-2',
    lg: 'text-sm sm:text-base px-4 py-2.5 gap-2.5',
  }[size];

  const variantStyles = {
    primary:
      'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.35)] active:scale-[0.98]',
    secondary:
      'bg-[#152238] hover:bg-[#1c2c47] text-slate-200 border border-[#1f324d] hover:border-cyan-500/40 active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-[#152238] text-slate-300 border border-[#1f324d] hover:border-slate-400 active:scale-[0.98]',
    danger:
      'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-[#152238] text-slate-400 hover:text-slate-100',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
