import type { Metadata } from "next";
import { Banknote } from "lucide-react";

import { RemitForm } from "@/components/remit/remit-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PersonCell } from "@/components/shared/person-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { formatMoney, formatRelative } from "@/lib/format";
import { getSelectableMembers } from "@/lib/members";
import { REMIT_SELECT, REMIT_TYPE_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { RemitLogWithPeople, RemitStatus, RemitType } from "@/lib/types/app";

export const metadata: Metadata = { title: "Submit remit" };

export default async function NewRemitPage() {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const [members, typesResult, recent] = await Promise.all([
    getSelectableMembers(),
    supabase
      .from("remit_types")
      .select(REMIT_TYPE_SELECT)
      .order("name")
      .returns<RemitType[]>(),
    supabase
      .from("remit_logs")
      .select(REMIT_SELECT)
      .eq("submitted_by", profile.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<RemitLogWithPeople[]>(),
  ]);

  const types = typesResult.data ?? [];
  const recentEntries = recent.data ?? [];

  return (
    <>
      <PageHeader
        title="Submit Remit"
        description="Record contracts or materials on behalf of a member. An admin approves before it counts."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="py-6">
          <CardContent>
            <RemitForm members={members} types={types} />
          </CardContent>
        </Card>

        <Card className="h-fit gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Your recent submissions</CardTitle>
          </CardHeader>

          {recentEntries.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Nothing submitted yet"
              description="Entries you file will appear here."
              className="py-10"
            />
          ) : (
            <ul className="divide-border/60 divide-y">
              {recentEntries.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <PersonCell person={entry.member} compact />
                    <p className="text-muted-foreground mt-1 text-xs">
                      {entry.quantity}× {entry.remit_type?.name ?? "Remit"}
                      {entry.amount != null ? ` · ${formatMoney(entry.amount)}` : ""}
                    </p>
                    <p className="text-muted-foreground/70 mt-0.5 text-xs">
                      {formatRelative(entry.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={entry.status as RemitStatus} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
