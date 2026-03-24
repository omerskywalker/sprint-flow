import type { Ticket, DailyFocus, FocusResult } from '@/types'
import { pointsToHours, remainingWorkingDays } from './utils'

/**
 * Determine the recommended focus ticket for today.
 *
 * Algorithm:
 *   For each non-done ticket: risk = (story_points * 4) / days_remaining
 *   Return ticket with highest risk score.
 *   If a daily_focus row exists for today with is_manual=true, use that instead.
 */
export function computeDailyFocus(
  tickets: Ticket[],
  todayFocus: DailyFocus | null,
  sprintEndDate: string,
  today: Date = new Date()
): FocusResult {
  // If there's a manual override for today, honour it
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

  // Score each ticket
  const scored = nonDone.map(t => {
    const hours = pointsToHours(t.story_points)
    const risk = daysRemaining > 0 ? hours / daysRemaining : hours * 1000
    return { ticket: t, risk_score: risk }
  })

  // Sort descending by risk
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
