"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { PersonCell } from "@/components/shared/person-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setMemberRep } from "@/lib/actions/reputation";
import { REP_BANDS, REP_BAND_LABELS } from "@/lib/constants";
import { displayName } from "@/lib/display";
import {
  CRAFTING_UNLOCK_LABELS,
  CRAFTING_UNLOCKS,
  type MemberSummary,
  type RepBand,
} from "@/lib/types/app";
import { cn } from "@/lib/utils";

type RowDraft = {
  repBand: RepBand;
  tierLabel: string;
  houseRobPayout: string;
  atmPayout: string;
  launderRate: string;
  storeCapacity: string;
  gpsUnlocked: boolean;
  ropeUnlocked: boolean;
  nosUnlocked: boolean;
  usbUnlocked: boolean;
};

function draftFrom(summary: MemberSummary | undefined): RowDraft {
  return {
    repBand: (summary?.rep_band ?? "mid") as RepBand,
    tierLabel: summary?.tier_label ?? "",
    houseRobPayout: summary?.house_rob_payout ?? "",
    atmPayout: summary?.atm_payout ?? "",
    launderRate: summary?.launder_rate ?? "",
    storeCapacity: summary?.store_capacity ?? "",
    gpsUnlocked: Boolean(summary?.gps_unlocked),
    ropeUnlocked: Boolean(summary?.rope_unlocked),
    nosUnlocked: Boolean(summary?.nos_unlocked),
    usbUnlocked: Boolean(summary?.usb_unlocked),
  };
}

function sameDraft(a: RowDraft, b: RowDraft): boolean {
  return (
    a.repBand === b.repBand &&
    a.tierLabel === b.tierLabel &&
    a.houseRobPayout === b.houseRobPayout &&
    a.atmPayout === b.atmPayout &&
    a.launderRate === b.launderRate &&
    a.storeCapacity === b.storeCapacity &&
    a.gpsUnlocked === b.gpsUnlocked &&
    a.ropeUnlocked === b.ropeUnlocked &&
    a.nosUnlocked === b.nosUnlocked &&
    a.usbUnlocked === b.usbUnlocked
  );
}

const UNLOCK_KEYS = {
  gps: "gpsUnlocked",
  rope: "ropeUnlocked",
  nos: "nosUnlocked",
  usb: "usbUnlocked",
} as const;

export function SetRepGrid({ members }: { members: MemberSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() =>
    Object.fromEntries(members.map((m) => [m.id, draftFrom(m)])),
  );
  const baselineRef = useRef(
    Object.fromEntries(members.map((m) => [m.id, draftFrom(m)])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? members
      : members.filter((m) =>
          [m.ingame_name, m.discord_username, m.crew_rank, m.tier_label, m.rep_band]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        );
    return [...list].sort((a, b) =>
      displayName(a).localeCompare(displayName(b), undefined, {
        sensitivity: "base",
      }),
    );
  }, [members, query]);

  function patch(id: string, next: Partial<RowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...next },
    }));
  }

  function saveRow(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    if (!draft.tierLabel.trim()) {
      toast.error("Add a label before saving.");
      return;
    }

    setSavingId(id);
    startTransition(async () => {
      const result = await setMemberRep({
        memberId: id,
        repBand: draft.repBand,
        tierLabel: draft.tierLabel,
        houseRobPayout: draft.houseRobPayout,
        atmPayout: draft.atmPayout,
        launderRate: draft.launderRate,
        storeCapacity: draft.storeCapacity,
        gpsUnlocked: draft.gpsUnlocked,
        ropeUnlocked: draft.ropeUnlocked,
        nosUnlocked: draft.nosUnlocked,
        usbUnlocked: draft.usbUnlocked,
      });

      setSavingId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      baselineRef.current[id] = { ...draft };
      setTick((n) => n + 1);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Tab through cells. Enter or Save on a row. Dirty rows stay highlighted
          until saved.
        </p>
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter members"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">Member</TableHead>
              <TableHead className="min-w-28">Band</TableHead>
              <TableHead className="min-w-36">Label</TableHead>
              <TableHead className="min-w-24">House</TableHead>
              <TableHead className="min-w-24">ATM</TableHead>
              <TableHead className="min-w-24">Launder</TableHead>
              <TableHead className="min-w-24">Store</TableHead>
              <TableHead className="min-w-40">Craft</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((member) => {
              const draft = drafts[member.id] ?? draftFrom(member);
              const dirty = !sameDraft(
                draft,
                baselineRef.current[member.id] ?? draftFrom(member),
              );
              const busy = pending && savingId === member.id;

              return (
                <TableRow
                  key={member.id}
                  className={cn(dirty && "bg-primary/5")}
                >
                  <TableCell>
                    <PersonCell person={member} />
                  </TableCell>

                  <TableCell>
                    <div className="flex gap-1">
                      {REP_BANDS.map((band) => (
                        <button
                          key={band}
                          type="button"
                          title={REP_BAND_LABELS[band]}
                          onClick={() => patch(member.id, { repBand: band })}
                          className={cn(
                            "rounded border px-2 py-1 text-xs font-medium uppercase",
                            draft.repBand === band
                              ? band === "high"
                                ? "border-primary/40 bg-primary/15 text-primary"
                                : "border-foreground/30 bg-secondary"
                              : "border-border/70 text-muted-foreground hover:bg-secondary/60",
                          )}
                        >
                          {band[0]}
                        </button>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Input
                      value={draft.tierLabel}
                      onChange={(e) =>
                        patch(member.id, { tierLabel: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveRow(member.id);
                        }
                      }}
                      placeholder="Label"
                      className="h-8"
                    />
                  </TableCell>

                  {(
                    [
                      ["houseRobPayout", "House"],
                      ["atmPayout", "ATM"],
                      ["launderRate", "Launder"],
                      ["storeCapacity", "Store"],
                    ] as const
                  ).map(([key]) => (
                    <TableCell key={key}>
                      <Input
                        value={draft[key]}
                        onChange={(e) =>
                          patch(member.id, { [key]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveRow(member.id);
                          }
                        }}
                        placeholder="—"
                        className="h-8"
                      />
                    </TableCell>
                  ))}

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {CRAFTING_UNLOCKS.map((unlock) => {
                        const field = UNLOCK_KEYS[unlock];
                        const on = draft[field];
                        return (
                          <button
                            key={unlock}
                            type="button"
                            title={CRAFTING_UNLOCK_LABELS[unlock]}
                            onClick={() =>
                              patch(member.id, { [field]: !on })
                            }
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[11px] font-medium",
                              on
                                ? "border-success/40 bg-success/15 text-success"
                                : "border-border/70 text-muted-foreground",
                            )}
                          >
                            {CRAFTING_UNLOCK_LABELS[unlock]}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant={dirty ? "default" : "outline"}
                      disabled={!dirty || busy}
                      onClick={() => saveRow(member.id)}
                      className="h-8"
                    >
                      {busy ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Check />
                      )}
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
