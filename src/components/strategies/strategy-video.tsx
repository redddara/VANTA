import { ExternalLink } from "lucide-react";

import { youtubeEmbedUrl } from "@/lib/youtube";

export function StrategyVideo({ url }: { url: string | null | undefined }) {
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
