-- APPLIED to the IT Help Desk project (jnopqxeqziazaqknuvmy) on 2026-06-14.
-- `sales` schema keeps lead data separable from IT Helpdesk tables and trivially
-- migratable to a dedicated "Sales Call Agent" project when going live.
create schema if not exists sales;

create table if not exists sales.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  caller_phone text, name text, vehicle_or_equipment text, product_need text,
  urgency text, budget_range text, branch_of_interest text, preferred_callback text,
  notes_summary text, source text default 'inbound-call', recording_url text,
  lead_score int, lead_temperature text, routing text,
  status text default 'new', call_sid text
);

create table if not exists sales.call_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  call_sid text, caller_phone text, transcript jsonb,
  duration_seconds int, ended_reason text, recorded boolean default false, consent_given boolean
);

create index if not exists leads_created_at_idx on sales.leads (created_at desc);
create index if not exists leads_status_idx on sales.leads (status);
create index if not exists leads_call_sid_idx on sales.leads (call_sid);
create index if not exists call_logs_call_sid_idx on sales.call_logs (call_sid);

alter table sales.leads enable row level security;
alter table sales.call_logs enable row level security;

create or replace view sales.view_leads as
select id, created_at, name, caller_phone, vehicle_or_equipment, product_need, urgency,
       budget_range, branch_of_interest, preferred_callback, lead_score, lead_temperature,
       routing, status, source, recording_url, notes_summary, call_sid,
       (created_at at time zone 'America/Jamaica')::date as lead_date_jm,
       to_char(created_at at time zone 'America/Jamaica', 'Dy') as lead_dow_jm
from sales.leads;
