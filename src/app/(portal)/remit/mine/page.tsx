import type { Metadata } from "next";
import { Banknote } from "lucide-react";

import { RemitDeleteButton } from "@/components/remit/remit-delete-button";
import { RemitForm } from "@/components/remit/remit-form";
import { RemitProofThumb } from "@/components/remit/remit-proof";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PersonCell } from "@/components/shared/person-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { formatMoney, formatRelative } from "@/lib/format";
import { getSelectableMembers } from "@/lib/members";
import { REMIT_SELECT, REMIT_TYPE_SELECT, WEEKLY_COMPLIANCE_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  isAdmin,
  isStaff,
  type RemitLogWithPeople,
  type RemitStatus,
  type RemitType,
  type WeeklyCompliance,
} from "@/lib/types/app";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Log remit" };

export default async function LogRemitPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();
  const staff = isStaff(profile.crew_rank);
  const admin = isAdmin(profile.crew_rank);

  const [typesResult, recentResult, complianceResult, members] = await Promise.all([
    supabase
      .from("remit_types")
      .select(REMIT_TYPE_SELECT)
      .order("name")
      .returns<RemitType[]>(),
    supabase
      .from("remit_logs")
      .select(REMIT_SELECT)
      .or(
        staff
          ? `member_id.eq.${profile.id},submitted_by.eq.${profile.id}`
          : `member_id.eq.${profile.id}`,
      )
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<RemitLogWithPeople[]>(),
    supabase
      .from("member_weekly_compliance")
      .select(WEEKLY_COMPLIANCE_SELECT)
      .eq("member_id", profile.id)
      .returns<WeeklyCompliance[]>(),
    staff ? getSelectableMembers() : Promise.resolve([]),
  ]);

  const types = typesResult.data ?? [];
  const recentEntries = recentResult.data ?? [];
  const quotas = complianceResult.data ?? [];
  const quotasMet = quotas.length > 0 && quotas.every((q) => q.quota_met);

  return (
    <>
      <PageHeader
        title="Log Remit"
        description={
          staff
            ? "Log for yourself by default. Paste a screenshot as proof. Staff can credit someone else."
            : "Record contracts and materials you handed over. Paste a screenshot as proof."
        }
      />

      {quotas.length > 0 ? (
        <div
          className={cn(
            "mb-6 space-y-2 rounded-xl border px-4 py-3 text-sm",
            quotasMet
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {quotas.map((q) => (
              <p key={q.quota_type_id}>
                Weekly {q.quota_type_name}:{" "}
                <span className="font-semibold tabular">
                  {q.approved_quantity}/{q.quota_amount}
                </span>{" "}
                approved — {q.quota_met ? "quota met" : "still short"}
              </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="py-6">
          <CardContent>
            <RemitForm
              members={members}
              types={types}
              selfId={profile.id}
              canCreditOthers={staff}
              creditsWarehouseOnLog={admin}
            />
          </CardContent>
        </Card>

        <Card className="h-fit gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Recent remit</CardTitle>
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
              {recentEntries.map((entry) => {
                const label = `${entry.quantity}× ${entry.remit_type?.name ?? "Remit"}`;
                const showMember =
                  staff && entry.member_id !== profile.id;
                return (
                  <li key={entry.id} className="flex items-start gap-2 p-3">
                    {entry.proof_path ? (
                      <RemitProofThumb path={entry.proof_path} />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      {showMember ? (
                        <PersonCell person={entry.member} compact />
                      ) : null}
                      <p
                        className={cn(
                          "text-sm font-medium",
                          showMember && "mt-1",
                        )}
                      >
                        {label}
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
                    <div className="flex shrink-0 items-center gap-1">
                      <RemitDeleteButton
                        id={entry.id}
                        status={entry.status}
                        label={label}
                      />
                      <StatusBadge status={entry.status as RemitStatus} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
