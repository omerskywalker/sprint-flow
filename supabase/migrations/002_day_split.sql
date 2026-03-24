-- Add end-day for multi-day ticket splits
alter table tickets
  add column if not exists day_assigned_end int check (day_assigned_end between 1 and 10);
