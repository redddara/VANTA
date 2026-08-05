import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types/database.types";

/** Routes reachable without a session. Everything else redirects to /login. */
const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/auth-code-error",
  "/auth/signout",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Refreshes the Supabase session cookie and gates unauthenticated traffic.
 *
 * This is a convenience redirect, not a security boundary: RLS is what actually
 * protects the data. Skipping this middleware would show empty pages, not
 * someone else's records.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() revalidates the token with Supabase. Do not swap this for
  // getSession(), which trusts whatever is in the cookie.
  //
  // A network failure here must not 500 the whole site: fall back to "signed
  // out", which sends the visitor to /login instead of an error page.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const { pathname } = request.nextUrl;

  // getUser() above may have rotated the refresh token, in which case the new
  // cookies are on `response`. A redirect built from scratch would drop them and
  // leave the browser replaying a token Supabase has already spent, so every
  // later request would fail and bounce here again — an endless redirect.
  function redirectKeepingCookies(url: URL) {
    const redirect = NextResponse.redirect(url);
    // Copy name/value/options explicitly — passing the cookie object can drop
    // path/maxAge in some Next versions and leave the browser without a session.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie.name, cookie.value);
    }
    return redirect;
  }

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return redirectKeepingCookies(redirectUrl);
  }

  // `stale` means a page just turned this user away for having no profile row.
  // Bouncing them back would loop.
  if (user && pathname === "/login" && !request.nextUrl.searchParams.has("stale")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return redirectKeepingCookies(redirectUrl);
  }

  return response;
}
