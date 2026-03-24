'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Zap, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import type { Sprint } from '@/types'
import { useState } from 'react'

interface DashboardShellProps {
  user: User
  children: React.ReactNode
}

const NAV_TABS = [
  { label: 'Daily', href: '/dashboard' },
  { label: 'Weekly', href: '/dashboard/weekly' },
  { label: 'Sprint', href: '/dashboard/sprint' },
]

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { activeSprintId, setActiveSprintId } = useAppStore()
  const [sprintMenuOpen, setSprintMenuOpen] = useState(false)

  const { data: sprints } = useQuery<Sprint[]>({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const activeSprint = sprints?.find(s => s.id === activeSprintId) ?? sprints?.[0]

  // Auto-set active sprint if none selected
  if (sprints && sprints.length > 0 && !activeSprintId) {
    setActiveSprintId(sprints[0].id)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const fullName = user.user_metadata?.full_name as string | undefined
  const initials = fullName
    ? fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.[0].toUpperCase() ?? '?'

  return (
    <div className="flex flex-col h-full dark:bg-[#0e0e10] bg-[#f5f0eb]">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-3 border-b dark:border-white/6 border-black/8 dark:bg-[#0e0e10]/80 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        {/* Left: Logo + Sprint selector */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
              <Zap size={15} className="text-white" fill="white" />
            </div>
            <span className="text-base font-bold dark:text-white text-stone-900 hidden sm:block" style={{ fontFamily: 'var(--font-heading)' }}>
              SprintFlow
            </span>
          </Link>

          {activeSprint && (
            <div className="relative">
              <button
                onClick={() => setSprintMenuOpen(v => !v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  'dark:bg-white/6 bg-black/5',
                  'dark:text-slate-300 text-stone-600',
                  'dark:hover:bg-white/10 hover:bg-black/8',
                  'border dark:border-white/8 border-black/8'
                )}
              >
                <span className="max-w-[140px] truncate">{activeSprint.name}</span>
                <ChevronDown size={13} className="shrink-0" />
              </button>

              {sprintMenuOpen && (
                <div className={cn(
                  'absolute left-0 top-full mt-1 w-56 rounded-xl py-1 z-50',
                  'dark:bg-[#1a1a1f] bg-white',
                  'border dark:border-white/8 border-black/8',
                  'shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
                )}>
                  {sprints?.map(sprint => (
                    <button
                      key={sprint.id}
                      onClick={() => {
                        setActiveSprintId(sprint.id)
                        setSprintMenuOpen(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm transition-colors',
                        'dark:text-slate-300 text-stone-700',
                        'dark:hover:bg-white/6 hover:bg-black/4',
                        sprint.id === activeSprint.id && 'dark:text-cyan-400 text-blue-600 font-medium'
                      )}
                    >
                      {sprint.name}
                    </button>
                  ))}
                  <div className="border-t dark:border-white/6 border-black/6 mt-1 pt-1">
                    <Link
                      href="/sprints/new"
                      onClick={() => setSprintMenuOpen(false)}
                      className="block px-3 py-2 text-sm dark:text-cyan-400 text-blue-600 dark:hover:bg-white/6 hover:bg-black/4"
                    >
                      + New Sprint
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {!activeSprint && (
            <Link
              href="/sprints/new"
              className="text-sm dark:text-cyan-400 text-blue-600 hover:underline"
            >
              + Create Sprint
            </Link>
          )}
        </div>

        {/* Center: Nav tabs */}
        <nav className="flex-1 flex justify-center">
          <div className={cn(
            'flex items-center gap-1 rounded-xl p-1',
            'dark:bg-white/5 bg-black/5',
            'border dark:border-white/6 border-black/6'
          )}>
            {NAV_TABS.map(tab => {
              const isActive = tab.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'dark:bg-white/10 bg-white dark:text-white text-stone-900 shadow-sm'
                      : 'dark:text-slate-400 text-stone-500 dark:hover:text-slate-200 hover:text-stone-700'
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Right: Theme toggle + avatar + sign out */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ThemeToggle />

          <div className="flex items-center gap-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={fullName ?? 'User'}
                className="h-8 w-8 rounded-full object-cover border dark:border-white/10 border-black/10"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">
                {initials}
              </div>
            )}
          </div>

          <button
            onClick={handleSignOut}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
              'dark:text-slate-400 text-stone-500',
              'dark:hover:text-slate-200 hover:text-stone-800',
              'dark:hover:bg-white/6 hover:bg-black/5'
            )}
            title="Sign out"
          >
            <LogOut size={15} />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
