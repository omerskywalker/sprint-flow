'use client'

import { TrendingUp, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeasibilityResult } from '@/types'

interface FeasibilityBannerProps {
  feasibility: FeasibilityResult
  className?: string
}

export function FeasibilityBanner({ feasibility, className }: FeasibilityBannerProps) {
  const { status, remaining_hours, available_hours, remaining_sprint_days } = feasibility

  const configs = {
    on_track: {
      icon: TrendingUp,
      label: 'On Track',
      description: `${remaining_hours}h of work fits within ${available_hours}h available (${remaining_sprint_days} days left).`,
      containerClass: 'border-emerald-500/20 bg-emerald-500/8',
      iconClass: 'text-emerald-400',
      labelClass: 'text-emerald-400',
      glow: '',
    },
    tight: {
      icon: AlertTriangle,
      label: 'Tight',
      description: `${remaining_hours}h remaining vs ${available_hours}h available. Push non-critical items.`,
      containerClass: 'border-amber-500/20 bg-amber-500/8',
      iconClass: 'text-amber-400',
      labelClass: 'text-amber-400',
      glow: 'glow-amber',
    },
    at_risk: {
      icon: XCircle,
      label: 'At Risk',
      description: `${remaining_hours}h of work exceeds ${available_hours}h available in ${remaining_sprint_days} days. Descope now.`,
      containerClass: 'border-red-500/20 bg-red-500/8',
      iconClass: 'text-red-400',
      labelClass: 'text-red-400',
      glow: 'glow-red',
    },
  }

  const config = configs[status]
  const Icon = config.icon
  const pct = available_hours > 0 ? Math.min((remaining_hours / available_hours) * 100, 100) : 0

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl px-4 py-3 border',
      config.containerClass,
      config.glow,
      className
    )}>
      <Icon size={18} className={config.iconClass} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('text-sm font-semibold', config.labelClass)}>
            {config.label}
          </span>
          <span className="text-xs dark:text-slate-500 text-stone-500">
            {config.description}
          </span>
        </div>
        {/* Progress bar */}
        <div className="progress-bar">
          <div
            className={cn(
              'progress-bar-fill',
              status === 'on_track' ? 'bg-emerald-400' :
              status === 'tight'    ? 'bg-amber-400' :
                                      'bg-red-400'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className={cn('text-xs font-mono font-medium whitespace-nowrap', config.labelClass)}>
        {remaining_hours}h / {available_hours}h
      </span>
    </div>
  )
}
