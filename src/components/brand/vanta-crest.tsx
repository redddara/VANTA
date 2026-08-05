import Image from "next/image";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8",
  md: "size-11",
  lg: "size-20",
  /** Login hero — animated crest. */
  xl: "size-52 sm:size-64",
} as const;

const SIZE_PX: Record<keyof typeof SIZES, number> = {
  sm: 32,
  md: 44,
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
  /** Use the animated GIF crest (login). Small nav marks stay on the static PNG. */
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
      <Image
        src={animated ? "/vanta-crest.gif" : "/vanta-crest.png"}
        alt=""
        fill
        sizes={`${px}px`}
        priority={priority}
        unoptimized={animated}
        className="object-contain"
      />
    </span>
  );
}

export function VantaWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-xl leading-none font-semibold tracking-[0.32em] uppercase",
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
