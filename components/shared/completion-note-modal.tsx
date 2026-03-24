'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompletionNoteModalProps {
  open: boolean
  title?: string
  onConfirm: (note: string | null) => void
  onCancel: () => void
  loading?: boolean
}

export function CompletionNoteModal({
  open,
  title = 'Mark as Complete',
  onConfirm,
  onCancel,
  loading = false,
}: CompletionNoteModalProps) {
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setNote('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onCancel])

  if (!open) return null

  const handleConfirm = () => {
    onConfirm(note.trim() || null)
  }

  const handleSkip = () => {
    onConfirm(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-md rounded-2xl p-6 animate-fade-in',
        'dark:bg-[#1a1a1f] bg-white',
        'border dark:border-white/8 border-black/8',
        'shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
      )}>
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
            {title}
          </h2>
        </div>

        <p className="text-sm dark:text-slate-400 text-stone-600 mb-4">
          Add an optional note about this completion (e.g., blockers resolved, decisions made).
        </p>

        <textarea
          ref={inputRef}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional completion note…"
          rows={3}
          className={cn(
            'w-full rounded-xl px-3 py-2.5 text-sm resize-none',
            'dark:bg-white/5 bg-black/4',
            'dark:text-slate-200 text-stone-800',
            'dark:border-white/10 border-black/10 border',
            'placeholder:dark:text-slate-600 placeholder:text-stone-400',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500/40',
            'transition-all'
          )}
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSkip}
            disabled={loading}
            className={cn(
              'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
              'dark:bg-white/8 bg-black/5',
              'dark:text-slate-400 text-stone-500',
              'dark:hover:bg-white/12 hover:bg-black/10',
              'disabled:opacity-50'
            )}
          >
            Skip Note
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'flex-1 btn-primary rounded-xl px-4 py-2.5 text-sm font-medium text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? 'Saving…' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
