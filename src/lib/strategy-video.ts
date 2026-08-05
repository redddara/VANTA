/** Limits for strategy reference video uploads. */

export const STRATEGY_VIDEO_BUCKET = "strategy-videos";

export const STRATEGY_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export const STRATEGY_VIDEO_MIME = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type StrategyVideoMime = (typeof STRATEGY_VIDEO_MIME)[number];

const EXT_BY_MIME: Record<StrategyVideoMime, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function isStrategyVideoMime(value: string): value is StrategyVideoMime {
  return (STRATEGY_VIDEO_MIME as readonly string[]).includes(value);
}

export function strategyVideoExtension(mime: StrategyVideoMime): string {
  return EXT_BY_MIME[mime];
}

export function validateStrategyVideoFile(file: File): string | null {
  if (!isStrategyVideoMime(file.type)) {
    return "Upload an MP4, WebM, or MOV video.";
  }
  if (file.size > STRATEGY_VIDEO_MAX_BYTES) {
    return "Keep strategy videos under 50 MB.";
  }
  return null;
}
