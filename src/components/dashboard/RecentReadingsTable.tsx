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

  // Last 8 readings in reverse chronological order
  const recentList = [...readings].slice(-8).reverse();

  return (
    <Card
      title="Recent Telemetry Ingestion Feed"
      icon={<ListFilter className="w-4 h-4 text-cyan-400" />}
      subtitle="Latest packets received by the frontend data adapter"
      action={
        <button
          onClick={onOpenLogs}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 transition-colors"
        >
          View Full Logs <ExternalLink className="w-3 h-3" />
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#1f324d] text-slate-400 font-mono text-[11px]">
              <th className="py-2 px-2">Timestamp</th>
              <th className="py-2 px-2">Coords (X, Y)</th>
              <th className="py-2 px-2 text-right">Mag Signal</th>
              <th className="py-2 px-2 text-right">Anomaly Score</th>
              <th className="py-2 px-2 text-center">Classification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1f324d]/40">
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
                      ? 'bg-cyan-950/40 border-l-2 border-cyan-400'
                      : 'hover:bg-[#152238]/60'
                  }`}
                >
                  <td className="py-2 px-2 font-mono text-slate-300 whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-2 font-mono text-slate-300">
                    ({r.x.toFixed(1)}, {r.y.toFixed(1)})
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-cyan-300 font-medium">
                    {r.magnetic_signal.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 font-mono text-right text-slate-200">
                    {r.anomaly_score.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-center">
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
