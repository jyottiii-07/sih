import React from 'react';
import { ResponsiveContainer, ScatterChart as ReScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { SensorReading } from '../../types/sensor';
import { Card } from '../common/Card';
import { ScatterChart as ScatterIcon } from 'lucide-react';

interface ScatterChartProps {
  readings: SensorReading[];
}

export const ScatterChart: React.FC<ScatterChartProps> = ({ readings }) => {
  const chartData = readings.map((r, i) => ({
    id: i + 1,
    signal: r.magnetic_signal,
    score: r.anomaly_score,
    coords: `(${r.x}, ${r.y})`,
    classification: r.classification,
  }));

  const getColor = (classification: string) => {
    if (classification === 'strong_anomaly') return '#e11d48';
    if (classification === 'weak_anomaly') return '#f59e0b';
    return '#10b981';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-lg text-xs font-mono text-slate-900">
          <div className="text-slate-500 pb-1 border-b border-slate-100 mb-1.5 flex justify-between gap-3">
            <span>Reading #{data.id}</span>
            <span className="text-blue-600 font-semibold">{data.coords}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-blue-700">
              <span>Mag Signal:</span>
              <span className="font-bold">{data.signal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 text-rose-700">
              <span>ML Score:</span>
              <span className="font-bold">{data.score.toFixed(2)}</span>
            </div>
            <div className="text-xs text-slate-600 capitalize">
              Class: <span className="text-slate-900 font-semibold">{data.classification.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      title="Signal vs ML Anomaly Score Correlation"
      icon={<ScatterIcon className="w-4 h-4 text-slate-500" />}
      subtitle="Scatter cross-plot evaluating magnetic intensity vs upstream anomaly classification"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="signal"
              name="Magnetic Signal"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              label={{ value: 'Magnetic Signal (Survey Units)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="score"
              name="Anomaly Score"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              domain={[0, 1.0]}
              label={{ value: 'ML Anomaly Score', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter name="Survey Readings" data={chartData}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.classification)} fillOpacity={0.85} />
              ))}
            </Scatter>
          </ReScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
