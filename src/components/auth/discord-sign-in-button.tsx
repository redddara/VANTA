"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 18" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.317 1.492A19.79 19.79 0 0 0 15.432 0c-.21.375-.455.88-.624 1.283a18.4 18.4 0 0 0-5.605 0A13 13 0 0 0 8.57 0 19.7 19.7 0 0 0 3.683 1.496C.593 6.062-.243 10.516.176 14.906a19.9 19.9 0 0 0 6.006 3.02 14.6 14.6 0 0 0 1.288-2.074 13 13 0 0 1-2.028-.966c.17-.124.336-.253.496-.386 3.91 1.79 8.147 1.79 12.01 0 .162.133.328.262.497.386-.647.378-1.328.7-2.032.967a14.4 14.4 0 0 0 1.288 2.073 19.8 19.8 0 0 0 6.01-3.02c.49-5.09-.838-9.504-3.394-13.414ZM8.02 12.207c-1.183 0-2.157-1.085-2.157-2.418s.955-2.42 2.157-2.42 2.176 1.086 2.156 2.42c0 1.333-.955 2.418-2.156 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.418s.955-2.42 2.157-2.42 2.176 1.086 2.156 2.42c0 1.333-.954 2.418-2.156 2.418Z" />
    </svg>
  );
}

export function DiscordSignInButton({ next }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: callback.toString() },
    });

    if (error) {
      setError(error.message);
      setPending(false);
    }
    // On success the browser is already navigating to Discord, so the pending
    // state is intentionally left on.
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        onClick={signIn}
        disabled={pending}
        size="lg"
        className="h-12 w-full text-base"
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <DiscordMark className="h-[1.15rem] w-auto" />
        )}
        {pending ? "Redirecting to Discord" : "Sign in with Discord"}
      </Button>

      {error && (
        <p role="alert" className="text-destructive text-center text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
