import React from 'react';
import { useSensorData } from '../../hooks/useSensorData';
import { Card } from '../common/Card';
import { AnomalyBadge } from '../common/Badge';
import { ListFilter, ExternalLink } from 'lucide-react';

interface RecentReadingsTableProps {
  onOpenLogs: () => void;
}

export const RecentReadingsTable: React.FC<RecentReadingsTableProps> = ({ onOpenLogs }) => {
  const { readings, selectedReading, setSelectedReading } = useSensorData();

  const recentList = [...readings].slice(-8).reverse();

  return (
    <Card
      title="Recent Telemetry Feed"
      icon={<ListFilter className="w-4 h-4 text-slate-500" />}
      subtitle="Latest packets received by the frontend data adapter"
      action={
        <button
          onClick={onOpenLogs}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 transition-colors"
        >
          Full Logs <ExternalLink className="w-3 h-3" />
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] bg-slate-50/60">
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Coords (X, Y)</th>
              <th className="py-2.5 px-3 text-right">Mag Signal</th>
              <th className="py-2.5 px-3 text-right">Anomaly Score</th>
              <th className="py-2.5 px-3 text-center">Classification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentList.map((r, idx) => {
              const isSelected =
                selectedReading?.timestamp === r.timestamp &&
                selectedReading?.x === r.x &&
                selectedReading?.y === r.y;

              return (
                <tr
                  key={`${r.timestamp}-${idx}`}
                  onClick={() => setSelectedReading(r)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-2 border-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">
                    ({r.x.toFixed(1)}, {r.y.toFixed(1)})
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-blue-700 font-semibold">
                    {r.magnetic_signal.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-right text-slate-900 font-medium">
                    {r.anomaly_score.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <AnomalyBadge classification={r.classification} size="sm" showIcon={false} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
