"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile } from "@/lib/actions/members";

export function ProfileForm({ ingameName }: { ingameName: string }) {
  const router = useRouter();
  const [value, setValue] = useState(ingameName);
  const [pending, startTransition] = useTransition();

  const dirty = value.trim() !== ingameName.trim();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateOwnProfile({ ingameName: value });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="ingame-name">In-game name</Label>
        <Input
          id="ingame-name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="The name your character goes by"
          maxLength={40}
          className="h-11"
        />
        <p className="text-muted-foreground text-xs">
          This is what the crew sees on the roster and on every remit and
          reputation entry.
        </p>
      </div>

      <Button type="submit" disabled={pending || !dirty}>
        {pending && <Loader2 className="animate-spin" />}
        Save
      </Button>
    </form>
  );
}
