'use client'

import Link from 'next/link'
import { cn, pointsToHours, statusLabel, statusColor } from '@/lib/utils'
import { TagBadge } from '@/components/shared/tag-badge'
import type { TicketWithTasks } from '@/types'

interface TicketCardProps {
  ticket: TicketWithTasks
  compact?: boolean
  className?: string
}

export function TicketCard({ ticket, compact = false, className }: TicketCardProps) {
  const totalTasks = ticket.micro_tasks?.length ?? 0
  const doneTasks = ticket.micro_tasks?.filter(t => t.completed).length ?? 0
  const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0

  if (compact) {
    return (
      <Link
        href={`/dashboard/tickets/${ticket.id}`}
        className={cn(
          'flex items-center gap-3 rounded-xl px-4 py-3 border transition-all group',
          'dark:bg-[#1a1a1f] bg-white',
          'dark:border-white/6 border-black/8',
          'dark:hover:border-white/12 hover:border-black/14',
          'dark:hover:bg-white/4 hover:bg-black/2',
          className
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono dark:text-slate-600 text-stone-400">
              {ticket.ticket_number}
            </span>
            <span className={cn('text-xs font-medium', statusColor(ticket.status))}>
              {statusLabel(ticket.status)}
            </span>
          </div>
          <p className="text-sm font-medium dark:text-slate-200 text-stone-800 truncate mt-0.5">
            {ticket.name}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs dark:text-slate-500 text-stone-400">
            {ticket.story_points}pt
          </span>
          {totalTasks > 0 && (
            <span className="text-xs dark:text-slate-600 text-stone-400">
              {doneTasks}/{totalTasks}
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/dashboard/tickets/${ticket.id}`}
      className={cn(
        'block rounded-2xl p-4 border transition-all group',
        'dark:bg-[#1a1a1f] bg-white',
        'dark:border-white/6 border-black/8',
        'dark:hover:border-white/12 hover:border-black/14',
        'shadow-[0_2px_12px_rgba(0,0,0,0.15)]',
        'dark:hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono dark:text-slate-600 text-stone-400">
              {ticket.ticket_number}
            </span>
            <span className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              ticket.status === 'todo'        && 'bg-zinc-500/15 text-zinc-400',
              ticket.status === 'in_progress' && 'bg-blue-500/15 text-blue-400',
              ticket.status === 'review'      && 'bg-amber-500/15 text-amber-400',
              ticket.status === 'done'        && 'bg-emerald-500/15 text-emerald-400',
            )}>
              {statusLabel(ticket.status)}
            </span>
          </div>
          <h3 className="text-sm font-semibold dark:text-white text-stone-900 leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
            {ticket.name}
          </h3>
        </div>
        <span className={cn(
          'shrink-0 text-xs font-mono px-2 py-1 rounded-lg',
          'dark:bg-white/6 bg-black/5',
          'dark:text-slate-400 text-stone-500'
        )}>
          {ticket.story_points}pt
        </span>
      </div>

      {/* Tags */}
      {ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {ticket.tags.slice(0, 3).map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {ticket.tags.length > 3 && (
            <span className="text-xs dark:text-slate-600 text-stone-400">+{ticket.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Progress */}
      {totalTasks > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="dark:text-slate-500 text-stone-400">{doneTasks}/{totalTasks} tasks</span>
            <span className="dark:text-slate-500 text-stone-400">{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs dark:text-slate-600 text-stone-400">
          {pointsToHours(ticket.story_points)}h estimated
        </span>
        {ticket.day_assigned && (
          <span className="text-xs dark:text-slate-600 text-stone-400">
            Day {ticket.day_assigned}
          </span>
        )}
      </div>
    </Link>
  )
}
