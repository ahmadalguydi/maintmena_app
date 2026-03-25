alter table public.maintenance_requests
  add column if not exists scheduled_for timestamptz;

alter table public.maintenance_requests
  add column if not exists lifecycle_state text;

update public.maintenance_requests
set scheduled_for = coalesce(scheduled_for, preferred_start_date, created_at)
where scheduled_for is null;

update public.maintenance_requests
set lifecycle_state = case
  when buyer_marked_complete is true then 'buyer_confirmed'
  when seller_marked_complete is true then 'seller_marked_complete'
  when status = 'cancelled' then 'cancelled'
  when status = 'disputed' then 'disputed'
  when status in ('closed', 'completed', 'confirmed') then 'closed'
  when status = 'in_progress' then 'in_progress'
  when status in ('en_route', 'arrived') then 'in_route'
  when status = 'accepted' and coalesce(scheduled_for, preferred_start_date, created_at) > (now() + interval '30 minutes')
    then 'scheduled_confirmed'
  when status = 'accepted' then 'seller_assigned'
  when status = 'no_seller_found' then 'no_seller_found'
  when status = 'submitted' then 'submitted'
  when status = 'draft' then 'draft'
  else 'dispatching'
end
where lifecycle_state is null;

create index if not exists idx_maintenance_requests_scheduled_for
  on public.maintenance_requests (scheduled_for);

create index if not exists idx_maintenance_requests_lifecycle_state
  on public.maintenance_requests (lifecycle_state);

create index if not exists idx_maintenance_requests_buyer_lifecycle
  on public.maintenance_requests (buyer_id, lifecycle_state, created_at desc);

create index if not exists idx_maintenance_requests_seller_lifecycle
  on public.maintenance_requests (assigned_seller_id, lifecycle_state, scheduled_for);
