"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
      {items.map((item, index) => {
        const active = isActivePath(pathname, item.href);
        const startsGroup =
          index > 0 && items[index - 1].group !== item.group;

        return (
          <div key={item.href} className="flex items-center">
            {startsGroup && (
              <span aria-hidden className="bg-border mx-2 h-4 w-px" />
            )}
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {active && (
                <span className="bg-primary absolute inset-x-3 -bottom-px h-px" />
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
