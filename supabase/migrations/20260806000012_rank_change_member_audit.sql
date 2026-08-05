-- Include the affected member's display name on profile audits so the audit
-- log shows who was promoted, demoted, deactivated, or reactivated.

create or replace function public.vanta_audit_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_label text;
begin
  member_label := coalesce(
    nullif(new.ingame_name, ''),
    new.discord_username,
    new.id::text
  );

  if new.crew_rank is distinct from old.crew_rank then
    perform public.vanta_audit(
      'rank.change',
      'profiles',
      new.id,
      jsonb_build_object(
        'member', member_label,
        'discord_username', new.discord_username,
        'crew_rank', jsonb_build_object('from', old.crew_rank, 'to', new.crew_rank)
      )
    );
  end if;

  if new.is_active is distinct from old.is_active then
    perform public.vanta_audit(
      case when new.is_active then 'member.reactivate' else 'member.deactivate' end,
      'profiles',
      new.id,
      jsonb_build_object(
        'member', member_label,
        'discord_username', new.discord_username,
        'is_active', jsonb_build_object('from', old.is_active, 'to', new.is_active)
      )
    );
  end if;

  return null;
end;
$$;
