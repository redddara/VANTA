"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { PersonCell } from "@/components/shared/person-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setMemberRep } from "@/lib/actions/reputation";
import {
  REP_BANDS,
  REP_BAND_LABELS,
  REP_HOUSE_OPTIONS,
  REP_LABEL_OPTIONS,
  REP_LAUNDER_OPTIONS,
  REP_STORE_OPTIONS,
} from "@/lib/constants";
import { displayName } from "@/lib/display";
import {
  CRAFTING_UNLOCK_LABELS,
  CRAFTING_UNLOCKS,
  type MemberSummary,
  type RepBand,
} from "@/lib/types/app";
import { cn } from "@/lib/utils";

const EMPTY = "__empty__";

type RowDraft = {
  repBand: RepBand;
  labels: string[];
  houseRobPayout: string;
  atmPayout: string;
  launderRate: string;
  storeCapacity: string;
  gpsUnlocked: boolean;
  ropeUnlocked: boolean;
  nosUnlocked: boolean;
  usbUnlocked: boolean;
};

/** Persist multi-label as "Hacker / Driver" (order fixed). */
function encodeLabels(labels: string[] | undefined): string {
  const list = labels ?? [];
  return REP_LABEL_OPTIONS.filter((label) => list.includes(label)).join(" / ");
}

function decodeLabels(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const parts = raw.split(/[/,|]+/).map((p) => p.trim());
  return REP_LABEL_OPTIONS.filter((label) =>
    parts.some((p) => p.toLowerCase() === label.toLowerCase()),
  );
}

function draftFrom(summary: MemberSummary | undefined): RowDraft {
  return {
    repBand: (summary?.rep_band ?? "mid") as RepBand,
    labels: decodeLabels(summary?.tier_label),
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
    encodeLabels(a.labels) === encodeLabels(b.labels) &&
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

function FieldSelect({
  value,
  options,
  placeholder,
  allowEmpty = false,
  onChange,
}: {
  value: string;
  options: readonly string[];
  placeholder: string;
  allowEmpty?: boolean;
  onChange: (value: string) => void;
}) {
  const safeOptions = options ?? [];
  const selected = safeOptions.includes(value)
    ? value
    : allowEmpty
      ? EMPTY
      : undefined;

  return (
    <Select
      value={selected || (allowEmpty ? EMPTY : undefined)}
      onValueChange={(next) => onChange(next === EMPTY ? "" : next)}
    >
      <SelectTrigger size="sm" className="h-8 w-full min-w-24">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? (
          <SelectItem value={EMPTY}>
            <span className="text-muted-foreground">—</span>
          </SelectItem>
        ) : null}
        {safeOptions.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SetRepGrid({ members }: { members: MemberSummary[] }) {
  const router = useRouter();
  const roster = Array.isArray(members) ? members : [];
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() =>
    Object.fromEntries(roster.map((m) => [m.id, draftFrom(m)])),
  );
  const baselineRef = useRef<Record<string, RowDraft>>(
    Object.fromEntries(roster.map((m) => [m.id, draftFrom(m)])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [pending, startTransition] = useTransition();

  const memberKey = roster.map((m) => m.id).join(",");

  // Rebuild drafts after roster refresh so old row shapes cannot crash.
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, RowDraft> = {};
      for (const member of roster) {
        const existing = prev[member.id];
        next[member.id] =
          existing && Array.isArray(existing.labels)
            ? existing
            : draftFrom(member);
      }
      return next;
    });

    const nextBaseline: Record<string, RowDraft> = {};
    for (const member of roster) {
      const existing = baselineRef.current[member.id];
      nextBaseline[member.id] =
        existing && Array.isArray(existing.labels)
          ? existing
          : draftFrom(member);
    }
    baselineRef.current = nextBaseline;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by member ids
  }, [memberKey]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? roster
      : roster.filter((m) =>
          [
            m.ingame_name,
            m.discord_username,
            m.crew_rank,
            m.tier_label,
            m.rep_band,
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        );
    return [...list].sort((a, b) =>
      displayName(a).localeCompare(displayName(b), undefined, {
        sensitivity: "base",
      }),
    );
  }, [roster, query]);

  function patch(id: string, next: Partial<RowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? draftFrom(roster.find((m) => m.id === id))),
        ...next,
      },
    }));
  }

  function toggleLabel(id: string, label: string) {
    const draft = drafts[id] ?? draftFrom(roster.find((m) => m.id === id));
    const current = draft.labels ?? [];
    const on = current.includes(label);
    const labels = on
      ? current.filter((l) => l !== label)
      : [...current, label];
    patch(id, { labels });
  }

  function saveRow(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    const tierLabel = encodeLabels(draft.labels);
    if (!tierLabel) {
      toast.error("Pick Hacker and/or Driver before saving.");
      return;
    }

    setSavingId(id);
    startTransition(async () => {
      const result = await setMemberRep({
        memberId: id,
        repBand: draft.repBand,
        tierLabel,
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
      baselineRef.current[id] = {
        ...draft,
        labels: [...(draft.labels ?? [])],
      };
      setTick((n) => n + 1);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Label can be Hacker, Driver, or both. ATM salary is typed in; other
          fields use the lists.
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
              <TableHead className="min-w-32">Band</TableHead>
              <TableHead className="min-w-40">Label</TableHead>
              <TableHead className="min-w-36">House</TableHead>
              <TableHead className="min-w-28">ATM</TableHead>
              <TableHead className="min-w-28">Launder</TableHead>
              <TableHead className="min-w-28">Store</TableHead>
              <TableHead className="min-w-40">Craft</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((member) => {
              const draft = drafts[member.id] ?? draftFrom(member);
              const labels = draft.labels ?? [];
              const dirty = !sameDraft(
                { ...draft, labels },
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
                    <Select
                      value={draft.repBand}
                      onValueChange={(band) =>
                        patch(member.id, { repBand: band as RepBand })
                      }
                    >
                      <SelectTrigger size="sm" className="h-8 w-full min-w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REP_BANDS.map((band) => (
                          <SelectItem key={band} value={band}>
                            {REP_BAND_LABELS[band]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {REP_LABEL_OPTIONS.map((label) => {
                        const on = labels.includes(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleLabel(member.id, label)}
                            className={cn(
                              "rounded border px-2 py-1 text-xs font-medium",
                              on
                                ? "border-primary/40 bg-primary/15 text-primary"
                                : "border-border/70 text-muted-foreground hover:bg-secondary/60",
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>

                  <TableCell>
                    <FieldSelect
                      value={draft.houseRobPayout}
                      options={REP_HOUSE_OPTIONS}
                      placeholder="House"
                      allowEmpty
                      onChange={(houseRobPayout) =>
                        patch(member.id, { houseRobPayout })
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      value={draft.atmPayout}
                      onChange={(e) =>
                        patch(member.id, { atmPayout: e.target.value })
                      }
                      onFocus={(e) => e.currentTarget.select()}
                      placeholder="Salary"
                      className="h-8 tabular"
                    />
                  </TableCell>

                  <TableCell>
                    <FieldSelect
                      value={draft.launderRate}
                      options={REP_LAUNDER_OPTIONS}
                      placeholder="Launder"
                      allowEmpty
                      onChange={(launderRate) =>
                        patch(member.id, { launderRate })
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <FieldSelect
                      value={draft.storeCapacity}
                      options={REP_STORE_OPTIONS}
                      placeholder="Store"
                      allowEmpty
                      onChange={(storeCapacity) =>
                        patch(member.id, { storeCapacity })
                      }
                    />
                  </TableCell>

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
