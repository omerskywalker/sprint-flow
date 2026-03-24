'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, statusLabel, statusColor, pointsToHours } from '@/lib/utils'
import { TagBadge } from '@/components/shared/tag-badge'
import Link from 'next/link'
import type { TicketWithTasks } from '@/types'

interface KanbanCardProps {
  ticket: TicketWithTasks
  isDragging?: boolean
}

export function KanbanCard({ ticket, isDragging = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableDragging,
  } = useSortable({ id: ticket.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const totalTasks = ticket.micro_tasks?.length ?? 0
  const doneTasks = ticket.micro_tasks?.filter(t => t.completed).length ?? 0
  const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'rounded-xl p-3 border cursor-grab active:cursor-grabbing transition-all select-none',
        'dark:bg-[#1a1a1f] bg-white',
        'dark:border-white/6 border-black/8',
        sortableDragging || isDragging
          ? 'opacity-50 scale-95'
          : 'dark:hover:border-white/14 hover:border-black/16 dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono dark:text-slate-600 text-stone-400">
          {ticket.ticket_number}
        </span>
        <span className={cn(
          'shrink-0 text-xs font-mono px-1.5 py-0.5 rounded',
          'dark:bg-white/6 bg-black/5',
          'dark:text-slate-400 text-stone-500'
        )}>
          {ticket.story_points}pt
        </span>
      </div>

      {/* Name - click navigates, drag drags */}
      <Link
        href={`/dashboard/tickets/${ticket.id}`}
        onClick={e => e.stopPropagation()}
        className="block text-sm font-medium dark:text-slate-200 text-stone-800 leading-snug mb-2 hover:dark:text-white hover:text-stone-900 transition-colors"
        draggable={false}
      >
        {ticket.name}
      </Link>

      {/* Tags */}
      {ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {ticket.tags.slice(0, 2).map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {ticket.tags.length > 2 && (
            <span className="text-xs dark:text-slate-600 text-stone-400">+{ticket.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Progress */}
      {totalTasks > 0 && (
        <div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs dark:text-slate-600 text-stone-400">
              {doneTasks}/{totalTasks}
            </span>
            <span className="text-xs dark:text-slate-600 text-stone-400">
              {pointsToHours(ticket.story_points)}h
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
