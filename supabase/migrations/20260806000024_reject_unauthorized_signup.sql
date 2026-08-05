-- Wipe a brand-new auth account when Discord guild membership fails.
-- Established members who leave the server are only signed out by the app;
-- their history stays intact for admins to deactivate later.

create or replace function public.vanta_reject_unauthorized_signup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  created timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select p.created_at into created
  from public.profiles p
  where p.id = uid;

  -- Only destroy accounts provisioned in this login attempt. Older profiles
  -- keep their rows; the callback simply refuses a session.
  if created is null or created > now() - interval '5 minutes' then
    delete from auth.users where id = uid;
  end if;
end;
$$;

revoke all on function public.vanta_reject_unauthorized_signup() from public;
grant execute on function public.vanta_reject_unauthorized_signup() to authenticated;
