"use client";

import { useEffect, useId, useState } from "react";
import { Film, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { validateStrategyVideoFile } from "@/lib/strategy-video";
import { cn } from "@/lib/utils";

export function VideoAttach({
  file,
  existingPath,
  onChange,
  onClearExisting,
  disabled,
}: {
  file: File | null;
  existingPath?: string | null;
  onChange: (file: File | null) => void;
  onClearExisting?: () => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function accept(next: File | null) {
    if (!next) {
      setError(null);
      onChange(null);
      return;
    }
    const issue = validateStrategyVideoFile(next);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    onChange(next);
  }

  const hasExisting = Boolean(existingPath) && !file;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Video</p>
        {file || hasExisting ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              accept(null);
              onClearExisting?.();
            }}
          >
            <X />
            Remove
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "rounded-lg border border-dashed px-3 py-3 transition-colors",
          disabled && "opacity-60",
        )}
      >
        {previewUrl ? (
          <video
            src={previewUrl}
            controls
            className="mx-auto max-h-56 w-full rounded-md bg-black object-contain"
          />
        ) : hasExisting ? (
          <p className="text-muted-foreground py-3 text-center text-sm">
            A video is already attached. Choose a new file to replace it.
          </p>
        ) : (
          <label
            htmlFor={inputId}
            className={cn(
              "text-muted-foreground flex cursor-pointer flex-col items-center gap-2 py-4 text-center text-sm",
              disabled && "pointer-events-none",
            )}
          >
            <Film className="size-5" />
            <span>
              <span className="text-foreground underline-offset-2 hover:underline">
                Choose a video
              </span>{" "}
              to upload
            </span>
            <span className="text-xs">MP4, WebM, or MOV · max 50 MB</span>
          </label>
        )}

        <input
          id={inputId}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            accept(next);
            event.target.value = "";
          }}
        />

        {!previewUrl ? (
          <div className="mt-2 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => document.getElementById(inputId)?.click()}
            >
              {hasExisting ? "Replace video" : "Browse files"}
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
