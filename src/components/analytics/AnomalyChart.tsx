import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { SensorReading } from '../../types/sensor';
import { Card } from '../common/Card';
import { Sparkles } from 'lucide-react';

interface AnomalyChartProps {
  readings: SensorReading[];
}

export const AnomalyChart: React.FC<AnomalyChartProps> = ({ readings }) => {
  const chartData = readings.map((r, i) => ({
    index: i + 1,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    score: r.anomaly_score,
    coords: `(${r.x}, ${r.y})`,
    classification: r.classification,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-lg text-xs font-mono text-slate-900">
          <div className="text-slate-500 pb-1 border-b border-slate-100 mb-1.5 flex justify-between gap-3">
            <span>#{data.index} &bull; {data.time}</span>
            <span className="text-blue-600 font-semibold">{data.coords}</span>
          </div>
          <div className="flex justify-between gap-4 text-rose-700">
            <span>ML Anomaly Score:</span>
            <span className="font-bold">{data.score.toFixed(2)} / 1.00</span>
          </div>
          <div className="text-xs text-slate-600 mt-1 capitalize">
            Classification: <span className="text-slate-900 font-semibold">{data.classification.replace('_', ' ')}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      title="ML Anomaly Likelihood Profile (0.0 to 1.0)"
      icon={<Sparkles className="w-4 h-4 text-slate-500" />}
      subtitle="Upstream machine learning model anomaly likelihood score trajectory"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="index"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              domain={[0, 1.0]}
              ticks={[0, 0.25, 0.5, 0.75, 1.0]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Threshold Reference Lines */}
            <ReferenceLine y={0.8} stroke="#e11d48" strokeDasharray="4 4" label={{ value: 'Strong Zone', fill: '#be123c', fontSize: 11 }} />
            <ReferenceLine y={0.45} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Weak Zone', fill: '#b45309', fontSize: 11 }} />

            <Area
              type="monotone"
              dataKey="score"
              name="Anomaly Score"
              stroke="#e11d48"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#anomalyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
