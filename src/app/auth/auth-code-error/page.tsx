import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { VantaCrest } from "@/components/brand/vanta-crest";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign-in failed",
};

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="vanta-glow pointer-events-none absolute inset-0 -z-10" />

      <div className="w-full max-w-sm text-center">
        <VantaCrest size="lg" className="mb-6" />

        <div className="text-destructive mb-4 flex items-center justify-center gap-2">
          <ShieldAlert className="size-5" />
          <h1 className="font-display text-xl tracking-wide uppercase">
            Sign-in failed
          </h1>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed text-balance">
          Discord did not complete the handshake. This is usually a redirect URL
          that does not match the one configured in the Discord Developer Portal.
        </p>

        {reason && (
          <p className="text-muted-foreground/80 bg-card mt-4 rounded-md border p-3 text-left font-mono text-xs wrap-break-word">
            {reason}
          </p>
        )}

        <Button asChild className="mt-8 w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </main>
  );
}
