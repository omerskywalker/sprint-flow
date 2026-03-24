'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Ticket, CreateTicketInput, StoryPoints, TicketStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const STORY_POINTS: StoryPoints[] = [1, 2, 3, 5, 8, 13]
const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]

const COMMON_TAGS = ['backend', 'frontend', 'bug', 'feature', 'design', 'devops', 'testing', 'docs', 'security', 'performance']

interface TicketFormProps {
  sprintId: string
  ticket?: Ticket  // if editing
  onClose: () => void
  queryKey: string[]
}

export function TicketForm({ sprintId, ticket, onClose, queryKey }: TicketFormProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    ticket_number: ticket?.ticket_number ?? '',
    name: ticket?.name ?? '',
    story_points: (ticket?.story_points ?? 3) as StoryPoints,
    status: (ticket?.status ?? 'todo') as TicketStatus,
    tags: ticket?.tags ?? [] as string[],
    day_assigned: ticket?.day_assigned ?? null as number | null,
    day_assigned_end: ticket?.day_assigned_end ?? null as number | null,
    tagInput: '',
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (ticket) {
        const { error } = await supabase
          .from('tickets')
          .update({
            ticket_number: form.ticket_number,
            name: form.name,
            story_points: form.story_points,
            status: form.status,
            tags: form.tags,
            day_assigned: form.day_assigned,
            day_assigned_end: form.day_assigned_end,
          })
          .eq('id', ticket.id)
        if (error) throw error

        await supabase.from('audit_log').insert({
          entity_type: 'ticket',
          entity_id: ticket.id,
          action: 'updated',
        })
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
          .from('tickets')
          .insert({
            sprint_id: sprintId,
            user_id: user.id,
            ticket_number: form.ticket_number,
            name: form.name,
            story_points: form.story_points,
            status: form.status,
            tags: form.tags,
            day_assigned: form.day_assigned,
            day_assigned_end: form.day_assigned_end,
          })
          .select()
          .single()
        if (error) throw error

        await supabase.from('audit_log').insert({
          user_id: user.id,
          entity_type: 'ticket',
          entity_id: data.id,
          action: 'created',
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      onClose()
    },
  })

  const addTag = (tag: string) => {
    const t = tag.toLowerCase().trim()
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t], tagInput: '' }))
    }
  }

  const removeTag = (tag: string) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.ticket_number.trim()) return
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative w-full max-w-lg rounded-2xl p-6 animate-fade-in',
          'dark:bg-[#1a1a1f] bg-white',
          'border dark:border-white/8 border-black/8',
          'shadow-[0_8px_48px_rgba(0,0,0,0.5)]'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X size={16} />
        </button>

        <h2 className="text-lg font-semibold dark:text-white text-stone-900 mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
          {ticket ? 'Edit Ticket' : 'New Ticket'}
        </h2>

        <div className="space-y-4">
          {/* Ticket number + name */}
          <div className="flex gap-3">
            <div className="w-28">
              <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Ticket #</label>
              <input
                type="text"
                value={form.ticket_number}
                onChange={e => setForm(f => ({ ...f, ticket_number: e.target.value }))}
                placeholder="SP-1"
                required
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-sm font-mono',
                  'dark:bg-white/5 bg-black/4',
                  'dark:text-slate-200 text-stone-800',
                  'dark:border-white/10 border-black/10 border',
                  'focus:outline-none focus:ring-2 focus:ring-cyan-500/30'
                )}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs dark:text-slate-500 text-stone-400 mb-1 block">Ticket Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Implement user authentication"
                required
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

          {/* Story points */}
          <div>
            <label className="text-xs dark:text-slate-500 text-stone-400 mb-2 block">Story Points</label>
            <div className="flex gap-2">
              {STORY_POINTS.map(pts => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, story_points: pts }))}
                  className={cn(
                    'h-9 w-9 rounded-xl text-sm font-semibold transition-all',
                    form.story_points === pts
                      ? 'btn-primary text-white glow-blue'
                      : 'dark:bg-white/6 bg-black/5 dark:text-slate-400 text-stone-500 dark:hover:bg-white/12 hover:bg-black/10 border dark:border-white/8 border-black/8'
                  )}
                >
                  {pts}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs dark:text-slate-500 text-stone-400 mb-2 block">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, status: opt.value }))}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-medium transition-all border',
                    form.status === opt.value
                      ? opt.value === 'todo'        ? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
                        : opt.value === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : opt.value === 'review'      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        :                               'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'dark:bg-white/4 bg-black/4 dark:text-slate-500 text-stone-400 dark:border-white/8 border-black/8 dark:hover:bg-white/8 hover:bg-black/8'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs dark:text-slate-500 text-stone-400 mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs dark:bg-white/8 bg-black/6 dark:text-slate-300 text-stone-600"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TAGS.filter(t => !form.tags.includes(t)).map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="tag-badge dark:bg-white/4 bg-black/4 dark:text-slate-500 text-stone-400 dark:hover:bg-white/8 hover:bg-black/8 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Day assigned */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs dark:text-slate-500 text-stone-400 mb-2 block">
                Start Day (1–10, optional)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.day_assigned ?? ''}
                onChange={e => setForm(f => ({
                  ...f,
                  day_assigned: e.target.value ? parseInt(e.target.value) : null,
                  day_assigned_end: null,
                }))}
                placeholder="Assign in roadmap"
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-sm',
                  'dark:bg-white/5 bg-black/4',
                  'dark:text-slate-200 text-stone-800',
                  'dark:border-white/10 border-black/10 border',
                  'focus:outline-none focus:ring-2 focus:ring-cyan-500/30'
                )}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs dark:text-slate-500 text-stone-400 mb-2 block">
                End Day (split, optional)
              </label>
              <input
                type="number"
                min={form.day_assigned ?? 1}
                max={10}
                value={form.day_assigned_end ?? ''}
                disabled={!form.day_assigned}
                onChange={e => setForm(f => ({
                  ...f,
                  day_assigned_end: e.target.value ? parseInt(e.target.value) : null,
                }))}
                placeholder="Same as start"
                className={cn(
                  'w-full rounded-xl px-3 py-2 text-sm',
                  'dark:bg-white/5 bg-black/4',
                  'dark:text-slate-200 text-stone-800',
                  'dark:border-white/10 border-black/10 border',
                  'focus:outline-none focus:ring-2 focus:ring-cyan-500/30',
                  !form.day_assigned && 'opacity-40 cursor-not-allowed'
                )}
              />
            </div>
          </div>
        </div>

        {mutation.error && (
          <p className="mt-3 text-sm text-red-400">
            {mutation.error instanceof Error ? mutation.error.message : 'Something went wrong'}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium dark:bg-white/6 bg-black/5 dark:text-slate-300 text-stone-600 dark:hover:bg-white/10 hover:bg-black/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 btn-primary rounded-xl px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : ticket ? 'Save Changes' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
