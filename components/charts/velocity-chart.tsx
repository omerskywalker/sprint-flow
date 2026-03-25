'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'

export interface VelocityPoint {
  name: string       // truncated sprint name
  fullName: string   // full sprint name for tooltip
  completed: number  // story points completed
  total: number      // total story points
  rate: number       // completion % (0-100)
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const entry = item as unknown as { payload: VelocityPoint }
  const d = entry.payload
  return (
    <div className={cn(
      'rounded-xl px-4 py-3',
      'bg-[#1a1a1f] border border-white/10',
      'shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
    )}>
      <p className="text-xs text-slate-400 mb-2 max-w-[180px] truncate">{d.fullName}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-slate-400">Completed:</span>
          <span className="font-semibold text-white">{d.completed} pts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="text-slate-400">Total:</span>
          <span className="font-semibold text-white">{d.total} pts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Rate:</span>
          <span className="font-semibold text-emerald-400">{d.rate}%</span>
        </div>
      </div>
    </div>
  )
}

interface VelocityChartProps {
  data: VelocityPoint[]
  className?: string
}

export function VelocityChart({ data, className }: VelocityChartProps) {
  if (data.length === 0) {
    return (
      <div className={cn('w-full h-64 flex items-center justify-center', className)}>
        <p className="text-sm text-slate-500">No sprint data yet</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full h-64', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          barGap={2}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          {/* Total (background) */}
          <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="rgba(255,255,255,0.08)" />

          {/* Completed (foreground) */}
          <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.rate >= 80
                    ? '#22d3ee'   // cyan — good
                    : entry.rate >= 50
                    ? '#f59e0b'   // amber — partial
                    : '#f87171'  // red — low
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
