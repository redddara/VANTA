import type { Metadata } from "next";
import { Banknote } from "lucide-react";

import { OwnRemitForm } from "@/components/remit/own-remit-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { formatMoney, formatRelative } from "@/lib/format";
import { REMIT_SELECT, REMIT_TYPE_SELECT, WEEKLY_COMPLIANCE_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  RemitLogWithPeople,
  RemitStatus,
  RemitType,
  WeeklyCompliance,
} from "@/lib/types/app";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Log remit" };

export default async function OwnRemitPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();

  const [typesResult, recentResult, complianceResult] = await Promise.all([
    supabase
      .from("remit_types")
      .select(REMIT_TYPE_SELECT)
      .order("name")
      .returns<RemitType[]>(),
    supabase
      .from("remit_logs")
      .select(REMIT_SELECT)
      .eq("member_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<RemitLogWithPeople[]>(),
    supabase
      .from("member_weekly_compliance")
      .select(WEEKLY_COMPLIANCE_SELECT)
      .eq("member_id", profile.id)
      .maybeSingle<WeeklyCompliance>(),
  ]);

  const types = typesResult.data ?? [];
  const recentEntries = recentResult.data ?? [];
  const compliance = complianceResult.data;

  return (
    <>
      <PageHeader
        title="Log My Remit"
        description="Record contracts and materials you handed over. Entries stay pending until an admin approves them."
      />

      {compliance ? (
        <div
          className={cn(
            "mb-6 rounded-xl border px-4 py-3 text-sm",
            compliance.quota_met
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          Weekly {compliance.quota_type_name}:{" "}
          <span className="font-semibold tabular">
            {compliance.approved_quantity}/{compliance.quota_amount}
          </span>{" "}
          approved — {compliance.quota_met ? "quota met" : "still short"}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="py-6">
          <CardContent>
            <OwnRemitForm types={types} />
          </CardContent>
        </Card>

        <Card className="h-fit gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Your recent remit</CardTitle>
          </CardHeader>

          {recentEntries.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Nothing logged yet"
              description="Entries you log will appear here."
              className="py-10"
            />
          ) : (
            <ul className="divide-border/60 divide-y">
              {recentEntries.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {entry.quantity}× {entry.remit_type?.name ?? "Remit"}
                    </p>
                    {entry.amount != null ? (
                      <p className="text-muted-foreground tabular mt-0.5 text-xs">
                        {formatMoney(entry.amount)}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatRelative(entry.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={entry.status as RemitStatus} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
