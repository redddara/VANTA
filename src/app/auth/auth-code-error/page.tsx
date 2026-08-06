import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { VantaCrest } from "@/components/brand/vanta-crest";
import { Button } from "@/components/ui/button";
import { discordInviteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign-in failed",
};

const ERROR_COPY: Record<
  string,
  { title: string; body: string; showInvite?: boolean }
> = {
  not_in_guild: {
    title: "Not in the crew Discord",
    body: "This portal is only for members of the Vanta Discord server. Join the server with this Discord account, then try signing in again.",
    showInvite: true,
  },
  guild_check_failed: {
    title: "Could not verify Discord membership",
    body: "Discord did not return your server list. Wait a moment and try again. If it keeps failing, ask an admin.",
  },
  missing_provider_token: {
    title: "Discord token missing",
    body: "Sign-in completed but Discord did not grant access to check your servers. Try signing in again and accept the permissions prompt.",
  },
  missing_guild_config: {
    title: "Portal misconfigured",
    body: "DISCORD_GUILD_ID is not set on this deployment. An admin needs to add the crew server ID before anyone can sign in.",
  },
};

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string }>;
}) {
  const { reason, error } = await searchParams;
  const copy = error ? ERROR_COPY[error] : undefined;
  const invite = copy?.showInvite ? discordInviteUrl() : undefined;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="vanta-glow pointer-events-none absolute inset-0 -z-10" />

      <div className="w-full max-w-sm text-center">
        <VantaCrest size="lg" className="mb-6" />

        <div className="text-destructive mb-4 flex items-center justify-center gap-2">
          <ShieldAlert className="size-5" />
          <h1 className="font-display text-xl tracking-wide uppercase">
            {copy?.title ?? "Sign-in failed"}
          </h1>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed text-balance">
          {copy?.body ??
            "Discord did not complete the handshake. Most often the member opened the wrong portal link, or that link is missing from Supabase Redirect URLs."}
        </p>

        {!copy ? (
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed text-balance">
            Crew should sign in only at{" "}
            <span className="text-foreground font-medium">
              vanta-two-xi.vercel.app
            </span>
            . Send the gray box below to an admin if it keeps failing.
          </p>
        ) : null}

        {reason && (
          <p className="text-muted-foreground/80 bg-card mt-4 rounded-md border p-3 text-left font-mono text-xs wrap-break-word">
            {reason}
          </p>
        )}

        <div className="mt-8 flex w-full flex-col gap-3">
          {invite ? (
            <Button asChild className="w-full">
              <a href={invite} target="_blank" rel="noreferrer">
                Join the Discord
              </a>
            </Button>
          ) : null}
          <Button
            asChild
            variant={invite ? "outline" : "default"}
            className="w-full"
          >
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
