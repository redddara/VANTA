"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STRATEGY_VIDEO_BUCKET } from "@/lib/strategy-video";
import { createClient } from "@/lib/supabase/client";
import { youtubeEmbedUrl } from "@/lib/youtube";

/**
 * Defers signed-URL work and video decode until the member asks to play,
 * so /strategies stays light when many cards are on screen.
 */
export function StrategyVideo({
  path,
  url,
}: {
  path?: string | null;
  /** Legacy external URL (YouTube), if any. */
  url?: string | null;
}) {
  const [active, setActive] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (!path || !active || requested.current) return;
    requested.current = true;

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
  }, [path, active]);

  if (path) {
    if (!active) {
      return (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="bg-muted/80 hover:bg-muted flex aspect-video w-full items-center justify-center gap-2 rounded-lg border transition-colors"
        >
          <Play className="text-muted-foreground size-5" />
          <span className="text-muted-foreground text-sm font-medium">
            Load video
          </span>
        </button>
      );
    }
    if (loading) {
      return (
        <div className="bg-muted flex aspect-video w-full items-center justify-center rounded-lg border">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        </div>
      );
    }
    if (failed || !signedUrl) {
      return (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Video could not be loaded.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              requested.current = false;
              setActive(true);
            }}
          >
            Retry
          </Button>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-lg border bg-black">
        <video
          src={signedUrl}
          controls
          playsInline
          preload="none"
          className="aspect-video w-full"
        />
      </div>
    );
  }

  if (!url) return null;

  const embed = youtubeEmbedUrl(url);
  if (embed) {
    if (!active) {
      return (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="bg-muted/80 hover:bg-muted flex aspect-video w-full items-center justify-center gap-2 rounded-lg border transition-colors"
        >
          <Play className="text-muted-foreground size-5" />
          <span className="text-muted-foreground text-sm font-medium">
            Load video
          </span>
        </button>
      );
    }
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
