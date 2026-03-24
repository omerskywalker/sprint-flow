'use client'

import { useAppStore } from '@/lib/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Sprint, Ticket, TicketWithTasks, TicketStatus } from '@/types'
import {
  getWeekDays, toISODate, formatDateShort, pointsToHours
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { TagBadge } from '@/components/shared/tag-badge'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

// ── Draggable ticket card ─────────────────────────────────────────────────────
function WeeklyTicketCard({ ticket, isDragging }: { ticket: TicketWithTasks; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortDragging } = useSortable({ id: ticket.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const doneTasks = ticket.micro_tasks?.filter(t => t.completed).length ?? 0
  const totalTasks = ticket.micro_tasks?.length ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-lg px-2.5 py-2 border transition-all cursor-grab active:cursor-grabbing select-none',
        'dark:bg-[#1a1a1f] bg-white',
        'dark:border-white/6 border-black/8',
        sortDragging || isDragging ? 'opacity-40 scale-95' : 'dark:hover:border-white/14'
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-xs font-mono dark:text-slate-600 text-stone-400">{ticket.ticket_number}</span>
        <span className="text-xs dark:text-slate-500 text-stone-400 shrink-0">{ticket.story_points}pt</span>
      </div>
      <Link
        href={`/dashboard/tickets/${ticket.id}`}
        onClick={e => e.stopPropagation()}
        draggable={false}
        className="block text-xs font-medium dark:text-slate-200 text-stone-800 leading-snug mb-1.5 hover:dark:text-white"
      >
        {ticket.name}
      </Link>
      {ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ticket.tags.slice(0, 1).map(tag => <TagBadge key={tag} tag={tag} />)}
        </div>
      )}
      {ticket.day_assigned_end && ticket.day_assigned_end !== ticket.day_assigned && (
        <div className="mt-1 text-[10px] dark:text-violet-400 text-violet-600 font-medium">
          D{ticket.day_assigned}–D{ticket.day_assigned_end}
        </div>
      )}
      {totalTasks > 0 && (
        <div className="mt-1.5 progress-bar">
          <div className="progress-bar-fill" style={{ width: `${(doneTasks / totalTasks) * 100}%` }} />
        </div>
      )}
    </div>
  )
}

// ── Day column ────────────────────────────────────────────────────────────────
function DayColumn({
  date, sprintDay, tickets, isToday,
}: {
  date: Date
  sprintDay: number | null
  tickets: TicketWithTasks[]
  isToday: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: toISODate(date) })

  // Distribute hours evenly for split tickets
  const totalHours = tickets.reduce((acc, t) => {
    const hours = pointsToHours(t.story_points)
    if (t.day_assigned && t.day_assigned_end) {
      const span = t.day_assigned_end - t.day_assigned + 1
      return acc + hours / span
    }
    return acc + hours
  }, 0)
  const completedHours = tickets
    .filter(t => t.status === 'done')
    .reduce((acc, t) => {
      const hours = pointsToHours(t.story_points)
      if (t.day_assigned && t.day_assigned_end) {
        const span = t.day_assigned_end - t.day_assigned + 1
        return acc + hours / span
      }
      return acc + hours
    }, 0)
  const pct = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div className={cn(
        'rounded-xl px-3 py-2.5 mb-2 border',
        isToday
          ? 'dark:bg-cyan-500/10 bg-cyan-50 dark:border-cyan-500/30 border-cyan-200'
          : 'dark:bg-white/3 bg-black/3 dark:border-white/6 border-black/8'
      )}>
        <div className="flex items-center justify-between mb-1">
          <span className={cn('text-xs font-semibold', isToday ? 'dark:text-cyan-400 text-cyan-600' : 'dark:text-slate-400 text-stone-600')}>
            {formatDateShort(date)}
          </span>
          {sprintDay && (
            <span className="text-xs dark:text-slate-600 text-stone-400">Day {sprintDay}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn(totalHours > 8 ? 'text-amber-400' : 'dark:text-slate-500 text-stone-400')}>
            {Math.round(totalHours * 10) / 10}h
          </span>
          <span className="dark:text-slate-500 text-stone-400">{pct}%</span>
        </div>
        <div className="mt-1 progress-bar">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 min-h-[180px] transition-all',
          'dark:bg-white/2 bg-black/3',
          'border dark:border-white/4 border-black/6',
          isOver && 'dark:bg-white/6 bg-black/6 dark:border-cyan-500/30 glow-cyan'
        )}
      >
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tickets.map(ticket => (
              <WeeklyTicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </SortableContext>
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs dark:text-slate-700 text-stone-400">
            No tickets
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WeeklyPage() {
  const { activeSprintId } = useAppStore()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)

  const today = new Date()
  const baseDate = new Date(today)
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDays = getWeekDays(baseDate)

  const queryKey = ['sprint-detail', activeSprintId]

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

  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const dayAssignMutation = useMutation({
    mutationFn: async ({ ticketId, dayAssigned }: { ticketId: string; dayAssigned: number | null }) => {
      const { error } = await supabase
        .from('tickets')
        .update({ day_assigned: dayAssigned })
        .eq('id', ticketId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  // Map ISO date -> sprint day number
  const sprintDayMap = new Map<string, number>()
  if (sprint) {
    const start = new Date(sprint.start_date + 'T00:00:00')
    weekDays.forEach(d => {
      const iso = toISODate(d)
      let count = 0
      const cur = new Date(start)
      const target = new Date(d)
      while (cur <= target) {
        const dow = cur.getDay()
        if (dow !== 0 && dow !== 6) count++
        cur.setDate(cur.getDate() + 1)
      }
      if (count > 0 && count <= 10) sprintDayMap.set(iso, count)
    })
  }

  // Map day_assigned (1-10) -> ISO date
  const dayToDate = new Map<number, string>()
  if (sprint) {
    const start = new Date(sprint.start_date + 'T00:00:00')
    for (let day = 1; day <= 10; day++) {
      let count = 0
      const cur = new Date(start)
      while (true) {
        const dow = cur.getDay()
        if (dow !== 0 && dow !== 6) {
          count++
          if (count === day) {
            dayToDate.set(day, toISODate(cur))
            break
          }
        }
        cur.setDate(cur.getDate() + 1)
      }
    }
  }

  // Group tickets by which weekday column they fall in
  const ticketsByDate = weekDays.reduce((acc, d) => {
    acc[toISODate(d)] = []
    return acc
  }, {} as Record<string, TicketWithTasks[]>)

  for (const ticket of tickets) {
    if (ticket.day_assigned) {
      const endDay = ticket.day_assigned_end ?? ticket.day_assigned
      for (let d = ticket.day_assigned; d <= endDay; d++) {
        const dateIso = dayToDate.get(d)
        if (dateIso && ticketsByDate[dateIso] !== undefined) {
          ticketsByDate[dateIso].push(ticket)
        }
      }
    }
  }

  // Unassigned tickets
  const unassigned = tickets.filter(t =>
    !t.day_assigned || !dayToDate.has(t.day_assigned) || !ticketsByDate[dayToDate.get(t.day_assigned)!]
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const ticketId = active.id as string
    const targetDateIso = over.id as string

    const sprintDay = sprintDayMap.get(targetDateIso)
    if (sprintDay !== undefined) {
      dayAssignMutation.mutate({ ticketId, dayAssigned: sprintDay })
    }
  }

  const activeTicket = tickets.find(t => t.id === activeId) ?? null
  const todayIso = toISODate(today)

  if (!activeSprintId || !sprint) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <p className="dark:text-slate-400 text-stone-500">No active sprint. Create one first.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
          Weekly View
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            className="rounded-lg p-2 dark:hover:bg-white/8 hover:bg-black/8 dark:text-slate-400 text-stone-500 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-lg px-3 py-1.5 text-xs dark:hover:bg-white/8 hover:bg-black/8 dark:text-slate-400 text-stone-500 transition-colors"
          >
            This Week
          </button>
          <button
            onClick={() => setWeekOffset(v => v + 1)}
            className="rounded-lg p-2 dark:hover:bg-white/8 hover:bg-black/8 dark:text-slate-400 text-stone-500 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        {/* Day columns */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {weekDays.map(d => {
            const iso = toISODate(d)
            const sprintDay = sprintDayMap.get(iso) ?? null
            return (
              <DayColumn
                key={iso}
                date={d}
                sprintDay={sprintDay}
                tickets={ticketsByDate[iso] ?? []}
                isToday={iso === todayIso}
              />
            )
          })}
        </div>

        {/* Unassigned row */}
        {unassigned.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium dark:text-slate-500 text-stone-400 mb-3 uppercase tracking-wide">
              Unassigned
            </h2>
            <div className="flex flex-wrap gap-3">
              {unassigned.map(ticket => (
                <div key={ticket.id} className="w-48">
                  <WeeklyTicketCard ticket={ticket} />
                </div>
              ))}
            </div>
          </div>
        )}

        <DragOverlay>
          {activeTicket && <WeeklyTicketCard ticket={activeTicket} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
