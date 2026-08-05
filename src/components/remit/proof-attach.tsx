"use client";

import { useEffect, useId, useRef, useState, type ClipboardEvent } from "react";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { validateRemitProofFile } from "@/lib/remit-proof";
import { cn } from "@/lib/utils";

export function ProofAttach({
  file,
  onChange,
  disabled,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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
    const issue = validateRemitProofFile(next);
    if (issue) {
      setError(issue);
      return;
    }
    setError(null);
    onChange(next);
  }

  function onPaste(event: ClipboardEvent) {
    if (disabled) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const pasted = item.getAsFile();
        if (pasted) {
          event.preventDefault();
          accept(pasted);
          return;
        }
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Proof</p>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => accept(null)}
          >
            <X />
            Remove
          </Button>
        ) : null}
      </div>

      <div
        tabIndex={0}
        onPaste={onPaste}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (disabled) return;
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) accept(dropped);
        }}
        className={cn(
          "rounded-lg border border-dashed px-3 py-3 outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-2",
          dragOver && "border-foreground/40 bg-muted/40",
          disabled && "opacity-60",
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img
            src={previewUrl}
            alt="Remit proof preview"
            className="mx-auto max-h-48 rounded-md object-contain"
          />
        ) : (
          <label
            htmlFor={inputId}
            className={cn(
              "text-muted-foreground flex cursor-pointer flex-col items-center gap-2 py-4 text-center text-sm",
              disabled && "pointer-events-none",
            )}
          >
            <ImagePlus className="size-5" />
            <span>
              Paste a screenshot here, drop an image, or{" "}
              <span className="text-foreground underline-offset-2 hover:underline">
                choose a file
              </span>
            </span>
            <span className="text-xs">PNG, JPG, WebP, or GIF · max 5 MB</span>
          </label>
        )}

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            accept(next);
            event.target.value = "";
          }}
        />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
