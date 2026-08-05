"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { MemberAvatar } from "@/components/nav/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { displayName } from "@/lib/display";
import { cn } from "@/lib/utils";

export type SelectableMember = {
  id: string;
  ingame_name: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
  crew_rank: string | null;
};

export function MemberCombobox({
  members,
  value,
  onChange,
  id,
  placeholder = "Select a member",
  invalid = false,
}: {
  members: SelectableMember[];
  value: string | null;
  onChange: (id: string | null) => void;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = members.find((member) => member.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            "h-11 w-full justify-between px-3 font-normal",
            !selected && "text-muted-foreground/70",
          )}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <MemberAvatar profile={selected} className="size-6" />
              <span className="truncate">{displayName(selected)}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search members" />
          <CommandList>
            <CommandEmpty>No member found.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => {
                const name = displayName(member);
                const isSelected = member.id === value;

                return (
                  <CommandItem
                    key={member.id}
                    // cmdk matches on this string, so include every field a
                    // user might reasonably type.
                    value={`${name} ${member.discord_username ?? ""} ${member.crew_rank ?? ""}`}
                    onSelect={() => {
                      onChange(isSelected ? null : member.id);
                      setOpen(false);
                    }}
                  >
                    <MemberAvatar profile={member} className="size-6" />
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {member.crew_rank ?? "Prospect"}
                    </span>
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
