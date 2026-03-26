"use client";

import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const lineData = [
    { name: 'Jan', total: 4000, organic: 2400 },
    { name: 'Feb', total: 3000, organic: 1398 },
    { name: 'Mar', total: 2000, organic: 9800 },
    { name: 'Apr', total: 2780, organic: 3908 },
    { name: 'May', total: 1890, organic: 4800 },
    { name: 'Jun', total: 3390, organic: 3800 },
    { name: 'Jul', total: 3490, organic: 4300 },
    { name: 'Aug', total: 2000, organic: 5000 },
    { name: 'Sep', total: 2780, organic: 3908 },
    { name: 'Oct', total: 1890, organic: 4800 },
    { name: 'Nov', total: 2390, organic: 3800 },
    { name: 'Dec', total: 3490, organic: 4300 },
];

const pieData = [
    { name: 'Group A', value: 400 },
    { name: 'Group B', value: 300 },
];
const COLORS = ['#ffffff', '#27272a'];

export function ReachBreakdownChart() {
    return (
        <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                />
                <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#fff"
                    strokeWidth={2}
                    dot={false}
                />
                <Line
                    type="monotone"
                    dataKey="organic"
                    stroke="#52525b"
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

export function AudienceDonut() {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={pieData}
                    innerRadius={30}
                    outerRadius={40}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
}

const aiData = [
    { name: '1', uv: 100 },
    { name: '2', uv: 150 },
    { name: '3', uv: 120 },
    { name: '4', uv: 250 },
    { name: '5', uv: 200 },
    { name: '6', uv: 350 },
    { name: '7', uv: 300 },
];

export function AIAssistantChart() {
    return (
        <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={aiData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="uv"
                    stroke="#fff"
                    strokeWidth={1}
                    fillOpacity={1}
                    fill="url(#colorUv)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
