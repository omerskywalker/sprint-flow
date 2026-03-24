'use client'

import { cn } from '@/lib/utils'

const TAG_COLORS: Record<string, string> = {
  backend:    'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  frontend:   'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  bug:        'bg-red-500/15 text-red-400 border border-red-500/20',
  feature:    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  design:     'bg-pink-500/15 text-pink-400 border border-pink-500/20',
  devops:     'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  testing:    'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  docs:       'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  security:   'bg-rose-500/15 text-rose-400 border border-rose-500/20',
  performance:'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
}

const DEFAULT_COLOR = 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'

interface TagBadgeProps {
  tag: string
  className?: string
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  const colorClass = TAG_COLORS[tag.toLowerCase()] ?? DEFAULT_COLOR
  return (
    <span className={cn('tag-badge', colorClass, className)}>
      {tag}
    </span>
  )
}
