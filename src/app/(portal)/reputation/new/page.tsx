import type { Metadata } from "next";
import { Star } from "lucide-react";

import { ReputationForm } from "@/components/reputation/reputation-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PersonCell } from "@/components/shared/person-cell";
import { RepDelta } from "@/components/shared/rep-delta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { formatRelative } from "@/lib/format";
import { getSelectableMembers } from "@/lib/members";
import { REPUTATION_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { ReputationEntryWithPeople } from "@/lib/types/app";

export const metadata: Metadata = { title: "Give reputation" };

export default async function NewReputationPage() {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const [members, recent] = await Promise.all([
    getSelectableMembers(),
    supabase
      .from("reputation_entries")
      .select(REPUTATION_SELECT)
      .eq("given_by", profile.id)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<ReputationEntryWithPeople[]>(),
  ]);

  const recentEntries = recent.data ?? [];

  return (
    <>
      <PageHeader
        title="Give Reputation"
        description="Grant or dock a member's standing. Every entry needs a reason and is visible to that member."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="py-6">
          <CardContent>
            <ReputationForm members={members} />
          </CardContent>
        </Card>

        <Card className="h-fit gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Recently given by you</CardTitle>
          </CardHeader>

          {recentEntries.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No entries yet"
              description="Reputation you grant or dock will appear here."
              className="py-10"
            />
          ) : (
            <ul className="divide-border/60 divide-y">
              {recentEntries.map((entry) => (
                <li key={entry.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <PersonCell person={entry.member} compact />
                    </div>
                    <RepDelta points={entry.points} className="shrink-0 text-sm" />
                  </div>
                  <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                    {entry.reason}
                  </p>
                  <p className="text-muted-foreground/70 mt-1 text-xs">
                    {formatRelative(entry.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
