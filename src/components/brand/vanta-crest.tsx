import Image from "next/image";

import { cn } from "@/lib/utils";

const SIZES = {
  /** Compact marks (mobile sheet, dense UI). */
  sm: "size-10",
  /** Default nav / sidebar crest. */
  md: "size-16",
  lg: "size-20",
  /** Login hero — animated crest. */
  xl: "size-52 sm:size-64",
} as const;

const SIZE_PX: Record<keyof typeof SIZES, number> = {
  sm: 40,
  md: 64,
  lg: 80,
  xl: 256,
};

/** The crew crest, framed as a badge. */
export function VantaCrest({
  size = "md",
  className,
  priority = false,
  animated = false,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
  /** Use the animated GIF crest (nav + login). Static PNG is the fallback. */
  animated?: boolean;
}) {
  const px = SIZE_PX[size];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        SIZES[size],
        className,
      )}
    >
      {animated ? (
        // next/image can freeze multi-frame GIFs; use a plain img for playback.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/vanta-crest.gif"
          alt=""
          width={px}
          height={px}
          decoding="async"
          className="size-full object-contain"
        />
      ) : (
        <Image
          src="/vanta-crest.png"
          alt=""
          fill
          sizes={`${px}px`}
          priority={priority}
          className="object-contain"
        />
      )}
    </span>
  );
}

export function VantaWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        // Oswald sits a hair high next to icons; nudge for optical middle.
        "font-display inline-flex items-center text-xl leading-none font-semibold tracking-[0.32em] uppercase translate-y-px",
        className,
      )}
    >
      Vanta
    </span>
  );
}

/** Crest plus wordmark, used in the header and on the login screen. */
export function VantaLockup({
  size = "md",
  className,
  priority = false,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <VantaCrest size={size} priority={priority} />
      <VantaWordmark />
    </span>
  );
}
