import React, { useState, useMemo } from 'react';
import { SensorReading } from '../../types/sensor';
import { AnomalyBadge } from '../common/Badge';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface LogsTableProps {
  readings: SensorReading[];
  selectedReading: SensorReading | null;
  onSelectReading: (reading: SensorReading) => void;
}

type SortField = keyof SensorReading;
type SortOrder = 'asc' | 'desc';

export const LogsTable: React.FC<LogsTableProps> = ({
  readings,
  selectedReading,
  onSelectReading,
}) => {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [readings, sortField, sortOrder]);

  const renderSortHeader = (label: string, field: SortField, align: 'left' | 'right' | 'center' = 'left') => {
    const isCurrent = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`py-3 px-3 cursor-pointer select-none hover:text-slate-900 transition-colors font-mono text-[11px] uppercase tracking-wider text-${align} ${
          isCurrent ? 'text-blue-600 font-bold' : 'text-slate-500'
        }`}
      >
        <div className={`inline-flex items-center gap-1.5 justify-${align === 'right' ? 'end' : align === 'center' ? 'center' : 'start'}`}>
          <span>{label}</span>
          {isCurrent ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="w-full overflow-x-auto bg-white border border-slate-200 rounded-lg shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
          <tr>
            {renderSortHeader('Timestamp', 'timestamp', 'left')}
            {renderSortHeader('Sensor ID', 'sensor_id', 'left')}
            {renderSortHeader('X', 'x', 'right')}
            {renderSortHeader('Y', 'y', 'right')}
            {renderSortHeader('Bx', 'bx', 'right')}
            {renderSortHeader('By', 'by', 'right')}
            {renderSortHeader('Bz', 'bz', 'right')}
            {renderSortHeader('Signal', 'magnetic_signal', 'right')}
            {renderSortHeader('ML Score', 'anomaly_score', 'right')}
            {renderSortHeader('Classification', 'classification', 'center')}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-mono">
          {sortedReadings.map((r, idx) => {
            const isSelected =
              selectedReading?.timestamp === r.timestamp &&
              selectedReading?.x === r.x &&
              selectedReading?.y === r.y;

            return (
              <tr
                key={`${r.timestamp}-${idx}`}
                onClick={() => onSelectReading(r)}
                className={`cursor-pointer transition-colors duration-100 ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-4 border-blue-600 font-medium'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Timestamp */}
                <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                  {new Date(r.timestamp).toISOString()}
                </td>

                {/* Sensor ID */}
                <td className="py-2.5 px-3 text-slate-900 font-semibold">
                  {r.sensor_id}
                </td>

                {/* X, Y */}
                <td className="py-2.5 px-3 text-right text-slate-700">{r.x.toFixed(1)}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">{r.y.toFixed(1)}</td>

                {/* Bx, By, Bz */}
                <td className="py-2.5 px-3 text-right text-sky-700">{r.bx.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-indigo-700">{r.by.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right text-purple-700">{r.bz.toFixed(2)}</td>

                {/* Magnetic Signal */}
                <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                  {r.magnetic_signal.toFixed(2)}
                </td>

                {/* Anomaly Score */}
                <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">
                  {r.anomaly_score.toFixed(2)}
                </td>

                {/* Classification Badge */}
                <td className="py-2.5 px-3 text-center">
                  <AnomalyBadge classification={r.classification} size="sm" showIcon={false} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
