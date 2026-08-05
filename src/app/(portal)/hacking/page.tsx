import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireRoster } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hacking Practice" };

export default async function HackingPracticePage() {
  await requireRoster();

  return (
    <>
      <PageHeader
        title="Hacking Practice"
        description="Practice the store and ammunation robbery minigames — thermite, crate, USB hack, door pairs, and more. Operator+ only."
        actions={
          <a
            href="/hacking-practice/index.html"
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open fullscreen
          </a>
        }
      />
      <div className="-mx-4 overflow-hidden border-y bg-black sm:-mx-6 sm:rounded-lg sm:border">
        <iframe
          src="/hacking-practice/index.html"
          title="Store and Ammunation hacking practice"
          className="h-[min(78dvh,880px)] w-full border-0"
          allow="autoplay"
        />
      </div>
    </>
  );
}
