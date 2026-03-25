'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { SHORTCUT_GROUPS } from '@/lib/use-keyboard-shortcuts'
import { X } from 'lucide-react'

interface ShortcutsModalProps {
  open: boolean
  onClose: () => void
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full max-w-sm rounded-2xl p-6 animate-fade-in',
        'dark:bg-[#1a1a1f] bg-white',
        'border dark:border-white/8 border-black/8',
        'shadow-[0_8px_48px_rgba(0,0,0,0.5)]'
      )}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 dark:text-slate-400 text-stone-400 dark:hover:text-slate-200 hover:text-stone-700"
        >
          <X size={16} />
        </button>
        <h2 className="text-base font-semibold dark:text-white text-stone-900 mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
          Keyboard Shortcuts
        </h2>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-medium uppercase tracking-wide dark:text-slate-500 text-stone-400 mb-2">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.shortcuts.map(shortcut => (
                  <div key={shortcut.description} className="flex items-center justify-between gap-4">
                    <span className="text-sm dark:text-slate-300 text-stone-700">{shortcut.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {shortcut.keys.map(k => (
                        <kbd
                          key={k}
                          className={cn(
                            'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded text-xs font-semibold',
                            'dark:bg-white/8 bg-black/6',
                            'dark:text-slate-300 text-stone-600',
                            'border dark:border-white/10 border-black/12',
                            'shadow-[0_1px_0_rgba(0,0,0,0.2)]'
                          )}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
