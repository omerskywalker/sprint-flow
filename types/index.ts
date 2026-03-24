export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Core domain types ───────────────────────────────────────────────────────

export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13

export type TicketStatus = 'todo' | 'in_progress' | 'review' | 'done'

export type EntityType = 'ticket' | 'micro_task'

export type AuditAction = 'completed' | 'unchecked' | 'created' | 'deleted' | 'updated'

export type FeasibilityStatus = 'on_track' | 'tight' | 'at_risk'

// ─── Database row types ───────────────────────────────────────────────────────

export interface Sprint {
  id: string
  user_id: string
  name: string
  start_date: string   // ISO date "YYYY-MM-DD"
  end_date: string     // ISO date "YYYY-MM-DD"
  created_at: string
}

export interface Ticket {
  id: string
  sprint_id: string
  user_id: string
  ticket_number: string
  name: string
  story_points: StoryPoints
  status: TicketStatus
  tags: string[]
  day_assigned: number | null      // 1-10, start day
  day_assigned_end: number | null  // 1-10, end day (null = single day)
  created_at: string
}

export interface MicroTask {
  id: string
  ticket_id: string
  description: string
  completed: boolean
  is_acceptance_criteria: boolean
  position: number
  created_at: string
}

export interface Contact {
  id: string
  ticket_id: string
  name: string
  email: string | null
  role: string | null
  notes: string | null
  created_at: string
}

export interface Resource {
  id: string
  ticket_id: string
  title: string
  url: string | null
  notes: string | null
  created_at: string
}

export interface DailyFocus {
  id: string
  sprint_id: string
  user_id: string
  date: string  // ISO date
  ticket_id: string | null
  is_manual: boolean
  created_at: string
}

export interface AuditLogEntry {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  action: AuditAction
  notes: string | null
  created_at: string
}

// ─── Enriched / computed types ────────────────────────────────────────────────

export interface TicketWithTasks extends Ticket {
  micro_tasks: MicroTask[]
}

export interface SprintWithTickets extends Sprint {
  tickets: TicketWithTasks[]
}

export interface BurndownPoint {
  day: number
  label: string          // "Day 1", "Day 2" …
  ideal: number          // linearly decreasing from total to 0
  actual: number | null  // points remaining at end of that sprint day
}

export interface FeasibilityResult {
  remaining_hours: number
  available_hours: number
  status: FeasibilityStatus
  remaining_sprint_days: number
  total_sprint_days: number
}

export interface FocusResult {
  ticket: Ticket | null
  risk_score: number
  is_manual: boolean
}

export interface DayLoad {
  day: number            // 1-10
  tickets: Ticket[]
  total_hours: number
  is_overloaded: boolean // > 8h
}

// ─── Form / input types ───────────────────────────────────────────────────────

export interface CreateSprintInput {
  name: string
  start_date: string
  end_date: string
}

export interface CreateTicketInput {
  sprint_id: string
  ticket_number: string
  name: string
  story_points: StoryPoints
  status?: TicketStatus
  tags?: string[]
  day_assigned?: number | null
  day_assigned_end?: number | null
}

export interface UpdateTicketInput {
  name?: string
  story_points?: StoryPoints
  status?: TicketStatus
  tags?: string[]
  day_assigned?: number | null
  day_assigned_end?: number | null
}

export interface CreateMicroTaskInput {
  ticket_id: string
  description: string
  is_acceptance_criteria?: boolean
  position?: number
}

export interface CreateContactInput {
  ticket_id: string
  name: string
  email?: string
  role?: string
  notes?: string
}

export interface CreateResourceInput {
  ticket_id: string
  title: string
  url?: string
  notes?: string
}

// ─── UI state types ───────────────────────────────────────────────────────────

export type ViewMode = 'burndown' | 'kanban' | 'list'

export type Theme = 'dark' | 'light'

export interface AppStore {
  activeSprintId: string | null
  theme: Theme
  viewMode: ViewMode
  setActiveSprintId: (id: string | null) => void
  setTheme: (theme: Theme) => void
  setViewMode: (mode: ViewMode) => void
}

// ─── Supabase auth types ──────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
}
