import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import {
  canViewRoster,
  isAdmin,
  isRank,
  isStaff,
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

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

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

