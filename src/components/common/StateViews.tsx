import React from 'react';
import { Loader2, AlertOctagon, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const LoadingView: React.FC<{ message?: string }> = ({
  message = 'Acquiring seafloor telemetry stream...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px] w-full">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
        <Loader2 className="w-6 h-6 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="font-display font-medium text-sm text-slate-300 tracking-wide">{message}</p>
      <p className="text-xs text-slate-500 mt-1">Connecting to data provider interface</p>
    </div>
  );
};

export const EmptyView: React.FC<{
  title?: string;
  description?: string;
  action?: React.ReactNode;
}> = ({
  title = 'No Telemetry Readings Available',
  description = 'No sensor readings match the current filter criteria or survey grid area.',
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center min-h-[260px] bg-[#0e1626]/50 border border-[#1f324d] rounded-xl">
      <div className="p-3.5 bg-[#152238] rounded-full border border-[#1f324d] mb-3 text-slate-400">
        <Inbox className="w-7 h-7" />
      </div>
      <h4 className="font-display font-semibold text-slate-200 text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
};

export const ErrorView: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'Failed to load sensor telemetry from provider.', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center min-h-[280px] bg-red-950/20 border border-red-500/40 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.15)]">
      <div className="p-3.5 bg-red-950/80 rounded-full border border-red-500/50 mb-3 text-red-400 animate-pulse">
        <AlertOctagon className="w-7 h-7" />
      </div>
      <h4 className="font-display font-semibold text-red-200 text-sm mb-1">Telemetry Provider Error</h4>
      <p className="text-xs text-red-300/80 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRetry}>
          Retry Connection
        </Button>
      )}
    </div>
  );
};
