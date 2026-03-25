'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Sprint, Ticket } from '@/types'
import { VelocityChart, type VelocityPoint } from '@/components/charts/velocity-chart'
import { cn, formatDate } from '@/lib/utils'
import { TrendingUp, Target, CheckCircle2, Layers } from 'lucide-react'
import { PageSkeleton } from '@/components/shared/skeleton'

interface SprintStats {
  sprint: Sprint
  totalPoints: number
  donePoints: number
  totalTickets: number
  doneTickets: number
  rate: number  // 0-100
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'cyan',
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: 'cyan' | 'emerald' | 'amber' | 'slate'
}) {
  const colorMap = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    slate: 'dark:text-slate-300 text-stone-700',
  }
  return (
    <div className={cn(
      'rounded-2xl p-5 border',
      'dark:bg-[#1a1a1f] bg-white',
      'dark:border-white/6 border-black/8'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="dark:text-slate-500 text-stone-400" />
        <span className="text-xs dark:text-slate-500 text-stone-400 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className={cn('text-3xl font-bold', colorMap[color])} style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </div>
      {sub && <div className="text-xs dark:text-slate-600 text-stone-400 mt-1">{sub}</div>}
    </div>
  )
}

export default function AnalyticsPage() {
  const supabase = createClient()

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery<Sprint[]>({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('start_date', { ascending: true })
      if (error) return []
      return data ?? []
    },
  })

  const { data: allTickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ['all-tickets-analytics'],
    queryFn: async () => {
      if (sprints.length === 0) return []
      const sprintIds = sprints.map(s => s.id)
      const { data, error } = await supabase
        .from('tickets')
        .select('id, sprint_id, story_points, status')
        .in('sprint_id', sprintIds)
      if (error) return []
      return data ?? []
    },
    enabled: sprints.length > 0,
  })

  if (sprintsLoading || ticketsLoading) return <PageSkeleton />

  // Build per-sprint stats
  const sprintStats: SprintStats[] = sprints.map(sprint => {
    const tickets = allTickets.filter(t => t.sprint_id === sprint.id)
    const totalPoints = tickets.reduce((acc, t) => acc + t.story_points, 0)
    const donePoints = tickets.filter(t => t.status === 'done').reduce((acc, t) => acc + t.story_points, 0)
    const totalTickets = tickets.length
    const doneTickets = tickets.filter(t => t.status === 'done').length
    const rate = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0
    return { sprint, totalPoints, donePoints, totalTickets, doneTickets, rate }
  })

  // Aggregate stats
  const completedSprints = sprintStats.filter(s => s.donePoints > 0 || s.totalTickets > 0)
  const avgVelocity = completedSprints.length > 0
    ? Math.round(completedSprints.reduce((acc, s) => acc + s.donePoints, 0) / completedSprints.length)
    : 0
  const avgRate = completedSprints.length > 0
    ? Math.round(completedSprints.reduce((acc, s) => acc + s.rate, 0) / completedSprints.length)
    : 0
  const bestSprint = sprintStats.length > 0
    ? sprintStats.reduce((best, s) => s.donePoints > best.donePoints ? s : best, sprintStats[0])
    : null
  const totalDone = sprintStats.reduce((acc, s) => acc + s.doneTickets, 0)

  // Chart data — truncate long sprint names
  const velocityData: VelocityPoint[] = sprintStats.map(s => ({
    name: s.sprint.name.length > 12 ? s.sprint.name.slice(0, 12) + '…' : s.sprint.name,
    fullName: s.sprint.name,
    completed: s.donePoints,
    total: s.totalPoints,
    rate: s.rate,
  }))

  if (sprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold dark:text-white text-stone-900 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          No Sprints Yet
        </h2>
        <p className="text-sm dark:text-slate-400 text-stone-500">
          Create and complete sprints to see velocity analytics here.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-white text-stone-900" style={{ fontFamily: 'var(--font-heading)' }}>
          Analytics
        </h1>
        <p className="text-sm dark:text-slate-400 text-stone-500 mt-1">
          Velocity and completion trends across {sprints.length} sprint{sprints.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Avg Velocity"
          value={`${avgVelocity}pt`}
          sub="story points / sprint"
          color="cyan"
        />
        <StatCard
          icon={Target}
          label="Avg Completion"
          value={`${avgRate}%`}
          sub="points completed"
          color={avgRate >= 80 ? 'emerald' : avgRate >= 50 ? 'amber' : 'slate'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Tickets Done"
          value={totalDone}
          sub={`across ${sprints.length} sprint${sprints.length !== 1 ? 's' : ''}`}
          color="emerald"
        />
        <StatCard
          icon={Layers}
          label="Best Sprint"
          value={bestSprint ? `${bestSprint.donePoints}pt` : '—'}
          sub={bestSprint?.sprint.name ?? ''}
          color="cyan"
        />
      </div>

      {/* Velocity chart */}
      <div className={cn(
        'rounded-2xl p-5 border',
        'dark:bg-[#1a1a1f] bg-white',
        'dark:border-white/6 border-black/8'
      )}>
        <h2 className="text-sm font-semibold dark:text-slate-300 text-stone-700 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
          Sprint Velocity
        </h2>
        <p className="text-xs dark:text-slate-500 text-stone-400 mb-4">
          Story points completed (cyan) vs total (gray) per sprint
        </p>
        <VelocityChart data={velocityData} />
      </div>

      {/* Per-sprint table */}
      <div className={cn(
        'rounded-2xl border overflow-hidden',
        'dark:bg-[#1a1a1f] bg-white',
        'dark:border-white/6 border-black/8'
      )}>
        <div className={cn(
          'grid grid-cols-[1fr_80px_80px_80px_100px_90px] gap-2 px-5 py-3 text-xs font-medium uppercase tracking-wide',
          'dark:text-slate-500 text-stone-400',
          'dark:border-b dark:border-white/6 border-b border-black/8'
        )}>
          <span>Sprint</span>
          <span>Points</span>
          <span>Done</span>
          <span>Tickets</span>
          <span>Completion</span>
          <span>Rate</span>
        </div>

        {sprintStats.map((s, i) => (
          <div
            key={s.sprint.id}
            className={cn(
              'grid grid-cols-[1fr_80px_80px_80px_100px_90px] gap-2 px-5 py-3.5 items-center',
              'dark:hover:bg-white/2 hover:bg-black/2 transition-colors',
              i < sprintStats.length - 1 && 'dark:border-b dark:border-white/4 border-b border-black/6'
            )}
          >
            <div>
              <div className="text-sm font-medium dark:text-slate-200 text-stone-800 truncate">
                {s.sprint.name}
              </div>
              <div className="text-xs dark:text-slate-600 text-stone-400 mt-0.5">
                {formatDate(s.sprint.start_date)} – {formatDate(s.sprint.end_date)}
              </div>
            </div>
            <span className="text-sm dark:text-slate-400 text-stone-600">{s.totalPoints}pt</span>
            <span className="text-sm font-medium dark:text-cyan-400 text-cyan-600">{s.donePoints}pt</span>
            <span className="text-sm dark:text-slate-400 text-stone-600">{s.doneTickets}/{s.totalTickets}</span>
            <div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${s.rate}%` }} />
              </div>
            </div>
            <span className={cn(
              'text-sm font-semibold',
              s.rate >= 80
                ? 'text-emerald-400'
                : s.rate >= 50
                ? 'dark:text-amber-400 text-amber-600'
                : s.totalPoints === 0
                ? 'dark:text-slate-600 text-stone-400'
                : 'text-red-400'
            )}>
              {s.totalPoints === 0 ? '—' : `${s.rate}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
