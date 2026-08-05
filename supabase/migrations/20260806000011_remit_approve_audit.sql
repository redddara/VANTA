-- Richer remit review audits: separate approve/reject actions, named member,
-- and a short remit summary so the audit log shows who approved what for whom.

create or replace function public.vanta_audit_remit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
  member_label text;
  type_label text;
  review_action text;
begin
  if tg_op = 'DELETE' then
    perform public.vanta_audit(
      'remit.delete', 'remit_logs', old.id,
      jsonb_build_object('deleted', to_jsonb(old))
    );
    return null;
  end if;

  if new.status is distinct from old.status then
    select coalesce(nullif(p.ingame_name, ''), p.discord_username, p.id::text)
      into member_label
    from public.profiles p
    where p.id = new.member_id;

    select t.name into type_label
    from public.remit_types t
    where t.id = new.remit_type_id;

    review_action := case new.status
      when 'approved' then 'remit.approve'
      when 'rejected' then 'remit.reject'
      else 'remit.status'
    end;

    perform public.vanta_audit(
      review_action,
      'remit_logs',
      new.id,
      jsonb_build_object(
        'member', member_label,
        'status', jsonb_build_object('from', old.status, 'to', new.status),
        'quantity', new.quantity,
        'amount', new.amount,
        'remit_type', type_label,
        'reviewed_by', new.reviewed_by
      )
    );
  end if;

  if new.amount is distinct from old.amount then
    diff := diff || jsonb_build_object(
      'amount', jsonb_build_object('from', old.amount, 'to', new.amount)
    );
  end if;

  if new.quantity is distinct from old.quantity then
    diff := diff || jsonb_build_object(
      'quantity', jsonb_build_object('from', old.quantity, 'to', new.quantity)
    );
  end if;

  if new.remit_type_id is distinct from old.remit_type_id then
    diff := diff || jsonb_build_object(
      'remit_type_id', jsonb_build_object('from', old.remit_type_id, 'to', new.remit_type_id)
    );
  end if;

  if new.description is distinct from old.description then
    diff := diff || jsonb_build_object(
      'description', jsonb_build_object('from', old.description, 'to', new.description)
    );
  end if;

  if diff <> '{}'::jsonb then
    perform public.vanta_audit('remit.edit', 'remit_logs', new.id, diff);
  end if;

  return null;
end;
$$;
