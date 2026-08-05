import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Clock, Coins, ScrollText, Shield, Star } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCell } from "@/components/shared/person-cell";
import { RepDelta } from "@/components/shared/rep-delta";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MEMBER_SUMMARY_SELECT, REMIT_SELECT, REPUTATION_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  MemberSummary,
  RemitLogWithPeople,
  RemitStatus,
  ReputationEntryWithPeople,
} from "@/lib/types/app";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();

  // RLS scopes these to the caller: a member sees only their own rows here even
  // though the query itself has no ownership filter beyond member_id.
  const [summaryResult, reputationResult, remitResult] = await Promise.all([
    supabase
      .from("member_summary")
      .select(MEMBER_SUMMARY_SELECT)
      .eq("id", profile.id)
      .maybeSingle<MemberSummary>(),
    supabase
      .from("reputation_entries")
      .select(REPUTATION_SELECT)
      .eq("member_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<ReputationEntryWithPeople[]>(),
    supabase
      .from("remit_logs")
      .select(REMIT_SELECT)
      .eq("member_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<RemitLogWithPeople[]>(),
  ]);

  const summary = summaryResult.data;
  const reputation = reputationResult.data ?? [];
  const remit = remitResult.data ?? [];

  const totalRep = Number(summary?.total_rep ?? 0);
  const approvedRemit = Number(summary?.total_approved_remit ?? 0);
  const pendingCount = Number(summary?.pending_remit_count ?? 0);

  return (
    <>
      <PageHeader
        title={displayName(profile)}
        description={`${profile.crew_rank ?? "Recruit"} · joined ${formatRelative(profile.created_at)}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/roster">View roster</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Reputation"
          value={totalRep > 0 ? `+${totalRep}` : String(totalRep)}
          icon={Star}
          tone={totalRep > 0 ? "positive" : totalRep < 0 ? "negative" : "default"}
          hint={`${reputation.length} ${reputation.length === 1 ? "entry" : "entries"} on record`}
        />
        <StatCard
          label="Approved remit"
          value={formatMoney(approvedRemit)}
          icon={Coins}
          tone="accent"
          hint="Lifetime contributions credited to you"
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

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="flex-row items-center gap-2 border-b py-4">
            <Shield className="text-muted-foreground size-4" />
            <CardTitle className="text-base">Reputation history</CardTitle>
          </CardHeader>

          {reputation.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No reputation yet"
              description="Officers add reputation when you contribute. Every entry comes with a reason."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rep</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="hidden sm:table-cell">Given by</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reputation.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <RepDelta points={entry.points} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm break-words">{entry.reason}</p>
                      <p className="text-muted-foreground mt-1 text-xs sm:hidden">
                        {displayName(entry.giver ?? {})}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <PersonCell person={entry.giver} compact />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs whitespace-nowrap">
                      <time dateTime={entry.created_at} title={formatDateTime(entry.created_at)}>
                        {formatRelative(entry.created_at)}
                      </time>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              description="When an officer records a contribution for you it shows up here, pending until an admin approves it."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remit.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="tabular font-medium whitespace-nowrap">
                      {formatMoney(log.amount)}
                      <p className="text-muted-foreground mt-1 max-w-40 truncate text-xs font-normal sm:hidden">
                        {log.description || "No description"}
                      </p>
                    </TableCell>
                    <TableCell className="hidden max-w-xs sm:table-cell">
                      <p className="text-muted-foreground text-sm break-words">
                        {log.description || "\u2014"}
                      </p>
                      {log.submitter && (
                        <p className="text-muted-foreground/70 mt-1 text-xs">
                          by {displayName(log.submitter)}
                        </p>
                      )}
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
