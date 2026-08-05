import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserX } from "lucide-react";

import { VantaCrest } from "@/components/brand/vanta-crest";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account inactive",
};

export default async function DeactivatedPage() {
  const session = await getSession();

  if (!session) redirect("/login");
  if (session.profile.is_active) redirect("/dashboard");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="vanta-glow pointer-events-none absolute inset-0 -z-10 opacity-40" />

      <div className="w-full max-w-sm text-center">
        <VantaCrest size="lg" className="mb-6 grayscale" />

        <div className="text-muted-foreground mb-4 flex items-center justify-center gap-2">
          <UserX className="size-5" />
          <h1 className="font-[family-name:var(--font-display)] text-xl tracking-wide uppercase">
            Account inactive
          </h1>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed text-balance">
          Your Vanta account has been set to inactive, so the portal is
          read-locked for you. Your remit and reputation history is intact. Ask
          an admin to reactivate you.
        </p>

        <form action="/auth/signout" method="post" className="mt-8">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
