'use client'

import { useState } from 'react'
import { Target, RefreshCw, ChevronDown, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusRiskLevel } from '@/lib/focus'
import { pointsToHours, statusLabel } from '@/lib/utils'
import { TagBadge } from '@/components/shared/tag-badge'
import type { Ticket, DailyFocus, Sprint } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toISODate } from '@/lib/utils'
import { toast } from '@/components/shared/toast'

interface DailyFocusWidgetProps {
  focusTicket: Ticket | null
  todayFocus: DailyFocus | null
  sprint: Sprint
  allTickets: Ticket[]
  riskScore: number
  isManual: boolean
}

export function DailyFocusWidget({
  focusTicket,
  todayFocus,
  sprint,
  allTickets,
  riskScore,
  isManual,
}: DailyFocusWidgetProps) {
  const [overrideOpen, setOverrideOpen] = useState(false)
  const queryClient = useQueryClient()
  const supabase = createClient()

  const nonDoneTickets = allTickets.filter(t => t.status !== 'done')
  const riskLevel = focusRiskLevel(riskScore)

  const overrideMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const today = toISODate(new Date())
      if (todayFocus) {
        const { error } = await supabase
          .from('daily_focus')
          .update({ ticket_id: ticketId, is_manual: true })
          .eq('id', todayFocus.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('daily_focus')
          .insert({
            user_id: user.id,
            sprint_id: sprint.id,
            date: today,
            ticket_id: ticketId,
            is_manual: true,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-focus', sprint.id] })
      setOverrideOpen(false)
    },
    onError: () => toast('Failed to update focus'),
  })

  const resetToAlgo = useMutation({
    mutationFn: async () => {
      if (!todayFocus) return
      const { error } = await supabase
        .from('daily_focus')
        .update({ is_manual: false })
        .eq('id', todayFocus.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-focus', sprint.id] })
    },
    onError: () => toast('Failed to reset focus'),
  })

  const glowClass = riskLevel === 'high' ? 'glow-amber' : 'glow-cyan animate-pulse-glow'
  const borderClass = riskLevel === 'high'
    ? 'border-amber-500/30'
    : riskLevel === 'medium'
    ? 'border-cyan-500/30'
    : 'border-cyan-500/20'

  if (!focusTicket) {
    return (
      <div className={cn(
        'rounded-2xl p-6 border',
        'dark:bg-[#1a1a1f] bg-white',
        'border-emerald-500/20 bg-emerald-500/5',
      )}>
        <div className="flex items-center gap-3">
          <CheckCircle2 size={24} className="text-emerald-400" />
          <div>
            <h3 className="font-semibold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
              All Done!
            </h3>
            <p className="text-sm dark:text-slate-400 text-stone-500">
              No remaining tickets in this sprint. Great work!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-2xl p-5 border transition-shadow',
      'dark:bg-[#1a1a1f] bg-white',
      borderClass,
      glowClass
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            riskLevel === 'high' ? 'bg-amber-500/15' : 'bg-cyan-500/15'
          )}>
            <Target size={20} className={riskLevel === 'high' ? 'text-amber-400' : 'text-cyan-400'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono dark:text-slate-500 text-stone-500">
                {focusTicket.ticket_number}
              </span>
              <span className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                riskLevel === 'high'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-cyan-500/15 text-cyan-400'
              )}>
                {riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Medium Priority' : 'Focus'}
              </span>
              {isManual && (
                <span className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full">
                  Manual
                </span>
              )}
            </div>
            <h3 className="font-semibold dark:text-white text-stone-900 text-sm leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
              {focusTicket.name}
            </h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full border',
                'dark:bg-white/5 bg-black/5',
                'dark:text-slate-400 text-stone-500',
                'dark:border-white/8 border-black/8'
              )}>
                {focusTicket.story_points}pt · {pointsToHours(focusTicket.story_points)}h
              </span>
              <span className="text-xs dark:text-slate-500 text-stone-400">
                {statusLabel(focusTicket.status)}
              </span>
              {focusTicket.tags.map(tag => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          </div>
        </div>

        {/* Override controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isManual && (
            <button
              onClick={() => resetToAlgo.mutate()}
              title="Reset to algorithm"
              className="rounded-lg p-1.5 dark:text-slate-500 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setOverrideOpen(v => !v)}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                'dark:bg-white/6 bg-black/5',
                'dark:text-slate-400 text-stone-500',
                'dark:hover:bg-white/10 hover:bg-black/10',
                'border dark:border-white/8 border-black/8'
              )}
            >
              Override
              <ChevronDown size={12} />
            </button>

            {overrideOpen && (
              <div className={cn(
                'absolute right-0 top-full mt-1 w-56 rounded-xl py-1 z-50',
                'dark:bg-[#1a1a1f] bg-white',
                'border dark:border-white/10 border-black/10',
                'shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
              )}>
                <p className="px-3 py-1.5 text-xs dark:text-slate-500 text-stone-400 font-medium uppercase tracking-wide">
                  Set Focus
                </p>
                {nonDoneTickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => overrideMutation.mutate(t.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm transition-colors',
                      'dark:text-slate-300 text-stone-700',
                      'dark:hover:bg-white/6 hover:bg-black/4',
                      t.id === focusTicket.id && 'dark:text-cyan-400 text-blue-600'
                    )}
                  >
                    <span className="font-mono text-xs dark:text-slate-500 text-stone-400 mr-2">
                      {t.ticket_number}
                    </span>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
