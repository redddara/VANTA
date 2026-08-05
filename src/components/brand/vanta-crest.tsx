import Image from "next/image";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8 rounded-md",
  md: "size-11 rounded-lg",
  lg: "size-20 rounded-xl",
} as const;

/** The crew crest, framed as a badge. */
export function VantaCrest({
  size = "md",
  className,
  priority = false,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-primary/25 shadow-[0_0_24px_-8px_var(--primary)]",
        SIZES[size],
        className,
      )}
    >
      <Image
        src="/vanta-crest.png"
        alt=""
        fill
        sizes="80px"
        priority={priority}
        className="object-cover"
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
