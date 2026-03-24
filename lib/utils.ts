import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert story points to hours */
export function pointsToHours(points: number): number {
  const map: Record<number, number> = {
    1: 4,
    2: 8,
    3: 12,
    5: 20,
    8: 32,
    13: 52,
  }
  return map[points] ?? points * 4
}

/** Skip weekends — count only Mon–Fri between two dates (inclusive) */
export function countWorkingDays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endD = new Date(end)
  endD.setHours(0, 0, 0, 0)
  while (cur <= endD) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/** Return the Nth working day date from a start date (1-indexed) */
export function nthWorkingDay(start: Date, n: number): Date {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  while (true) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) {
      count++
      if (count === n) return new Date(cur)
    }
    cur.setDate(cur.getDate() + 1)
  }
}

/** How many working days remain from today through end (inclusive) */
export function remainingWorkingDays(today: Date, end: Date): number {
  return countWorkingDays(today, end)
}

/** Return today's sprint day number (1-10), or null if outside sprint */
export function currentSprintDay(sprintStart: Date, today: Date): number | null {
  const start = new Date(sprintStart)
  start.setHours(0, 0, 0, 0)
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  if (t < start) return null
  const day = countWorkingDays(start, t)
  return day > 0 ? day : null
}

/** Format a date string YYYY-MM-DD to a human-readable label */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Format as "Mon, Mar 23" */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Get Monday of the week containing `date` */
export function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d
}

/** Get the 5 working days (Mon–Fri) for the week containing `date` */
export function getWeekDays(date: Date): Date[] {
  const mon = getWeekMonday(date)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

/** YYYY-MM-DD from a Date */
export function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Truncate text with ellipsis */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

/** Return a status color class */
export function statusColor(status: string): string {
  switch (status) {
    case 'todo':        return 'text-zinc-400'
    case 'in_progress': return 'text-blue-400'
    case 'review':      return 'text-amber-400'
    case 'done':        return 'text-emerald-400'
    default:            return 'text-zinc-400'
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'todo':        return 'To Do'
    case 'in_progress': return 'In Progress'
    case 'review':      return 'Review'
    case 'done':        return 'Done'
    default:            return status
  }
}
