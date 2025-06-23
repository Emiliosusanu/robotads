
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChart2, Loader2 } from 'lucide-react';

const PerformanceChart = ({ data, dataKey, dataKeyPrev, name, strokeColor, prevStrokeColor, formatTick, yAxisLabel, isLoading }) => {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <Loader2 className="animate-spin text-primary" size={32}/>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <BarChart2 size={32} className="mr-2"/> No data for chart
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatTick} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10, dx: -5 }}/>
        <Tooltip
          contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))" }}
          formatter={(value, name, props) => [`${formatTick ? formatTick(value) : value}`, name]}
        />
        <Legend wrapperStyle={{fontSize: "12px"}}/>
        <Line type="monotone" dataKey={dataKey} name={name} stroke={strokeColor} strokeWidth={2} dot={{ r:3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey={dataKeyPrev} name={`${name} (Prev.)`} stroke={prevStrokeColor} strokeWidth={2} strokeDasharray="5 5" dot={{ r:3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PerformanceChart;
