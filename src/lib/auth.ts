import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { canAccessInventory } from "@/lib/features";
import { INVENTORY_WAREHOUSE_SELECT } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  canViewRoster,
  isAdmin,
  isRank,
  isStaff,
  type InventoryWarehouse,
  type Profile,
} from "@/lib/types/app";

export type Session = {
  user: User;
  profile: Profile;
};

/**
 * The signed-in user and their crew profile, or null when signed out.
 *
 * Wrapped in React's `cache` so the nav, the page and any server action in a
 * single request share one round trip instead of three.
 */
/** Separate from getSession so a failed session can tell the two cases apart. */
const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  const user = await getUser();

  if (!user) return null;

  let { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Auth can exist without a profiles row (failed provision, wiped row). Heal
  // before treating the visitor as signed out, or they bounce login → dashboard
  // → login forever.
  if (!data) {
    const { data: healed } = await supabase.rpc("vanta_ensure_profile");
    data = healed ?? null;
  }

  if (!data) return null;

  return {
    user,
    profile: {
      ...data,
      // A rank the app does not know about must not be treated as a high one.
      crew_rank: isRank(data.crew_rank) ? data.crew_rank : "Prospect",
    },
  };
});

/** Sends signed-out visitors to /login. Use at the top of any private page. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    // Signed in with no readable profile row. Plain /login would bounce a
    // signed-in visitor straight back here, so say so in the URL and let the
    // login page render instead of looping.
    if (await getUser()) redirect("/login?stale=1");
    redirect("/login");
  }

  if (!session.profile.is_active) redirect("/deactivated");
  return session;
}

/**
 * These only decide what a page shows. Row level security is the real boundary,
 * so a stale tab or a direct API call is still refused by the database.
 */
export async function requireStaff(): Promise<Session> {
  const session = await requireSession();
  if (!isStaff(session.profile.crew_rank)) redirect("/dashboard");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!isAdmin(session.profile.crew_rank)) redirect("/dashboard");
  return session;
}

/** Operator and up. Prospects are not shown who else is in the crew. */
export async function requireRoster(): Promise<Session> {
  const session = await requireSession();
  if (!canViewRoster(session.profile.crew_rank)) redirect("/dashboard");
  return session;
}

/**
 * Warehouses the signed-in member may open. Admins get every catalog row;
 * others get only assigned warehouses (active preferred in nav).
 */
export const getMyWarehouseAccess = cache(
  async (): Promise<InventoryWarehouse[]> => {
    const session = await getSession();
    if (!session) return [];

    const supabase = await createClient();

    if (isAdmin(session.profile.crew_rank)) {
      const { data } = await supabase
        .from("inventory_warehouses")
        .select(INVENTORY_WAREHOUSE_SELECT)
        .order("sort_order")
        .order("id")
        .returns<InventoryWarehouse[]>();
      return data ?? [];
    }

    const { data: access } = await supabase
      .from("inventory_warehouse_access")
      .select("warehouse")
      .eq("member_id", session.profile.id);

    const ids = (access ?? []).map((row) => row.warehouse);
    if (ids.length === 0) return [];

    const { data } = await supabase
      .from("inventory_warehouses")
      .select(INVENTORY_WAREHOUSE_SELECT)
      .in("id", ids)
      .order("sort_order")
      .order("id")
      .returns<InventoryWarehouse[]>();

    return data ?? [];
  },
);

/** Admin, or any member with at least one warehouse assignment. */
export async function requireInventoryAccess(): Promise<
  Session & { warehouses: InventoryWarehouse[] }
> {
  const session = await requireSession();
  const warehouses = await getMyWarehouseAccess();
  if (!canAccessInventory(session.profile, warehouses)) {
    redirect("/dashboard");
  }
  return { ...session, warehouses };
}
