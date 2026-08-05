import type { Metadata } from "next";

import { DiscordSignInButton } from "@/components/auth/discord-sign-in-button";
import { VantaCrest, VantaWordmark } from "@/components/brand/vanta-crest";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="vanta-glow pointer-events-none absolute inset-0 -z-10" />

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <VantaCrest size="lg" priority />
          <VantaWordmark className="mt-6 text-3xl" />
          <p className="text-muted-foreground mt-3 text-sm">Member Portal</p>
        </div>

        <div className="vanta-hairline my-8 h-px w-full" />

        <p className="text-muted-foreground mb-6 text-center text-sm leading-relaxed text-balance">
          Sign in with the Discord account you use in the crew server. Your
          profile is created automatically on first login.
        </p>

        <DiscordSignInButton next={safeNext} />

        <p className="text-muted-foreground/70 mt-8 text-center text-xs leading-relaxed">
          Access is limited to Vanta members. If you sign in and the portal says
          your account is inactive, ask an officer to reactivate you.
        </p>
      </div>
    </main>
  );
}
