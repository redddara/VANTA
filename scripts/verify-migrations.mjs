/**
 * Runs every migration in supabase/migrations against an in-process Postgres
 * (PGlite) and exercises the RLS policies as member / officer / admin.
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

async function main() {
  console.log("\nBootstrapping Supabase-like environment");
  await bootstrapSupabaseEnvironment();
  ok("auth schema, roles and auth.uid() stubs");

  console.log("\nRunning migrations");
  await runMigrations();

  console.log("\nProfile auto-provisioning");
  const adminId = await signIn("boss");
  const officerId = await signIn("capo");
  const memberId = await signIn("soldier");
  const outsiderId = await signIn("recruit");

  await check("first Discord sign-in is provisioned as admin", async () => {
    const { rows } = await asSystem("select role, discord_username, ingame_name from public.profiles where id = $1;", [adminId]);
    assert(rows.length === 1, "no profile row was created");
    assert(rows[0].role === "admin", `expected admin, got ${rows[0].role}`);
    assert(rows[0].discord_username === "boss", "discord username was not copied");
    assert(rows[0].ingame_name === "boss", "ingame name was not seeded");
  });

  await check("subsequent sign-ins default to member", async () => {
    const { rows } = await asSystem("select role from public.profiles where id = any($1);", [
      [officerId, memberId, outsiderId],
    ]);
    assert(rows.length === 3, "expected three profiles");
    assert(rows.every((r) => r.role === "member"), "a later signup was not a plain member");
  });

  await check("avatar refreshes when Discord metadata changes", async () => {
    await asSystem(
      `update auth.users
       set raw_user_meta_data = jsonb_set(raw_user_meta_data, '{avatar_url}', '"https://cdn.discordapp.com/new.png"')
       where id = $1;`,
      [memberId],
    );
    const { rows } = await asSystem("select discord_avatar_url from public.profiles where id = $1;", [memberId]);
    assert(rows[0].discord_avatar_url === "https://cdn.discordapp.com/new.png", "avatar was not synced");
  });

  // Promote via the system path, the way the SETUP.md bootstrap instructs.
  await asSystem("update public.profiles set role = 'officer' where id = $1;", [officerId]);

  console.log("\nprofiles RLS");

  await check("any member can read the whole roster", async () => {
    const { rows } = await as(memberId, "select id from public.profiles;");
    assert(rows.length === 4, `expected 4 profiles, got ${rows.length}`);
  });

  await check("a member can rename their own ingame_name", async () => {
    await as(memberId, "update public.profiles set ingame_name = 'Tony V' where id = $1;", [memberId]);
    const { rows } = await asSystem("select ingame_name from public.profiles where id = $1;", [memberId]);
    assert(rows[0].ingame_name === "Tony V", "the rename did not stick");
  });

  await denied(
    "a member cannot promote themselves",
    () => as(memberId, "update public.profiles set role = 'admin' where id = $1;", [memberId]),
    "Only an admin can change",
  );

  await denied(
    "a member cannot change their own crew_rank",
    () => as(memberId, "update public.profiles set crew_rank = 'Underboss' where id = $1;", [memberId]),
    "Only an admin can change",
  );

  await check("a member cannot edit someone else's profile", async () => {
    const result = await as(memberId, "update public.profiles set ingame_name = 'hacked' where id = $1;", [outsiderId]);
    assert(result.affectedRows === 0, "RLS let a member write to another member's row");
  });

  await denied(
    "an officer cannot promote anyone",
    () => as(officerId, "update public.profiles set role = 'admin' where id = $1;", [officerId]),
    "Only an admin can change",
  );

  await check("an admin can set roles and ranks", async () => {
    await as(adminId, "update public.profiles set crew_rank = 'Capo', role = 'officer' where id = $1;", [officerId]);
    const { rows } = await asSystem("select crew_rank, role from public.profiles where id = $1;", [officerId]);
    assert(rows[0].crew_rank === "Capo" && rows[0].role === "officer", "admin update did not apply");
  });

  await denied(
    "the last active admin cannot be demoted",
    () => as(adminId, "update public.profiles set role = 'member' where id = $1;", [adminId]),
    "at least one active admin",
  );

  console.log("\nremit_logs RLS");

  await denied(
    "a plain member cannot submit remit",
    () =>
      as(memberId, "insert into public.remit_logs (member_id, amount, description, submitted_by) values ($1, 500, 'heist cut', $1);", [
        memberId,
      ]),
    "row-level security",
  );

  let remitId;
  await check("an officer can submit remit for a member", async () => {
    const { rows } = await as(
      officerId,
      "insert into public.remit_logs (member_id, amount, description, submitted_by) values ($1, 5000, 'warehouse job', $2) returning id, status;",
      [memberId, officerId],
    );
    remitId = rows[0].id;
    assert(rows[0].status === "pending", "new remit should start pending");
  });

  await denied(
    "an officer cannot submit remit attributed to someone else",
    () =>
      as(officerId, "insert into public.remit_logs (member_id, amount, submitted_by) values ($1, 100, $2);", [
        memberId,
        adminId,
      ]),
    "row-level security",
  );

  await denied(
    "an officer cannot self-approve at insert time",
    () =>
      as(officerId, "insert into public.remit_logs (member_id, amount, submitted_by, status) values ($1, 100, $2, 'approved');", [
        memberId,
        officerId,
      ]),
    "row-level security",
  );

  await check("a member sees their own remit but not other members'", async () => {
    await as(
      officerId,
      "insert into public.remit_logs (member_id, amount, submitted_by) values ($1, 900, $2);",
      [outsiderId, officerId],
    );
    const { rows } = await as(memberId, "select id from public.remit_logs;");
    assert(rows.length === 1, `member should see exactly their own 1 entry, saw ${rows.length}`);
  });

  await check("an officer sees every remit entry", async () => {
    const { rows } = await as(officerId, "select id from public.remit_logs;");
    assert(rows.length === 2, `officer should see 2 entries, saw ${rows.length}`);
  });

  await check("an officer cannot approve remit", async () => {
    const result = await as(officerId, "update public.remit_logs set status = 'approved' where id = $1;", [remitId]);
    assert(result.affectedRows === 0, "an officer managed to approve remit");
  });

  await check("an admin approves remit and the reviewer is stamped automatically", async () => {
    await as(adminId, "update public.remit_logs set status = 'approved' where id = $1;", [remitId]);
    const { rows } = await asSystem("select status, reviewed_by from public.remit_logs where id = $1;", [remitId]);
    assert(rows[0].status === "approved", "status did not change");
    assert(rows[0].reviewed_by === adminId, "reviewed_by was not stamped from the JWT");
  });

  console.log("\nreputation_entries RLS");

  let repId;
  await check("an officer can grant reputation", async () => {
    const { rows } = await as(
      officerId,
      "insert into public.reputation_entries (member_id, points, reason, given_by) values ($1, 15, 'ran the warehouse job clean', $2) returning id;",
      [memberId, officerId],
    );
    repId = rows[0].id;
  });

  await check("an officer can dock reputation with negative points", async () => {
    await as(
      officerId,
      "insert into public.reputation_entries (member_id, points, reason, given_by) values ($1, -5, 'missed a scheduled run', $2);",
      [memberId, officerId],
    );
  });

  await denied(
    "reputation requires a non-empty reason",
    () =>
      as(officerId, "insert into public.reputation_entries (member_id, points, reason, given_by) values ($1, 5, '   ', $2);", [
        memberId,
        officerId,
      ]),
    "violates check constraint",
  );

  await denied(
    "a plain member cannot grant themselves reputation",
    () =>
      as(memberId, "insert into public.reputation_entries (member_id, points, reason, given_by) values ($1, 100, 'because', $1);", [
        memberId,
      ]),
    "row-level security",
  );

  await check("a member cannot read another member's reputation entries", async () => {
    await as(
      officerId,
      "insert into public.reputation_entries (member_id, points, reason, given_by) values ($1, 40, 'secret praise', $2);",
      [outsiderId, officerId],
    );
    const { rows } = await as(memberId, "select id from public.reputation_entries;");
    assert(rows.length === 2, `member should see only their own 2 entries, saw ${rows.length}`);
  });

  await check("an officer cannot edit a reputation entry", async () => {
    const result = await as(officerId, "update public.reputation_entries set points = 999 where id = $1;", [repId]);
    assert(result.affectedRows === 0, "an officer edited a reputation entry");
  });

  console.log("\nmember_summary view");

  await check("totals are visible crew-wide even though line items are not", async () => {
    const { rows } = await as(
      memberId,
      "select id, total_rep, total_approved_remit from public.member_summary where id = $1;",
      [outsiderId],
    );
    assert(rows.length === 1, "member could not read another member's summary row");
    assert(Number(rows[0].total_rep) === 40, `expected outsider total_rep 40, got ${rows[0].total_rep}`);
  });

  await check("reputation totals net positive and negative entries", async () => {
    const { rows } = await as(memberId, "select total_rep from public.member_summary where id = $1;", [memberId]);
    assert(Number(rows[0].total_rep) === 10, `expected 15 + -5 = 10, got ${rows[0].total_rep}`);
  });

  await check("only approved remit counts toward the total", async () => {
    const { rows } = await as(
      memberId,
      "select total_approved_remit, pending_remit_count from public.member_summary where id = $1;",
      [outsiderId],
    );
    assert(Number(rows[0].total_approved_remit) === 0, "a pending entry leaked into the approved total");
    assert(Number(rows[0].pending_remit_count) === 1, "pending count is wrong");
  });

  console.log("\naudit_log");

  await check("only admins can read the audit log", async () => {
    const memberRows = await as(memberId, "select id from public.audit_log;");
    assert(memberRows.rows.length === 0, "a member read the audit log");
    const officerRows = await as(officerId, "select id from public.audit_log;");
    assert(officerRows.rows.length === 0, "an officer read the audit log");
    const adminRows = await as(adminId, "select id from public.audit_log;");
    assert(adminRows.rows.length > 0, "the admin sees an empty audit log");
  });

  await check("approving remit was recorded with actor and diff", async () => {
    const { rows } = await asSystem(
      "select actor_id, action, target_id, detail from public.audit_log where action = 'remit.status';",
    );
    assert(rows.length === 1, `expected 1 remit.status row, got ${rows.length}`);
    assert(rows[0].actor_id === adminId, "the acting admin was not recorded");
    assert(rows[0].target_id === remitId, "the audited target is wrong");
    assert(rows[0].detail.status.from === "pending" && rows[0].detail.status.to === "approved", "the diff is wrong");
  });

  await check("role changes are recorded", async () => {
    const { rows } = await asSystem("select action, detail from public.audit_log where action = 'role.change';");
    assert(rows.length >= 1, "no role change was audited");
    assert(rows.some((r) => r.detail.role?.to === "officer"), "the promotion to officer was not captured");
  });

  await check("an admin edit to a reputation entry is audited", async () => {
    await as(adminId, "update public.reputation_entries set points = 20 where id = $1;", [repId]);
    const { rows } = await asSystem("select detail from public.audit_log where action = 'reputation.edit';");
    assert(rows.length === 1, "the reputation edit was not audited");
    assert(rows[0].detail.points.to === 20, "the audited diff is wrong");
  });

  await check("voiding a remit entry preserves a copy in the audit log", async () => {
    await as(adminId, "delete from public.remit_logs where id = $1;", [remitId]);
    const { rows } = await asSystem("select detail from public.audit_log where action = 'remit.delete';");
    assert(rows.length === 1, "the deletion was not audited");
    assert(Number(rows[0].detail.deleted.amount) === 5000, "the deleted row was not snapshotted");
  });

  await denied(
    "nobody can write to the audit log directly",
    () => as(adminId, "insert into public.audit_log (actor_id, action) values ($1, 'forged');", [adminId]),
    "permission denied",
  );

  await denied(
    "nobody can erase audit history",
    () => as(adminId, "delete from public.audit_log;"),
    "permission denied",
  );

  console.log("\nDeactivation");

  await check("deactivating an officer strips their write access", async () => {
    await as(adminId, "update public.profiles set is_active = false where id = $1;", [officerId]);
    let blocked = false;
    try {
      await as(
        officerId,
        "insert into public.reputation_entries (member_id, points, reason, given_by) values ($1, 5, 'still here', $2);",
        [memberId, officerId],
      );
    } catch {
      blocked = true;
    }
    assert(blocked, "a deactivated officer could still grant reputation");
  });

  await check("a deactivated member keeps their history", async () => {
    const { rows } = await asSystem("select total_rep from public.member_summary where id = $1;", [officerId]);
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
