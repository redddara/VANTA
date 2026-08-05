import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/types/database.types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the anon key on purpose. Every query runs as the signed-in user so RLS
 * is what decides the result -- there is no service-role key anywhere in this
 * app, which means a bug in a page cannot leak another member's data.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the
          // session on every request, so it is safe to ignore this here.
        }
      },
    },
  });
}
