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
    if (classification === 'strong_anomaly') return '#ef4444';
    if (classification === 'weak_anomaly') return '#f59e0b';
    return '#10b981';
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-[#0a101b]/95 border border-[#2e4d75] rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
          <div className="text-slate-400 pb-1 border-b border-[#1f324d] mb-1.5 flex justify-between gap-3">
            <span>Reading #{data.id}</span>
            <span className="text-cyan-300">{data.coords}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-cyan-300">
              <span>Mag Signal:</span>
              <span className="font-bold">{data.signal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 text-red-400">
              <span>ML Score:</span>
              <span className="font-bold">{data.score.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-slate-400 capitalize">
              Class: <span className="text-slate-200 font-semibold">{data.classification.replace('_', ' ')}</span>
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
      icon={<ScatterIcon className="w-4 h-4 text-cyan-400" />}
      subtitle="Scatter cross-plot evaluating magnetic intensity vs upstream anomaly classification"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="signal"
              name="Magnetic Signal"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1f324d' }}
              label={{ value: 'Magnetic Signal (Survey Units)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="score"
              name="Anomaly Score"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1f324d' }}
              domain={[0, 1.0]}
              label={{ value: 'ML Anomaly Score', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
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
