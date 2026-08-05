-- Placeholder ladder so the portal is usable before real payouts are pasted in.
-- Skips when any tier already exists, so re-applying never clobber edits.

insert into public.rep_tiers (
  level_order,
  tier_label,
  house_rob_payout,
  atm_payout,
  launder_rate,
  store_capacity,
  gps_unlocked,
  rope_unlocked,
  nos_unlocked,
  usb_unlocked
)
select *
from (
  values
    (1, 'Prospect Runner',   '$2,500',  '$1,000', '$50/MB',  '25 MB', false, false, false, false),
    (2, 'Reliable Hand',     '$5,000',  '$2,500', '$65/MB',  '40 MB', true,  false, false, false),
    (3, 'Consistent Mansion','$10,500', '$5,000', '$80/MB',  '60 MB', true,  true,  false, false),
    (4, 'Crew Specialist',   '$15,000', '$7,500', '$90/MB',  '75 MB', true,  true,  true,  false),
    (5, 'Top Earner',        '$22,000', '$12,000','$100/MB', '100 MB',true,  true,  true,  true)
) as seed(
  level_order,
  tier_label,
  house_rob_payout,
  atm_payout,
  launder_rate,
  store_capacity,
  gps_unlocked,
  rope_unlocked,
  nos_unlocked,
  usb_unlocked
)
where not exists (select 1 from public.rep_tiers);
