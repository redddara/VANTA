import type { Metadata } from "next";
import Link from "next/link";

import { RemitQueue } from "@/components/admin/remit-queue";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { REMIT_SELECT, REMIT_TYPE_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { RemitLogWithPeople, RemitType } from "@/lib/types/app";

export const metadata: Metadata = { title: "Remit queue" };

export default async function AdminRemitPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [entriesResult, typesResult] = await Promise.all([
    supabase
      .from("remit_logs")
      .select(REMIT_SELECT)
      .order("created_at", { ascending: false })
      .limit(300)
      .returns<RemitLogWithPeople[]>(),
    supabase
      .from("remit_types")
      .select(REMIT_TYPE_SELECT)
      .order("name")
      .returns<RemitType[]>(),
  ]);

  return (
    <>
      <PageHeader
        title="Remit Queue"
        description="Approve, reject, edit or void contributions. Only approved laundering contracts count toward the weekly quota."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/remit/compliance">Weekly quota</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/remit-types">Remit types</Link>
            </Button>
          </div>
        }
      />
      <RemitQueue entries={entriesResult.data ?? []} types={typesResult.data ?? []} />
    </>
  );
}
