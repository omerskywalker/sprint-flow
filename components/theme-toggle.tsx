'use client'

import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useAppStore()

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        'text-slate-400 hover:text-slate-200 hover:bg-white/8',
        'dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/8',
        'light:text-stone-500 light:hover:text-stone-800 light:hover:bg-black/5',
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-amber-400" />
      ) : (
        <Moon size={18} className="text-slate-500" />
      )}
    </button>
  )
}
