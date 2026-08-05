import type { Metadata } from "next";

import { DiscordSignInButton } from "@/components/auth/discord-sign-in-button";
import { VantaCrest, VantaWordmark } from "@/components/brand/vanta-crest";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; stale?: string }>;
}) {
  const { next, stale } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="vanta-glow pointer-events-none absolute inset-0 -z-10" />

      <div className="w-full max-w-sm">
        <div className="vanta-fade-up flex flex-col items-center text-center">
          <VantaCrest size="xl" animated priority />
          <VantaWordmark className="vanta-fade-up vanta-fade-up-delay-1 mt-8 text-3xl sm:text-4xl" />
          <p className="text-muted-foreground vanta-fade-up vanta-fade-up-delay-2 mt-3 text-sm">
            Member Portal
          </p>
        </div>

        <div className="vanta-hairline vanta-fade-up vanta-fade-up-delay-2 my-8 h-px w-full" />

        {stale ? (
          <p className="border-destructive/40 bg-destructive/10 text-muted-foreground vanta-fade-up vanta-fade-up-delay-3 mb-6 rounded-md border px-4 py-3 text-center text-sm leading-relaxed text-balance">
            You are signed in to Discord but the portal has no profile for that
            account. Sign in again, and if this keeps happening ask an admin to
            check your membership.
          </p>
        ) : null}

        <p className="text-muted-foreground vanta-fade-up vanta-fade-up-delay-3 mb-6 text-center text-sm leading-relaxed text-balance">
          Sign in with the Discord account that is already in the Vanta server.
          Only crew members can access the portal — your profile is created on
          first login.
        </p>

        <div className="vanta-fade-up vanta-fade-up-delay-4">
          <DiscordSignInButton next={safeNext} />
        </div>

        <p className="text-muted-foreground/70 vanta-fade-up vanta-fade-up-delay-4 mt-8 text-center text-xs leading-relaxed">
          Access is limited to Vanta members. If you sign in and the portal says
          your account is inactive, ask an admin to reactivate you.
        </p>
      </div>
    </main>
  );
}
