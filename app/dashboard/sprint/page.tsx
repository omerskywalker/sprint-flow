'use client'

import { useAppStore } from '@/lib/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Sprint, Ticket, TicketWithTasks, TicketStatus, ViewMode } from '@/types'
import { computeFeasibilityFull, buildBurndownData } from '@/lib/feasibility'
import { cn, formatDate, statusLabel, statusColor, pointsToHours } from '@/lib/utils'
import { FeasibilityBanner } from '@/components/shared/feasibility-banner'
import { BurndownChart } from '@/components/charts/burndown-chart'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { TicketForm } from '@/components/tickets/ticket-form'
import { DeleteConfirmModal } from '@/components/shared/delete-confirm-modal'
import { TagBadge } from '@/components/shared/tag-badge'
import Link from 'next/link'
import { Plus, BarChart2, Columns, List, Pencil, Trash2, ArrowUpDown } from 'lucide-react'
import { useState } from 'react'

const VIEW_TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: 'burndown', label: 'Burndown', icon: BarChart2 },
  { id: 'kanban',   label: 'Kanban',   icon: Columns },
  { id: 'list',     label: 'List',     icon: List },
]

export default function SprintPage() {
  const { activeSprintId, viewMode, setViewMode } = useAppStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [deleteTicket, setDeleteTicket] = useState<Ticket | null>(null)
  const [sortField, setSortField] = useState<'story_points' | 'status' | 'ticket_number'>('ticket_number')

  const queryKey = ['sprint-detail', activeSprintId ?? ''] as string[]

  const { data: sprint } = useQuery<Sprint | null>({
    queryKey: ['sprint', activeSprintId],
    queryFn: async () => {
      if (!activeSprintId) return null
      const { data } = await supabase.from('sprints').select('*').eq('id', activeSprintId).single()
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

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.from('tickets').delete().eq('id', ticketId)
      if (error) throw error
      await supabase.from('audit_log').insert({
        entity_type: 'ticket',
        entity_id: ticketId,
        action: 'deleted',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setDeleteTicket(null)
    },
  })

  if (!activeSprintId || !sprint) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="dark:text-slate-400 text-stone-500">No active sprint. Create one to get started.</p>
      </div>
    )
  }

  const rawTickets = tickets as Ticket[]
  const feasibility = computeFeasibilityFull(rawTickets, sprint.start_date, sprint.end_date)
  const burndownData = buildBurndownData(rawTickets, sprint.start_date, sprint.end_date)

  const doneTickets = tickets.filter(t => t.status === 'done').length
  const totalPoints = rawTickets.reduce((acc, t) => acc + t.story_points, 0)
  const donePoints = rawTickets.filter(t => t.status === 'done').reduce((acc, t) => acc + t.story_points, 0)
  const overallPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0

  const sortedTickets = [...tickets].sort((a, b) => {
    if (sortField === 'story_points') return b.story_points - a.story_points
    if (sortField === 'status') {
      const order: Record<TicketStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 }
      return order[a.status] - order[b.status]
    }
    return a.ticket_number.localeCompare(b.ticket_number)
  })

  return (
    <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
      {/* Sprint header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
            {sprint.name}
          </h1>
          <p className="text-sm dark:text-slate-400 text-stone-500 mt-1">
            {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)} ·{' '}
            {doneTickets}/{tickets.length} tickets done
          </p>
          {/* Overall progress */}
          <div className="mt-3 flex items-center gap-3">
            <div className="progress-bar w-48">
              <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
            </div>
            <span className="text-sm font-medium dark:text-slate-300 text-stone-600">
              {overallPct}%
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowTicketForm(true)}
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shrink-0"
        >
          <Plus size={16} />
          Add Ticket
        </button>
      </div>

      {/* View tabs */}
      <div className={cn(
        'inline-flex items-center gap-1 rounded-xl p-1',
        'dark:bg-white/5 bg-black/5',
        'border dark:border-white/6 border-black/6'
      )}>
        {VIEW_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                viewMode === tab.id
                  ? 'dark:bg-white/10 bg-white dark:text-white text-stone-900 shadow-sm'
                  : 'dark:text-slate-500 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600'
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Burndown tab */}
      {viewMode === 'burndown' && (
        <div className="space-y-4">
          <div className={cn(
            'rounded-2xl p-5 border',
            'dark:bg-[#1a1a1f] bg-white',
            'dark:border-white/6 border-black/8'
          )}>
            <h2 className="text-sm font-semibold dark:text-slate-300 text-stone-700 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Burndown Chart
            </h2>
            <BurndownChart data={burndownData} />
          </div>
          <FeasibilityBanner feasibility={feasibility} />
        </div>
      )}

      {/* Kanban tab */}
      {viewMode === 'kanban' && (
        <KanbanBoard tickets={tickets} queryKey={queryKey} />
      )}

      {/* List tab */}
      {viewMode === 'list' && (
        <div className={cn(
          'rounded-2xl border overflow-hidden',
          'dark:bg-[#1a1a1f] bg-white',
          'dark:border-white/6 border-black/8'
        )}>
          {/* Table header */}
          <div className={cn(
            'grid grid-cols-[40px_1fr_80px_140px_120px_100px_80px] gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wide',
            'dark:text-slate-500 text-stone-400',
            'dark:border-b dark:border-white/6 border-b border-black/8'
          )}>
            <span>#</span>
            <span>Ticket</span>
            <button
              onClick={() => setSortField('story_points')}
              className="flex items-center gap-1 hover:dark:text-slate-300 hover:text-stone-600"
            >
              Points <ArrowUpDown size={10} />
            </button>
            <span>Tags</span>
            <button
              onClick={() => setSortField('status')}
              className="flex items-center gap-1 hover:dark:text-slate-300 hover:text-stone-600"
            >
              Status <ArrowUpDown size={10} />
            </button>
            <span>Progress</span>
            <span>Actions</span>
          </div>

          {sortedTickets.map((ticket, i) => {
            const doneTasks = ticket.micro_tasks?.filter(t => t.completed).length ?? 0
            const totalTasks = ticket.micro_tasks?.length ?? 0
            const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

            return (
              <div
                key={ticket.id}
                className={cn(
                  'grid grid-cols-[40px_1fr_80px_140px_120px_100px_80px] gap-2 px-4 py-3 items-center',
                  'dark:hover:bg-white/3 hover:bg-black/2 transition-colors',
                  i < sortedTickets.length - 1 && 'dark:border-b dark:border-white/4 border-b border-black/6'
                )}
              >
                <span className="text-xs font-mono dark:text-slate-600 text-stone-400">
                  {ticket.ticket_number}
                </span>
                <Link
                  href={`/dashboard/tickets/${ticket.id}`}
                  className="text-sm font-medium dark:text-slate-200 text-stone-800 hover:dark:text-white hover:text-stone-900 truncate"
                >
                  {ticket.name}
                </Link>
                <span className="text-sm dark:text-slate-400 text-stone-600">
                  {ticket.story_points}pt
                  <span className="text-xs dark:text-slate-600 text-stone-400 ml-1">
                    ({pointsToHours(ticket.story_points)}h)
                  </span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {ticket.tags.slice(0, 2).map(tag => (
                    <TagBadge key={tag} tag={tag} />
                  ))}
                </div>
                <span className={cn('text-xs font-medium', statusColor(ticket.status))}>
                  {statusLabel(ticket.status)}
                </span>
                <div>
                  {totalTasks > 0 ? (
                    <div>
                      <div className="progress-bar mb-1">
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs dark:text-slate-600 text-stone-400">{pct}%</span>
                    </div>
                  ) : (
                    <span className="text-xs dark:text-slate-700 text-stone-300">—</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingTicket(ticket)}
                    className="rounded p-1.5 dark:text-slate-600 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteTicket(ticket)}
                    className="rounded p-1.5 dark:text-slate-600 text-stone-400 dark:hover:text-red-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}

          {tickets.length === 0 && (
            <div className="flex items-center justify-center py-16 text-sm dark:text-slate-600 text-stone-400">
              No tickets yet. Add some above.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(showTicketForm || editingTicket) && (
        <TicketForm
          sprintId={activeSprintId}
          ticket={editingTicket ?? undefined}
          onClose={() => {
            setShowTicketForm(false)
            setEditingTicket(null)
          }}
          queryKey={queryKey}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteTicket}
        title="Delete Ticket"
        description={`Delete "${deleteTicket?.name}"? All tasks, contacts, and resources will be removed.`}
        onConfirm={() => deleteTicket && deleteMutation.mutate(deleteTicket.id)}
        onCancel={() => setDeleteTicket(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
