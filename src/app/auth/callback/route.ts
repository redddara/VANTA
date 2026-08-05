import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types/database.types";

/**
 * Discord returns here with a one-time code. The session cookies must be written
 * onto the redirect response itself — setting them only via next/headers and then
 * redirecting often drops them on Vercel, which sends the member straight back
 * to /login as if they never signed in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  // Only allow same-origin relative paths, so ?next= cannot bounce a member
  // to an attacker's site after a legitimate login.
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

  if (!code) {
    return NextResponse.redirect(`${base}/auth/auth-code-error`);
  }

  let response = NextResponse.redirect(`${base}${destination}`);

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.redirect(`${base}${destination}`);
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${base}/auth/auth-code-error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  // Heal a missing profiles row before the portal layout tries to load it.
  const { error: profileError } = await supabase.rpc("vanta_ensure_profile");
  if (profileError) {
    return NextResponse.redirect(
      `${base}/auth/auth-code-error?reason=${encodeURIComponent(profileError.message)}`,
    );
  }

  return response;
}
