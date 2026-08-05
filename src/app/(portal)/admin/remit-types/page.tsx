import type { Metadata } from "next";

import { RemitTypesManager } from "@/components/admin/remit-types-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { REMIT_TYPE_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { RemitType } from "@/lib/types/app";

export const metadata: Metadata = { title: "Remit types" };

export default async function AdminRemitTypesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("remit_types")
    .select(REMIT_TYPE_SELECT)
    .order("name")
    .returns<RemitType[]>();

  return (
    <>
      <PageHeader
        title="Remit Types"
        description="Catalog of what members can remit. Exactly one type may carry the weekly quota."
      />
      <RemitTypesManager types={data ?? []} />
    </>
  );
}
