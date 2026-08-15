"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { REMIT_PROOF_BUCKET } from "@/lib/remit-proof";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Signs storage URLs only when the thumb scrolls into view, so long remit
 * lists do not fire hundreds of storage calls on first paint.
 */
export function RemitProofThumb({
  path,
  className,
}: {
  path: string | null | undefined;
  className?: string;
}) {
  const rootRef = useRef<HTMLButtonElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !path) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [path]);

  useEffect(() => {
    if (!path || !visible) {
      if (!path) {
        setUrl(null);
        setFailed(false);
        setLoading(false);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    const supabase = createClient();
    void supabase.storage
      .from(REMIT_PROOF_BUCKET)
      .createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error || !data?.signedUrl) {
          setFailed(true);
          setUrl(null);
          return;
        }
        setUrl(data.signedUrl);
      });

    return () => {
      cancelled = true;
    };
  }, [path, visible]);

  if (!path) return null;

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        onClick={() => setOpen(true)}
        disabled={!url}
        className={cn(
          "bg-muted relative block size-12 shrink-0 overflow-hidden rounded-md border",
          "hover:border-foreground/30 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
        title="View proof"
      >
        {loading || (!url && !failed && visible) ? (
          <Loader2 className="text-muted-foreground absolute inset-0 m-auto size-4 animate-spin" />
        ) : failed || !url ? (
          <ImageIcon className="text-muted-foreground absolute inset-0 m-auto size-4" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img
            src={url}
            alt="Remit proof"
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Remit proof</DialogTitle>
          </DialogHeader>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img
              src={url}
              alt="Remit proof full size"
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
