import type { SelectableMember } from "@/components/shared/member-combobox";
import { displayName } from "@/lib/display";
import { createClient } from "@/lib/supabase/server";

/**
 * Active members, ordered for a picker.
 *
 * Inactive members are excluded so staff cannot file remit or set reputation
 * against someone who has left the crew.
 */
export async function getSelectableMembers(): Promise<SelectableMember[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("id, ingame_name, discord_username, discord_avatar_url, crew_rank")
    .eq("is_active", true);

  return (data ?? []).sort((a, b) =>
    displayName(a).localeCompare(displayName(b), undefined, { sensitivity: "base" }),
  );
}
