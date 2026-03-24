'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeleteConfirmModalProps {
  open: boolean
  title?: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function DeleteConfirmModal({
  open,
  title = 'Delete Item',
  description = 'This action cannot be undone. Are you sure?',
  onConfirm,
  onCancel,
  loading = false,
}: DeleteConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-sm rounded-2xl p-6 animate-fade-in',
        'dark:card-dark card-light',
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 glow-red">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
            {title}
          </h2>
        </div>

        <p className="text-sm dark:text-slate-400 text-stone-600 mb-6 leading-relaxed">
          {description}
        </p>

        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className={cn(
              'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
              'dark:bg-white/8 bg-black/5',
              'dark:text-slate-200 text-stone-700',
              'dark:hover:bg-white/12 hover:bg-black/10',
              'disabled:opacity-50'
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
              'bg-red-500 hover:bg-red-600 text-white',
              'glow-red hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
