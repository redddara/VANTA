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
import { TierPayouts } from "@/components/reputation/tier-payouts";
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
      .maybeSingle<WeeklyCompliance>(),
  ]);

  const summary = summaryResult.data;
  const remit = remitResult.data ?? [];
  const compliance = complianceResult.data;

  const approvedRemit = Number(summary?.total_approved_remit ?? 0);
  const pendingCount = Number(summary?.pending_remit_count ?? 0);
  const hasTier = Boolean(summary?.current_tier_id);
  const quotaMet = compliance?.quota_met ?? false;

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
            <Button asChild variant="outline" size="sm">
              <Link href="/rep-tiers">Rep ladder</Link>
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
          value={
            compliance
              ? `${compliance.approved_quantity}/${compliance.quota_amount}`
              : "—"
          }
          icon={quotaMet ? Check : X}
          tone={quotaMet ? "positive" : "negative"}
          hint={
            compliance
              ? quotaMet
                ? `${compliance.quota_type_name} met this week`
                : `${compliance.quota_type_name} still short`
              : "Quota not configured"
          }
        />
        <StatCard
          label="Reputation tier"
          value={summary?.tier_label ?? "Unassigned"}
          icon={Layers}
          tone={hasTier ? "accent" : "default"}
          hint={
            hasTier
              ? `Level ${summary?.tier_level_order}`
              : "Staff still need to place you on the ladder"
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
            <CardTitle className="text-base">Your tier</CardTitle>
          </CardHeader>

          {!hasTier || !summary ? (
            <EmptyState
              icon={Layers}
              title="No tier assigned"
              description="When staff place you on the ladder, your payouts and crafting unlocks show up here."
            />
          ) : (
            <CardContent className="space-y-5 py-5">
              <div>
                <p className="text-lg font-semibold">{summary.tier_label}</p>
                <p className="text-muted-foreground text-sm">
                  Level {summary.tier_level_order}
                </p>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {remit.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.quantity}× {log.remit_type?.name ?? "Remit"}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
