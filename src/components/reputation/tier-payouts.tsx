import { cn } from "@/lib/utils";

const PAYOUTS = [
  { key: "house_rob_payout", label: "House Rob" },
  { key: "atm_payout", label: "ATM" },
  { key: "launder_rate", label: "Launder" },
  { key: "store_capacity", label: "Store" },
] as const;

type PayoutSource = {
  house_rob_payout?: string | null;
  atm_payout?: string | null;
  launder_rate?: string | null;
  store_capacity?: string | null;
};

export function TierPayouts({
  tier,
  className,
}: {
  tier: PayoutSource | null | undefined;
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4", className)}>
      {PAYOUTS.map(({ key, label }) => (
        <div key={key}>
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="font-medium tabular-nums">{tier?.[key] || "\u2014"}</dd>
        </div>
      ))}
    </dl>
  );
}
