"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
      <div className="bg-destructive/10 text-destructive mb-4 flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-5" />
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-xl tracking-wide uppercase">
        Something broke
      </h1>

      <p className="text-muted-foreground mt-2 max-w-sm text-sm text-balance">
        This page could not load. If it keeps happening, check that the Supabase
        environment variables are set and that the migrations have been applied.
      </p>

      {error.digest && (
        <p className="text-muted-foreground/60 mt-3 font-[family-name:var(--font-geist-mono)] text-xs">
          {error.digest}
        </p>
      )}

      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
