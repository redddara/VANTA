import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  Check,
  Clock,
  Coins,
  Layers,
  ScrollText,
  Shield,
  X,
} from "lucide-react";

import { CraftingUnlockBadges } from "@/components/reputation/crafting-unlocks";
import { RepBandBadge } from "@/components/reputation/rep-band-badge";
import { TierPayouts } from "@/components/reputation/tier-payouts";
import { RemitDeleteButton } from "@/components/remit/remit-delete-button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth";
import { REP_BAND_LABELS } from "@/lib/constants";
import { displayName } from "@/lib/display";
import { formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import {
  MEMBER_SUMMARY_SELECT,
  REMIT_SELECT,
  WEEKLY_COMPLIANCE_SELECT,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  canViewRoster,
  type MemberSummary,
  type RemitLogWithPeople,
  type RemitStatus,
  type WeeklyCompliance,
} from "@/lib/types/app";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();

  const isProspect = !canViewRoster(profile.crew_rank);

  const [summaryResult, remitResult, complianceResult] = await Promise.all([
    supabase
      .from("member_summary")
      .select(MEMBER_SUMMARY_SELECT)
      .eq("id", profile.id)
      .maybeSingle<MemberSummary>(),
    supabase
      .from("remit_logs")
      .select(REMIT_SELECT)
      .eq("member_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<RemitLogWithPeople[]>(),
    supabase
      .from("member_weekly_compliance")
      .select(WEEKLY_COMPLIANCE_SELECT)
      .eq("member_id", profile.id)
      .returns<WeeklyCompliance[]>(),
  ]);

  const summary = summaryResult.data;
  const remit = remitResult.data ?? [];
  const quotas = complianceResult.data ?? [];

  const approvedRemit = Number(summary?.total_approved_remit ?? 0);
  const pendingCount = Number(summary?.pending_remit_count ?? 0);
  const hasRep = Boolean(summary?.tier_label);
  const quotasMet = quotas.length > 0 && quotas.every((q) => q.quota_met);
  const quotasHint =
    quotas.length === 0
      ? "Quota not configured"
      : quotas
          .map(
            (q) =>
              `${q.quota_type_name} ${q.approved_quantity}/${q.quota_amount}`,
          )
          .join(" · ");
  const quotasValue =
    quotas.length === 0
      ? "—"
      : quotas.length === 1
        ? `${quotas[0].approved_quantity}/${quotas[0].quota_amount}`
        : `${quotas.filter((q) => q.quota_met).length}/${quotas.length} met`;

  return (
    <>
      <PageHeader
        title={displayName(profile)}
        description={`${profile.crew_rank} · joined ${formatRelative(profile.created_at)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/remit/mine">Log remit</Link>
            </Button>
            {!isProspect && (
              <Button asChild variant="outline" size="sm">
                <Link href="/roster">View roster</Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Weekly quota"
          value={quotasValue}
          icon={quotas.length === 0 ? Clock : quotasMet ? Check : X}
          tone={
            quotas.length === 0
              ? "default"
              : quotasMet
                ? "positive"
                : "negative"
          }
          hint={quotasHint}
        />
        <StatCard
          label="Reputation"
          value={summary?.tier_label ?? "Unassigned"}
          icon={Layers}
          tone={hasRep ? "accent" : "default"}
          hint={
            hasRep && summary?.rep_band
              ? REP_BAND_LABELS[summary.rep_band]
              : "Staff still need to set your reputation"
          }
        />
        <StatCard
          label="Approved cash"
          value={formatMoney(approvedRemit)}
          icon={Coins}
          tone="accent"
          hint="Lifetime cash remits credited to you"
        />
        <StatCard
          label="Awaiting review"
          value={String(pendingCount)}
          icon={Clock}
          hint={
            pendingCount === 0
              ? "Nothing pending"
              : "An admin still needs to approve these"
          }
        />
      </div>

      <div className={cn("mt-8 grid gap-6", "xl:grid-cols-2")}>
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="flex-row items-center gap-2 border-b py-4">
            <Shield className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Your reputation</CardTitle>
          </CardHeader>

          {!hasRep || !summary ? (
            <EmptyState
              icon={Layers}
              title="No reputation set"
              description="When staff enter your payouts and crafting unlocks, they show up here."
            />
          ) : (
            <CardContent className="space-y-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">{summary.tier_label}</p>
                <RepBandBadge band={summary.rep_band} />
              </div>
              <TierPayouts tier={summary} />
              <div>
                <p className="text-muted-foreground mb-2 text-xs">Crafting</p>
                <CraftingUnlockBadges tier={summary} />
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="flex-row items-center gap-2 border-b py-4">
            <Banknote className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Remit history</CardTitle>
          </CardHeader>

          {remit.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No remit logged"
              description="Log contracts and materials you hand over — they stay pending until an admin approves them."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="hidden sm:table-cell">Cash</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">When</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {remit.map((log) => {
                  const label = `${log.quantity}× ${log.remit_type?.name ?? "Remit"}`;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {label}
                        {log.description ? (
                          <p className="text-muted-foreground mt-1 max-w-48 truncate text-xs font-normal">
                            {log.description}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="tabular text-muted-foreground hidden sm:table-cell">
                        {log.amount != null ? formatMoney(log.amount) : "\u2014"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status as RemitStatus} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-xs whitespace-nowrap">
                        <time dateTime={log.created_at} title={formatDateTime(log.created_at)}>
                          {formatRelative(log.created_at)}
                        </time>
                      </TableCell>
                      <TableCell className="text-right">
                        <RemitDeleteButton
                          id={log.id}
                          status={log.status}
                          label={label}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
