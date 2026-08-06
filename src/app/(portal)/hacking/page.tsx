import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth";
import { canAccessHackingPractice } from "@/lib/features";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hacking Practice" };

export default async function HackingPracticePage() {
  const { profile } = await requireSession();
  if (!canAccessHackingPractice(profile)) redirect("/dashboard");

  return (
    <>
      <PageHeader
        title="Hacking Practice"
        description="Private practice for store and ammunation minigames. Access is granted per member by the Kingpin."
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
