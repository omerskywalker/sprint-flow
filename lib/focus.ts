import type { Ticket, DailyFocus, FocusResult } from '@/types'
import { pointsToHours, remainingWorkingDays } from './utils'

/**
 * Determine the recommended focus ticket for today.
 *
 * Priority order:
 *   1. Manual override (daily_focus row with is_manual=true)
 *   2. Any ticket currently in_progress — highest story points first
 *   3. Algorithm fallback: highest risk score among all non-done tickets
 *      risk = hours / days_remaining
 */
export function computeDailyFocus(
  tickets: Ticket[],
  todayFocus: DailyFocus | null,
  sprintEndDate: string,
  today: Date = new Date()
): FocusResult {
  // 1. Manual override
  if (todayFocus?.is_manual && todayFocus.ticket_id) {
    const manual = tickets.find(t => t.id === todayFocus.ticket_id) ?? null
    return { ticket: manual, risk_score: Infinity, is_manual: true }
  }

  const endDate = new Date(sprintEndDate + 'T23:59:59')
  const daysRemaining = remainingWorkingDays(today, endDate)

  const nonDone = tickets.filter(t => t.status !== 'done')

  if (nonDone.length === 0) {
    return { ticket: null, risk_score: 0, is_manual: false }
  }

  // 2. Prefer in-progress tickets — pick the heaviest one
  const inProgress = nonDone
    .filter(t => t.status === 'in_progress')
    .sort((a, b) => b.story_points - a.story_points)

  if (inProgress.length > 0) {
    const top = inProgress[0]
    const hours = pointsToHours(top.story_points)
    const risk = daysRemaining > 0 ? hours / daysRemaining : hours * 1000
    return { ticket: top, risk_score: risk, is_manual: false }
  }

  // 3. Algorithm fallback: highest risk score
  const scored = nonDone.map(t => {
    const hours = pointsToHours(t.story_points)
    const risk = daysRemaining > 0 ? hours / daysRemaining : hours * 1000
    return { ticket: t, risk_score: risk }
  })
  scored.sort((a, b) => b.risk_score - a.risk_score)

  return {
    ticket: scored[0].ticket,
    risk_score: scored[0].risk_score,
    is_manual: false,
  }
}

/**
 * Given today's focus ticket, return a risk level label.
 */
export function focusRiskLevel(risk_score: number): 'low' | 'medium' | 'high' {
  if (!isFinite(risk_score)) return 'high'
  if (risk_score >= 4) return 'high'
  if (risk_score >= 2) return 'medium'
  return 'low'
}
