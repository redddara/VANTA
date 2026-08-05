/**
 * Fails loudly at first use rather than surfacing an opaque "Invalid URL" from
 * deep inside the Supabase client when an env var is missing on Vercel.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local for ` +
        `local development, or add it under Project Settings > Environment Variables ` +
        `in Vercel. See SETUP.md.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Absolute origin used to build the OAuth redirect. Vercel injects
 * VERCEL_PROJECT_PRODUCTION_URL, but a custom domain should win, so
 * NEXT_PUBLIC_SITE_URL takes precedence when set.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
