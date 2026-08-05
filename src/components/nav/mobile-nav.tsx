"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { VantaCrest, VantaWordmark } from "@/components/brand/vanta-crest";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isActivePath, NAV_GROUP_LABELS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MobileNav({
  items,
  memberName,
}: {
  items: NavItem[];
  memberName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const groups = items.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="flex items-center gap-3">
            <VantaCrest size="sm" animated />
            <VantaWordmark className="text-base" />
          </SheetTitle>
          <SheetDescription className="text-left">
            Signed in as {memberName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-3">
          {Object.entries(groups).map(([group, groupItems]) => (
            <div key={group} className="mb-5 last:mb-0">
              <p className="text-muted-foreground/70 px-3 pb-2 text-[0.7rem] font-semibold tracking-widest uppercase">
                {NAV_GROUP_LABELS[group as NavItem["group"]]}
              </p>
              <div className="flex flex-col gap-0.5">
                {groupItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-sm font-medium",
                        "border-l-2 border-transparent",
                        "transition-[color,background-color,border-color] duration-200 ease-out",
                        active
                          ? "bg-primary/12 text-primary border-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
