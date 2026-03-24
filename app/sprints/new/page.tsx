'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { useMutation } from '@tanstack/react-query'
import { RoadmapPlanner, type PlannerTicket } from '@/components/roadmap/roadmap-planner'
import { cn, nthWorkingDay, toISODate } from '@/lib/utils'
import type { StoryPoints, TicketStatus } from '@/types'
import { Plus, X, Zap, ArrowLeft, ArrowRight, Rocket } from 'lucide-react'
import { TagBadge } from '@/components/shared/tag-badge'

const STORY_POINTS: StoryPoints[] = [1, 2, 3, 5, 8, 13]
const COMMON_TAGS = ['backend', 'frontend', 'bug', 'feature', 'design', 'devops', 'testing', 'docs']

let localIdCounter = 0
function makeLocalId() { return `local-${++localIdCounter}` }

export default function NewSprintPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setActiveSprintId } = useAppStore()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Sprint details
  const [sprintName, setSprintName] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    // Default to next Monday
    const dow = d.getDay()
    if (dow !== 1) {
      const diff = dow === 0 ? 1 : 8 - dow
      d.setDate(d.getDate() + diff)
    }
    return toISODate(d)
  })

  // Step 2: Tickets
  const [tickets, setTickets] = useState<PlannerTicket[]>([])
  const [ticketForm, setTicketForm] = useState({
    ticket_number: '',
    name: '',
    story_points: 3 as StoryPoints,
    tags: [] as string[],
  })

  // Derived end date (10 working days from start)
  const endDate = (() => {
    if (!startDate) return ''
    try {
      const start = new Date(startDate + 'T00:00:00')
      return toISODate(nthWorkingDay(start, 10))
    } catch { return '' }
  })()

  const launchMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create sprint
      const { data: sprint, error: sprintError } = await supabase
        .from('sprints')
        .insert({ user_id: user.id, name: sprintName, start_date: startDate, end_date: endDate })
        .select()
        .single()
      if (sprintError) throw sprintError

      // Create tickets with day assignments
      if (tickets.length > 0) {
        const ticketRows = tickets.map(t => ({
          sprint_id: sprint.id,
          user_id: user.id,
          ticket_number: t.ticket_number,
          name: t.name,
          story_points: t.story_points,
          status: 'todo' as TicketStatus,
          tags: t.tags,
          day_assigned: t.day_assigned,
          day_assigned_end: t.day_assigned_end ?? null,
        }))
        const { data: createdTickets, error: ticketError } = await supabase
          .from('tickets')
          .insert(ticketRows)
          .select()
        if (ticketError) throw ticketError

        // Audit log for each ticket
        if (createdTickets) {
          await supabase.from('audit_log').insert(
            createdTickets.map(t => ({
              user_id: user.id,
              entity_type: 'ticket' as const,
              entity_id: t.id,
              action: 'created' as const,
            }))
          )
        }
      }

      return sprint
    },
    onSuccess: (sprint) => {
      setActiveSprintId(sprint.id)
      router.push('/dashboard')
    },
  })

  const addTicket = () => {
    if (!ticketForm.ticket_number.trim() || !ticketForm.name.trim()) return
    setTickets(prev => [...prev, {
      localId: makeLocalId(),
      sprint_id: '',  // will be set on launch
      ticket_number: ticketForm.ticket_number.trim(),
      name: ticketForm.name.trim(),
      story_points: ticketForm.story_points,
      status: 'todo',
      tags: ticketForm.tags,
      day_assigned: null,
      day_assigned_end: null,
    }])
    setTicketForm(f => ({
      ...f,
      ticket_number: autoIncrement(ticketForm.ticket_number),
      name: '',
      tags: [],
    }))
  }

  const removeTicket = (localId: string) => {
    setTickets(prev => prev.filter(t => t.localId !== localId))
  }

  const totalHours = tickets.reduce((acc, t) => {
    const map: Record<number, number> = { 1: 4, 2: 8, 3: 12, 5: 20, 8: 32, 13: 52 }
    return acc + (map[t.story_points] ?? 0)
  }, 0)

  const capacity = 10 * 8  // 80h

  return (
    <div className="min-h-screen dark:bg-[#0e0e10] bg-[#f5f0eb]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b dark:border-white/6 border-black/8 dark:bg-[#0e0e10]/80 bg-white/80 backdrop-blur-sm px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
              <Zap size={15} className="text-white" fill="white" />
            </div>
            <span className="font-bold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
              SprintFlow
            </span>
            <span className="dark:text-slate-600 text-stone-400">/</span>
            <span className="text-sm dark:text-slate-400 text-stone-500">New Sprint</span>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {([1, 2, 3] as const).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  step === s
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-md'
                    : step > s
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'dark:bg-white/8 bg-black/8 dark:text-slate-500 text-stone-400'
                )}>
                  {s}
                </div>
                {s < 3 && <div className={cn('w-8 h-px', step > s ? 'bg-emerald-500/40' : 'dark:bg-white/10 bg-black/10')} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Step 1: Sprint Details ── */}
        {step === 1 && (
          <div className="max-w-lg mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold dark:text-white text-stone-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              Sprint Details
            </h1>
            <p className="text-sm dark:text-slate-400 text-stone-500 mb-8">
              Name your sprint and set the start date. End date is auto-calculated for 10 working days.
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium dark:text-slate-300 text-stone-700 mb-2 block">
                  Sprint Name
                </label>
                <input
                  value={sprintName}
                  onChange={e => setSprintName(e.target.value)}
                  placeholder="Sprint 1 — Authentication & Onboarding"
                  className={cn(
                    'w-full rounded-xl px-4 py-3 text-sm',
                    'dark:bg-[#1a1a1f] bg-white',
                    'dark:text-slate-200 text-stone-800',
                    'dark:border-white/10 border-black/10 border',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-500/30',
                    'placeholder:dark:text-slate-600 placeholder:text-stone-400'
                  )}
                />
              </div>

              <div>
                <label className="text-sm font-medium dark:text-slate-300 text-stone-700 mb-2 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={cn(
                    'w-full rounded-xl px-4 py-3 text-sm',
                    'dark:bg-[#1a1a1f] bg-white',
                    'dark:text-slate-200 text-stone-800',
                    'dark:border-white/10 border-black/10 border',
                    'focus:outline-none focus:ring-2 focus:ring-cyan-500/30'
                  )}
                />
              </div>

              {endDate && (
                <div className={cn(
                  'rounded-xl px-4 py-3 border',
                  'dark:bg-cyan-500/5 bg-cyan-50',
                  'dark:border-cyan-500/20 border-cyan-200'
                )}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="dark:text-slate-400 text-stone-500">End Date (10 working days)</span>
                    <span className="font-medium dark:text-cyan-400 text-cyan-600">
                      {new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-xl px-4 py-2.5 text-sm dark:bg-white/6 bg-black/5 dark:text-slate-400 text-stone-500 dark:hover:bg-white/10 hover:bg-black/10 transition-colors"
              >
                <ArrowLeft size={14} className="inline mr-1" />
                Cancel
              </button>
              <button
                disabled={!sprintName.trim() || !startDate || !endDate}
                onClick={() => setStep(2)}
                className="btn-primary flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Next: Add Tickets
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Add Tickets ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-2xl font-bold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Add Tickets
              </h1>
              <div className={cn(
                'text-sm px-3 py-1.5 rounded-xl border',
                totalHours > capacity
                  ? 'dark:bg-red-500/10 bg-red-50 dark:border-red-500/30 border-red-200 text-red-400'
                  : totalHours > capacity * 0.8
                  ? 'dark:bg-amber-500/10 bg-amber-50 dark:border-amber-500/30 border-amber-200 dark:text-amber-400 text-amber-600'
                  : 'dark:bg-emerald-500/10 bg-emerald-50 dark:border-emerald-500/30 border-emerald-200 dark:text-emerald-400 text-emerald-600'
              )}>
                {totalHours}h / {capacity}h capacity
              </div>
            </div>
            <p className="text-sm dark:text-slate-400 text-stone-500 mb-6">
              Add all tickets for this sprint. You&apos;ll assign them to days in the next step.
            </p>

            {/* Ticket input form */}
            <div className={cn(
              'rounded-2xl p-5 border mb-5',
              'dark:bg-[#1a1a1f] bg-white',
              'dark:border-white/6 border-black/8'
            )}>
              <div className="grid grid-cols-[100px_1fr] gap-3 mb-3">
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Ticket #</label>
                  <input
                    value={ticketForm.ticket_number}
                    onChange={e => setTicketForm(f => ({ ...f, ticket_number: e.target.value }))}
                    placeholder="SP-1"
                    className={cn(
                      'w-full rounded-xl px-3 py-2 text-sm font-mono',
                      'dark:bg-white/5 bg-black/4',
                      'dark:text-slate-200 text-stone-800',
                      'dark:border-white/10 border-black/10 border',
                      'focus:outline-none focus:ring-2 focus:ring-cyan-500/30'
                    )}
                  />
                </div>
                <div>
                  <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Name</label>
                  <input
                    value={ticketForm.name}
                    onChange={e => setTicketForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Implement user authentication…"
                    onKeyDown={e => e.key === 'Enter' && addTicket()}
                    className={cn(
                      'w-full rounded-xl px-3 py-2 text-sm',
                      'dark:bg-white/5 bg-black/4',
                      'dark:text-slate-200 text-stone-800',
                      'dark:border-white/10 border-black/10 border',
                      'focus:outline-none focus:ring-2 focus:ring-cyan-500/30'
                    )}
                  />
                </div>
              </div>

              {/* Story points picker */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs dark:text-slate-500 text-stone-400">Points:</span>
                {STORY_POINTS.map(pts => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setTicketForm(f => ({ ...f, story_points: pts }))}
                    className={cn(
                      'h-8 w-8 rounded-xl text-xs font-semibold transition-all',
                      ticketForm.story_points === pts
                        ? 'btn-primary text-white'
                        : 'dark:bg-white/6 bg-black/5 dark:text-slate-400 text-stone-500 dark:hover:bg-white/12 hover:bg-black/10 border dark:border-white/8 border-black/8'
                    )}
                  >
                    {pts}
                  </button>
                ))}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COMMON_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setTicketForm(f => ({
                        ...f,
                        tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
                      }))
                    }}
                    className={cn(
                      'tag-badge transition-all',
                      ticketForm.tags.includes(tag)
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'dark:bg-white/4 bg-black/4 dark:text-slate-500 text-stone-400 dark:hover:bg-white/8'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                onClick={addTicket}
                disabled={!ticketForm.ticket_number.trim() || !ticketForm.name.trim()}
                className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Plus size={14} />
                Add Ticket
              </button>
            </div>

            {/* Tickets list */}
            {tickets.length > 0 && (
              <div className={cn(
                'rounded-2xl border mb-5',
                'dark:bg-[#1a1a1f] bg-white',
                'dark:border-white/6 border-black/8'
              )}>
                {tickets.map((t, i) => (
                  <div
                    key={t.localId}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3',
                      i < tickets.length - 1 && 'border-b dark:border-white/4 border-black/6'
                    )}
                  >
                    <span className="text-xs font-mono dark:text-slate-600 text-stone-400 w-12 shrink-0">
                      {t.ticket_number}
                    </span>
                    <span className="flex-1 text-sm dark:text-slate-200 text-stone-800 truncate">{t.name}</span>
                    <span className="text-xs dark:text-slate-500 text-stone-400 shrink-0">{t.story_points}pt</span>
                    <div className="flex gap-1 shrink-0">
                      {t.tags.slice(0, 2).map(tag => <TagBadge key={tag} tag={tag} />)}
                    </div>
                    <button
                      onClick={() => removeTicket(t.localId)}
                      className="p-1 rounded dark:text-slate-600 text-stone-300 dark:hover:text-red-400 hover:text-red-500 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl px-4 py-2.5 text-sm dark:bg-white/6 bg-black/5 dark:text-slate-400 text-stone-500 dark:hover:bg-white/10 hover:bg-black/10 transition-colors"
              >
                <ArrowLeft size={14} className="inline mr-1" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-primary flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2"
              >
                Next: Plan Roadmap
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Roadmap ── */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h1 className="text-2xl font-bold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Roadmap Planner
                </h1>
                <p className="text-sm dark:text-slate-400 text-stone-500 mt-1">
                  Drag tickets to assign them to sprint days. Overloaded days (&gt;8h) highlight in amber.
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium dark:text-white text-stone-900">{sprintName}</div>
                <div className="text-xs dark:text-slate-500 text-stone-400">
                  {new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' – '}
                  {new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div className={cn(
              'rounded-2xl p-5 border mb-5',
              'dark:bg-[#1a1a1f] bg-white',
              'dark:border-white/6 border-black/8'
            )}>
              <RoadmapPlanner
                tickets={tickets}
                onChange={setTickets}
              />
            </div>

            {/* Summary */}
            <div className={cn(
              'rounded-xl p-4 border mb-6',
              'dark:bg-white/3 bg-black/3',
              'dark:border-white/6 border-black/8'
            )}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold dark:text-white text-stone-900">{tickets.length}</div>
                  <div className="text-xs dark:text-slate-500 text-stone-400">Tickets</div>
                </div>
                <div>
                  <div className={cn(
                    'text-lg font-bold',
                    totalHours > capacity ? 'text-red-400' : totalHours > capacity * 0.8 ? 'text-amber-400' : 'text-emerald-400'
                  )}>
                    {totalHours}h
                  </div>
                  <div className="text-xs dark:text-slate-500 text-stone-400">of {capacity}h capacity</div>
                </div>
                <div>
                  <div className="text-lg font-bold dark:text-cyan-400 text-cyan-600">
                    {tickets.filter(t => t.day_assigned).length}
                  </div>
                  <div className="text-xs dark:text-slate-500 text-stone-400">Assigned to days</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl px-4 py-2.5 text-sm dark:bg-white/6 bg-black/5 dark:text-slate-400 text-stone-500 dark:hover:bg-white/10 hover:bg-black/10 transition-colors"
              >
                <ArrowLeft size={14} className="inline mr-1" />
                Back
              </button>
              <button
                onClick={() => launchMutation.mutate()}
                disabled={launchMutation.isPending}
                className="btn-primary flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {launchMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Launching…
                  </>
                ) : (
                  <>
                    <Rocket size={15} />
                    Launch Sprint
                  </>
                )}
              </button>
            </div>

            {launchMutation.error && (
              <p className="mt-3 text-sm text-red-400 text-center">
                {launchMutation.error instanceof Error ? launchMutation.error.message : 'Failed to create sprint'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Auto-increment ticket number: SP-1 → SP-2 */
function autoIncrement(num: string): string {
  const match = num.match(/^([A-Za-z\-]+)(\d+)$/)
  if (match) {
    return `${match[1]}${parseInt(match[2]) + 1}`
  }
  return num
}
