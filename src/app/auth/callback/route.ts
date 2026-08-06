import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isDiscordGuildMember } from "@/lib/discord";
import { discordGuildId, supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types/database.types";

/**
 * Discord returns here with a one-time code. The session cookies must be written
 * onto the redirect response itself — setting them only via next/headers and then
 * redirecting often drops them on Vercel, which sends the member straight back
 * to /login as if they never signed in.
 *
 * After the session exists we confirm the account is in the crew Discord server
 * before letting them into the portal.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const oauthError = searchParams.get("error");
  const oauthDescription = searchParams.get("error_description");

  // Only allow same-origin relative paths, so ?next= cannot bounce a member
  // to an attacker's site after a legitimate login.
  const destination =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = isLocal || !forwardedHost ? origin : `https://${forwardedHost}`;

  if (!code) {
    const detail =
      oauthDescription || oauthError || "No authorization code returned.";
    return NextResponse.redirect(
      `${base}/auth/auth-code-error?reason=${encodeURIComponent(detail)}`,
    );
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

  function redirectKeepingCookies(path: string) {
    const redirect = NextResponse.redirect(`${base}${path}`);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie.name, cookie.value);
    }
    return redirect;
  }

  async function denyAccess(errorCode: string, wipeSignup: boolean) {
    if (wipeSignup) {
      try {
        await supabase.rpc("vanta_reject_unauthorized_signup");
      } catch {
        // Best-effort cleanup; the session is cleared either way.
      }
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Account may already be gone after a wipe.
    }
    return redirectKeepingCookies(
      `/auth/auth-code-error?error=${encodeURIComponent(errorCode)}`,
    );
  }

  const { data: sessionData, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error || !sessionData.session) {
    return NextResponse.redirect(
      `${base}/auth/auth-code-error?reason=${encodeURIComponent(error?.message ?? "No session")}`,
    );
  }

  let guildId: string;
  try {
    guildId = discordGuildId();
  } catch {
    return denyAccess("missing_guild_config", false);
  }

  const providerToken = sessionData.session.provider_token;
  if (!providerToken) {
    return denyAccess("missing_provider_token", false);
  }

  let inGuild = false;
  try {
    inGuild = await isDiscordGuildMember(providerToken, guildId);
  } catch {
    return denyAccess("guild_check_failed", false);
  }

  if (!inGuild) {
    return denyAccess("not_in_guild", true);
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
