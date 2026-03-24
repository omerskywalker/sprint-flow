-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- SPRINTS
-- ============================================================
create table if not exists sprints (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz not null default now()
);

alter table sprints enable row level security;

create policy "Users can manage their own sprints"
  on sprints for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TICKETS
-- ============================================================
create table if not exists tickets (
  id             uuid primary key default uuid_generate_v4(),
  sprint_id      uuid not null references sprints(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  ticket_number  text not null,
  name           text not null,
  story_points   int not null default 1 check (story_points in (1, 2, 3, 5, 8, 13)),
  status         text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'done')),
  tags           text[] not null default '{}',
  day_assigned   int check (day_assigned between 1 and 10),
  created_at     timestamptz not null default now()
);

alter table tickets enable row level security;

create policy "Users can manage their own tickets"
  on tickets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- MICRO TASKS
-- ============================================================
create table if not exists micro_tasks (
  id                    uuid primary key default uuid_generate_v4(),
  ticket_id             uuid not null references tickets(id) on delete cascade,
  description           text not null,
  completed             bool not null default false,
  is_acceptance_criteria bool not null default false,
  position              int not null default 0,
  created_at            timestamptz not null default now()
);

alter table micro_tasks enable row level security;

create policy "Users can manage micro_tasks for their tickets"
  on micro_tasks for all
  using (
    exists (
      select 1 from tickets t
      where t.id = micro_tasks.ticket_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from tickets t
      where t.id = micro_tasks.ticket_id
        and t.user_id = auth.uid()
    )
  );

-- ============================================================
-- CONTACTS
-- ============================================================
create table if not exists contacts (
  id        uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  name      text not null,
  email     text,
  role      text,
  notes     text,
  created_at timestamptz not null default now()
);

alter table contacts enable row level security;

create policy "Users can manage contacts for their tickets"
  on contacts for all
  using (
    exists (
      select 1 from tickets t
      where t.id = contacts.ticket_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from tickets t
      where t.id = contacts.ticket_id
        and t.user_id = auth.uid()
    )
  );

-- ============================================================
-- RESOURCES
-- ============================================================
create table if not exists resources (
  id        uuid primary key default uuid_generate_v4(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  title     text not null,
  url       text,
  notes     text,
  created_at timestamptz not null default now()
);

alter table resources enable row level security;

create policy "Users can manage resources for their tickets"
  on resources for all
  using (
    exists (
      select 1 from tickets t
      where t.id = resources.ticket_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from tickets t
      where t.id = resources.ticket_id
        and t.user_id = auth.uid()
    )
  );

-- ============================================================
-- DAILY FOCUS
-- ============================================================
create table if not exists daily_focus (
  id        uuid primary key default uuid_generate_v4(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  date      date not null,
  ticket_id uuid references tickets(id) on delete set null,
  is_manual bool not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table daily_focus enable row level security;

create policy "Users can manage their own daily focus"
  on daily_focus for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table if not exists audit_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('ticket', 'micro_task')),
  entity_id   uuid not null,
  action      text not null check (action in ('completed', 'unchecked', 'created', 'deleted', 'updated')),
  notes       text,
  created_at  timestamptz not null default now()
);

alter table audit_log enable row level security;

create policy "Users can manage their own audit log"
  on audit_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_tickets_sprint_id on tickets(sprint_id);
create index if not exists idx_tickets_user_id on tickets(user_id);
create index if not exists idx_micro_tasks_ticket_id on micro_tasks(ticket_id);
create index if not exists idx_contacts_ticket_id on contacts(ticket_id);
create index if not exists idx_resources_ticket_id on resources(ticket_id);
create index if not exists idx_daily_focus_user_date on daily_focus(user_id, date);
create index if not exists idx_audit_log_entity on audit_log(entity_type, entity_id);
create index if not exists idx_audit_log_user on audit_log(user_id, created_at desc);
