/** Best-effort YouTube URL → embeddable video id. */

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export function youtubeVideoId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return null;

    if (host === "youtu.be" || host === "www.youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }

    const fromQuery = url.searchParams.get("v");
    if (fromQuery && /^[\w-]{6,}$/.test(fromQuery)) return fromQuery;

    const parts = url.pathname.split("/").filter(Boolean);
    if (
      parts[0] &&
      ["embed", "shorts", "live", "v"].includes(parts[0]) &&
      parts[1] &&
      /^[\w-]{6,}$/.test(parts[1])
    ) {
      return parts[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function youtubeEmbedUrl(raw: string | null | undefined): string | null {
  const id = youtubeVideoId(raw);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}
