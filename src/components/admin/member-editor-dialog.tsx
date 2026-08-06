"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { MemberAvatar } from "@/components/nav/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateMember } from "@/lib/actions/members";
import { displayName } from "@/lib/display";
import { RANKS, RANK_DESCRIPTIONS } from "@/lib/constants";
import { isAdmin, isRank, type MemberSummary, type Rank } from "@/lib/types/app";

/** Falls back to the lowest rank if the stored value is not on the ladder. */
function normaliseRank(rank: string | null): Rank {
  return isRank(rank) ? rank : RANKS[0];
}

function EditorBody({
  member,
  isSelf,
  canRename,
  canGrantHacking,
  onDone,
}: {
  member: MemberSummary;
  isSelf: boolean;
  canRename: boolean;
  canGrantHacking: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [rank, setRank] = useState<Rank>(normaliseRank(member.crew_rank));
  const [isActive, setIsActive] = useState(member.is_active);
  const [ingameName, setIngameName] = useState(member.ingame_name ?? "");
  const [hackingAccess, setHackingAccess] = useState(
    Boolean(member.hacking_practice_access),
  );

  const name = displayName(member);
  const nameDirty =
    canRename && ingameName.trim() !== (member.ingame_name ?? "").trim();
  const hackingDirty =
    canGrantHacking &&
    hackingAccess !== Boolean(member.hacking_practice_access);
  const dirty =
    rank !== member.crew_rank ||
    isActive !== member.is_active ||
    nameDirty ||
    hackingDirty;

  function save() {
    startTransition(async () => {
      const result = await updateMember({
        id: member.id,
        rank,
        isActive,
        ...(canRename ? { ingameName: ingameName.trim() } : {}),
        ...(canGrantHacking ? { hackingPracticeAccess: hackingAccess } : {}),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `${displayName({
          ...member,
          ingame_name: ingameName.trim() || member.ingame_name,
        })} updated.`,
      );
      onDone();
      router.refresh();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <MemberAvatar profile={member} className="size-9" />
          <span className="min-w-0 truncate">{name}</span>
        </DialogTitle>
        <DialogDescription>
          {member.discord_username
            ? `Discord: ${member.discord_username}`
            : "No Discord handle on file"}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-5 py-1">
        {canRename ? (
          <div className="grid gap-2">
            <Label htmlFor="member-ingame-name">In-game name</Label>
            <Input
              id="member-ingame-name"
              value={ingameName}
              onChange={(event) => setIngameName(event.target.value)}
              placeholder="Crew display name"
              maxLength={40}
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs">
              Shown on the roster, remit tracker, and reputation pages. Only a
              Kingpin can change another member&apos;s name.
            </p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="member-rank">Rank</Label>
          <Select
            value={rank}
            onValueChange={(value) => setRank(value as Rank)}
          >
            <SelectTrigger id="member-rank" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Highest first: promoting is the common case. */}
              {[...RANKS].reverse().map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {RANK_DESCRIPTIONS[rank]}
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div className="min-w-0">
            <Label htmlFor="member-active" className="mb-1">
              Active member
            </Label>
            <p className="text-muted-foreground text-xs">
              Turning this off removes them from the roster and blocks all
              writes. Their history is kept.
            </p>
          </div>
          <Switch
            id="member-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        {canGrantHacking ? (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0">
              <Label htmlFor="member-hacking" className="mb-1">
                Hacking Practice access
              </Label>
              <p className="text-muted-foreground text-xs">
                Lets this member open the private practice page. Keep it off for
                everyone else.
              </p>
            </div>
            <Switch
              id="member-hacking"
              checked={hackingAccess}
              onCheckedChange={setHackingAccess}
            />
          </div>
        ) : null}

        {isSelf && !isAdmin(rank) && (
          <p className="text-warning border-warning/30 bg-warning/10 rounded-md border p-3 text-xs">
            This is your own account. Dropping below Underboss will lock you out
            of these controls.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={save} disabled={pending || !dirty}>
          {pending && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}

export function MemberEditorDialog({
  member,
  open,
  onOpenChange,
  isSelf,
  canRename,
  canGrantHacking,
}: {
  member: MemberSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSelf: boolean;
  canRename: boolean;
  canGrantHacking: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed so opening a different member resets the draft values. */}
        {member && (
          <EditorBody
            key={member.id}
            member={member}
            isSelf={isSelf}
            canRename={canRename}
            canGrantHacking={canGrantHacking}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
