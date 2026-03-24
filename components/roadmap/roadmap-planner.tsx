'use client'

import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn, pointsToHours } from '@/lib/utils'
import type { StoryPoints, TicketStatus } from '@/types'
import { TagBadge } from '@/components/shared/tag-badge'

export interface PlannerTicket {
  localId: string   // temporary ID before DB insert
  sprint_id: string
  ticket_number: string
  name: string
  story_points: StoryPoints
  status: TicketStatus
  tags: string[]
  day_assigned: number | null
  day_assigned_end: number | null
}

interface RoadmapPlannerProps {
  tickets: PlannerTicket[]
  onChange: (tickets: PlannerTicket[]) => void
}

// ── Draggable card ────────────────────────────────────────────────────────────
function RoadmapCard({
  ticket,
  isDragging,
  onSplit,
  onUnsplit,
}: {
  ticket: PlannerTicket
  isDragging?: boolean
  onSplit?: (days: number) => void
  onUnsplit?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: sortDragging }
    = useSortable({ id: ticket.localId })

  const style = { transform: CSS.Transform.toString(transform), transition }
  const isAssigned = ticket.day_assigned !== null
  const isSplit = isAssigned && ticket.day_assigned_end !== null
  const spanDays = isSplit ? (ticket.day_assigned_end! - ticket.day_assigned! + 1) : 1

  // Max days we can split to without exceeding day 10
  const maxSplitDays = isAssigned ? 10 - ticket.day_assigned! + 1 : 1
  const canSplitHalf = isAssigned && maxSplitDays >= 2
  const canSplitThird = isAssigned && maxSplitDays >= 3

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-lg px-2.5 py-2 border cursor-grab active:cursor-grabbing select-none transition-all',
        'dark:bg-[#1a1a1f] bg-white',
        isSplit
          ? 'dark:border-violet-500/40 border-violet-300'
          : 'dark:border-white/6 border-black/8',
        sortDragging || isDragging ? 'opacity-40 scale-95' : 'dark:hover:border-white/14'
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-xs font-mono dark:text-slate-600 text-stone-400 truncate">
          {ticket.ticket_number}
        </span>
        <span className="text-xs dark:text-slate-500 text-stone-400 shrink-0">
          {ticket.story_points}pt
        </span>
      </div>
      <p className="text-xs font-medium dark:text-slate-200 text-stone-800 leading-snug">
        {ticket.name}
      </p>
      {ticket.tags && ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {(ticket.tags ?? []).slice(0, 1).map(tag => <TagBadge key={tag} tag={tag} />)}
        </div>
      )}

      {/* Split indicator */}
      {isSplit && (
        <div className="mt-1.5 text-xs dark:text-violet-400 text-violet-600 font-medium">
          → D{ticket.day_assigned_end} ({spanDays}d split)
        </div>
      )}

      {/* Split controls — only on assigned cards */}
      {isAssigned && onSplit && onUnsplit && (
        <div
          className="flex items-center gap-1 mt-2"
          onPointerDown={e => e.stopPropagation()}
        >
          {!isSplit ? (
            <>
              {canSplitHalf && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onSplit(2) }}
                  title="Split across 2 days"
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium dark:bg-violet-500/15 bg-violet-100 dark:text-violet-400 text-violet-600 dark:hover:bg-violet-500/25 hover:bg-violet-200 transition-colors"
                >
                  ½
                </button>
              )}
              {canSplitThird && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onSplit(3) }}
                  title="Split across 3 days"
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium dark:bg-violet-500/15 bg-violet-100 dark:text-violet-400 text-violet-600 dark:hover:bg-violet-500/25 hover:bg-violet-200 transition-colors"
                >
                  ⅓
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onUnsplit() }}
              title="Remove split"
              className="rounded px-1.5 py-0.5 text-[10px] font-medium dark:bg-white/8 bg-black/6 dark:text-slate-500 text-stone-400 dark:hover:bg-white/14 hover:bg-black/10 transition-colors"
            >
              unsplit
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Day column ────────────────────────────────────────────────────────────────
function DayColumn({
  day,
  tickets,
  loadHours,
  onSplit,
  onUnsplit,
}: {
  day: number
  tickets: PlannerTicket[]
  loadHours: number
  onSplit: (localId: string, days: number) => void
  onUnsplit: (localId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day}` })
  const isOverloaded = loadHours > 8
  const pct = Math.min((loadHours / 8) * 100, 100)

  return (
    <div className="flex flex-col min-w-[120px] flex-1">
      {/* Header */}
      <div className={cn(
        'rounded-xl px-2 py-2 mb-2 text-center border',
        isOverloaded
          ? 'dark:bg-amber-500/10 bg-amber-50 dark:border-amber-500/30 border-amber-200 glow-amber'
          : 'dark:bg-white/3 bg-black/3 dark:border-white/6 border-black/8'
      )}>
        <span className={cn(
          'block text-xs font-semibold mb-1',
          isOverloaded ? 'dark:text-amber-400 text-amber-600' : 'dark:text-slate-400 text-stone-600'
        )}>
          Day {day}
        </span>
        <span className={cn(
          'block text-xs',
          isOverloaded ? 'dark:text-amber-400 text-amber-600' : 'dark:text-slate-600 text-stone-400'
        )}>
          {Math.round(loadHours * 10) / 10}h / 8h
        </span>
        <div className="mt-1 h-1 rounded-full dark:bg-white/8 bg-black/8 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', isOverloaded ? 'bg-amber-400' : 'bg-cyan-400')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-1.5 min-h-[150px] transition-all',
          'dark:bg-white/2 bg-black/2',
          'border dark:border-white/4 border-black/6',
          isOver && 'dark:bg-cyan-500/5 bg-cyan-50 dark:border-cyan-500/30 border-cyan-200 glow-cyan'
        )}
      >
        <SortableContext items={tickets.map(t => t.localId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {tickets.map(t => (
              <RoadmapCard
                key={t.localId}
                ticket={t}
                onSplit={(days) => onSplit(t.localId, days)}
                onUnsplit={() => onUnsplit(t.localId)}
              />
            ))}
          </div>
        </SortableContext>
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-12 text-xs dark:text-slate-700 text-stone-400">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function RoadmapPlanner({ tickets, onChange }: RoadmapPlannerProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const unassigned = tickets.filter(t => !t.day_assigned)

  // Tickets that start on each day (for rendering cards in columns)
  const byDay = Array.from({ length: 10 }, (_, i) => i + 1).reduce((acc, day) => {
    acc[day] = tickets.filter(t => t.day_assigned === day)
    return acc
  }, {} as Record<number, PlannerTicket[]>)

  // Distributed load per day: split tickets contribute hours/span to each covered day
  const getDayLoad = (day: number): number => {
    return tickets
      .filter(t => {
        if (!t.day_assigned) return false
        const end = t.day_assigned_end ?? t.day_assigned
        return day >= t.day_assigned && day <= end
      })
      .reduce((acc, t) => {
        const span = (t.day_assigned_end ?? t.day_assigned!) - t.day_assigned! + 1
        return acc + pointsToHours(t.story_points) / span
      }, 0)
  }

  const handleSplit = (localId: string, days: number) => {
    onChange(tickets.map(t => {
      if (t.localId !== localId || !t.day_assigned) return t
      return { ...t, day_assigned_end: Math.min(t.day_assigned + days - 1, 10) }
    }))
  }

  const handleUnsplit = (localId: string) => {
    onChange(tickets.map(t =>
      t.localId === localId ? { ...t, day_assigned_end: null } : t
    ))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const localId = active.id as string
    const overId = over.id as string

    let dayAssigned: number | null = null
    if (overId === 'unassigned') {
      dayAssigned = null
    } else if (overId.startsWith('day-')) {
      dayAssigned = parseInt(overId.replace('day-', ''))
    } else {
      // Dropped on another ticket — find its day
      const overTicket = tickets.find(t => t.localId === overId)
      dayAssigned = overTicket?.day_assigned ?? null
    }

    onChange(tickets.map(t =>
      t.localId === localId
        ? { ...t, day_assigned: dayAssigned, day_assigned_end: null }
        : t
    ))
  }

  const activeTicket = tickets.find(t => t.localId === activeId) ?? null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      {/* 10-day grid (scroll horizontally) */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-2 min-w-max">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(day => (
            <DayColumn
              key={day}
              day={day}
              tickets={byDay[day]}
              loadHours={getDayLoad(day)}
              onSplit={handleSplit}
              onUnsplit={handleUnsplit}
            />
          ))}
        </div>
      </div>

      {/* Unassigned section */}
      {unassigned.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide dark:text-slate-500 text-stone-400 mb-2">
            Unassigned
          </h3>
          <UnassignedZone tickets={unassigned} />
        </div>
      )}

      <DragOverlay>
        {activeTicket && <RoadmapCard ticket={activeTicket} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

function UnassignedZone({ tickets }: { tickets: PlannerTicket[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-wrap gap-2 rounded-xl p-3 min-h-[80px] border transition-all',
        'dark:bg-white/2 bg-black/2',
        'dark:border-white/4 border-black/6',
        isOver && 'dark:border-cyan-500/30 glow-cyan'
      )}
    >
      <SortableContext items={tickets.map(t => t.localId)} strategy={verticalListSortingStrategy}>
        {tickets.map(t => (
          <div key={t.localId} className="w-44">
            <RoadmapCard ticket={t} />
          </div>
        ))}
      </SortableContext>
      {tickets.length === 0 && (
        <span className="text-xs dark:text-slate-700 text-stone-400 self-center">All tickets assigned</span>
      )}
    </div>
  )
}
