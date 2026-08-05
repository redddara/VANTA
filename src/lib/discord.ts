/**
 * Discord guild membership helpers used at OAuth callback time.
 * The provider_token is only available right after exchangeCodeForSession.
 */

export type DiscordGuild = {
  id: string;
  name: string;
};

export async function fetchDiscordGuilds(
  accessToken: string,
): Promise<DiscordGuild[]> {
  const response = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Discord guilds lookup failed (${response.status})`);
  }

  return (await response.json()) as DiscordGuild[];
}

export async function isDiscordGuildMember(
  accessToken: string,
  guildId: string,
): Promise<boolean> {
  const guilds = await fetchDiscordGuilds(accessToken);
  return guilds.some((guild) => guild.id === guildId);
}
