import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { isRole, type Profile } from "@/lib/types/app";

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
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      role: isRole(data.role) ? data.role : "member",
    },
  };
});

/** Sends signed-out visitors to /login. Use at the top of any private page. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.profile.is_active) redirect("/deactivated");
  return session;
}

export async function requireStaff(): Promise<Session> {
  const session = await requireSession();
  if (session.profile.role === "member") redirect("/dashboard");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.profile.role !== "admin") redirect("/dashboard");
  return session;
}

