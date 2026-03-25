'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Sprint, Ticket } from '@/types'
import { cn, statusColor, statusLabel } from '@/lib/utils'
import { Search, X } from 'lucide-react'
import { TagBadge } from '@/components/shared/tag-badge'

interface SearchResult {
  ticket: Ticket
  sprint: Sprint
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const { data: sprints = [] } = useQuery<Sprint[]>({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data } = await supabase.from('sprints').select('*').order('start_date', { ascending: false })
      return data ?? []
    },
    enabled: open,
  })

  const { data: allTickets = [] } = useQuery<Ticket[]>({
    queryKey: ['search-all-tickets'],
    queryFn: async () => {
      if (sprints.length === 0) return []
      const { data } = await supabase
        .from('tickets')
        .select('id, sprint_id, ticket_number, name, story_points, status, tags')
        .in('sprint_id', sprints.map(s => s.id))
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: open && sprints.length > 0,
  })

  const sprintById = Object.fromEntries(sprints.map(s => [s.id, s]))

  const results: SearchResult[] = query.trim().length < 1
    ? []
    : allTickets
        .filter(t => {
          const q = query.toLowerCase()
          return (
            t.name.toLowerCase().includes(q) ||
            t.ticket_number.toLowerCase().includes(q) ||
            t.tags.some(tag => tag.toLowerCase().includes(q))
          )
        })
        .slice(0, 12)
        .map(t => ({ ticket: t, sprint: sprintById[t.sprint_id] }))
        .filter(r => r.sprint)

  const navigate = useCallback((result: SearchResult) => {
    router.push(`/dashboard/tickets/${result.ticket.id}`)
    onClose()
  }, [router, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && results[cursor]) {
      navigate(results[cursor])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-lg rounded-2xl overflow-hidden animate-fade-in',
        'dark:bg-[#1a1a1f] bg-white',
        'border dark:border-white/10 border-black/10',
        'shadow-[0_24px_80px_rgba(0,0,0,0.6)]',
      )}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b dark:border-white/6 border-black/8">
          <Search size={16} className="dark:text-slate-500 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets by name, number, or tag…"
            className={cn(
              'flex-1 bg-transparent text-sm outline-none',
              'dark:text-slate-200 text-stone-800',
              'placeholder:dark:text-slate-600 placeholder:text-stone-400'
            )}
          />
          {query && (
            <button onClick={() => setQuery('')} className="dark:text-slate-600 text-stone-400 dark:hover:text-slate-300 hover:text-stone-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Results */}
        {query.trim().length > 0 && (
          <div className="max-h-[400px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm dark:text-slate-600 text-stone-400">
                No tickets match &quot;{query}&quot;
              </div>
            ) : (
              <div className="p-2">
                {results.map((r, i) => (
                  <button
                    key={r.ticket.id}
                    onClick={() => navigate(r)}
                    onMouseEnter={() => setCursor(i)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors',
                      cursor === i
                        ? 'dark:bg-white/8 bg-black/5'
                        : 'dark:hover:bg-white/5 hover:bg-black/3'
                    )}
                  >
                    <span className="text-xs font-mono dark:text-slate-600 text-stone-400 pt-0.5 w-12 shrink-0">
                      {r.ticket.ticket_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm dark:text-slate-200 text-stone-800 truncate">{r.ticket.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs dark:text-slate-600 text-stone-400 truncate">{r.sprint.name}</span>
                        <span className="text-xs dark:text-slate-700 text-stone-300">·</span>
                        <span className={cn('text-xs font-medium', statusColor(r.ticket.status))}>
                          {statusLabel(r.ticket.status)}
                        </span>
                        {r.ticket.tags.slice(0, 2).map(tag => (
                          <TagBadge key={tag} tag={tag} />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs dark:text-slate-600 text-stone-400 shrink-0 pt-0.5">
                      {r.ticket.story_points}pt
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className={cn(
          'flex items-center gap-4 px-4 py-2.5 text-xs',
          'dark:text-slate-700 text-stone-400',
          query.trim() && results.length > 0 ? 'border-t dark:border-white/6 border-black/8' : ''
        )}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
