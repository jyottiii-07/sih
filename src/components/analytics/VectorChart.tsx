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
        <div className="p-3 bg-[#0a101b]/95 border border-[#2e4d75] rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
          <div className="text-slate-400 pb-1 border-b border-[#1f324d] mb-1.5 flex justify-between gap-3">
            <span>#{data.index} &bull; {data.time}</span>
            <span className="text-cyan-300">{data.coords}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4 text-sky-400">
              <span>Bx Vector:</span>
              <span className="font-bold">{data.bx.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 text-indigo-400">
              <span>By Vector:</span>
              <span className="font-bold">{data.by.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 text-purple-400">
              <span>Bz Vector:</span>
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
      icon={<Activity className="w-4 h-4 text-cyan-400" />}
      subtitle="Raw tri-axial magnetic sensor telemetry &bull; Provisional Survey Units"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}
            />
            <Line
              type="monotone"
              dataKey="bx"
              name="Bx Vector"
              stroke="#38bdf8"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 4, fill: '#38bdf8' }}
            />
            <Line
              type="monotone"
              dataKey="by"
              name="By Vector"
              stroke="#818cf8"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 4, fill: '#818cf8' }}
            />
            <Line
              type="monotone"
              dataKey="bz"
              name="Bz Vector"
              stroke="#c084fc"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 4, fill: '#c084fc' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
