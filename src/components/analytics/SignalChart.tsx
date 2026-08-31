import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { SensorReading } from '../../types/sensor';
import { Card } from '../common/Card';
import { Zap } from 'lucide-react';

interface SignalChartProps {
  readings: SensorReading[];
}

export const SignalChart: React.FC<SignalChartProps> = ({ readings }) => {
  const chartData = readings.map((r, i) => ({
    index: i + 1,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    signal: r.magnetic_signal,
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
          <div className="flex justify-between gap-4 text-blue-700">
            <span>Magnetic Signal:</span>
            <span className="font-bold">{data.signal.toFixed(2)} survey units</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      title="Composite Magnetic Signal Magnitude"
      icon={<Zap className="w-4 h-4 text-slate-500" />}
      subtitle="Total scalar magnetic field profile across survey stations"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
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
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="signal"
              name="Magnetic Signal"
              stroke="#2563eb"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#signalGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
