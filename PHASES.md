# SprintFlow — Build Phases

Track the status of every planned phase here. Check this file for current progress.

Legend: ✅ Complete · 🔲 Planned

---

## Phase 0: Scaffolding ✅

Project bootstrap and infrastructure.

- ✅ Next.js 16 app with TypeScript (App Router)
- ✅ Tailwind CSS v4
- ✅ Supabase project (Postgres + auth)
- ✅ Database schema: `sprints`, `tickets`, `micro_tasks`, `contacts`, `resources`, `daily_focus`, `audit_log`
- ✅ Row Level Security policies (all tables scoped to `auth.uid()`)
- ✅ Auth middleware protecting `/dashboard/**`
- ✅ TanStack Query, Zustand, dnd-kit, recharts, lucide-react, date-fns dependencies
- ✅ Dark/light theme system with theme toggle and localStorage persistence
- ✅ Custom font variables (heading, mono)

---

## Phase 1: Core Features ✅

Auth, sprint lifecycle, and ticket management.

- ✅ Supabase email auth + OAuth (login page, redirect, sign out)
- ✅ Sprint creation wizard (3 steps: details → tickets → roadmap planner)
- ✅ Auto-calculated sprint end date (10 working days, weekends skipped)
- ✅ Roadmap planner: drag tickets to sprint days during creation
- ✅ Sprint switcher dropdown in header (auto-selects most recent)
- ✅ Ticket CRUD: create, edit, delete with Fibonacci story points (1/2/3/5/8/13)
- ✅ Ticket tags (backend, frontend, bug, feature, design, devops, testing, docs)
- ✅ Multi-day ticket splits (`day_assigned` + `day_assigned_end`)
- ✅ Micro-tasks with checkboxes and acceptance criteria flag
- ✅ Daily focus algorithm (risk-scored, auto-selects highest-risk in-progress ticket)
- ✅ Feasibility analysis (remaining hours vs sprint capacity)
- ✅ Audit log: records create/complete/delete/update events per ticket
- ✅ Ticket detail page: tasks, contacts, resources, audit history sub-tabs
- ✅ Contacts: add stakeholder name, email, role, notes per ticket
- ✅ Resources: add link/doc title, URL, notes per ticket
- ✅ Toast notifications for errors and confirmations
- ✅ Loading skeletons (page, sprint, weekly views)
- ✅ Audit log RLS fixes

---

## Phase 2: Tracking & Polish ✅

Visualization, interactions, and UX refinements.

- ✅ Burndown chart with historical accuracy (reconstructed from audit log completion timestamps)
- ✅ Burndown shows ideal vs actual line; future days null (no line drawn)
- ✅ Kanban board with drag-and-drop (Todo → In Progress → Review → Done)
- ✅ Kanban drag syncs ticket status to Supabase
- ✅ List view with sortable columns (ticket #, story points, status)
- ✅ Sprint view: overall progress bar (% points done)
- ✅ Sprint settings modal: rename sprint, danger-zone delete sprint
- ✅ Delete confirmations for tickets and sprints (`DeleteConfirmModal`)
- ✅ Weekly calendar view: 5-day columns, per-day hour load, completion %
- ✅ Weekly view: drag tickets between days, updates `day_assigned` in Supabase
- ✅ Weekly view: done tickets shown with strikethrough + green indicator
- ✅ Daily focus: manual override (user can pin a different ticket)
- ✅ Feasibility banner: on-track / tight / at-risk with color coding
- ✅ Completion note modal when marking ticket as done
- ✅ Font polish (heading font applied to all page titles)
- ✅ App name "SprintFlow" established

---

## Phase 3: Velocity & Analytics ✅

Cross-sprint insights and velocity tracking.

- ✅ Analytics page (`/dashboard/analytics`) — new top-nav tab
- ✅ Velocity bar chart: completed points (color-coded by rate) vs total points per sprint
- ✅ Stat cards: average velocity, average completion rate, total tickets done, best sprint
- ✅ Per-sprint breakdown table: name, dates, total points, done points, ticket count, completion rate
- ✅ Completion rate color-coding: cyan ≥80%, amber ≥50%, red <50%
- ✅ Empty state when no sprints exist yet

---

## Phase 4: Search, Filter & Productivity 🔲

Making it faster to find and act on tickets.

- 🔲 Global ticket search (across all sprints, by name or ticket #)
- 🔲 Filter tickets by tag, status, and story points in sprint/list views
- 🔲 Keyboard shortcuts (e.g. `n` = new ticket, `k`/`j` = navigate, `d` = daily view)
- 🔲 Bulk status update (select multiple tickets → move to status)
- 🔲 Sprint templates (save a ticket set as a reusable template)
- 🔲 Drag-to-reorder tickets in list view (manual ordering via `position` column)

---

## Phase 5: Reports & Export 🔲

End-of-sprint summaries and data portability.

- 🔲 Sprint summary report: printable/shareable page per sprint (velocity, tickets, burndown snapshot)
- 🔲 CSV export of tickets (name, points, status, tags, completion date)
- 🔲 Retrospective notes: per-sprint free-text field (what went well, what to improve)
- 🔲 Custom sprint length (configurable working days, not just 10)
- 🔲 Sprint capacity override (set available hours per day per sprint)
- 🔲 Sprint close flow: archive completed sprint with a summary card

---

## Stretch Goals 🔲

Bigger features for future consideration.

- 🔲 Team / collaborator support (invite users to a workspace, shared sprint view)
- 🔲 Jira / Linear import (CSV or API-based ticket import)
- 🔲 Slack / webhook notifications (daily focus reminder, sprint end alert)
- 🔲 Mobile-optimized layout (responsive design pass for small screens)
- 🔲 GitHub PR linking (attach PR URL to ticket, show CI status badge)
- 🔲 Sprint velocity forecasting (predict completion based on historical data)
- 🔲 Recurring tickets (templates that auto-populate into new sprints)
- 🔲 Time tracking (log actual hours spent per ticket vs estimated)
