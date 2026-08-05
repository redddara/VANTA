import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Discord sends the member back here with a one-time code. Exchanging it sets
 * the session cookie. The profiles row is normally created by the auth.users
 * trigger; vanta_ensure_profile heals the case where the account already exists
 * but the profile row never landed.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Only allow same-origin relative paths, so ?next= cannot be used to bounce a
  // member to an attacker's site after a legitimate login.
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  // The auth.users trigger creates the profile on first Discord insert. If that
  // ever missed (or the row was wiped), a later sign-in would leave the member
  // signed in with nothing to load — heal it here before sending them in.
  const { error: profileError } = await supabase.rpc("vanta_ensure_profile");
  if (profileError) {
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(profileError.message)}`,
    );
  }

  // Behind Vercel's proxy the request origin is http; trust the forwarded host.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

  return NextResponse.redirect(`${base}${destination}`);
}
