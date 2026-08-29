import React from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const LoadingView: React.FC<{ message?: string }> = ({
  message = 'Loading sensor telemetry...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px] w-full">
      <div className="mb-3 text-blue-600">
        <Loader2 className="w-7 h-7 animate-spin" />
      </div>
      <p className="font-medium text-sm text-slate-800">{message}</p>
      <p className="text-xs text-slate-500 mt-1">Connecting to data provider</p>
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
    <div className="flex flex-col items-center justify-center p-10 text-center min-h-[260px] bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
        <Inbox className="w-6 h-6" />
      </div>
      <h4 className="font-semibold text-slate-800 text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
};

export const ErrorView: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'Failed to load sensor telemetry from provider.', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center min-h-[280px] bg-rose-50/50 border border-rose-200 rounded-lg">
      <div className="p-3 bg-rose-100 rounded-full text-rose-600 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="font-semibold text-rose-900 text-sm mb-1">Telemetry Provider Error</h4>
      <p className="text-xs text-rose-700 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRetry}>
          Retry Connection
        </Button>
      )}
    </div>
  );
};
