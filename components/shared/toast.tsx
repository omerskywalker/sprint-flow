'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'

export type ToastType = 'error' | 'success'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

// Module-level singleton — importable anywhere without React context
let _toasts: ToastItem[] = []
const _listeners = new Set<(t: ToastItem[]) => void>()

function _notify() {
  _listeners.forEach(fn => fn([..._toasts]))
}

export function toast(message: string, type: ToastType = 'error') {
  const id = Math.random().toString(36).slice(2)
  _toasts = [..._toasts, { id, message, type }]
  _notify()
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id)
    _notify()
  }, 4500)
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    _listeners.add(setItems)
    return () => { _listeners.delete(setItems) }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 shadow-xl text-sm font-medium border pointer-events-auto',
            t.type === 'error'
              ? 'dark:bg-[#1a0808] bg-red-50 dark:border-red-500/30 border-red-200 dark:text-red-400 text-red-600'
              : 'dark:bg-[#081a08] bg-emerald-50 dark:border-emerald-500/30 border-emerald-200 dark:text-emerald-400 text-emerald-600'
          )}
        >
          {t.type === 'error'
            ? <AlertCircle size={15} className="shrink-0" />
            : <CheckCircle2 size={15} className="shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => {
              _toasts = _toasts.filter(x => x.id !== t.id)
              _notify()
            }}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
