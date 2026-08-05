import Link from "next/link";

import { VantaCrest } from "@/components/brand/vanta-crest";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="vanta-glow pointer-events-none absolute inset-0 -z-10 opacity-50" />

      <VantaCrest size="lg" className="mb-6" />

      <p className="text-primary font-display text-5xl tracking-widest">
        404
      </p>
      <h1 className="mt-3 font-display text-xl tracking-wide uppercase">
        Nothing here
      </h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm text-balance">
        That page does not exist, or you do not have access to it.
      </p>

      <Button asChild className="mt-8">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
