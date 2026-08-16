import type { Metadata } from "next";

import { RemitTracker } from "@/components/remit/remit-tracker";
import { PageHeader } from "@/components/shared/page-header";
import { requireStaff } from "@/lib/auth";
import {
  manilaMonth,
  manilaWeeksInMonth,
  manilaWeekStart,
  upcomingManilaWeeks,
} from "@/lib/manila-week";
import { REMIT_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  isAdmin,
  type RemitLogWithPeople,
  type WeeklyCompliance,
} from "@/lib/types/app";

export const metadata: Metadata = { title: "Remit tracker" };

type SearchParams = Promise<{
  year?: string;
  month?: string;
  week?: string;
}>;

export default async function RemitTrackerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireStaff();
  const params = await searchParams;
  const current = manilaMonth();
  const year = Number(params.year) || current.year;
  const month = Number(params.month) || current.month;
  const weeks = manilaWeeksInMonth(year, month);
  const currentWeek = manilaWeekStart();
  const selectedWeek =
    params.week && weeks.includes(params.week)
      ? params.week
      : weeks.includes(currentWeek)
        ? currentWeek
        : (weeks[weeks.length - 1] ?? currentWeek);

  const supabase = await createClient();

  const [complianceResult, historyResult] = await Promise.all([
    supabase.rpc("vanta_member_week_compliance", { p_week: selectedWeek }),
    supabase
      .from("remit_logs")
      .select(REMIT_SELECT)
      .eq("week_start", selectedWeek)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<RemitLogWithPeople[]>(),
  ]);

  const compliance = (complianceResult.data ?? []) as WeeklyCompliance[];
  const history = historyResult.data ?? [];

  return (
    <>
      <PageHeader
        title="Remit Tracker"
        description="Quota weeks run Monday to Sunday (Manila). Each tab shows the full date range so you can see which days are covered."
      />
      <RemitTracker
        year={year}
        month={month}
        weeks={weeks.length > 0 ? weeks : [selectedWeek]}
        selectedWeek={selectedWeek}
        compliance={compliance}
        history={history}
        upcomingWeeks={upcomingManilaWeeks(8)}
        canManageAdvance={isAdmin(profile.crew_rank)}
      />
    </>
  );
}
