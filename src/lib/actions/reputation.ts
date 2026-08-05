"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, toActionError, type ActionResult } from "@/lib/actions/shared";
import { requireSession } from "@/lib/auth";
import { REP_BANDS, REP_BAND_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/types/app";

const uuid = z.uuid("Pick a value from the list.");

const SetMemberRepSchema = z.object({
  memberId: uuid,
  repBand: z.enum(REP_BANDS, { error: "Pick Low, Mid, or High Rep." }),
  tierLabel: z
    .string()
    .trim()
    .min(1, "Give this reputation a label.")
    .max(80, "Keep the label under 80 characters."),
  houseRobPayout: z.string().trim().max(80).optional().nullable(),
  atmPayout: z.string().trim().max(80).optional().nullable(),
  launderRate: z.string().trim().max(80).optional().nullable(),
  storeCapacity: z.string().trim().max(80).optional().nullable(),
  gpsUnlocked: z.boolean(),
  ropeUnlocked: z.boolean(),
  nosUnlocked: z.boolean(),
  usbUnlocked: z.boolean(),
});

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function revalidateRep() {
  revalidatePath("/dashboard");
  revalidatePath("/roster");
  revalidatePath("/reputation/new");
  revalidatePath("/admin/members");
  revalidatePath("/admin/audit");
}

/** Set or replace one member's reputation profile (entered one-by-one). */
export async function setMemberRep(
  input: z.infer<typeof SetMemberRepSchema>,
): Promise<ActionResult> {
  const parsed = SetMemberRepSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { profile } = await requireSession();
  if (!isStaff(profile.crew_rank)) {
    return { ok: false, error: "Only Enforcers and above can set reputation." };
  }
  const supabase = await createClient();

  const { error } = await supabase.from("member_rep").upsert(
    {
      member_id: parsed.data.memberId,
      rep_band: parsed.data.repBand,
      tier_label: parsed.data.tierLabel,
      house_rob_payout: emptyToNull(parsed.data.houseRobPayout),
      atm_payout: emptyToNull(parsed.data.atmPayout),
      launder_rate: emptyToNull(parsed.data.launderRate),
      store_capacity: emptyToNull(parsed.data.storeCapacity),
      gps_unlocked: parsed.data.gpsUnlocked,
      rope_unlocked: parsed.data.ropeUnlocked,
      nos_unlocked: parsed.data.nosUnlocked,
      usb_unlocked: parsed.data.usbUnlocked,
      updated_by: profile.id,
    },
    { onConflict: "member_id" },
  );

  if (error) return { ok: false, error: toActionError(error) };

  revalidateRep();
  return {
    ok: true,
    message: `Saved ${REP_BAND_LABELS[parsed.data.repBand]} — ${parsed.data.tierLabel}.`,
  };
}
