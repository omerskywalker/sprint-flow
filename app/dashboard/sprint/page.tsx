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
import { Plus, BarChart2, Columns, List, Pencil, Trash2, ArrowUpDown, Settings, X, Filter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/shared/toast'
import { SprintSkeleton } from '@/components/shared/skeleton'

const VIEW_TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
  { id: 'burndown', label: 'Burndown', icon: BarChart2 },
  { id: 'kanban',   label: 'Kanban',   icon: Columns },
  { id: 'list',     label: 'List',     icon: List },
]

export default function SprintPage() {
  const { activeSprintId, viewMode, setViewMode, setActiveSprintId } = useAppStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [deleteTicket, setDeleteTicket] = useState<Ticket | null>(null)
  const [sortField, setSortField] = useState<'story_points' | 'status' | 'ticket_number'>('ticket_number')
  const [showSprintSettings, setShowSprintSettings] = useState(false)
  const [showDeleteSprint, setShowDeleteSprint] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 'n' shortcut → new ticket (only when not typing)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowTicketForm(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const queryKey = ['sprint-detail', activeSprintId ?? ''] as string[]

  const { data: sprint, isLoading: sprintLoading } = useQuery<Sprint | null>({
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

  // For each ticket, find the earliest 'completed' audit entry so we can
  // reconstruct the true historical burndown line.
  const { data: ticketCompletions = [] } = useQuery<{ completedAt: string; points: number }[]>({
    queryKey: ['burndown-completions', activeSprintId],
    queryFn: async () => {
      if (!activeSprintId || tickets.length === 0) return []
      const ticketIds = tickets.map(t => t.id)
      const pointsById = Object.fromEntries(tickets.map(t => [t.id, t.story_points]))

      const { data } = await supabase
        .from('audit_log')
        .select('entity_id, created_at')
        .eq('entity_type', 'ticket')
        .eq('action', 'completed')
        .in('entity_id', ticketIds)
        .order('created_at', { ascending: true })

      if (!data) return []

      // Keep only the earliest completion per ticket
      const earliest = new Map<string, string>()
      for (const row of data) {
        if (!earliest.has(row.entity_id)) {
          earliest.set(row.entity_id, row.created_at)
        }
      }

      return Array.from(earliest.entries()).map(([id, completedAt]) => ({
        completedAt,
        points: pointsById[id] ?? 0,
      }))
    },
    enabled: !!activeSprintId && tickets.length > 0,
  })

  const deleteMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('tickets').delete().eq('id', ticketId)
      if (error) throw error
      await supabase.from('audit_log').insert({
        user_id: user?.id,
        entity_type: 'ticket',
        entity_id: ticketId,
        action: 'deleted',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setDeleteTicket(null)
    },
    onError: () => toast('Failed to delete ticket'),
  })

  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('sprints')
        .update({ name })
        .eq('id', activeSprintId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprint', activeSprintId] })
      queryClient.invalidateQueries({ queryKey: ['sprints'] })
      setShowSprintSettings(false)
    },
    onError: () => toast('Failed to rename sprint'),
  })

  const deleteSprintMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sprints').delete().eq('id', activeSprintId!)
      if (error) throw error
    },
    onSuccess: () => {
      setActiveSprintId(null)
      queryClient.invalidateQueries({ queryKey: ['sprints'] })
      setShowDeleteSprint(false)
      setShowSprintSettings(false)
      router.push('/dashboard')
    },
    onError: () => toast('Failed to delete sprint'),
  })

  const bulkStatusMutation = useMutation({
    mutationFn: async (status: TicketStatus) => {
      const ids = Array.from(selectedIds)
      const { error } = await supabase
        .from('tickets')
        .update({ status })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setSelectedIds(new Set())
    },
    onError: () => toast('Failed to update tickets'),
  })

  if (sprintLoading) return <SprintSkeleton />

  if (!activeSprintId || !sprint) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="dark:text-slate-400 text-stone-500">No active sprint. Create one to get started.</p>
      </div>
    )
  }

  const rawTickets = tickets as Ticket[]
  const feasibility = computeFeasibilityFull(rawTickets, sprint.start_date, sprint.end_date)
  const burndownData = buildBurndownData(rawTickets, sprint.start_date, sprint.end_date, ticketCompletions)

  const doneTickets = tickets.filter(t => t.status === 'done').length
  const totalPoints = rawTickets.reduce((acc, t) => acc + t.story_points, 0)
  const donePoints = rawTickets.filter(t => t.status === 'done').reduce((acc, t) => acc + t.story_points, 0)
  const overallPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0

  // Collect all tags across sprint tickets for filter chips
  const allTags = Array.from(new Set(tickets.flatMap(t => t.tags))).sort()

  const filteredTickets = tickets.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false
    if (filterTag && !t.tags.includes(filterTag)) return false
    return true
  })

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortField === 'story_points') return b.story_points - a.story_points
    if (sortField === 'status') {
      const order: Record<TicketStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 }
      return order[a.status] - order[b.status]
    }
    return a.ticket_number.localeCompare(b.ticket_number)
  })

  const hasFilters = filterStatus !== null || filterTag !== null

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
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setRenameValue(sprint.name); setShowSprintSettings(true) }}
            className="rounded-xl p-2 dark:bg-white/6 bg-black/5 dark:text-slate-400 text-stone-500 dark:hover:bg-white/10 hover:bg-black/10 transition-colors border dark:border-white/8 border-black/8"
            title="Sprint settings"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={() => setShowTicketForm(true)}
            className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white"
          >
            <Plus size={16} />
            Add Ticket
          </button>
        </div>
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

      {/* Filter chips — shown on kanban and list views */}
      {(viewMode === 'kanban' || viewMode === 'list') && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="dark:text-slate-600 text-stone-400 shrink-0" />

          {/* Status filters */}
          {(['todo', 'in_progress', 'review', 'done'] as TicketStatus[]).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? null : status)}
              className={cn(
                'tag-badge border transition-all',
                filterStatus === status
                  ? 'dark:bg-cyan-500/20 bg-cyan-100 dark:text-cyan-300 text-cyan-700 dark:border-cyan-500/40 border-cyan-300'
                  : 'dark:bg-white/4 bg-black/4 dark:text-slate-500 text-stone-400 dark:border-white/8 border-black/8 dark:hover:bg-white/8 hover:bg-black/6'
              )}
            >
              {statusLabel(status)}
            </button>
          ))}

          {/* Tag filters */}
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={cn(
                'tag-badge border transition-all',
                filterTag === tag
                  ? 'dark:bg-violet-500/20 bg-violet-100 dark:text-violet-300 text-violet-700 dark:border-violet-500/40 border-violet-300'
                  : 'dark:bg-white/4 bg-black/4 dark:text-slate-500 text-stone-400 dark:border-white/8 border-black/8 dark:hover:bg-white/8 hover:bg-black/6'
              )}
            >
              {tag}
            </button>
          ))}

          {hasFilters && (
            <button
              onClick={() => { setFilterStatus(null); setFilterTag(null) }}
              className="flex items-center gap-1 text-xs dark:text-slate-600 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600 ml-1"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
      )}

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
        <KanbanBoard tickets={filteredTickets} queryKey={queryKey} />
      )}

      {/* List tab */}
      {viewMode === 'list' && (
        <div>
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 border',
              'dark:bg-cyan-500/10 bg-cyan-50',
              'dark:border-cyan-500/20 border-cyan-200'
            )}>
              <span className="text-sm font-medium dark:text-cyan-300 text-cyan-700">
                {selectedIds.size} selected
              </span>
              <span className="dark:text-cyan-800 text-cyan-300">·</span>
              <span className="text-xs dark:text-slate-400 text-stone-500 mr-1">Move to:</span>
              {(['todo', 'in_progress', 'review', 'done'] as TicketStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => bulkStatusMutation.mutate(s)}
                  disabled={bulkStatusMutation.isPending}
                  className={cn(
                    'tag-badge border transition-all disabled:opacity-50',
                    'dark:bg-white/8 bg-black/5 dark:text-slate-300 text-stone-700',
                    'dark:border-white/10 border-black/10',
                    'dark:hover:bg-white/14 hover:bg-black/10'
                  )}
                >
                  {statusLabel(s)}
                </button>
              ))}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs dark:text-slate-500 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600"
              >
                <X size={13} />
              </button>
            </div>
          )}

          <div className={cn(
            'rounded-2xl border overflow-hidden',
            'dark:bg-[#1a1a1f] bg-white',
            'dark:border-white/6 border-black/8'
          )}>
            {/* Table header */}
            <div className={cn(
              'grid grid-cols-[28px_40px_1fr_80px_140px_120px_100px_80px] gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wide',
              'dark:text-slate-500 text-stone-400',
              'dark:border-b dark:border-white/6 border-b border-black/8'
            )}>
              <input
                type="checkbox"
                className="rounded"
                checked={sortedTickets.length > 0 && sortedTickets.every(t => selectedIds.has(t.id))}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedIds(new Set(sortedTickets.map(t => t.id)))
                  } else {
                    setSelectedIds(new Set())
                  }
                }}
              />
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
              const isSelected = selectedIds.has(ticket.id)

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'grid grid-cols-[28px_40px_1fr_80px_140px_120px_100px_80px] gap-2 px-4 py-3 items-center transition-colors',
                    isSelected
                      ? 'dark:bg-cyan-500/5 bg-cyan-50'
                      : 'dark:hover:bg-white/3 hover:bg-black/2',
                    i < sortedTickets.length - 1 && 'dark:border-b dark:border-white/4 border-b border-black/6'
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={isSelected}
                    onChange={e => {
                      const next = new Set(selectedIds)
                      if (e.target.checked) next.add(ticket.id)
                      else next.delete(ticket.id)
                      setSelectedIds(next)
                    }}
                  />
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

            {sortedTickets.length === 0 && (
              <div className="flex items-center justify-center py-16 text-sm dark:text-slate-600 text-stone-400">
                {hasFilters ? 'No tickets match the current filters.' : 'No tickets yet. Add some above.'}
              </div>
            )}
          </div>
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

      <DeleteConfirmModal
        open={showDeleteSprint}
        title="Delete Sprint"
        description={`Delete "${sprint.name}"? All tickets, tasks, contacts, and resources will be permanently removed.`}
        onConfirm={() => deleteSprintMutation.mutate()}
        onCancel={() => setShowDeleteSprint(false)}
        loading={deleteSprintMutation.isPending}
      />

      {/* Sprint settings modal */}
      {showSprintSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSprintSettings(false)} />
          <div className={cn(
            'relative w-full max-w-sm rounded-2xl p-6 animate-fade-in',
            'dark:bg-[#1a1a1f] bg-white',
            'border dark:border-white/8 border-black/8',
            'shadow-[0_8px_48px_rgba(0,0,0,0.5)]'
          )}>
            <button
              onClick={() => setShowSprintSettings(false)}
              className="absolute right-4 top-4 rounded-lg p-1 dark:text-slate-400 text-stone-400 dark:hover:text-slate-200 hover:text-stone-700 transition-colors"
            >
              <X size={16} />
            </button>
            <h2 className="text-lg font-semibold dark:text-white text-stone-900 mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              Sprint Settings
            </h2>

            {/* Rename */}
            <div className="mb-5">
              <label className="text-xs dark:text-slate-500 text-stone-400 mb-1.5 block">Sprint Name</label>
              <input
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && renameValue.trim()) renameMutation.mutate(renameValue.trim())
                }}
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-sm',
                  'dark:bg-white/5 bg-black/4',
                  'dark:text-slate-200 text-stone-800',
                  'dark:border-white/10 border-black/10 border',
                  'focus:outline-none focus:ring-2 focus:ring-cyan-500/30'
                )}
              />
              <button
                onClick={() => renameValue.trim() && renameMutation.mutate(renameValue.trim())}
                disabled={renameMutation.isPending || !renameValue.trim() || renameValue.trim() === sprint.name}
                className="mt-2 btn-primary rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-40 w-full"
              >
                {renameMutation.isPending ? 'Saving…' : 'Save Name'}
              </button>
            </div>

            {/* Danger zone */}
            <div className={cn(
              'rounded-xl p-4 border',
              'dark:bg-red-500/5 bg-red-50',
              'dark:border-red-500/20 border-red-200'
            )}>
              <p className="text-xs font-medium text-red-400 mb-1">Danger Zone</p>
              <p className="text-xs dark:text-slate-500 text-stone-500 mb-3">
                Permanently deletes all tickets, tasks, and audit history for this sprint.
              </p>
              <button
                onClick={() => setShowDeleteSprint(true)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-400 dark:bg-red-500/10 bg-red-100 dark:hover:bg-red-500/20 hover:bg-red-200 transition-colors"
              >
                <Trash2 size={14} />
                Delete Sprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
