'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import type { BurndownPoint } from '@/types'
import { cn } from '@/lib/utils'

interface BurndownChartProps {
  data: BurndownPoint[]
  className?: string
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string; dataKey: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className={cn(
      'rounded-xl px-4 py-3',
      'bg-[#1a1a1f] border border-white/10',
      'shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
    )}>
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-400 capitalize">{entry.name}:</span>
          <span className="font-semibold text-white">{entry.value} pts</span>
        </div>
      ))}
    </div>
  )
}

export function BurndownChart({ data, className }: BurndownChartProps) {
  return (
    <div className={cn('w-full h-64', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '12px' }}
            formatter={(value) => (
              <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'capitalize' }}>
                {value}
              </span>
            )}
          />
          {/* Ideal line */}
          <Line
            type="monotone"
            dataKey="ideal"
            name="Ideal"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
          {/* Actual line */}
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="#22d3ee"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#22d3ee' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
