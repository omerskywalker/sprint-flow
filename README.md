# SprintFlow

A personal sprint management app built for engineers who want a focused, no-noise way to plan and track 2-week sprints. SprintFlow keeps you on top of daily priorities, sprint health, and velocity — without the overhead of heavyweight project tools.

---

## What it does

SprintFlow organizes work around a 10-working-day sprint cycle. Each sprint has:

- **Tickets** with Fibonacci story points, tags, status, micro-tasks, and acceptance criteria
- **Daily Focus** — an algorithm that surfaces your highest-risk in-progress ticket each morning
- **Feasibility analysis** — compares remaining hours to available sprint capacity in real time
- **Burndown chart** — reconstructed historically from audit log completion timestamps
- **Kanban board** — drag cards between Todo / In Progress / Review / Done columns
- **Weekly planner** — drag tickets to calendar days, see per-day load and completion %
- **Ticket detail** — micro-tasks, acceptance criteria, stakeholder contacts, resource links, and full audit history
- **Roadmap planner** — assign tickets to sprint days during sprint creation
- **Analytics** — velocity tracking across all sprints with completion rate stats

---

## Tech stack

| Layer | Library |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database & Auth | [Supabase](https://supabase.com) (Postgres + Row Level Security) |
| Server client | [@supabase/ssr](https://github.com/supabase/ssr) |
| Data fetching | [TanStack Query v5](https://tanstack.com/query) |
| Global state | [Zustand v5](https://zustand-demo.pmnd.rs) |
| Drag & drop | [@dnd-kit](https://dndkit.com) |
| Charts | [Recharts v3](https://recharts.org) |
| Icons | [Lucide React](https://lucide.dev) |
| Date utilities | [date-fns v4](https://date-fns.org) |

---

## Project structure

```
app/
  auth/               Login / OAuth callback
  dashboard/          Main app shell (sticky nav, sprint switcher)
    page.tsx          Daily focus view
    weekly/           Weekly calendar planner
    sprint/           Burndown / Kanban / List view
    analytics/        Velocity & cross-sprint analytics
    tickets/[id]/     Ticket detail (tasks, contacts, resources, audit)
  sprints/new/        3-step sprint creation wizard

components/
  charts/             BurndownChart, VelocityChart
  focus/              DailyFocusWidget
  kanban/             KanbanBoard, KanbanColumn, KanbanCard
  roadmap/            RoadmapPlanner (drag-to-day assignment)
  tickets/            TicketCard, TicketForm, MicroTaskList
  shared/             Modals, toasts, skeletons, tag badges

lib/
  feasibility.ts      Burndown data + feasibility calculations
  focus.ts            Daily focus algorithm (risk scoring)
  store.ts            Zustand store (active sprint, theme, view mode)
  supabase/           Client + server Supabase helpers

supabase/migrations/  SQL migrations (init schema, day-split feature)
types/index.ts        All shared TypeScript types
```

---

## Database schema

```
sprints         id, user_id, name, start_date, end_date
tickets         id, sprint_id, user_id, ticket_number, name, story_points,
                status, tags[], day_assigned, day_assigned_end
micro_tasks     id, ticket_id, description, completed, is_acceptance_criteria, position
contacts        id, ticket_id, name, email, role, notes
resources       id, ticket_id, title, url, notes
daily_focus     id, sprint_id, user_id, date, ticket_id, is_manual
audit_log       id, user_id, entity_type, entity_id, action, notes, created_at
```

All tables use Postgres Row Level Security — users can only read/write their own data.

---

## Story points → hours

| Points | Hours |
|---|---|
| 1 | 4h |
| 2 | 8h |
| 3 | 12h |
| 5 | 20h |
| 8 | 32h |
| 13 | 52h |

Sprint capacity is 80h (10 days × 8h/day).

---

## Getting started

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project with the migrations applied

### Environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run migrations

Apply the SQL files in `supabase/migrations/` to your Supabase project (via the SQL editor or `supabase db push`).

### Start the dev server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

---

## Key design decisions

- **Sprint = 10 working days** (auto-calculated end date, weekends skipped)
- **Burndown uses audit log** — completion timestamps are recorded so the chart is historically accurate even after the sprint ends
- **Daily focus is algorithmic** — risk score weighs status, story points, and days remaining; can be overridden manually
- **Zustand persists to localStorage** — active sprint and theme survive page reloads without a round-trip to Supabase
- **No team features** — data is scoped per user; all RLS policies enforce `user_id = auth.uid()`
