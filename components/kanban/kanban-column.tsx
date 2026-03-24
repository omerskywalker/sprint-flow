'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn, statusLabel } from '@/lib/utils'
import { KanbanCard } from './kanban-card'
import type { TicketWithTasks, TicketStatus } from '@/types'

interface KanbanColumnProps {
  status: TicketStatus
  tickets: TicketWithTasks[]
}

const STATUS_STYLES: Record<TicketStatus, { dot: string; count: string; header: string }> = {
  todo: {
    dot:    'bg-zinc-400',
    count:  'dark:bg-zinc-700 bg-zinc-200 dark:text-zinc-300 text-zinc-600',
    header: 'dark:text-zinc-300 text-zinc-700',
  },
  in_progress: {
    dot:    'bg-blue-400',
    count:  'dark:bg-blue-500/20 bg-blue-100 dark:text-blue-300 text-blue-700',
    header: 'dark:text-blue-300 text-blue-700',
  },
  review: {
    dot:    'bg-amber-400',
    count:  'dark:bg-amber-500/20 bg-amber-100 dark:text-amber-300 text-amber-700',
    header: 'dark:text-amber-300 text-amber-700',
  },
  done: {
    dot:    'bg-emerald-400',
    count:  'dark:bg-emerald-500/20 bg-emerald-100 dark:text-emerald-300 text-emerald-700',
    header: 'dark:text-emerald-300 text-emerald-700',
  },
}

export function KanbanColumn({ status, tickets }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const style = STATUS_STYLES[status]

  return (
    <div className="flex flex-col min-w-[240px] w-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', style.dot)} />
          <h3 className={cn('text-sm font-semibold', style.header)}>
            {statusLabel(status)}
          </h3>
        </div>
        <span className={cn('text-xs font-medium rounded-full px-2 py-0.5', style.count)}>
          {tickets.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 min-h-[200px] transition-all',
          'dark:bg-white/2 bg-black/3',
          'border dark:border-white/4 border-black/6',
          isOver && 'dark:bg-white/6 bg-black/6 dark:border-white/10 border-black/12 glow-cyan'
        )}
      >
        <SortableContext
          items={tickets.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tickets.map(ticket => (
              <KanbanCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </SortableContext>

        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs dark:text-slate-700 text-stone-400">
            Drop tickets here
          </div>
        )}
      </div>
    </div>
  )
}
