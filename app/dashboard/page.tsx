'use client'

import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Sprint, Ticket, MicroTask, DailyFocus, TicketWithTasks } from '@/types'
import { computeDailyFocus } from '@/lib/focus'
import { computeFeasibilityFull } from '@/lib/feasibility'
import { toISODate } from '@/lib/utils'
import { DailyFocusWidget } from '@/components/focus/daily-focus-widget'
import { FeasibilityBanner } from '@/components/shared/feasibility-banner'
import { MicroTaskList } from '@/components/tickets/micro-task-list'
import { TicketCard } from '@/components/tickets/ticket-card'
import { TicketForm } from '@/components/tickets/ticket-form'
import { Plus, Calendar } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useState } from 'react'

export default function DashboardPage() {
  const { activeSprintId } = useAppStore()
  const supabase = createClient()
  const today = toISODate(new Date())
  const [showTicketForm, setShowTicketForm] = useState(false)

  const queryKey = ['sprint-detail', activeSprintId ?? ''] as string[]

  const { data: sprint } = useQuery<Sprint | null>({
    queryKey: ['sprint', activeSprintId],
    queryFn: async () => {
      if (!activeSprintId) return null
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('id', activeSprintId)
        .single()
      if (error) return null
      return data
    },
    enabled: !!activeSprintId,
  })

  const { data: tickets = [] } = useQuery<TicketWithTasks[]>({
    queryKey,
    queryFn: async () => {
      if (!activeSprintId) return []
      const { data, error } = await supabase
        .from('tickets')
        .select('*, micro_tasks(*)')
        .eq('sprint_id', activeSprintId)
        .order('created_at')
      if (error) return []
      return data ?? []
    },
    enabled: !!activeSprintId,
  })

  const { data: todayFocus } = useQuery<DailyFocus | null>({
    queryKey: ['daily-focus', activeSprintId],
    queryFn: async () => {
      if (!activeSprintId) return null
      const { data } = await supabase
        .from('daily_focus')
        .select('*')
        .eq('sprint_id', activeSprintId)
        .eq('date', today)
        .maybeSingle()
      return data
    },
    enabled: !!activeSprintId,
  })

  if (!activeSprintId || !sprint) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-4xl mb-4">🚀</div>
        <h2 className="text-xl font-semibold dark:text-white text-stone-900 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          No Sprint Active
        </h2>
        <p className="text-sm dark:text-slate-400 text-stone-500 mb-6">
          Create a sprint to start tracking your work.
        </p>
        <a
          href="/sprints/new"
          className="btn-primary rounded-xl px-6 py-2.5 text-sm font-medium text-white"
        >
          Create Sprint
        </a>
      </div>
    )
  }

  const rawTickets = tickets as Ticket[]
  const focusResult = computeDailyFocus(rawTickets, todayFocus ?? null, sprint.end_date)
  const feasibility = computeFeasibilityFull(rawTickets, sprint.start_date, sprint.end_date)
  const focusTicket = tickets.find(t => t.id === focusResult.ticket?.id) ?? null
  const focusMicroTasks = focusTicket?.micro_tasks ?? []

  const inProgressOther = tickets.filter(t =>
    t.id !== focusTicket?.id &&
    (t.status === 'in_progress' || t.status === 'review')
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm dark:text-slate-500 text-stone-400 mb-1">
            <Calendar size={14} />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-2xl font-bold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
            Today&apos;s Focus
          </h1>
        </div>
        <button
          onClick={() => setShowTicketForm(true)}
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} />
          <span className="hidden sm:block">Add Ticket</span>
        </button>
      </div>

      {/* Focus widget */}
      <DailyFocusWidget
        focusTicket={focusResult.ticket}
        todayFocus={todayFocus ?? null}
        sprint={sprint}
        allTickets={rawTickets}
        riskScore={focusResult.risk_score}
        isManual={focusResult.is_manual}
      />

      {/* Micro-tasks for focus ticket */}
      {focusTicket && (
        <div className={cn(
          'rounded-2xl p-5 border',
          'dark:bg-[#1a1a1f] bg-white',
          'dark:border-white/6 border-black/8'
        )}>
          <h2 className="text-sm font-semibold dark:text-slate-300 text-stone-700 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Tasks — {focusTicket.name}
          </h2>
          <MicroTaskList
            tasks={focusMicroTasks}
            ticketId={focusTicket.id}
            showAC={true}
            queryKey={queryKey}
          />
        </div>
      )}

      {/* Feasibility banner */}
      <FeasibilityBanner feasibility={feasibility} />

      {/* Other in-progress tickets */}
      {inProgressOther.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold dark:text-slate-400 text-stone-500 mb-3 uppercase tracking-wide">
            Also In Progress
          </h2>
          <div className="space-y-2">
            {inProgressOther.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} compact />
            ))}
          </div>
        </div>
      )}

      {/* Sprint info */}
      <div className="text-xs dark:text-slate-600 text-stone-400 text-center">
        {sprint.name} · {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)}
      </div>

      {/* Ticket form modal */}
      {showTicketForm && (
        <TicketForm
          sprintId={activeSprintId}
          onClose={() => setShowTicketForm(false)}
          queryKey={queryKey}
        />
      )}
    </div>
  )
}
