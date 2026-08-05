import type { Metadata } from "next";

import { StrategiesBoard } from "@/components/strategies/strategies-board";
import { PageHeader } from "@/components/shared/page-header";
import { requireSession } from "@/lib/auth";
import { STRATEGY_CATEGORY_SELECT, STRATEGY_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  isAdmin,
  type StrategyCategory,
  type StrategyWithCategory,
} from "@/lib/types/app";

export const metadata: Metadata = { title: "Strategies" };

export default async function StrategiesPage() {
  const { profile } = await requireSession();
  const supabase = await createClient();
  const canManage = isAdmin(profile.crew_rank);

  const [categoriesResult, strategiesResult] = await Promise.all([
    supabase
      .from("strategy_categories")
      .select(STRATEGY_CATEGORY_SELECT)
      .order("sort_order")
      .order("name")
      .returns<StrategyCategory[]>(),
    supabase
      .from("strategies")
      .select(STRATEGY_SELECT)
      .order("title")
      .returns<StrategyWithCategory[]>(),
  ]);

  return (
    <>
      <PageHeader
        title="Strategies"
        description={
          canManage
            ? "Crew playbooks for blocks, chase switches, and more. You can add and edit entries."
            : "Crew playbooks for blocks, chase switches, and more. Read-only for your rank."
        }
      />
      <StrategiesBoard
        categories={categoriesResult.data ?? []}
        strategies={strategiesResult.data ?? []}
        canManage={canManage}
      />
    </>
  );
}
