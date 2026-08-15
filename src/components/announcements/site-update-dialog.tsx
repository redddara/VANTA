"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dismissAnnouncement } from "@/lib/actions/announcements";
import type { PendingAnnouncement } from "@/lib/types/app";

/**
 * Shows the newest undismissed site update. Closing / Got it records a
 * dismissal so that announcement never pops again for this member.
 */
export function SiteUpdateDialog({
  announcement,
}: {
  announcement: PendingAnnouncement | null;
}) {
  const [open, setOpen] = useState(announcement != null);
  const [pending, startTransition] = useTransition();
  const dismissing = useRef(false);

  if (!announcement) return null;

  function acknowledge() {
    if (dismissing.current || !announcement) return;
    dismissing.current = true;

    startTransition(async () => {
      const result = await dismissAnnouncement(announcement.id);
      if (!result.ok) {
        dismissing.current = false;
        toast.error(result.error);
        return;
      }
      // Close locally. Remaining updates show on the next navigation instead of
      // forcing a full portal shell refresh here.
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) acknowledge();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Site update
          </p>
          <DialogTitle className="text-xl">{announcement.title}</DialogTitle>
          <DialogDescription className="text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed">
            {announcement.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={acknowledge} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
