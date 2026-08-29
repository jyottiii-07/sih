import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { SensorReading } from '../../types/sensor';
import { Card } from '../common/Card';
import { Activity } from 'lucide-react';

interface VectorChartProps {
  readings: SensorReading[];
}

export const VectorChart: React.FC<VectorChartProps> = ({ readings }) => {
  const chartData = readings.map((r, i) => ({
    index: i + 1,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    bx: r.bx,
    by: r.by,
    bz: r.bz,
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
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-sky-700">
              <span>Bx:</span>
              <span className="font-bold">{data.bx.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 text-indigo-700">
              <span>By:</span>
              <span className="font-bold">{data.by.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 text-purple-700">
              <span>Bz:</span>
              <span className="font-bold">{data.bz.toFixed(2)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      title="Magnetic Vector Components (Bx, By, Bz)"
      icon={<Activity className="w-4 h-4 text-slate-500" />}
      subtitle="Raw tri-axial magnetic sensor telemetry &bull; Provisional Survey Units"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}
            />
            <Line
              type="monotone"
              dataKey="bx"
              name="Bx Vector"
              stroke="#0284c7"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4, fill: '#0284c7' }}
            />
            <Line
              type="monotone"
              dataKey="by"
              name="By Vector"
              stroke="#4f46e5"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4, fill: '#4f46e5' }}
            />
            <Line
              type="monotone"
              dataKey="bz"
              name="Bz Vector"
              stroke="#9333ea"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4, fill: '#9333ea' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
