/**
 * Runs every migration in supabase/migrations against an in-process Postgres
 * (PGlite) and exercises the RLS policies at each of the six crew ranks.
 *
 * The point is to prove the policies actually deny what they claim to deny,
 * since a broken policy fails open and would be invisible in the UI.
 *
 *   node scripts/verify-migrations.mjs
 */
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase", "migrations");

const db = new PGlite();

let passed = 0;
const failures = [];

function ok(name) {
  passed += 1;
  console.log(`  \u2713 ${name}`);
}

function fail(name, detail) {
  failures.push({ name, detail });
  console.log(`  \u2717 ${name}\n      ${detail}`);
}

async function check(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (error) {
    fail(name, error.message.split("\n")[0]);
  }
}

/** Asserts the callback is rejected by the database. */
async function denied(name, fn, expectedFragment) {
  try {
    await fn();
    fail(name, "expected the database to reject this, but it succeeded");
  } catch (error) {
    const message = error.message ?? String(error);
    if (expectedFragment && !message.toLowerCase().includes(expectedFragment.toLowerCase())) {
      fail(name, `rejected, but not for the expected reason: ${message.split("\n")[0]}`);
      return;
    }
    ok(name);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Runs `fn` as the given user id with the Supabase `authenticated` role. */
async function as(uid, sql, params) {
  await db.exec("reset role;");
  await db.query("select set_config('vanta.uid', $1, false);", [uid ?? ""]);
  await db.exec("set role authenticated;");
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}

/** Runs SQL with full privileges, the way a migration or the service role would. */
async function asSystem(sql, params) {
  await db.exec("reset role;");
  await db.query("select set_config('vanta.uid', '', false);");
  return db.query(sql, params);
}

// --- Supabase platform stubs -------------------------------------------------
// PGlite is plain Postgres, so the pieces the migrations assume Supabase
// provides (auth schema, roles, auth.uid()) have to be created first.
async function bootstrapSupabaseEnvironment() {
  await db.exec(`
    create schema if not exists auth;

    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      raw_user_meta_data jsonb default '{}'::jsonb,
      created_at timestamptz default now()
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('vanta.uid', true), '')::uuid;
    $$;

    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin bypassrls;
      end if;
    end
    $$;

    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
}

async function runMigrations() {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

  assert(files.length > 0, "no migration files found");

  for (const file of files) {
    let sql = await readFile(path.join(migrationsDir, file), "utf8");

    // PGlite does not ship contrib modules; gen_random_uuid() is core in PG13+.
    sql = sql.replace(/create extension if not exists "pgcrypto";/g, "");

    try {
      await db.exec(sql);
      console.log(`  \u2713 ${file}`);
      passed += 1;
    } catch (error) {
      fail(file, error.message.split("\n")[0]);
      throw new Error(`migration ${file} failed, cannot continue`);
    }
  }
}

/** Simulates a Discord sign-in, which fires the auth.users trigger. */
async function signIn(username) {
  const { rows } = await asSystem(
    `insert into auth.users (raw_user_meta_data)
     values (jsonb_build_object(
       'user_name', $1::text,
       'avatar_url', 'https://cdn.discordapp.com/avatars/' || $1::text || '.png',
       'custom_claims', jsonb_build_object('global_name', $1::text)
     ))
     returning id;`,
    [username],
  );
  return rows[0].id;
}

async function rankOf(id) {
  const { rows } = await asSystem("select crew_rank from public.profiles where id = $1;", [id]);
  return rows[0]?.crew_rank;
}

async function main() {
  console.log("\nBootstrapping Supabase-like environment");
  await bootstrapSupabaseEnvironment();
  ok("auth schema, roles and auth.uid() stubs");

  console.log("\nRunning migrations");
  await runMigrations();

  console.log("\nProfile auto-provisioning");
  const kingpinId = await signIn("kingpin");
  const underbossId = await signIn("underboss");
  const captainId = await signIn("captain");
  const operatorId = await signIn("operator");
  const prospectId = await signIn("prospect");

  await check("the first Discord sign-in is provisioned as Kingpin", async () => {
    const { rows } = await asSystem(
      "select crew_rank, discord_username, ingame_name from public.profiles where id = $1;",
      [kingpinId],
    );
    assert(rows.length === 1, "no profile row was created");
    assert(rows[0].crew_rank === "Kingpin", `expected Kingpin, got ${rows[0].crew_rank}`);
    assert(rows[0].discord_username === "kingpin", "discord username was not copied");
    assert(rows[0].ingame_name === "kingpin", "ingame name was not seeded");
  });

  await check("every later sign-in starts as a Prospect", async () => {
    const { rows } = await asSystem("select crew_rank from public.profiles where id = any($1);", [
      [underbossId, captainId, operatorId, prospectId],
    ]);
    assert(rows.length === 4, "expected four profiles");
    assert(
      rows.every((r) => r.crew_rank === "Prospect"),
      "a later signup was given something other than Prospect",
    );
  });

  await check("avatar refreshes when Discord metadata changes", async () => {
    await asSystem(
      `update auth.users
       set raw_user_meta_data = jsonb_set(raw_user_meta_data, '{avatar_url}', '"https://cdn.discordapp.com/new.png"')
       where id = $1;`,
      [operatorId],
    );
    const { rows } = await asSystem("select discord_avatar_url from public.profiles where id = $1;", [operatorId]);
    assert(rows[0].discord_avatar_url === "https://cdn.discordapp.com/new.png", "avatar was not synced");
  });

  await check("vanta_ensure_profile heals an orphaned auth account", async () => {
    // Disable the insert trigger so we can reproduce a user with no profile.
    await asSystem("alter table auth.users disable trigger on_auth_user_created;");
    const orphan = await asSystem(
      `insert into auth.users (id, email, raw_user_meta_data)
       values (gen_random_uuid(), 'orphan@example.com', '{"user_name":"orphan","custom_claims":{"global_name":"Orphan"}}'::jsonb)
       returning id;`,
    );
    const orphanId = orphan.rows[0].id;
    await asSystem("alter table auth.users enable trigger on_auth_user_created;");

    const before = await asSystem("select 1 from public.profiles where id = $1;", [orphanId]);
    assert(before.rows.length === 0, "orphan unexpectedly got a profile from the insert");

    const { rows } = await as(orphanId, "select crew_rank, ingame_name from public.vanta_ensure_profile();");
    assert(rows.length === 1, "ensure_profile returned nothing");
    assert(rows[0].crew_rank === "Prospect", `expected Prospect, got ${rows[0].crew_rank}`);
    assert(rows[0].ingame_name === "Orphan", "display name was not copied");

    // Idempotent: calling again must return the same row, not create a second.
    const again = await as(orphanId, "select id from public.vanta_ensure_profile();");
    assert(again.rows[0].id === orphanId, "second call did not return the existing profile");

    // Drop the orphan so later roster counts stay tied to the five seeded members.
    await asSystem("delete from auth.users where id = $1;", [orphanId]);
  });

  // Promote via the system path, the way the SETUP.md bootstrap instructs.
  await asSystem("update public.profiles set crew_rank = 'Underboss' where id = $1;", [underbossId]);
  await asSystem("update public.profiles set crew_rank = 'Captain' where id = $1;", [captainId]);
  await asSystem("update public.profiles set crew_rank = 'Operator' where id = $1;", [operatorId]);

  console.log("\nprofiles RLS");

  await check("an Operator can read the whole roster", async () => {
    const { rows } = await as(operatorId, "select id from public.profiles;");
    assert(rows.length === 5, `expected 5 profiles, got ${rows.length}`);
  });

  await check("a Prospect sees only their own profile row", async () => {
    const { rows } = await as(prospectId, "select id from public.profiles;");
    assert(rows.length === 1, `a Prospect saw ${rows.length} profiles, expected only their own`);
    assert(rows[0].id === prospectId, "a Prospect saw somebody else's row");
  });

  await check("a Prospect can still set their own in-game name", async () => {
    await as(prospectId, "update public.profiles set ingame_name = 'Nico' where id = $1;", [prospectId]);
    const { rows } = await asSystem("select ingame_name from public.profiles where id = $1;", [prospectId]);
    assert(rows[0].ingame_name === "Nico", "the rename did not stick");
  });

  await denied(
    "a Prospect cannot promote themselves",
    () => as(prospectId, "update public.profiles set crew_rank = 'Kingpin' where id = $1;", [prospectId]),
    "Only an admin can change",
  );

  await denied(
    "an Operator cannot change their own rank",
    () => as(operatorId, "update public.profiles set crew_rank = 'Captain' where id = $1;", [operatorId]),
    "Only an admin can change",
  );

  await check("an Operator cannot edit someone else's profile", async () => {
    const result = await as(operatorId, "update public.profiles set ingame_name = 'hacked' where id = $1;", [
      prospectId,
    ]);
    assert(result.affectedRows === 0, "RLS let an Operator write to another member's row");
  });

  // Two different mechanisms deny this. Another member's row is filtered out by
  // the policy, so the update quietly affects nothing; their own row passes the
  // policy and is stopped by the guard trigger with a message.
  await check("a Captain cannot promote another member", async () => {
    const result = await as(captainId, "update public.profiles set crew_rank = 'Underboss' where id = $1;", [
      operatorId,
    ]);
    assert(result.affectedRows === 0, "a Captain promoted another member");
    assert((await rankOf(operatorId)) === "Operator", "the Operator's rank changed anyway");
  });

  await denied(
    "a Captain cannot promote themselves",
    () => as(captainId, "update public.profiles set crew_rank = 'Underboss' where id = $1;", [captainId]),
    "Only an admin can change",
  );

  await check("an Underboss can set ranks", async () => {
    await as(underbossId, "update public.profiles set crew_rank = 'Enforcer' where id = $1;", [captainId]);
    assert((await rankOf(captainId)) === "Enforcer", "the Underboss update did not apply");
    await as(underbossId, "update public.profiles set crew_rank = 'Captain' where id = $1;", [captainId]);
    assert((await rankOf(captainId)) === "Captain", "the rank could not be set back");
  });

  await denied(
    "an Underboss cannot appoint a Kingpin",
    () => as(underbossId, "update public.profiles set crew_rank = 'Kingpin' where id = $1;", [underbossId]),
    "Only a Kingpin can grant",
  );

  await denied(
    "the last active Kingpin cannot be demoted",
    () => as(kingpinId, "update public.profiles set crew_rank = 'Captain' where id = $1;", [kingpinId]),
    "at least one active Kingpin",
  );

  await denied(
    "the last active Kingpin cannot be deactivated",
    () => as(kingpinId, "update public.profiles set is_active = false where id = $1;", [kingpinId]),
    "at least one active Kingpin",
  );

  await check("a Kingpin can appoint another Kingpin", async () => {
    await as(kingpinId, "update public.profiles set crew_rank = 'Kingpin' where id = $1;", [underbossId]);
    assert((await rankOf(underbossId)) === "Kingpin", "the appointment did not apply");
    // Step back down now that a second Kingpin exists to authorise it.
    await as(kingpinId, "update public.profiles set crew_rank = 'Underboss' where id = $1;", [underbossId]);
    assert((await rankOf(underbossId)) === "Underboss", "the demotion did not apply");
  });

  await denied(
    "ranks outside the ladder are rejected",
    () => asSystem("update public.profiles set crew_rank = 'Consigliere' where id = $1;", [operatorId]),
    "violates check constraint",
  );

  console.log("\nremit_types and remit_logs RLS");

  const remitTypes = await asSystem(
    "select id, name, is_weekly_quota, quota_amount from public.remit_types order by name;",
  );
  const launderingType = remitTypes.rows.find((r) => r.is_weekly_quota);
  const chopmatsType = remitTypes.rows.find((r) => r.name === "Chopmats — Aluminum");
  assert(launderingType, "Laundering Contract seed missing");
  assert(chopmatsType, "Chopmats — Aluminum seed missing");
  assert(
    remitTypes.rows.filter((r) => String(r.name).startsWith("Chopmats")).length === 5,
    "expected five Chopmats material types",
  );
  assert(
    !remitTypes.rows.some((r) => r.name === "Chopmats"),
    "generic Chopmats type should have been replaced",
  );
  assert(Number(launderingType.quota_amount) === 2, "weekly quota should be 2");

  await check("everyone can read remit types", async () => {
    const { rows } = await as(prospectId, "select id from public.remit_types;");
    assert(rows.length >= 8, `expected seeded types, got ${rows.length}`);
  });

  await denied(
    "a Captain cannot create remit types",
    () => as(captainId, "insert into public.remit_types (name) values ('Fake Type');"),
    "row-level security",
  );

  let prospectRemitId;
  await check("a Prospect can log their own remit", async () => {
    const { rows } = await as(
      prospectId,
      `insert into public.remit_logs (member_id, remit_type_id, quantity, description, submitted_by)
       values ($1, $2, 1, 'first drop', $1)
       returning id, status, week_start;`,
      [prospectId, launderingType.id],
    );
    prospectRemitId = rows[0].id;
    assert(rows[0].status === "pending", "a self-logged remit should start pending");
    assert(rows[0].week_start != null, "week_start should be stamped by the trigger");
  });

  await denied(
    "a Prospect cannot log remit for anyone else",
    () =>
      as(
        prospectId,
        `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by)
         values ($1, $2, 1, $3);`,
        [operatorId, launderingType.id, prospectId],
      ),
    "row-level security",
  );

  await denied(
    "a Prospect cannot approve their own remit at insert time",
    () =>
      as(
        prospectId,
        `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by, status)
         values ($1, $2, 1, $1, 'approved');`,
        [prospectId, launderingType.id],
      ),
    "row-level security",
  );

  await check("an Operator can log their own remit", async () => {
    await as(
      operatorId,
      `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by)
       values ($1, $2, 2, $1);`,
      [operatorId, chopmatsType.id],
    );
  });

  let remitId;
  await check("a Captain can submit remit for another member", async () => {
    const { rows } = await as(
      captainId,
      `insert into public.remit_logs (member_id, remit_type_id, quantity, amount, description, submitted_by)
       values ($1, $2, 2, 5000, 'warehouse job', $3)
       returning id, status;`,
      [operatorId, launderingType.id, captainId],
    );
    remitId = rows[0].id;
    assert(rows[0].status === "pending", "new remit should start pending");
  });

  await denied(
    "a Captain cannot submit remit attributed to someone else",
    () =>
      as(
        captainId,
        `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by)
         values ($1, $2, 1, $3);`,
        [operatorId, launderingType.id, kingpinId],
      ),
    "row-level security",
  );

  await denied(
    "a Captain cannot self-approve at insert time",
    () =>
      as(
        captainId,
        `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by, status)
         values ($1, $2, 1, $3, 'approved');`,
        [operatorId, launderingType.id, captainId],
      ),
    "row-level security",
  );

  await check("a Prospect sees their own remit and nothing else", async () => {
    const { rows } = await as(prospectId, "select id from public.remit_logs;");
    assert(rows.length === 1, `a Prospect saw ${rows.length} entries, expected only their own`);
    assert(rows[0].id === prospectRemitId, "a Prospect saw somebody else's remit");
  });

  await check("a Captain sees every remit entry", async () => {
    const { rows } = await as(captainId, "select id from public.remit_logs;");
    assert(rows.length === 3, `a Captain should see 3 entries, saw ${rows.length}`);
  });

  await check("a Captain cannot approve remit", async () => {
    const result = await as(captainId, "update public.remit_logs set status = 'approved' where id = $1;", [remitId]);
    assert(result.affectedRows === 0, "a Captain managed to approve remit");
  });

  await check("an admin approves remit and the reviewer is stamped automatically", async () => {
    await as(underbossId, "update public.remit_logs set status = 'approved' where id = $1;", [remitId]);
    const { rows } = await asSystem("select status, reviewed_by from public.remit_logs where id = $1;", [remitId]);
    assert(rows[0].status === "approved", "status did not change");
    assert(rows[0].reviewed_by === underbossId, "reviewed_by was not stamped from the JWT");
  });

  await check("week_start is stamped as the Manila Sunday of created_at", async () => {
    const { rows } = await asSystem(
      `select week_start = public.vanta_week_start(created_at) as ok from public.remit_logs where id = $1;`,
      [remitId],
    );
    assert(rows[0].ok === true, "week_start does not match the trigger formula");
  });

  await check("weekly compliance counts only approved laundering quantity", async () => {
    // Approve a second laundering row for the Operator so they meet the quota of 2.
    await as(
      captainId,
      `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by)
       values ($1, $2, 1, $3);`,
      [operatorId, launderingType.id, captainId],
    );
    // Still pending — not counted yet.
    let { rows } = await as(
      captainId,
      "select approved_quantity, quota_met from public.member_weekly_compliance where member_id = $1 and quota_type_id = $2;",
      [operatorId, launderingType.id],
    );
    assert(Number(rows[0].approved_quantity) === 2, `expected 2 from the earlier approve, got ${rows[0].approved_quantity}`);
    assert(rows[0].quota_met === true, "Operator should already meet quota from the approved qty 2");

    // Chopmats must not count toward laundering quota.
    rows = (
      await as(
        captainId,
        "select approved_quantity from public.member_weekly_compliance where member_id = $1 and quota_type_id = $2;",
        [operatorId, launderingType.id],
      )
    ).rows;
    assert(Number(rows[0].approved_quantity) === 2, "non-quota types inflated the weekly count");
  });

  await check("multiple weekly quota types are allowed", async () => {
    const { rows: created } = await as(
      underbossId,
      `insert into public.remit_types (name, is_weekly_quota, quota_amount)
       values ('Extra Weekly Contract', true, 1)
       returning id;`,
    );
    assert(created.length === 1, "second weekly quota type was rejected");
    const extraId = created[0].id;

    const { rows } = await as(
      captainId,
      "select quota_type_id from public.member_weekly_compliance where member_id = $1;",
      [operatorId],
    );
    assert(rows.length === 2, `expected 2 compliance rows (one per quota), got ${rows.length}`);
    assert(
      rows.some((r) => r.quota_type_id === launderingType.id) &&
        rows.some((r) => r.quota_type_id === extraId),
      "compliance missing one of the weekly quota types",
    );

    await as(underbossId, "delete from public.remit_types where id = $1;", [extraId]);
  });

  await check("a Prospect can read their own compliance row only", async () => {
    const { rows } = await as(prospectId, "select member_id, quota_met from public.member_weekly_compliance;");
    assert(rows.length === 1, `Prospect saw ${rows.length} compliance rows`);
    assert(rows.every((r) => r.member_id === prospectId), "Prospect read another member's compliance");
    assert(rows[0].quota_met === false, "Prospect has no approved laundering yet");
  });

  await check("an Operator cannot read the crew compliance table", async () => {
    const { rows } = await as(operatorId, "select member_id from public.member_weekly_compliance;");
    assert(rows.length >= 1 && rows.every((r) => r.member_id === operatorId), "Operator saw other members' compliance");
  });

  console.log("\nmember_rep RLS (per-member reputation)");

  await check("the shared ladder table is gone", async () => {
    const { rows } = await asSystem(
      "select to_regclass('public.rep_tiers') is null as dropped;",
    );
    assert(rows[0].dropped === true, "rep_tiers still exists");
  });

  await check("a Captain can set a member's reputation profile", async () => {
    await as(
      captainId,
      `insert into public.member_rep (
         member_id, rep_band, tier_label, house_rob_payout, atm_payout, launder_rate, store_capacity,
         gps_unlocked, rope_unlocked, nos_unlocked, usb_unlocked, updated_by
       ) values ($1, 'mid', 'Reliable Hand', '$5,000', '$2,500', '$65/MB', '40 MB', true, false, false, false, $2);`,
      [operatorId, captainId],
    );
  });

  await check("a Captain can update that member's reputation fields", async () => {
    await as(
      captainId,
      `update public.member_rep
       set rep_band = 'high', tier_label = 'Top Earner', usb_unlocked = true, updated_by = $1
       where member_id = $2;`,
      [captainId, operatorId],
    );
    const { rows } = await as(
      operatorId,
      "select rep_band, tier_label, usb_unlocked from public.member_rep where member_id = $1;",
      [operatorId],
    );
    assert(rows[0].rep_band === "high", "rep band update did not stick");
    assert(rows[0].tier_label === "Top Earner", "update did not stick");
    assert(rows[0].usb_unlocked === true, "usb unlock missing");
  });

  await denied(
    "an Operator cannot set reputation",
    () =>
      as(
        operatorId,
        `insert into public.member_rep (member_id, rep_band, tier_label, updated_by)
         values ($1, 'low', 'Fake', $1);`,
        [prospectId],
      ),
    "row-level security",
  );

  await denied(
    "a Prospect cannot set their own reputation",
    () =>
      as(
        prospectId,
        `insert into public.member_rep (member_id, rep_band, tier_label, updated_by)
         values ($1, 'high', 'Self', $1);`,
        [prospectId],
      ),
    "row-level security",
  );

  await check("new members have no reputation until staff sets one", async () => {
    const { rows } = await asSystem("select 1 from public.member_rep where member_id = $1;", [prospectId]);
    assert(rows.length === 0, "a Prospect was auto-assigned reputation");
  });

  await check("anyone can read another member's reputation", async () => {
    const { rows } = await as(
      prospectId,
      "select rep_band, tier_label from public.member_rep where member_id = $1;",
      [operatorId],
    );
    assert(rows.length === 1, "a Prospect could not read member_rep");
    assert(rows[0].rep_band === "high", "wrong rep band visible");
    assert(rows[0].tier_label === "Top Earner", "wrong reputation visible");
  });

  await check("the points ledger was archived, not dropped", async () => {
    const { rows } = await asSystem(
      "select to_regclass('public.reputation_entries_legacy') is not null as archived, to_regclass('public.reputation_entries') is null as removed;",
    );
    assert(rows[0].archived === true, "legacy table missing");
    assert(rows[0].removed === true, "reputation_entries still exists under the old name");
  });

  console.log("\nmember_summary view");

  await check("roster summary exposes per-member reputation fields", async () => {
    const { rows } = await as(
      operatorId,
      "select id, rep_band, tier_label, gps_unlocked, usb_unlocked, total_approved_remit from public.member_summary where id = $1;",
      [operatorId],
    );
    assert(rows.length === 1, "could not read own summary");
    assert(rows[0].rep_band === "high", `returned band ${rows[0].rep_band}`);
    assert(rows[0].tier_label === "Top Earner", `returned ${rows[0].tier_label}`);
    assert(rows[0].usb_unlocked === true, "usb unlock missing from summary");
  });

  await check("a member with no reputation shows null fields", async () => {
    const { rows } = await as(
      operatorId,
      "select rep_band, tier_label, house_rob_payout from public.member_summary where id = $1;",
      [prospectId],
    );
    assert(rows.length === 1, "an Operator could not read another member's summary row");
    assert(rows[0].rep_band === null, "unassigned member has a rep band");
    assert(rows[0].tier_label === null, "unassigned member has a reputation label");
    assert(rows[0].house_rob_payout === null, "unassigned member has payouts");
  });

  await check("a Prospect sees only their own summary row", async () => {
    const { rows } = await as(prospectId, "select id from public.member_summary;");
    assert(rows.length === 1, `a Prospect saw ${rows.length} summary rows, expected only their own`);
    assert(rows[0].id === prospectId, "a Prospect read somebody else's totals");
  });

  await check("only approved remit counts toward the total", async () => {
    const { rows } = await as(
      operatorId,
      "select total_approved_remit, pending_remit_count from public.member_summary where id = $1;",
      [operatorId],
    );
    assert(Number(rows[0].total_approved_remit) === 5000, "the approved total is wrong");
    // Chopmats + the extra pending laundering row from the compliance setup.
    assert(Number(rows[0].pending_remit_count) === 2, `pending count is wrong: ${rows[0].pending_remit_count}`);
  });

  console.log("\naudit_log");

  await check("only admins can read the audit log", async () => {
    const prospectRows = await as(prospectId, "select id from public.audit_log;");
    assert(prospectRows.rows.length === 0, "a Prospect read the audit log");
    const operatorRows = await as(operatorId, "select id from public.audit_log;");
    assert(operatorRows.rows.length === 0, "an Operator read the audit log");
    const captainRows = await as(captainId, "select id from public.audit_log;");
    assert(captainRows.rows.length === 0, "a Captain read the audit log");
    const underbossRows = await as(underbossId, "select id from public.audit_log;");
    assert(underbossRows.rows.length > 0, "the Underboss sees an empty audit log");
  });

  await check("approving remit was recorded with actor and diff", async () => {
    const { rows } = await asSystem(
      "select actor_id, action, target_id, detail from public.audit_log where action = 'remit.approve';",
    );
    assert(rows.length === 1, `expected 1 remit.approve row, got ${rows.length}`);
    assert(rows[0].actor_id === underbossId, "the acting admin was not recorded");
    assert(rows[0].target_id === remitId, "the audited target is wrong");
    assert(rows[0].detail.status.from === "pending" && rows[0].detail.status.to === "approved", "the diff is wrong");
    assert(typeof rows[0].detail.member === "string" && rows[0].detail.member.length > 0, "credited member missing from audit");
    assert(rows[0].detail.reviewed_by === underbossId, "reviewed_by missing from audit detail");
  });

  await check("rank changes are recorded", async () => {
    const { rows } = await asSystem(
      "select actor_id, target_id, detail from public.audit_log where action = 'rank.change';",
    );
    assert(rows.length >= 1, "no rank change was audited");
    assert(
      rows.some((r) => r.detail.crew_rank?.to === "Underboss"),
      "the promotion to Underboss was not captured",
    );
    assert(
      rows.every((r) => typeof r.detail.member === "string" && r.detail.member.length > 0),
      "rank change audits must name the member whose rank changed",
    );
    assert(
      rows.every((r) => r.target_id != null),
      "rank change audits must point at the affected profile",
    );
  });

  await check("setting and updating a member's reputation is audited", async () => {
    const { rows } = await asSystem(
      "select detail from public.audit_log where action = 'rep.set' order by created_at;",
    );
    assert(rows.length >= 2, `expected at least 2 rep.set audits, got ${rows.length}`);
    assert(
      rows.some((r) => r.detail.rep?.from === null && r.detail.rep?.to?.tier_label === "Reliable Hand"),
      "the first assignment was not audited",
    );
    assert(
      rows.some(
        (r) =>
          r.detail.rep?.from?.tier_label === "Reliable Hand" &&
          r.detail.rep?.to?.tier_label === "Top Earner",
      ),
      "the update was not audited",
    );
  });

  await check("a member can delete their own pending remit", async () => {
    const { rows } = await as(
      prospectId,
      `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by)
       values ($1, $2, 1, $1) returning id;`,
      [prospectId, launderingType.id],
    );
    const pendingId = rows[0].id;
    await as(prospectId, "delete from public.remit_logs where id = $1;", [pendingId]);
    const left = await asSystem("select 1 from public.remit_logs where id = $1;", [pendingId]);
    assert(left.rows.length === 0, "pending remit was not deleted");
  });

  await check("a Prospect cannot delete someone else's pending remit", async () => {
    const { rows } = await as(
      operatorId,
      `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by)
       values ($1, $2, 1, $1) returning id;`,
      [operatorId, chopmatsType.id],
    );
    const otherId = rows[0].id;
    // RLS DELETE silently skips rows the caller cannot see/delete.
    await as(prospectId, "delete from public.remit_logs where id = $1;", [otherId]);
    const left = await asSystem("select 1 from public.remit_logs where id = $1;", [otherId]);
    assert(left.rows.length === 1, "Prospect deleted another member's pending remit");
  });

  await check("a member cannot delete an already-approved remit", async () => {
    // remitId is approved earlier in the suite; member_id is operatorId.
    await as(operatorId, "delete from public.remit_logs where id = $1;", [remitId]);
    const left = await asSystem("select status from public.remit_logs where id = $1;", [remitId]);
    assert(left.rows.length === 1, "approved remit was deleted by its member");
    assert(left.rows[0].status === "approved", "approved remit status changed");
  });

  await check("voiding a remit entry preserves a copy in the audit log", async () => {
    await as(underbossId, "delete from public.remit_logs where id = $1;", [remitId]);
    const { rows } = await asSystem(
      "select detail from public.audit_log where action = 'remit.delete' and target_id = $1;",
      [remitId],
    );
    assert(rows.length === 1, "the deletion was not audited");
    assert(Number(rows[0].detail.deleted.amount) === 5000, "the deleted row was not snapshotted");
  });

  await denied(
    "nobody can write to the audit log directly",
    () => as(kingpinId, "insert into public.audit_log (actor_id, action) values ($1, 'forged');", [kingpinId]),
    "permission denied",
  );

  await denied(
    "nobody can erase audit history",
    () => as(kingpinId, "delete from public.audit_log;"),
    "permission denied",
  );

  console.log("\nDeactivation");

  await check("deactivating a Captain strips their write access", async () => {
    await as(kingpinId, "update public.profiles set is_active = false where id = $1;", [captainId]);
    let blocked = false;
    try {
      await as(
        captainId,
        "update public.member_rep set tier_label = 'Hacked', updated_by = $1 where member_id = $2;",
        [captainId, operatorId],
      );
    } catch {
      blocked = true;
    }
    // RLS update with no matching rows returns 0 affected without throwing.
    if (!blocked) {
      const { rows } = await asSystem("select tier_label from public.member_rep where member_id = $1;", [
        operatorId,
      ]);
      blocked = rows[0].tier_label === "Top Earner";
    }
    assert(blocked, "a deactivated Captain could still change reputation");
  });

  await denied(
    "a deactivated member cannot even log their own remit",
    () =>
      as(
        captainId,
        `insert into public.remit_logs (member_id, remit_type_id, quantity, submitted_by)
         values ($1, $2, 1, $1);`,
        [captainId, launderingType.id],
      ),
    "row-level security",
  );

  await check("a deactivated member keeps their summary row", async () => {
    const { rows } = await asSystem("select id from public.member_summary where id = $1;", [captainId]);
    assert(rows.length === 1, "the deactivated member vanished from the summary");
  });

  console.log(
    `\n${failures.length === 0 ? "PASS" : "FAIL"} \u2014 ${passed} passed, ${failures.length} failed\n`,
  );

  if (failures.length > 0) {
    for (const f of failures) console.log(`  ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(`\nAborted: ${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
