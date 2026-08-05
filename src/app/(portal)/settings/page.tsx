import type { Metadata } from "next";

import { MemberAvatar } from "@/components/nav/member-avatar";
import { RankBadge } from "@/components/nav/rank-badge";
import { ProfileForm } from "@/components/settings/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { RANK_DESCRIPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireSession();

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your in-game name is the only thing you can change here. Your rank is set by an admin."
      />

      <div className="grid max-w-3xl gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
        <Card className="py-6">
          <CardContent>
            <ProfileForm ingameName={profile.ingame_name ?? ""} />
          </CardContent>
        </Card>

        <Card className="h-fit py-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <MemberAvatar profile={profile} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {profile.discord_username ?? "No handle"}
                </p>
                <p className="text-muted-foreground text-xs">via Discord</p>
              </div>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground text-xs">Rank</dt>
                <dd>
                  <RankBadge rank={profile.crew_rank} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground text-xs">Joined</dt>
                <dd className="text-xs">{formatDate(profile.created_at)}</dd>
              </div>
            </dl>

            <p className="text-muted-foreground border-t pt-3 text-xs">
              {RANK_DESCRIPTIONS[profile.crew_rank]}
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
