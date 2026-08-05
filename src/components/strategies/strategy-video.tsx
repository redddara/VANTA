"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { STRATEGY_VIDEO_BUCKET } from "@/lib/strategy-video";
import { createClient } from "@/lib/supabase/client";
import { youtubeEmbedUrl } from "@/lib/youtube";

export function StrategyVideo({
  path,
  url,
}: {
  path?: string | null;
  /** Legacy external URL (YouTube), if any. */
  url?: string | null;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);

    const supabase = createClient();
    void supabase.storage
      .from(STRATEGY_VIDEO_BUCKET)
      .createSignedUrl(path, 60 * 60)
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoading(false);
        if (error || !data?.signedUrl) {
          setFailed(true);
          setSignedUrl(null);
          return;
        }
        setSignedUrl(data.signedUrl);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (path) {
    if (loading) {
      return (
        <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-lg border">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      );
    }
    if (failed || !signedUrl) {
      return (
        <p className="text-muted-foreground text-xs">Video could not be loaded.</p>
      );
    }
    return (
      <div className="overflow-hidden rounded-lg border bg-black">
        <video
          src={signedUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full"
        />
      </div>
    );
  }

  if (!url) return null;

  const embed = youtubeEmbedUrl(url);
  if (embed) {
    return (
      <div className="bg-background/60 aspect-video w-full overflow-hidden rounded-lg border">
        <iframe
          src={embed}
          title="Strategy reference video"
          className="size-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border/80 bg-background/40 text-foreground hover:border-primary/40 hover:bg-secondary/50 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
    >
      <ExternalLink className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{url}</span>
    </a>
  );
}
