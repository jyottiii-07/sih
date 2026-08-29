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
        <div className="p-3 bg-[#0a101b]/95 border border-[#2e4d75] rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
          <div className="text-slate-400 pb-1 border-b border-[#1f324d] mb-1.5 flex justify-between gap-3">
            <span>#{data.index} &bull; {data.time}</span>
            <span className="text-cyan-300">{data.coords}</span>
          </div>
          <div className="flex justify-between gap-4 text-cyan-300">
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
      icon={<Zap className="w-4 h-4 text-cyan-400" />}
      subtitle="Total scalar magnetic field profile across survey stations"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="signalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="index"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1f324d' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1f324d' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="signal"
              name="Magnetic Signal"
              stroke="#06b6d4"
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
